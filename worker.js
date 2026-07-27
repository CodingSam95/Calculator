// Web Worker for arbitrary-precision math logic using decimal.js
importScripts('https://cdnjs.cloudflare.com/ajax/libs/decimal.js/10.4.3/decimal.min.js');

// Unified Decimal configuration
// 50 significant digits is far more than enough for any real-world calculation
// and avoids the ~11-second delay when dividing non-terminating decimals like 22/7.
// (precision:100000 forced decimal.js to compute 100k digits of every irrational result.)
Decimal.set({
    precision: 50,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -9e15,
    toExpPos: 9e15
});

// Cache π and e once at startup (cheap at 50 digits, very expensive at 100k)
const CACHED_PI = Decimal.acos(-1);
const CACHED_E = new Decimal(1).exp();

let currentAngleMode = 'deg';

// Post message interface
self.onmessage = function (e) {
    const { type, expression, angleMode, seq } = e.data;

    try {
        if (!expression) {
            self.postMessage({ type, result: "", fullResult: "", isApprox: false, fraction: "", seq });
            return;
        }

        const resultDec = calculateExpression(expression, angleMode);

        const formatted = formatDecimalResult(resultDec);
        self.postMessage({
            type,
            result: formatted.result,
            fullResult: formatted.fullResult,
            isApprox: formatted.isApprox,
            fraction: formatted.fraction,
            seq
        });
    } catch (err) {
        self.postMessage({
            type,
            error: err.message || "Error",
            seq
        });
    }
};

// --- Preprocessing & Tokenization ---

function cleanSpaces(str) {
    return str.replace(/\s+/g, '');
}

function insertExplicitMultiplication(str) {
    let s = cleanSpaces(str);
    let prev;
    do {
        prev = s;
        s = s
            // Number followed by parenthesis: 2( -> 2*(
            .replace(/(\d)\(/g, '$1*(')
            // Parenthesis followed by number/parenthesis: )2 -> )*2, )( -> )*(
            .replace(/\)([\d\(])/g, ')*$1')
            // Number followed by identifier/constant: 2pi -> 2*pi, 2sin -> 2*sin (excluding standalone C/P operators)
            .replace(/(\d)(?![CP](?![a-zA-Z_]))([a-zA-Zπeπ_])/g, '$1*$2')
            // Variable/constant followed by number/parenthesis: pi2 -> pi*2, pi( -> pi*(
            .replace(/([πeπ_])([\d\(])/g, '$1*$2')
            // Parenthesis followed by identifier: )pi -> )*pi (excluding standalone C/P operators)
            .replace(/\)(?![CP](?![a-zA-Z_]))([a-zA-Zπeπ_])/g, ')*$1')
            // Two identifiers next to each other (e.g. pi e -> pi * e)
            .replace(/([πe])([πe])/g, '$1*$2');
    } while (s !== prev);
    return s;
}

function preprocessPercentages(str) {
    // 1. Handle + and - percentages (e.g., 100 + 10% => 100 * (1 + 10/100))
    str = str.replace(/([\d.]+|(\([\s\S]*?\)))\s*([\+\-])\s*([\d.]+)%/g, (match, p1, p2, op, p3) => {
        const factor = op === '+' ? `(1 + ${p3}/100)` : `(1 - ${p3}/100)`;
        return `(${p1} * ${factor})`;
    });
    // 2. Handle * and / percentages (e.g., 100 * 10% => 100 * (10/100))
    str = str.replace(/([\*\/])\s*([\d.]+)%/g, (match, op, p2) => {
        return `${op}(${p2}/100)`;
    });
    // 3. Handle any remaining % (standalone or at start)
    str = str.replace(/([\d.]+)%/g, "($1/100)");
    return str;
}

function tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
        const char = str[i];

        // Number (with scientific notation support)
        const numMatch = str.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
        if (numMatch) {
            tokens.push({ type: 'NUMBER', value: numMatch[0] });
            i += numMatch[0].length;
            continue;
        }

        // Identifier (functions or constants)
        const idMatch = str.slice(i).match(/^(?:[CP](?![a-zA-Z_])|[a-zA-Zπeπ_][a-zA-Z0-9_]*)/);
        if (idMatch) {
            tokens.push({ type: 'ID', value: idMatch[0] });
            i += idMatch[0].length;
            continue;
        }

        // Parentheses, operators, commas
        if ('+-*/^%(),!'.includes(char)) {
            tokens.push({ type: 'OP', value: char });
            i++;
            continue;
        }

        throw new Error("Invalid Input");
    }
    return tokens;
}

