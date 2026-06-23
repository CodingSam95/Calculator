let currentInput = sessionStorage.getItem('calc_current_input') || "";
let calcHistory = JSON.parse(localStorage.getItem('calc_history') || '[]');
const decimalDisplay = document.getElementById('decimal-out');
const fractionDisplay = document.getElementById('fraction-out');
const exprDisplay = document.getElementById('expr-out');
const livePreviewDisplay = document.getElementById('live-preview');
const equalBtn = document.querySelector('.btn.equal');
let cursorPos = currentInput.length;
let isDraggingCursor = false;

// Unified Decimal configuration
Decimal.set({
    precision: 100000,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -9e15,
    toExpPos: 9e15
});

// Initialize Web Worker for calculation execution
const worker = new Worker('worker.js?v=' + Date.now());
let requestSeq = 0;
let lastCalculatedExpr = "";

worker.onmessage = function (e) {
    const { type, result, fullResult, isApprox, fraction, error, seq } = e.data;
    if (seq !== requestSeq) return; // Ignore stale worker messages

    if (type === 'calculate') {
        if (error) {
            handleCalculateError(error);
        } else {
            handleCalculateSuccess(result, fullResult, isApprox, fraction);
        }
    } else if (type === 'preview') {
        if (error || !result) {
            livePreviewDisplay.classList.remove('shown');
        } else {
            livePreviewDisplay.innerText = result;
            livePreviewDisplay.classList.add('shown');
        }
    }
};

function handleCalculateError(errorMsg) {
    decimalDisplay.classList.add('error-text');
    const msg = errorMsg.toLowerCase();

    if (msg.includes('zero') || msg.includes('dividebyzero')) {
        decimalDisplay.innerText = "Can't divide by 0";
    } else if (errorMsg === "Domain Error") {
        decimalDisplay.innerText = "Domain Error";
    } else if (errorMsg === "Be Real") {
        decimalDisplay.innerText = "Be Real";
    } else if (errorMsg === "Overload") {
        decimalDisplay.innerText = "Overload";
    } else {
        decimalDisplay.innerText = "Error";
    }
    fractionDisplay.innerText = "";
    adjustFontSize();
}

function handleCalculateSuccess(result, fullResult, isApprox, fraction) {
    let resultStr = "";
    if (isApprox) {
        resultStr = `<span class="swipe-reveal" data-full="${fullResult}">${result}</span>`;
    } else {
        resultStr = result;
    }

    // Apply bracket replacement and trigger animation
    decimalDisplay.classList.remove('result-anim');
    void decimalDisplay.offsetWidth; // Trigger reflow
    decimalDisplay.innerHTML = resultStr.replace(/\[(.*?)\]/g, '<span class="overline">$1</span>');
    decimalDisplay.classList.add('result-anim');

    // Accurate Fraction Logic
    if (fraction) {
        fractionDisplay.innerText = fraction;
    } else {
        fractionDisplay.innerText = "";
    }

    // Hide expression history and live preview
    const formattedExpr = formatDisplayExpr(lastCalculatedExpr);
    exprDisplay.innerText = formattedExpr + ' =';
    exprDisplay.classList.add('shown');
    livePreviewDisplay.classList.remove('shown');

    // Push to history log (cap at 50)
    const cleanFull = fullResult.replace(/,/g, '');
    calcHistory.push({
        expr: formattedExpr,
        result: decimalDisplay.innerHTML,
        rawResult: cleanFull
    });
    if (calcHistory.length > 50) calcHistory.shift();
    localStorage.setItem('calc_history', JSON.stringify(calcHistory));

    adjustFontSize();

    setTimeout(() => {
        decimalDisplay.scrollTo({ left: 0, behavior: 'smooth' });
        exprDisplay.scrollTo({ left: exprDisplay.scrollWidth, behavior: 'smooth' });
    }, 0);
}

function append(val) {
    const operators = ['+', '-', '*', '/', '%'];
    const isOperator = operators.includes(val);
    const lastChar = currentInput.slice(-1);
    const secondLastChar = currentInput.length > 1 ? currentInput.slice(-2, -1) : "";

    if (currentInput === "" && isOperator && val !== '-') return;

    if (isOperator && operators.includes(lastChar)) {
        if (val === '-' && lastChar !== '-') {
            // allow negative sign directly after a generic operator
        } else {
            if (operators.includes(secondLastChar)) {
                currentInput = currentInput.slice(0, -2) + val;
                cursorPos = Math.max(0, cursorPos - 2) + val.length;
            } else {
                if (currentInput.length === 1 && val !== '-') return;
                currentInput = currentInput.slice(0, -1) + val;
                cursorPos = Math.max(0, cursorPos - 1) + val.length;
            }
            updateUI(currentInput);
            return;
        }
    }

    if (isOperator && (lastChar === 'C' || lastChar === 'P')) return;

    if (val === '.') {
        const parts = currentInput.split(/[\+\-\*\/\%\(\)]/);
        if (parts.pop().includes('.')) return;
    }

    // Insert at cursor position
    currentInput = currentInput.slice(0, cursorPos) + val + currentInput.slice(cursorPos);
    cursorPos += val.length;
    updateUI(currentInput);
}

function handleParentheses() {
    const openCount = (currentInput.match(/\(/g) || []).length;
    const closeCount = (currentInput.match(/\)/g) || []).length;
    const charBefore = cursorPos > 0 ? currentInput[cursorPos - 1] : "";

    let charToAdd = "(";
    if (openCount > closeCount && (!isNaN(charBefore) || charBefore === ')')) {
        charToAdd = ")";
    }

    currentInput = currentInput.slice(0, cursorPos) + charToAdd + currentInput.slice(cursorPos);
    cursorPos += 1;
    updateUI(currentInput);
}

function clearAll() {
    currentInput = "";
    cursorPos = 0;
    decimalDisplay.classList.remove('error-text');
    updateUI("");
    fractionDisplay.innerText = "";
    exprDisplay.innerText = "";
}

document.getElementById('btn-ce').addEventListener('click', () => {
    backspace();
    if (navigator.vibrate) navigator.vibrate(12);
});