// --- Recursive Descent Parser ---

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return this.tokens[this.pos] || null;
    }

    consume(type, value) {
        const token = this.peek();
        if (!token) {
            throw new Error("Invalid Input");
        }
        if (type && token.type !== type) {
            throw new Error("Invalid Input");
        }
        if (value && token.value !== value) {
            throw new Error("Invalid Input");
        }
        this.pos++;
        return token;
    }

    parse() {
        const res = this.expr();
        if (this.peek() !== null) {
            throw new Error("Invalid Input");
        }
        return res;
    }

    expr() {
        let node = this.term();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OP' && (token.value === '+' || token.value === '-')) {
                const op = this.consume().value;
                const right = this.term();
                if (op === '+') {
                    node = node.plus(right);
                } else {
                    node = node.minus(right);
                }
            } else {
                break;
            }
        }
        return node;
    }

    term() {
        let node = this.factor();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OP' && (token.value === '*' || token.value === '/' || token.value === '%')) {
                const op = this.consume().value;
                const right = this.factor();
                if (op === '*') {
                    node = node.times(right);
                } else if (op === '/') {
                    if (right.isZero()) throw new Error("DivideByZero");
                    node = node.div(right);
                } else {
                    if (right.isZero()) throw new Error("DivideByZero");
                    node = node.mod(right);
                }
            } else if (token && token.type === 'ID' && (token.value === 'C' || token.value === 'P')) {
                const op = this.consume().value;
                const right = this.factor();
                if (op === 'C') {
                    node = combinations(node, right);
                } else {
                    node = permutations(node, right);
                }
            } else {
                break;
            }
        }
        return node;
    }

    factor() {
        let node = this.primary();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OP' && token.value === '!') {
                this.consume();
                node = factorial(node);
            } else {
                break;
            }
        }
        const token = this.peek();
        if (token && token.type === 'OP' && token.value === '^') {
            this.consume();
            const right = this.factor();
            node = safePow(node, right);
        }
        return node;
    }

    primary() {
        const token = this.peek();
        if (!token) {
            throw new Error("Invalid Input");
        }

        if (token.type === 'NUMBER') {
            this.consume();
            return new Decimal(token.value);
        }

        if (token.type === 'ID') {
            const id = this.consume().value;
            const next = this.peek();
            if (next && next.type === 'OP' && next.value === '(') {
                this.consume('OP', '(');
                const args = [];
                if (this.peek() && (this.peek().type !== 'OP' || this.peek().value !== ')')) {
                    args.push(this.expr());
                    while (this.peek() && this.peek().type === 'OP' && this.peek().value === ',') {
                        this.consume('OP', ',');
                        args.push(this.expr());
                    }
                }
                this.consume('OP', ')');
                return evaluateFunction(id, args);
            } else {
                return evaluateConstant(id);
            }
        }

        if (token.type === 'OP' && token.value === '(') {
            this.consume('OP', '(');
            const node = this.expr();
            this.consume('OP', ')');
            return node;
        }

        if (token.type === 'OP' && token.value === '-') {
            this.consume();
            return this.primary().negated();
        }

        if (token.type === 'OP' && token.value === '+') {
            this.consume();
            return this.primary();
        }

        throw new Error("Invalid Input");
    }
}

// --- Math Functions & Optimizations ---

function calculateExpression(expr, angleMode) {
    currentAngleMode = angleMode || 'deg';

    let processed = insertExplicitMultiplication(expr);
    processed = preprocessPercentages(processed);

    const tokens = tokenize(processed);
    const parser = new Parser(tokens);
    const result = parser.parse();

    if (!result.isFinite()) {
        throw new Error("Overload");
    }

    return result;
}