function backspace() {
    if (!currentInput || cursorPos === 0) return;

    const funcs = ['asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'log(', 'ln(', 'nthRoot(', 'sin(', 'cos(', 'tan(', '^2 ', '^3 ', 'pi'];
    const opTokens = ['C', 'P'];
    let deleted = false;

    const partBefore = currentInput.slice(0, cursorPos);
    const partAfter = currentInput.slice(cursorPos);

    for (const f of funcs) {
        if (partBefore.endsWith(f)) {
            currentInput = partBefore.slice(0, -f.length) + partAfter;
            cursorPos -= f.length;
            deleted = true;
            break;
        }
    }

    if (!deleted) {
        for (const t of opTokens) {
            if (partBefore.endsWith(t)) {
                currentInput = partBefore.slice(0, -t.length) + partAfter;
                cursorPos -= t.length;
                deleted = true;
                break;
            }
        }
    }

    if (!deleted) {
        currentInput = partBefore.slice(0, -1) + partAfter;
        cursorPos -= 1;
    }

    updateUI(currentInput);
    if (!currentInput) fractionDisplay.innerText = "";
}

function formatNumbers(str) {
    let result = "";
    let currentNum = "";
    for (let char of str) {
        if (/[0-9\.\uE000]/.test(char)) {
            currentNum += char;
        } else {
            if (currentNum) {
                result += formatSingleNumber(currentNum);
                currentNum = "";
            }
            result += char;
        }
    }
    if (currentNum) {
        result += formatSingleNumber(currentNum);
    }
    return result;
}

function formatSingleNumber(numStr) {
    const parts = numStr.split('.');
    // Handle integer part with potential cursor marker \uE000
    let intPart = parts[0];
    let cleanInt = intPart.replace(/\uE000/g, '');

    // Find where commas should go in the clean version
    let formattedClean = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // If no commas added and no marker, return original
    if (formattedClean === cleanInt && !intPart.includes('\uE000')) {
        return parts.join('.');
    }

    // Map commas back from clean to dirty (with marker)
    let dirtyRes = "";
    let cleanIdx = 0;
    for (let i = 0; i < intPart.length; i++) {
        const char = intPart[i];
        if (char === '\uE000') {
            dirtyRes += char;
        } else {
            // Check if a comma was added BEFORE this character in formattedClean
            // In formattedClean, characters are at cleanIdx + numCommas
            // But it's easier to just reconstruct.
            cleanIdx++;
        }
    }

    // Alternative: Just use a pointer-based reconstruction
    let reconstructed = "";
    let cIdx = 0;
    let fIdx = 0;
    while (fIdx < formattedClean.length) {
        if (formattedClean[fIdx] === ',') {
            reconstructed += ',';
            fIdx++;
        } else {
            // We need to catch up any markers in intPart before the next digit
            while (cIdx < intPart.length && intPart[cIdx] === '\uE000') {
                reconstructed += '\uE000';
                cIdx++;
            }
            reconstructed += formattedClean[fIdx];
            fIdx++;
            cIdx++;
        }
    }
    // Final markers
    while (cIdx < intPart.length) {
        if (intPart[cIdx] === '\uE000') reconstructed += '\uE000';
        cIdx++;
    }

    parts[0] = reconstructed;
    return parts.join('.');
}

function formatDisplayExpr(str) {
    if (!str) return "";
    let expr = formatNumbers(str)
        .replace(/\*/g, '×')
        .replace(/\//g, '÷');
    expr = expr.replace(/sqrt\(/g, '√(');
    expr = expr.replace(/cbrt\(/g, '∛(');
    expr = expr.replace(/nthRoot\(/g, 'ʸ√(');
    expr = expr.replace(/asin\(/g, 'arcsin(');
    expr = expr.replace(/acos\(/g, 'arccos(');
    expr = expr.replace(/atan\(/g, 'arctan(');
    expr = expr.replace(/nCr\(/g, 'nCr(');
    expr = expr.replace(/\^2 /g, '²');
    expr = expr.replace(/\^3 /g, '³');
    expr = expr.replace(/(\d)C(\d)/g, '$1C$2');
    expr = expr.replace(/(\d)P(\d)/g, '$1P$2');
    expr = expr.replace(/(\d)e([+-]?\d)/g, '$1E$2');
    expr = expr.replace(/E/g, 'E'); // Ensure literal E stays E
    expr = expr.replace(/pi/g, 'π');
    expr = expr.replace(/e/g, 'e');
    return expr;
}

let parenFlashTimer;


function updateUI(val) {
    decimalDisplay.classList.remove('error-text');

    // Use a unique single character marker for the cursor
    const marker = "\uE000";
    let strWithMarker = val.slice(0, cursorPos) + marker + val.slice(cursorPos);
    let formatted = formatDisplayExpr(strWithMarker);

    // Replace marker with cursor HTML
    const cursorHtml = `<span class="cursor-container"><span class="cursor"></span><span class="cursor-handle"></span></span>`;
    formatted = formatted.replace(marker, cursorHtml);

    decimalDisplay.classList.remove('result-anim');
    decimalDisplay.innerHTML = formatted || (val === "" ? cursorHtml : "");
    fractionDisplay.innerText = "";
    exprDisplay.classList.remove('shown');
    adjustFontSize();

    // --- Live Preview Logic ---
    const incompleteRegex = /[+\-*/(\.]$|^$|[+\-*/]{2,}/;
    const isSimpleNumber = /^-?\d*\.?\d*$/.test(val.trim());

    if (!val || val === "0" || isSimpleNumber || incompleteRegex.test(val) || (val.match(/\(/g) || []).length !== (val.match(/\)/g) || []).length) {
        livePreviewDisplay.classList.remove('shown');
    } else {
        requestSeq++;
        worker.postMessage({
            type: 'preview',
            expression: val,
            angleMode: angleMode,
            seq: requestSeq
        });
    }

    setTimeout(() => {
        const cursorEl = decimalDisplay.querySelector('.cursor-container');
        if (cursorEl && !isDraggingCursor) {
            cursorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, 0);
    sessionStorage.setItem('calc_current_input', val);
}

function adjustFontSize() {
    const len = decimalDisplay.innerText.length;

    // Error messages should have a consistent, premium large font size
    if (decimalDisplay.classList.contains('error-text')) {
        const txt = decimalDisplay.innerText;
        if (txt === "Be Real") {
            decimalDisplay.style.fontSize = '3rem';
        } else if (txt === "Domain Error") {
            decimalDisplay.style.fontSize = '2.5rem';
        } else {
            decimalDisplay.style.fontSize = 'clamp(1.5rem, 8vw, 2.2rem)';
        }
        const fracLenErr = fractionDisplay.innerText.length;
        fractionDisplay.style.fontSize = fracLenErr < 25 ? '1.15rem' : '0.9rem';
        return;
    }

    if (len < 9) {
        decimalDisplay.style.fontSize = 'clamp(2.5rem, 12vw, 4rem)';
    } else if (len < 13) {
        decimalDisplay.style.fontSize = 'clamp(2rem, 10vw, 3rem)';
    } else if (len < 17) {
        decimalDisplay.style.fontSize = 'clamp(1.5rem, 8vw, 2.2rem)';
    } else {
        decimalDisplay.style.fontSize = 'clamp(1rem, 6vw, 1.5rem)';
    }

    const fracLen = fractionDisplay.innerText.length;
    if (fracLen < 25) {
        fractionDisplay.style.fontSize = '1.15rem';
    } else {
        fractionDisplay.style.fontSize = '0.9rem';
    }
}

function calculate() {
    if (!currentInput) return;

    // "Silent Return" if expression is incomplete (ends in operator, dot, or open bracket)
    const incompleteRegex = /[+\-*/(\.]$|^$/;
    if (incompleteRegex.test(currentInput)) return;

    const openCount = (currentInput.match(/\(/g) || []).length;
    const closeCount = (currentInput.match(/\)/g) || []).length;

    let preparedExpr = currentInput;
    if (openCount > closeCount) {
        preparedExpr += ")".repeat(openCount - closeCount);
    }

    lastCalculatedExpr = preparedExpr;

    requestSeq++;
    worker.postMessage({
        type: 'calculate',
        expression: preparedExpr,
        angleMode: angleMode,
        seq: requestSeq
    });
}

// ── Scientific Mode State ──
let sciMode = sessionStorage.getItem('calc_sci_mode') === 'true';
let angleMode = 'deg'; // 'deg' or 'rad'
let invMode = false;

function toRad(x) { return angleMode === 'deg' ? x * Math.PI / 180 : x; }
function toDeg(x) { return angleMode === 'deg' ? x * 180 / Math.PI : x; }

function sciFunc(fn) {
    const lastChar = currentInput.slice(-1);
    const hasExpr = currentInput.length > 0;

    let toAdd = "";
    let moveCursor = 0;

    switch (fn) {
        case 'sin':
            toAdd = invMode ? 'asin(' : 'sin(';
            moveCursor = toAdd.length;
            break;
        case 'cos':
            toAdd = invMode ? 'acos(' : 'cos(';
            moveCursor = toAdd.length;
            break;
        case 'tan':
            toAdd = invMode ? 'atan(' : 'tan(';
            moveCursor = toAdd.length;
            break;
        case 'log':
            toAdd = invMode ? 'E' : 'log(';
            moveCursor = toAdd.length;
            break;
        case 'ln':
            toAdd = invMode ? 'e^(' : 'ln(';
            moveCursor = toAdd.length;
            break;
        case 'sqrt':
            if (invMode) {
                toAdd = '^2 ';
                moveCursor = 3;
            } else {
                toAdd = 'sqrt(';
                moveCursor = 5;
            }
            break;
        case 'cbrt':
            if (invMode) {
                toAdd = '^3 ';
                moveCursor = 3;
            } else {
                toAdd = 'cbrt(';
                moveCursor = 5;
            }
            break;
        case 'fact':
            if (hasExpr && !isOperatorEnd()) {
                toAdd = '!';
                moveCursor = 1;
            }
            break;
        case 'nCr':
            const l = currentInput.slice(cursorPos - 1, cursorPos);
            if (!isNaN(l) && l !== "" && l !== " ") {
                toAdd = invMode ? 'P' : 'C';
                moveCursor = 1;
            }
            break;
        case 'pow':
            if (hasExpr && !isOperatorEnd()) {
                toAdd = '^';
                moveCursor = 1;
            }
            break;
        case 'pi':
            toAdd = 'pi';
            moveCursor = 2;
            break;
        case 'e':
            toAdd = 'e';
            moveCursor = 1;
            break;
    }

    if (toAdd) {
        currentInput = currentInput.slice(0, cursorPos) + toAdd + currentInput.slice(cursorPos);
        cursorPos += moveCursor;
    }

    updateUI(currentInput);
}

function isOperatorEnd() {
    const c = currentInput.slice(-1);
    return ['+', '-', '*', '/', '^', '(', ''].includes(c);
}

function toggleDegRad() {
    angleMode = angleMode === 'deg' ? 'rad' : 'deg';
    const btn = document.getElementById('btn-deg-rad');
    if (btn) {
        btn.textContent = angleMode;
        btn.classList.toggle('rad-mode', angleMode === 'rad');
    }
    if (navigator.vibrate) navigator.vibrate(20);
}

function updateInvLabels() {
    const btnSin = document.querySelector('button[onclick="sciFunc(\'sin\')"]');
    const btnCos = document.querySelector('button[onclick="sciFunc(\'cos\')"]');
    const btnTan = document.querySelector('button[onclick="sciFunc(\'tan\')"]');
    const btnSqrt = document.querySelector('button[onclick="sciFunc(\'sqrt\')"]');
    const btnCbrt = document.querySelector('.btn-cbrt');
    const btnLog = document.querySelector('button[onclick="sciFunc(\'log\')"]');
    const btnLn = document.querySelector('button[onclick="sciFunc(\'ln\')"]');
    const btnPow = document.querySelector('button[onclick="sciFunc(\'pow\')"]');
    const btnNcr = document.querySelector('button[onclick="sciFunc(\'nCr\')"]');

    if (invMode) {
        if (btnSin) btnSin.textContent = 'sin\u207B\u00B9';
        if (btnCos) btnCos.textContent = 'cos\u207B\u00B9';
        if (btnTan) btnTan.textContent = 'tan\u207B\u00B9';
        if (btnSqrt) btnSqrt.textContent = 'x\u00B2';
        if (btnCbrt) btnCbrt.innerHTML = '<span class="cube-icon">x\u00B3</span>';
        if (btnLog) btnLog.textContent = 'EXP';
        if (btnLn) btnLn.textContent = 'e\u02E3';
        if (btnNcr) btnNcr.textContent = 'nPr';
    } else {
        if (btnSin) btnSin.textContent = 'sin';
        if (btnCos) btnCos.textContent = 'cos';
        if (btnTan) btnTan.textContent = 'tan';
        if (btnSqrt) btnSqrt.textContent = 'sqrt';
        if (btnCbrt) btnCbrt.textContent = 'cbrt';
        if (btnLog) btnLog.textContent = 'log';
        if (btnLn) btnLn.textContent = 'ln';
        if (btnNcr) btnNcr.textContent = 'nCr';
    }
}

function toggleInv() {
    invMode = !invMode;
    const btn = document.querySelector('.btn.sci.inv');
    if (btn) btn.classList.toggle('active', invMode);
    updateInvLabels();
    if (navigator.vibrate) navigator.vibrate(15);
}

let isAnimatingMode = false;
let sciAnimTimeout = null;

// ── Dynamic Button Setup (haptic + tap + proximity) ──
// Must be callable any time buttons are shown/hidden
function setupBtnListeners() {
    const allBtns = Array.from(document.querySelectorAll('.btn'));
    const visibleBtns = allBtns.filter(b => b.offsetParent !== null || b.closest('.sci-rows'));
    // For proximity — only visible ones count
    const activeBtns = allBtns.filter(b => getComputedStyle(b).display !== 'none');
    const cols = sciMode ? 5 : 4;

    activeBtns.forEach((btn, index) => {
        // Remove old listeners by cloning
        if (btn._sciSetup) return;
        btn._sciSetup = true;

        // Haptic
        btn.addEventListener('click', () => { if (navigator.vibrate) navigator.vibrate(45); });

        // Tap glow
        let tapTimeout;
        const addTap = () => {
            btn.style.transition = 'none';
            btn.classList.add('tapped');
            clearTimeout(tapTimeout);
            tapTimeout = setTimeout(() => {
                btn.style.transition = '';
                btn.classList.remove('tapped');
            }, 100);
        };
        const removeTap = () => {
            btn.style.transition = '';
            btn.classList.remove('tapped');
        };
        btn.addEventListener('touchstart', addTap, { passive: true });
        btn.addEventListener('mousedown', addTap);
        btn.addEventListener('touchend', removeTap, { passive: true });
        btn.addEventListener('mouseup', removeTap);
        btn.addEventListener('mouseleave', removeTap);
        btn.addEventListener('touchcancel', removeTap, { passive: true });
    });

    // Proximity lighting — always recalculated fresh
    activeBtns.forEach((btn, index) => {
        const startLight = () => {
            if (isAnimatingMode) return;
            const row = Math.floor(index / cols);
            const col = index % cols;
            const color = getComputedStyle(btn).getPropertyValue('--glow-color').trim() || 'rgba(255, 255, 255, 0.3)';

            activeBtns.forEach((other, otherIdx) => {
                if (other === btn) {
                    other.style.transition = 'none';
                    if (btn.classList.contains('ac') || btn.classList.contains('equal')) {
                        other.style.setProperty('--prox-glow', `inset 0 0 15px 0px ${color}, inset 0 0 0 transparent`);
                    } else {
                        other.style.setProperty('--prox-glow', `inset 0 0 60px 20px ${color}, inset 0 0 15px 0px ${color}`);
                    }
                    return;
                }
                const oRow = Math.floor(otherIdx / cols);
                const oCol = otherIdx % cols;
                const dx = oCol - col;
                const dy = oRow - row;
                if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                    const iX = (dx !== 0 && dy !== 0) ? dx * 2 : dx * 4;
                    const iY = (dx !== 0 && dy !== 0) ? dy * 2 : dy * 4;
                    other.style.transition = 'none';
                    other.style.setProperty('--prox-glow', `inset ${iX}px ${iY}px 5px 0px ${color}, inset 0 0 0 transparent`);
                }
            });
        };
        const stopLight = () => {
            if (isAnimatingMode) return;
            activeBtns.forEach(other => {
                other.style.transition = '';
                other.style.setProperty('--prox-glow', 'inset 0 0 0 transparent, inset 0 0 0 transparent');
            });
        };
        btn.removeEventListener('touchstart', btn._startLight);
        btn.removeEventListener('mousedown', btn._startLight);
        btn.removeEventListener('touchend', btn._stopLight);
        btn.removeEventListener('mouseup', btn._stopLight);
        btn.removeEventListener('mouseleave', btn._stopLight);
        btn.removeEventListener('touchcancel', btn._stopLight);
        btn._startLight = startLight;
        btn._stopLight = stopLight;
        btn.addEventListener('touchstart', startLight, { passive: true });
        btn.addEventListener('mousedown', startLight);
        btn.addEventListener('touchend', stopLight, { passive: true });
        btn.addEventListener('mouseup', stopLight);
        btn.addEventListener('mouseleave', stopLight);
        btn.addEventListener('touchcancel', stopLight, { passive: true });
    });
}

// Initial setup
setupBtnListeners();

// Display interaction (Long press to copy)
const displayContainer = document.querySelector('.display');
let touchTimer;

displayContainer.addEventListener('touchstart', () => {
    touchTimer = setTimeout(() => {
        if (navigator.clipboard) {
            const cleanText = decimalDisplay.innerText.replace(/,/g, '');
            navigator.clipboard.writeText(cleanText).then(() => {
                if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
                decimalDisplay.style.color = '#4cd964';
                setTimeout(() => decimalDisplay.style.color = '', 300);
            }).catch(() => { });
        }
    }, 600);
}, { passive: true });

displayContainer.addEventListener('touchend', () => {
    clearTimeout(touchTimer);
}, { passive: true });

displayContainer.addEventListener('touchmove', () => {
    clearTimeout(touchTimer);
}, { passive: true });

// CE Hold-to-AC functionality
const btnCE = document.getElementById('btn-ce');
if (btnCE) {
    let ceFired = false;
    let ceDurTimer;

    const startCE = (e) => {
        e.preventDefault();
        ceFired = false;
        if (navigator.vibrate) navigator.vibrate(15);

        ceDurTimer = setTimeout(() => {
            clearAll();
            if (navigator.vibrate) navigator.vibrate([50, 40, 50, 40, 120]);
            ceFired = true;
        }, 500);
    };

    const endCE = (e) => {
        e.preventDefault();
        clearTimeout(ceDurTimer);
        if (!ceFired) {
            backspace();
        }
    };

    btnCE.addEventListener('touchstart', startCE, { passive: false });
    btnCE.addEventListener('touchend', endCE, { passive: false });
    btnCE.addEventListener('touchcancel', () => clearTimeout(ceDurTimer));

    btnCE.addEventListener('mousedown', startCE);
    btnCE.addEventListener('mouseup', endCE);
    btnCE.addEventListener('mouseleave', () => clearTimeout(ceDurTimer));
}

// ── Liquid Glass Switcher: Mode Toggle Integration ──
function activateSciMode(enable) {
    if (sciMode === enable) return;

    const allBtns = Array.from(document.querySelectorAll('.btn'));
    const grid = document.querySelector('.grid');
    const displayElement = document.querySelector('.display');

    if (sciAnimTimeout) {
        clearTimeout(sciAnimTimeout);
        sciAnimTimeout = null;
    }

    // 1. Suspend Proximity Light & Freeze Hover States
    isAnimatingMode = true;
    allBtns.forEach(btn => {
        btn.style.setProperty('--prox-glow', 'inset 0 0 0 transparent, inset 0 0 0 transparent');
        // Prevent mid-flight CSS transitions from polluting layout math
        btn.style.transition = 'none';
    });

    // 2. FLIP First: Capture mid-air geometry if interrupting an animation
    const firstRects = new Map();
    allBtns.forEach(btn => {
        if (btn.offsetWidth > 0 || getComputedStyle(btn).display !== 'none') {
            firstRects.set(btn, btn.getBoundingClientRect());
        }
    });

    // 3. Purge inline styles to expose true CSS layout rules for calculation
    grid.style.transition = 'none';
    displayElement.style.transition = 'none';
    allBtns.forEach(btn => {
        btn.style.transform = '';
        btn.style.opacity = '';
        btn.style.filter = '';
        btn.style.transformOrigin = '';
    });
    document.querySelectorAll('.ghost-clone').forEach(c => c.remove());

    // 4. Toggle Mode Data
    sciMode = enable;
    document.body.classList.toggle('sci-mode', sciMode);
    sessionStorage.setItem('calc_sci_mode', sciMode);
    if (navigator.vibrate) navigator.vibrate(enable ? [20, 10, 20] : 15);

    // 4. Force reflow to calculate new grid boundaries
    void document.body.offsetHeight;

    // 5. FLIP Last
    const lastRects = new Map();
    allBtns.forEach(btn => {
        if (btn.offsetWidth > 0 || getComputedStyle(btn).display !== 'none') {
            lastRects.set(btn, btn.getBoundingClientRect());
        }
    });

    // 6. Execute "Physical Camera" Transition
    const duration = 650;
    const easing = "cubic-bezier(0.2, 0.9, 0.2, 1)"; // Weighted, pulling back depth feel

    // Define geometric target point for the radial collapse / explode
    const sinBtn = document.querySelector('.btn.sci');
    const acBtn = document.querySelector('.btn.action.ac');
    const originRect = enable ? lastRects.get(sinBtn) : lastRects.get(acBtn);

    displayElement.style.transition = `width ${duration}ms ${easing}`;
    grid.style.transition = `gap ${duration}ms ${easing}`;

    const flipData = [];

    allBtns.forEach((btn, index) => {
        const first = firstRects.get(btn);
        const last = lastRects.get(btn);

        if (first && last) {
            // Button is common to both modes — scale and translate its position seamlessly
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            const dw = first.width / last.width;
            const dh = first.height / last.height;

            btn.style.transformOrigin = 'center center';
            btn.style.willChange = 'transform, width, font-size';
            btn.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${dw}, ${dh})`;
            btn.style.transition = 'none';

            flipData.push({ btn, mode: 'move' });
        } else if (!first && last) {
            // ENTERING: Sci buttons appearing (Emerge/Zoom Out from Top-Left)
            btn.style.transformOrigin = 'center center';

            // Calculate distance backwards to the origin singularity
            const dx = originRect ? (originRect.left - last.left) : -50;
            const dy = originRect ? (originRect.top - last.top) : -50;

            btn.style.willChange = 'transform, opacity, filter';
            // Start completely collapsed at the origin point (0.01 prevents zero-inversion math artifacts)
            btn.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.01)`;
            btn.style.opacity = '0';
            btn.style.filter = 'blur(2px)';
            btn.style.transition = 'none';

            flipData.push({ btn, mode: 'enter', index });
        } else if (first && !last) {
            // LEAVING: Sci buttons disappearing (Collapse towards Top-Left)
            const clone = btn.cloneNode(true);
            clone.classList.add('ghost-clone'); // tag for rapid switch cleanup
            document.body.appendChild(clone);
            clone.style.setProperty('display', 'flex', 'important');
            clone.style.position = 'fixed';
            clone.style.left = `${first.left}px`;
            clone.style.top = `${first.top}px`;
            clone.style.width = `${first.width}px`;
            clone.style.height = `${first.height}px`;
            clone.style.margin = '0';
            clone.style.opacity = '1';
            clone.style.filter = 'blur(0)';
            clone.style.zIndex = '99';
            clone.style.willChange = 'transform, opacity, filter';

            // Calculate vector towards the upper left geometrical sinkhole
            const dx = originRect ? (originRect.left - first.left) : -50;
            const dy = originRect ? (originRect.top - first.top) : -50;

            flipData.push({ btn: clone, mode: 'leave', dx, dy, index });
        }
    });

    // Execute bulk animation in a single, perfectly synchronized hardware-accelerated pass
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            flipData.forEach(({ btn, mode, dx, dy, index }) => {
                if (mode === 'move') {
                    btn.style.transition = `transform ${duration}ms ${easing}, width ${duration}ms ${easing}, font-size ${duration}ms ${easing}`;
                    btn.style.transform = '';
                } else if (mode === 'enter') {
                    const stagger = (index % 15) * 3;
                    btn.style.transition = `transform ${duration}ms ${easing} ${stagger}ms, opacity ${duration}ms ${easing} ${stagger}ms, filter ${duration}ms ease ${stagger}ms`;
                    btn.style.transform = '';
                    btn.style.opacity = '1';
                    btn.style.filter = 'blur(0)';
                } else if (mode === 'leave') {
                    const exitDuration = duration * 0.95;
                    const stagger = (index % 15) * 2;
                    btn.style.transition = `transform ${exitDuration}ms ${easing} ${stagger}ms, opacity ${exitDuration}ms ease ${stagger}ms, filter ${exitDuration}ms ease ${stagger}ms`;
                    btn.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.01)`;
                    btn.style.opacity = '0';
                    btn.style.filter = 'blur(2px)';

                    setTimeout(() => {
                        if (document.body.contains(btn)) btn.remove();
                    }, exitDuration + 100);
                }
            });
        });
    });

    // 7. Cleanup & Re-engage Proximity Tracker
    sciAnimTimeout = setTimeout(() => {
        isAnimatingMode = false;
        sciAnimTimeout = null;
        grid.style.transition = '';
        displayElement.style.transition = '';

        allBtns.forEach(btn => {
            btn.style.transform = '';
            btn.style.transition = '';
            btn.style.opacity = '';
            btn.style.filter = '';
            btn.style.transformOrigin = '';
        });

        // Wipe old listeners cleanly off the newly active layout constraints, and re-bind
        document.querySelectorAll('.btn').forEach(b => {
            if (b._startLight) {
                b.removeEventListener('touchstart', b._startLight);
                b.removeEventListener('mousedown', b._startLight);
                b.removeEventListener('touchend', b._stopLight);
                b.removeEventListener('mouseup', b._stopLight);
                b.removeEventListener('mouseleave', b._stopLight);
                b.removeEventListener('touchcancel', b._stopLight);
                delete b._startLight;
                delete b._stopLight;
                delete b._sciSetup;
            }
        });
        setupBtnListeners();
    }, duration + 100);
}

// ── Hamburger Menu & Mode Selection ──
const btnMenu = document.getElementById('btn-menu');
const modePanel = document.getElementById('mode-panel');
const btnHistory = document.getElementById('btn-history');
const historyPanel = document.getElementById('history-panel');
const btnConstants = document.getElementById('btn-constants');
const constantsPanel = document.getElementById('constants-panel');

function updateFeaturesForMode(mode) {
    if (mode === 'scientific') {
        btnConstants.classList.remove('hidden-element');
        btnConstants.removeAttribute('disabled');
    } else {
        btnConstants.classList.add('hidden-element');
        btnConstants.setAttribute('disabled', 'true');
        closeConstants();
    }

    if (mode === 'standard' || mode === 'scientific') {
        btnHistory.classList.remove('hidden-element');
        btnHistory.removeAttribute('disabled');
        historyPanel.classList.remove('hidden-element');
    } else {
        btnHistory.classList.add('hidden-element');
        btnHistory.setAttribute('disabled', 'true');
        historyPanel.classList.add('hidden-element');
        closeHistory();
    }
}

function closeMenu() {
    modePanel.classList.remove('open');
    btnMenu.classList.remove('active');
}

btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !modePanel.classList.contains('open');
    if (opening) {
        closeHistory();
        closeConstants();
    }
    modePanel.classList.toggle('open', opening);
    btnMenu.classList.toggle('active', opening);
});

window.selectMode = function (mode) {
    // Update active highlight
    document.querySelectorAll('.mode-row').forEach(row => {
        row.classList.toggle('active', row.dataset.mode === mode);
    });

    const datePanel = document.getElementById('date-calc-panel');
    const calcDisplay = document.querySelector('.display');
    const mainGrid = document.getElementById('main-grid');
    const dateModeLabel = document.getElementById('date-mode-label');

    if (mode === 'date') {
        if (calcDisplay) calcDisplay.style.display = 'none';
        if (mainGrid) mainGrid.style.display = 'none';
        if (datePanel) datePanel.style.display = 'flex';
        if (dateModeLabel) dateModeLabel.style.display = 'inline';
        initDateCalc();
    } else {
        if (calcDisplay) calcDisplay.style.display = '';
        if (mainGrid) mainGrid.style.display = '';
        if (datePanel) datePanel.style.display = 'none';
        if (dateModeLabel) dateModeLabel.style.display = 'none';
    }

    // Only standard / scientific drive the calculator grid for now
    if (mode === 'scientific') {
        activateSciMode(true);
    } else {
        // All other modes fall back to standard layout
        activateSciMode(false);
    }

    updateFeaturesForMode(mode);

    // Inactivate INV mode when switcher changes modes
    if (invMode) {
        invMode = false;
        const btnInv = document.querySelector('.btn.sci.inv');
        if (btnInv) btnInv.classList.remove('active');
        updateInvLabels();
    }

    sessionStorage.setItem('calc_mode', mode);
    closeMenu();
    if (navigator.vibrate) navigator.vibrate(15);
};

// ── Initialize App State from Storage ──
const savedMode = sessionStorage.getItem('calc_mode') || (sciMode ? 'scientific' : 'standard');
if (savedMode) {
    document.querySelectorAll('.mode-row').forEach(row => {
        row.classList.toggle('active', row.dataset.mode === savedMode);
    });
}
if (sciMode) {
    document.body.classList.add('sci-mode');
}

updateFeaturesForMode(savedMode);

if (currentInput) {
    updateUI(currentInput);
}

// ── History Panel ──
const btnClearHistory = document.getElementById('btn-clear-history');
const historyList = document.getElementById('history-list');

function renderHistory() {
    if (calcHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
        return;
    }
    historyList.innerHTML = calcHistory
        .slice()
        .reverse()
        .map(entry => `
            <div class="history-item">
                <div class="history-expr" onclick="injectHistory('${entry.rawResult || entry.result}')">${entry.expr} =</div>
                <div class="history-result" onclick="injectHistory('${entry.rawResult || entry.result}')">${entry.result}</div>
            </div>`)
        .join('');
}

function closeHistory() {
    historyPanel.classList.remove('open');
    btnHistory.classList.remove('active');
}

btnHistory.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !historyPanel.classList.contains('open');
    if (opening) {
        renderHistory();
        closeConstants();
        closeMenu();
    }
    historyPanel.classList.toggle('open', opening);
    btnHistory.classList.toggle('active', opening);
});

// ── Scientific Constants ──

function closeConstants() {
    constantsPanel.classList.remove('open');
    btnConstants.classList.remove('active');
}

btnConstants.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !constantsPanel.classList.contains('open');
    if (opening) {
        closeHistory();
        closeMenu();
    }
    constantsPanel.classList.toggle('open', opening);
    btnConstants.classList.toggle('active', opening);
});

window.injectConstant = function (val, sym) {
    if (val === 'undefined' || val === 'null' || !val) return;

    const charBefore = cursorPos > 0 ? currentInput[cursorPos - 1] : "";
    const operators = ['+', '-', '*', '/', '(', '^'];

    let toAdd = val;
    if (currentInput && !operators.includes(charBefore)) {
        toAdd = '*' + val;
    }

    currentInput = currentInput.slice(0, cursorPos) + toAdd + currentInput.slice(cursorPos);
    cursorPos += toAdd.length;

    updateUI(currentInput);
    closeConstants();
    if (navigator.vibrate) navigator.vibrate(15);
};

btnClearHistory.addEventListener('click', (e) => {
    e.stopPropagation();
    calcHistory = [];
    localStorage.removeItem('calc_history');
    renderHistory();
});

// Close on any tap outside panels
document.addEventListener('click', (e) => {
    if (!historyPanel.contains(e.target) && !e.target.closest('#btn-history')) {
        closeHistory();
    }
    if (constantsPanel && !constantsPanel.contains(e.target) && !e.target.closest('#btn-constants')) {
        closeConstants();
    }
    if (modePanel && !modePanel.contains(e.target) && !e.target.closest('#btn-menu')) {
        closeMenu();
    }
});

document.addEventListener('touchstart', (e) => {
    if (!historyPanel.contains(e.target) && !e.target.closest('#btn-history')) {
        closeHistory();
    }
    if (constantsPanel && !constantsPanel.contains(e.target) && !e.target.closest('#btn-constants')) {
        closeConstants();
    }
    if (modePanel && !modePanel.contains(e.target) && !e.target.closest('#btn-menu')) {
        closeMenu();
    }
}, { passive: true });

// --- History Injection ---
window.injectHistory = function (val, entryIdx) {
    if (val === 'undefined' || val === 'null' || !val) return;

    // Pulse animation on the display
    decimalDisplay.classList.remove('pulse-inject');
    void decimalDisplay.offsetWidth; // Trigger reflow
    decimalDisplay.classList.add('pulse-inject');

    // Auto-replace or insert at cursor
    const charBefore = cursorPos > 0 ? currentInput[cursorPos - 1] : "";
    if (!currentInput || ['+', '-', '*', '/'].includes(charBefore)) {
        currentInput = currentInput.slice(0, cursorPos) + val + currentInput.slice(cursorPos);
        cursorPos += val.length;
    } else {
        currentInput = val;
        cursorPos = val.length;
    }

    updateUI(currentInput);
    closeHistory();
    if (navigator.vibrate) navigator.vibrate(25);
};

// --- Swipe Reveal Handlers ---
function expandSwipeReveal(el) {
    const full = el.getAttribute('data-full');
    if (full) {
        const parent = el.parentElement;
        parent.innerHTML = full.replace(/\[(.*?)\]/g, '<span class="overline">$1</span>');
        if (navigator.vibrate) navigator.vibrate(10);
    }
}

document.addEventListener('touchmove', (e) => {
    const target = e.target.closest('.swipe-reveal');
    if (target) expandSwipeReveal(target);
}, { passive: true });

document.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > 0) {
        const target = e.target.closest('.swipe-reveal');
        if (target) expandSwipeReveal(target);
    }
}, { passive: true });

document.addEventListener('click', (e) => {
    const target = e.target.closest('.swipe-reveal');
    if (target) expandSwipeReveal(target);
});

// --- Hardware Keyboard Support ---
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const key = e.key;

    if (/[0-9\.\%]/.test(key) || ['+', '-', '*', '/'].includes(key)) {
        e.preventDefault();
        append(key);
    } else if (key === '(' || key === ')') {
        e.preventDefault();
        append(key);
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
        const eqBtn = document.querySelector('.btn.equal');
        if (eqBtn) {
            eqBtn.classList.add('tapped');
            setTimeout(() => eqBtn.classList.remove('tapped'), 100);
        }
    } else if (key === 'Backspace') {
        e.preventDefault();
        backspace();
    } else if (key === 'Escape') {
        e.preventDefault();
        clearAll();
        const acBtn = document.querySelector('.btn.ac');
        if (acBtn) {
            acBtn.classList.add('tapped');
            setTimeout(() => acBtn.classList.remove('tapped'), 100);
        }
    }
});

// --- Cursor Interaction Logic ---

function getCursorPosFromEvent(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    // Create a temporary version of the display with each character wrapped in a span
    // to measure their positions.
    const tempContainer = document.createElement('div');
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.position = 'absolute';
    tempContainer.style.whiteSpace = 'nowrap';
    tempContainer.style.display = 'flex';
    tempContainer.style.justifyContent = 'flex-end';
    tempContainer.style.alignItems = 'flex-end';
    tempContainer.style.font = getComputedStyle(decimalDisplay).font;
    tempContainer.style.padding = getComputedStyle(decimalDisplay).padding;
    tempContainer.style.width = decimalDisplay.offsetWidth + 'px';
    tempContainer.style.height = decimalDisplay.offsetHeight + 'px';
    tempContainer.style.boxSizing = 'border-box';
    document.body.appendChild(tempContainer);

    // We need to map raw currentInput characters to their visual positions
    let bestIdx = 0;
    let minDist = Infinity;

    // We'll iterate through all possible cursor positions in the raw string
    for (let i = 0; i <= currentInput.length; i++) {
        const marker = "\uE000";
        const testStr = currentInput.slice(0, i) + marker + currentInput.slice(i);
        const formatted = formatDisplayExpr(testStr);

        tempContainer.innerHTML = formatted.replace(marker, '<span id="cursor-target"></span>');
        const target = tempContainer.querySelector('#cursor-target');
        if (target) {
            const rect = target.getBoundingClientRect();
            const displayRect = decimalDisplay.getBoundingClientRect();

            // Map the relative X in the temp container to the screen X, accounting for current scroll
            const targetX = displayRect.left + (rect.left - tempContainer.getBoundingClientRect().left) - decimalDisplay.scrollLeft;
            const dist = Math.abs(x - targetX);
            if (dist < minDist) {
                minDist = dist;
                bestIdx = i;
            }
        }
    }

    document.body.removeChild(tempContainer);
    return snapCursorToBoundaries(bestIdx);
}

function snapCursorToBoundaries(pos) {
    if (!currentInput) return 0;
    const funcs = ['asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'log(', 'ln(', 'nthRoot(', 'sin(', 'cos(', 'tan(', '^2 ', '^3 '];

    // Check if pos is inside any function string
    for (const f of funcs) {
        let start = 0;
        while ((start = currentInput.indexOf(f, start)) !== -1) {
            const end = start + f.length;
            if (pos > start && pos < end) {
                // Inside! Snap to nearest boundary
                return (pos - start < end - pos) ? start : end;
            }
            start = end;
        }
    }

    // Check for 'pi'
    let piStart = 0;
    while ((piStart = currentInput.indexOf('pi', piStart)) !== -1) {
        const piEnd = piStart + 2;
        if (pos > piStart && pos < piEnd) {
            return (pos - piStart < piEnd - pos) ? piStart : piEnd;
        }
        piStart = piEnd;
    }

    return pos;
}

decimalDisplay.addEventListener('mousedown', (e) => {
    if (e.target.closest('.cursor-handle')) {
        isDraggingCursor = true;
        return;
    }
    cursorPos = getCursorPosFromEvent(e);
    updateUI(currentInput);
});

decimalDisplay.addEventListener('touchstart', (e) => {
    if (e.target.closest('.cursor-handle')) {
        isDraggingCursor = true;
        return;
    }
    // Only update pos on tap if not dragging
    cursorPos = getCursorPosFromEvent(e);
    updateUI(currentInput);
}, { passive: false });

window.addEventListener('mousemove', (e) => {
    if (!isDraggingCursor) return;
    cursorPos = getCursorPosFromEvent(e);
    updateUI(currentInput);
});

window.addEventListener('touchmove', (e) => {
    if (!isDraggingCursor) return;
    e.preventDefault();
    cursorPos = getCursorPosFromEvent(e);
    updateUI(currentInput);
}, { passive: false });

window.addEventListener('mouseup', () => {
    isDraggingCursor = false;
});

window.addEventListener('touchend', () => {
    isDraggingCursor = false;
});

// ── Date Calculator Logic ──
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

let today = new Date(); today.setHours(0, 0, 0, 0);
let fromDate = new Date(today);
let toDate = new Date(today); toDate.setDate(today.getDate() + 1);
let baseDate = new Date(today);
let calTarget = 'from', calView = 'day', calYear = today.getFullYear(), calMonth = today.getMonth();
let dateSubMode = 'diff';

function fmt(d) {
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

function initDateCalc() {
    buildSelects();
    updateDiff();
    updateAdd();
}

function selectModeDiffSub(m) {
    dateSubMode = m;
    const currentModeText = document.getElementById('currentModeText');
    const optDiff = document.getElementById('optDiff');
    const optAdd = document.getElementById('optAdd');

    if (m === 'diff') {
        if (currentModeText) currentModeText.textContent = 'Difference between dates';
        if (optDiff) optDiff.classList.add('active');
        if (optAdd) optAdd.classList.remove('active');
    } else {
        if (currentModeText) currentModeText.textContent = 'Add or subtract days';
        if (optAdd) optAdd.classList.add('active');
        if (optDiff) optDiff.classList.remove('active');
    }

    document.getElementById('panelDiff').style.display = m === 'diff' ? '' : 'none';
    document.getElementById('panelAdd').style.display = m === 'add' ? '' : 'none';
    closeAllDropdowns();
}

function toggleModeDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('modeSelectorMenu');
    const icon = document.querySelector('.mode-selector-icon');
    const isShow = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isShow) {
        menu.classList.add('show');
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
}

function closeAllDropdowns() {
    const menu = document.getElementById('modeSelectorMenu');
    if (menu) menu.classList.remove('show');
    const icon = document.querySelector('.mode-selector-icon');
    if (icon) icon.style.transform = 'rotate(0deg)';
}

function updateDiff() {
    document.getElementById('fromDisplay').textContent = fmt(fromDate);
    document.getElementById('toDisplay').textContent = fmt(toDate);
    let ms = toDate - fromDate;
    let sign = ms < 0 ? -1 : 1;
    ms = Math.abs(ms);
    let totalDays = Math.round(ms / 86400000);
    let d1 = new Date(Math.min(fromDate, toDate));
    let d2 = new Date(Math.max(fromDate, toDate));
    let yrs = d2.getFullYear() - d1.getFullYear();
    let mos = d2.getMonth() - d1.getMonth();
    let dys = d2.getDate() - d1.getDate();
    if (dys < 0) { mos--; let prev = new Date(d2.getFullYear(), d2.getMonth(), 0); dys += prev.getDate(); }
    if (mos < 0) { yrs--; mos += 12; }
    let parts = [];
    if (yrs > 0) parts.push(yrs + (yrs === 1 ? ' year' : ' years'));
    if (mos > 0) parts.push(mos + (mos === 1 ? ' month' : ' months'));
    if (dys > 0) parts.push(dys + (dys === 1 ? ' day' : ' days'));
    if (parts.length === 0) parts = ['0 days'];
    let main = totalDays === 1 ? '1 day' : totalDays + ' days';
    if (totalDays === 0) {
        document.getElementById('diffResult').textContent = 'Same dates';
    } else {
        document.getElementById('diffResult').textContent = (sign < 0 ? '-' : '') + main;
    }
    document.getElementById('diffSub').textContent = parts.join(', ');
}

function updateAdd() {
    document.getElementById('baseDisplay').textContent = fmt(baseDate);
    calcAdd();
}

function calcAdd() {
    let op = document.querySelector('input[name=op]:checked').value;
    let y = +document.getElementById('selY').value;
    let m = +document.getElementById('selM').value;
    let d = +document.getElementById('selD').value;
    let r = new Date(baseDate);
    let dir = op === 'add' ? 1 : -1;
    r.setFullYear(r.getFullYear() + dir * y);
    r.setMonth(r.getMonth() + dir * m);
    r.setDate(r.getDate() + dir * d);
    document.getElementById('addResult').textContent = fmt(r);
}

function buildSelects() {
    let sy = document.getElementById('selY');
    let sm = document.getElementById('selM');
    let sd = document.getElementById('selD');
    if (!sy || !sm || !sd) return;
    sy.innerHTML = '';
    sm.innerHTML = '';
    sd.innerHTML = '';

    // Clear custom select dropdown contents
    let dy = document.getElementById('dropdownY');
    let dm = document.getElementById('dropdownM');
    let dd = document.getElementById('dropdownD');
    if (dy) dy.innerHTML = '';
    if (dm) dm.innerHTML = '';
    if (dd) dd.innerHTML = '';

    for (let i = 0; i <= 999; i++) {
        let o = document.createElement('option');
        o.value = i;
        o.textContent = i;
        sy.appendChild(o.cloneNode(true));
        sm.appendChild(o.cloneNode(true));
        sd.appendChild(o.cloneNode(true));

        // Create and append custom option nodes
        if (dy) {
            let optY = document.createElement('div');
            optY.className = 'custom-option' + (i === 0 ? ' selected' : '');
            optY.dataset.value = i;
            optY.textContent = i;
            optY.onclick = (e) => selectCustomOption(e, 'Y', i);
            dy.appendChild(optY);
        }
        if (dm) {
            let optM = document.createElement('div');
            optM.className = 'custom-option' + (i === 0 ? ' selected' : '');
            optM.dataset.value = i;
            optM.textContent = i;
            optM.onclick = (e) => selectCustomOption(e, 'M', i);
            dm.appendChild(optM);
        }
        if (dd) {
            let optD = document.createElement('div');
            optD.className = 'custom-option' + (i === 0 ? ' selected' : '');
            optD.dataset.value = i;
            optD.textContent = i;
            optD.onclick = (e) => selectCustomOption(e, 'D', i);
            dd.appendChild(optD);
        }
    }
}

window.toggleCustomSelect = function (event, type) {
    event.stopPropagation();
    let currentShowState = false;
    let dropdown = document.getElementById('dropdown' + type);
    if (dropdown) {
        currentShowState = dropdown.classList.contains('show');
    }
    
    // Close other dropdowns
    closeCustomDropdowns();

    if (dropdown && !currentShowState) {
        dropdown.classList.add('show');
        // Scroll target option into view
        let sel = dropdown.querySelector('.custom-option.selected');
        if (sel) {
            dropdown.scrollTop = sel.offsetTop - dropdown.clientHeight / 2 + sel.clientHeight / 2;
        }
    }
};

window.selectCustomOption = function (event, type, val) {
    event.stopPropagation();
    let nativeSelect = document.getElementById('sel' + type);
    if (nativeSelect) {
        nativeSelect.value = val;
        // Trigger calc
        calcAdd();
    }

    // Sync trigger display element
    let customSelect = document.getElementById('customSel' + type);
    if (customSelect) {
        let trigger = customSelect.querySelector('.custom-select-trigger');
        if (trigger) trigger.textContent = val;

        // Toggle selected styling
        customSelect.querySelectorAll('.custom-option').forEach(opt => {
            opt.classList.toggle('selected', +opt.dataset.value === val);
        });
    }

    closeCustomDropdowns();
};

window.closeCustomDropdowns = function () {
    document.querySelectorAll('.custom-select-dropdown').forEach(d => {
        d.classList.remove('show');
    });
};

let isScrollingCal = false;
let lastVisibleMonth = null;
let lastVisibleYear = null;
let lastDecadeStart = null;

function handleCalScroll() {
    if (isScrollingCal) return;
    const container = document.getElementById('calMonthsScroll');
    if (!container) return;

    const h = 220; // Height of one month
    const scrollTop = container.scrollTop;

    if (scrollTop <= h * 0.3) {
        isScrollingCal = true;
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }

        if (calYear < 1600) {
            calYear = 1600;
            calMonth = 0;
            renderCal();
            container.scrollTop = 0;
            isScrollingCal = false;
            return;
        }

        renderCal();
        const newContainer = document.getElementById('calMonthsScroll');
        if (newContainer) {
            newContainer.scrollTop = scrollTop + h;
        }
        setTimeout(() => { isScrollingCal = false; }, 100);
    } else if (scrollTop >= h * 1.7) {
        isScrollingCal = true;
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }

        if (calYear > 2599) {
            calYear = 2599;
            calMonth = 11;
            renderCal();
            container.scrollTop = h * 2;
            isScrollingCal = false;
            return;
        }

        renderCal();
        const newContainer = document.getElementById('calMonthsScroll');
        if (newContainer) {
            newContainer.scrollTop = scrollTop - h;
        }
        setTimeout(() => { isScrollingCal = false; }, 100);
    } else {
        let visibleMonth = calMonth;
        let visibleYear = calYear;
        if (scrollTop < h * 0.5) {
            visibleMonth = calMonth - 1;
            if (visibleMonth < 0) { visibleMonth = 11; visibleYear--; }
        } else if (scrollTop > h * 1.5) {
            visibleMonth = calMonth + 1;
            if (visibleMonth > 11) { visibleMonth = 0; visibleYear++; }
        }

        if (visibleMonth !== lastVisibleMonth || visibleYear !== lastVisibleYear) {
            lastVisibleMonth = visibleMonth;
            lastVisibleYear = visibleYear;
            const titleEl = document.getElementById('calTitle');
            if (titleEl) {
                titleEl.textContent = MONTHS[visibleMonth] + ', ' + visibleYear;
            }
        }
    }
}

function handleYearScroll() {
    const container = document.getElementById('calYearsScroll');
    if (!container) return;
    const scrollTop = container.scrollTop;
    const r = Math.round((scrollTop + 71) / 62);
    const year = Math.max(1600, Math.min(2599, 1600 + r * 4));
    const decadeStart = Math.floor(year / 10) * 10;

    if (decadeStart !== lastDecadeStart) {
        lastDecadeStart = decadeStart;
        const titleEl = document.getElementById('calTitle');
        if (titleEl) {
            titleEl.textContent = decadeStart + ' - ' + (decadeStart + 9);
        }
    }
}

function getMonthDaysHTML(year, month, ref) {
    let first = new Date(year, month, 1).getDay();
    let daysInMonth = new Date(year, month + 1, 0).getDate();
    let daysInPrev = new Date(year, month, 0).getDate();

    let html = '<div class="cal-days-grid">';
    for (let i = 0; i < first; i++) {
        let day = daysInPrev - first + 1 + i;
        html += `<div class="cal-day other-month">${day}</div>`;
    }
    for (let i = 1; i <= daysInMonth; i++) {
        let d = new Date(year, month, i);
        let cls = 'cal-day';
        if (d.getTime() === today.getTime()) cls += ' today-mark';
        if (d.getTime() === ref.getTime()) cls += ' selected';

        if (year < 1600 || year > 2599) {
            cls += ' disabled';
            html += `<div class="${cls}">${i}</div>`;
        } else {
            html += `<div class="${cls}" onclick="pickDay(${i}, ${year}, ${month})">${i}</div>`;
        }
    }
    let total = first + daysInMonth;
    let rem = 42 - total;
    for (let i = 1; i <= rem; i++) {
        html += `<div class="cal-day other-month">${i}</div>`;
    }
    html += '</div>';
    return html;
}

function openCal(target) {
    calTarget = target;
    let ref = target === 'from' ? fromDate : target === 'to' ? toDate : baseDate;
    calYear = ref.getFullYear();
    calMonth = ref.getMonth();
    calView = 'day';
    renderCal();
    document.getElementById('popup').style.display = 'flex';

    if (calView === 'day') {
        requestAnimationFrame(() => {
            const scrollContainer = document.getElementById('calMonthsScroll');
            if (scrollContainer) {
                isScrollingCal = true;
                scrollContainer.scrollTop = 220;
                setTimeout(() => { isScrollingCal = false; }, 100);
            }
        });
    }
}
function closePopup() { document.getElementById('popup').style.display = 'none'; }

function drillUp() {
    if (calView === 'day') calView = 'month';
    else if (calView === 'month') calView = 'year';
    renderCal();

    if (calView === 'year') {
        const scrollContainer = document.getElementById('calYearsScroll');
        if (scrollContainer) {
            let ref = calTarget === 'from' ? fromDate : calTarget === 'to' ? toDate : baseDate;
            let r = Math.floor((ref.getFullYear() - 1600) / 4);
            scrollContainer.scrollTop = Math.max(0, r * 62 - 71);
        }
    }
}

function navBack() {
    if (calView === 'day') {
        if (calYear === 1600 && calMonth === 0) return;
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
    } else if (calView === 'month') {
        if (calYear === 1600) return;
        calYear--;
    } else {
        let decadeStart = Math.floor(calYear / 10) * 10;
        if (decadeStart <= 1600) return;
        calYear -= 10;
    }
    renderCal();
}

// Function navFwd is kept but Year logic matches boundaries
function navFwd() {
    if (calView === 'day') {
        if (calYear === 2599 && calMonth === 11) return;
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
    } else if (calView === 'month') {
        if (calYear === 2599) return;
        calYear++;
    } else {
        let decadeStart = Math.floor(calYear / 10) * 10;
        if (decadeStart >= 2590) return;
        calYear += 10;
    }
    renderCal();
}

function renderCal() {
    let titleEl = document.getElementById('calTitle');
    let body = document.getElementById('calBody');
    let ref = calTarget === 'from' ? fromDate : calTarget === 'to' ? toDate : baseDate;

    if (calView === 'day') {
        titleEl.textContent = MONTHS[calMonth] + ', ' + calYear;
        lastVisibleMonth = calMonth;
        lastVisibleYear = calYear;

        let prevM = calMonth - 1;
        let prevY = calYear;
        if (prevM < 0) { prevM = 11; prevY--; }

        let nextM = calMonth + 1;
        let nextY = calYear;
        if (nextM > 11) { nextM = 0; nextY++; }

        let scrollContainer = document.getElementById('calMonthsScroll');
        if (!scrollContainer) {
            let html = `
        <div class="cal-weekdays">
          ${DAYS.map(d => `<div class="cal-dh">${d}</div>`).join('')}
        </div>
        <div class="cal-months-scroll" id="calMonthsScroll" onscroll="handleCalScroll()">
          <div class="cal-months-track" id="calMonthsTrack">
            ${getMonthDaysHTML(prevY, prevM, ref)}
            ${getMonthDaysHTML(calYear, calMonth, ref)}
            ${getMonthDaysHTML(nextY, nextM, ref)}
          </div>
        </div>
      `;
            body.innerHTML = html;
        } else {
            const track = document.getElementById('calMonthsTrack');
            if (track) {
                track.innerHTML = `
          ${getMonthDaysHTML(prevY, prevM, ref)}
          ${getMonthDaysHTML(calYear, calMonth, ref)}
          ${getMonthDaysHTML(nextY, nextM, ref)}
        `;
            }
        }

    } else if (calView === 'month') {
        titleEl.textContent = calYear;
        let html = '<div class="month-grid">';
        SHORT.forEach((m, i) => {
            let cls = 'month-cell';
            if (ref.getFullYear() === calYear && ref.getMonth() === i) cls += ' sel';
            html += `<div class="${cls}" onclick="pickMonth(${i})">${m}</div>`;
        });
        html += '</div>';
        body.innerHTML = html;

    } else {
        let decadeStart = Math.floor(calYear / 10) * 10;
        titleEl.textContent = decadeStart + ' - ' + (decadeStart + 9);
        lastDecadeStart = decadeStart;

        let html = '<div class="cal-years-scroll" id="calYearsScroll" onscroll="handleYearScroll()">';
        html += '<div class="cal-years-grid">';
        for (let y = 1600; y <= 2599; y++) {
            let cls = 'year-cell';
            if (ref.getFullYear() === y) cls += ' sel';
            html += `<div class="${cls}" onclick="pickYear(${y})">${y}</div>`;
        }
        html += '</div></div>';
        body.innerHTML = html;

        setTimeout(() => {
            const scrollContainer = document.getElementById('calYearsScroll');
            if (scrollContainer) {
                let targetScrollTop = scrollContainer.scrollTop;
                let isAnimating = false;

                scrollContainer.addEventListener('wheel', function (e) {
                    e.preventDefault();
                    targetScrollTop += e.deltaY * 2.0; // upgraded by 0.5x
                    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
                    targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));

                    if (!isAnimating) {
                        isAnimating = true;
                        function step() {
                            const diff = targetScrollTop - scrollContainer.scrollTop;
                            if (Math.abs(diff) > 0.5) {
                                scrollContainer.scrollTop += diff * 0.15;
                                requestAnimationFrame(step);
                            } else {
                                scrollContainer.scrollTop = targetScrollTop;
                                isAnimating = false;
                            }
                        }
                        requestAnimationFrame(step);
                    }
                }, { passive: false });
            }
        }, 0);
    }
}

function pickDay(d, y, m) {
    let nd = new Date(y, m, d);
    if (nd.getFullYear() < 1600 || nd.getFullYear() > 2599) return;
    if (calTarget === 'from') fromDate = nd;
    else if (calTarget === 'to') toDate = nd;
    else baseDate = nd;
    closePopup();
    if (dateSubMode === 'diff') updateDiff(); else updateAdd();
}

function pickMonth(m) {
    calMonth = m;
    calView = 'day';
    renderCal();

    const scrollContainer = document.getElementById('calMonthsScroll');
    if (scrollContainer) {
        isScrollingCal = true;
        scrollContainer.scrollTop = 220;
        setTimeout(() => { isScrollingCal = false; }, 100);
    }
}

function pickYear(y) {
    calYear = y;
    calView = 'month';
    renderCal();
}

window.addEventListener('click', function () {
    closeAllDropdowns();
    closeCustomDropdowns();
});

// Initial UI Synchronization
if (savedMode === 'date') {
    selectMode('date');
} else {
    updateUI(currentInput);
}