function evaluateConstant(id) {
    const lid = id.toLowerCase();
    if (lid === 'pi' || lid === 'π') {
        return CACHED_PI;
    }
    if (lid === 'e') {
        return CACHED_E;
    }
    throw new Error("Invalid Input");
}

function factorial(n) {
    if (n.lt(0) || !n.isInteger()) throw new Error("Domain Error");
    if (n.gt(100000)) throw new Error("Overload");

    let result = new Decimal(1);
    const limit = n.toNumber();
    for (let i = 2; i <= limit; i++) {
        result = result.times(i);
    }
    return result;
}

function combinations(n, r) {
    if (n.lt(0) || r.lt(0) || n.lt(r) || !n.isInteger() || !r.isInteger()) throw new Error("Domain Error");

    let k = r;
    if (k.gt(n.minus(k))) {
        k = n.minus(k);
    }
    if (k.gt(100000)) throw new Error("Overload");

    let result = new Decimal(1);
    const limit = k.toNumber();
    for (let i = 1; i <= limit; i++) {
        result = result.times(n.minus(k).plus(i)).div(i);
    }
    return result;
}

function permutations(n, r) {
    if (n.lt(0) || r.lt(0) || n.lt(r) || !n.isInteger() || !r.isInteger()) throw new Error("Domain Error");
    if (r.gt(100000)) throw new Error("Overload");

    let result = new Decimal(1);
    const limit = r.toNumber();
    for (let i = 0; i < limit; i++) {
        result = result.times(n.minus(i));
    }
    return result;
}

function isPowerOfTen(x) {
    const s = x.abs().toString();
    return /^10*$/.test(s) || /^0\.0*1$/.test(s) || /^1e[+-]?\d+$/i.test(s);
}

function getPowerOfTenExponent(x) {
    const s = x.abs().toString();
    if (/^1(0*)$/.test(s)) {
        return new Decimal(s.length - 1);
    }
    const matchDecimal = /^0\.(0*)1$/.exec(s);
    if (matchDecimal) {
        return new Decimal(-(matchDecimal[1].length + 1));
    }
    const matchSci = /^1e([+-]?\d+)$/i.exec(s);
    if (matchSci) {
        return new Decimal(matchSci[1]);
    }
    return null;
}

function safePow(a, b) {
    if (a.isZero()) {
        if (b.isNegative()) throw new Error("DivideByZero");
        if (b.isZero()) return new Decimal(1);
        return new Decimal(0);
    }
    if (a.eq(1)) return new Decimal(1);
    if (a.eq(-1)) {
        return b.mod(2).eq(0) ? new Decimal(1) : new Decimal(-1);
    }
    if (b.isZero()) return new Decimal(1);

    // Power of Ten Optimization
    if (isPowerOfTen(a)) {
        const k = getPowerOfTenExponent(a);
        if (k !== null) {
            const newExp = k.times(b);
            if (newExp.dp() === 0) {
                let sign = 1;
                if (a.isNegative() && b.mod(2).eq(1)) {
                    sign = -1;
                }
                const signStr = sign === -1 ? "-" : "";
                if (newExp.abs().gt(9e15)) {
                    if (newExp.isNegative()) return new Decimal(0);
                    return new Decimal(Infinity);
                }
                return new Decimal(signStr + "1e" + newExp.toString());
            }
        }
    }

    // Large exponent overflow check
    try {
        const approxExp = b.times(a.abs().log());
        if (approxExp.gt(9e15)) {
            if (a.isNegative()) return new Decimal(Infinity);
            return new Decimal(Infinity);
        }
        if (approxExp.lt(-9e15)) {
            return new Decimal(0);
        }
    } catch (err) { }

    return a.pow(b);
}

function evaluateFunction(id, args) {
    const lid = id.toLowerCase();
    if (args.length === 0) throw new Error("Invalid Input");

    if (lid === 'sin') {
        let x = args[0];
        if (currentAngleMode === 'deg') {
            x = x.times(CACHED_PI).div(180);
        }
        if (x.abs().gt(1e6)) throw new Error("Domain Error");
        return x.sin();
    }
    if (lid === 'cos') {
        let x = args[0];
        if (currentAngleMode === 'deg') {
            x = x.times(CACHED_PI).div(180);
        }
        if (x.abs().gt(1e6)) throw new Error("Domain Error");
        return x.cos();
    }
    if (lid === 'tan') {
        let x = args[0];
        if (currentAngleMode === 'deg') {
            x = x.times(CACHED_PI).div(180);
        }
        if (x.abs().gt(1e6)) throw new Error("Domain Error");
        const cosVal = x.cos();
        if (cosVal.abs().lt('1e-' + Math.max(1, Math.floor(Decimal.precision / 2)))) throw new Error("DivideByZero");
        return x.tan();
    }
    if (lid === 'asin') {
        let x = args[0];
        if (x.abs().gt(1)) throw new Error("Domain Error");
        let res = x.asin();
        if (currentAngleMode === 'deg') {
            res = res.times(180).div(CACHED_PI);
        }
        return res;
    }
    if (lid === 'acos') {
        let x = args[0];
        if (x.abs().gt(1)) throw new Error("Domain Error");
        let res = x.acos();
        if (currentAngleMode === 'deg') {
            res = res.times(180).div(CACHED_PI);
        }
        return res;
    }
    if (lid === 'atan') {
        let x = args[0];
        let res = x.atan();
        if (currentAngleMode === 'deg') {
            res = res.times(180).div(CACHED_PI);
        }
        return res;
    }
    if (lid === 'sqrt') {
        if (args[0].isNegative()) throw new Error("Be Real");
        return args[0].sqrt();
    }
    if (lid === 'cbrt') {
        // decimal.js does not have .cbrt(); compute as x^(1/3) preserving sign
        let x = args[0];
        const third = new Decimal(1).div(3);
        if (x.isNegative()) {
            return x.abs().pow(third).negated();
        }
        return x.pow(third);
    }
    if (lid === 'log') {
        if (args[0].lte(0)) throw new Error("Domain Error");
        if (args.length === 2) {
            const base = args[1];
            if (base.lte(0) || base.eq(1)) throw new Error("Domain Error");
            return args[0].log(base);
        }
        return args[0].log();
    }
    if (lid === 'ln') {
        if (args[0].lte(0)) throw new Error("Domain Error");
        return args[0].ln();
    }
    if (lid === 'factorial') {
        return factorial(args[0]);
    }
    if (lid === 'combinations') {
        if (args.length < 2) throw new Error("Invalid Input");
        return combinations(args[0], args[1]);
    }
    if (lid === 'permutations') {
        if (args.length < 2) throw new Error("Invalid Input");
        return permutations(args[0], args[1]);
    }

    throw new Error("Invalid Input");
}

// --- Continued Fractions & Formatting ---

function toFraction(dec, maxDenominator = 100000) {
    let x = new Decimal(dec);
    const sign = x.isNegative() ? -1 : 1;
    x = x.abs();

    let h1 = new Decimal(1), h2 = new Decimal(0);
    let k1 = new Decimal(0), k2 = new Decimal(1);
    let b = x;

    for (let i = 0; i < 50; i++) {
        let a = b.floor();
        let aux = h1;
        h1 = a.times(h1).plus(h2);
        h2 = aux;

        aux = k1;
        k1 = a.times(k1).plus(k2);
        k2 = aux;

        if (k1.gt(maxDenominator)) {
            break;
        }

        let diff = x.minus(h1.div(k1)).abs();
        if (diff.isZero() || diff.lt(1e-35)) {
            break;
        }

        if (b.minus(a).isZero()) break;
        b = new Decimal(1).div(b.minus(a));
    }

    return {
        n: h1.times(sign),
        d: k1
    };
}

function getRecurringStr(dec, n, d) {
    if (d === 0 || !Number.isFinite(n) || !Number.isFinite(d)) return null;
    let n_abs = Math.abs(n);
    let d_abs = Math.abs(d);

    if (d_abs > 99999999) return null;

    let intPart = Math.floor(n_abs / d_abs);
    let rem = n_abs % d_abs;

    if (rem === 0) return null;

    let rems = new Map();
    let digits = "";
    let index = 0;

    while (rem !== 0 && !rems.has(rem) && index < 50) {
        rems.set(rem, index);
        rem *= 10;
        digits += Math.floor(rem / d_abs);
        rem %= d_abs;
        index++;
    }

    if (rem === 0) return null;

    if (rems.has(rem)) {
        let repeatIndex = rems.get(rem);
        let nonRepeating = digits.substring(0, repeatIndex);
        let repeating = digits.substring(repeatIndex);

        if (repeating.length <= 6) {
            let sign = dec < 0 ? "-" : "";
            let formattedInt = formatNumbers(intPart.toString());
            return `${sign}${formattedInt}.${nonRepeating}[${repeating}]`;
        }
    }

    return null;
}

function formatDecimalResult(dec) {
    const dp = dec.dp();
    const absDec = dec.abs();

    // For large integers or scientific notation results, use exponential form
    if (dp === 0) {
        // Large integers beyond JS safe representation: return as exponential string
        const e = dec.e; // exponent in decimal.js (number of digits - 1)
        if (e >= 15) {
            const approx = dec.toExponential(5).replace(/\.?0+e/i, 'e').toUpperCase().replace('E+', 'E');
            // Full precision: e.g. 1E50000 — safe to toString for power-of-ten results
            const full = dec.toExponential().toUpperCase().replace('E+', 'E');
            const isApprox = approx !== full;
            return { result: approx, fullResult: full, isApprox: isApprox, fraction: "" };
        }
        const decStr = dec.toFixed(0);
        const formatted = formatNumbers(decStr);
        return { result: formatted, fullResult: formatted, isApprox: false, fraction: "" };
    }

    const decStr = dec.toString();

    if (absDec.gte('1e12') || (absDec.gt(0) && absDec.lt('1e-7'))) {
        const approx = dec.toExponential(5).replace(/\.?0+e/i, 'e').toUpperCase().replace('E+', 'E');
        const fullResult = decStr.toUpperCase().replace('E+', 'E');
        const isApprox = (approx !== fullResult);
        return {
            result: formatNumbers(approx),
            fullResult: formatNumbers(fullResult),
            isApprox: isApprox,
            fraction: ""
        };
    }

    try {
        const frac = toFraction(dec);
        if (!frac.d.eq(1) && frac.n.abs().lte(100000) && frac.d.lte(100000)) {
            // Only use .toNumber() when values are safely within Number precision
            const nNum = frac.n.toNumber();
            const dNum = frac.d.toNumber();
            if (Number.isFinite(nNum) && Number.isFinite(dNum)) {
                const recurring = getRecurringStr(dec.toNumber(), nNum, dNum);
                if (recurring) {
                    return {
                        result: recurring,
                        fullResult: recurring,
                        isApprox: false,
                        fraction: `${frac.n.toString()} / ${frac.d.toString()}`
                    };
                } else {
                    const fractionStr = `${frac.n.toString()} / ${frac.d.toString()}`;
                    if (dp <= 6) {
                        const formatted = formatNumbers(decStr);
                        return {
                            result: formatted,
                            fullResult: formatted,
                            isApprox: false,
                            fraction: fractionStr
                        };
                    } else {
                        const approxVal = dec.toFixed(6).replace(/\.?0+$/, '');
                        const approx = formatNumbers(approxVal) + '...';
                        const full = formatNumbers(decStr);
                        return {
                            result: approx,
                            fullResult: full,
                            isApprox: true,
                            fraction: fractionStr
                        };
                    }
                }
            }
        }
    } catch (e) { }

    if (dp <= 6) {
        const formatted = formatNumbers(decStr);
        return { result: formatted, fullResult: formatted, isApprox: false, fraction: "" };
    } else {
        const approxVal = dec.toFixed(6).replace(/\.?0+$/, '');
        const approx = formatNumbers(approxVal) + '...';
        const full = formatNumbers(decStr);
        return {
            result: approx,
            fullResult: full,
            isApprox: true,
            fraction: ""
        };
    }
}

// Regex-based thousand-separator insertion — no char-by-char loop, no GC pressure from string concat.
// The worker never deals with the \uE000 cursor marker used by the UI layer,
// so the full per-character reconstruction logic from main.js is intentionally omitted here.
function formatNumbers(str) {
    return str.replace(/(\d+)(\.\d*)?/g, (_, int, dec) => {
        const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return dec ? formatted + dec : formatted;
    });
}