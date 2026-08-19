let currentInput = sessionStorage.getItem('calc_current_input') || "";
let calcHistory = JSON.parse(localStorage.getItem('calc_history') || '[]');
const decimalDisplay = document.getElementById('decimal-out');
const fractionDisplay = document.getElementById('fraction-out');
const exprDisplay = document.getElementById('expr-out');
const livePreviewDisplay = document.getElementById('live-preview');
const equalBtn = document.querySelector('.btn.equal');
let cursorPos = currentInput.length;
let isDraggingCursor = false;
let _lastFormattedUI = null; // DOM diff cache — skips innerHTML writes when nothing changed
let _lastFontBucket = -1;   // Font-size bucket cache — skips redundant style writes
let _lastFracBucket = -1;   // Fraction font-size bucket cache
let _activeBtns = [];        // Visible button array for proximity glow (refreshed on mode switch)

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
    _lastFormattedUI = null;
    _lastFontBucket = -1;
    _lastFracBucket = -1;
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
    _lastFormattedUI = null;
    _lastFontBucket = -1;
    _lastFracBucket = -1;
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


function backspace() {
    if (!currentInput || cursorPos === 0) return;

    const funcs = ['nthRoot(', 'asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'sin(', 'cos(', 'tan(', 'log(', 'e^(', 'ln(', '^2 ', '^3 ', 'pi'];
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
        .replace(/\*/g, '\u00D7')
        .replace(/\//g, '\u00F7');
    expr = expr.replace(/sqrt\(/g, '\u221A(');
    expr = expr.replace(/cbrt\(/g, '\u221B(');
    expr = expr.replace(/nthRoot\(/g, '\u02B8\u221A(');
    expr = expr.replace(/asin\(/g, 'arcsin(');
    expr = expr.replace(/acos\(/g, 'arccos(');
    expr = expr.replace(/atan\(/g, 'arctan(');
    expr = expr.replace(/nCr\(/g, 'nCr(');
    expr = expr.replace(/\^2 /g, '\u00B2');
    expr = expr.replace(/\^3 /g, '\u00B3');
    expr = expr.replace(/(\d)C(\d)/g, '$1C$2');
    expr = expr.replace(/(\d)P(\d)/g, '$1P$2');
    expr = expr.replace(/(\d)e([+-]?\d)/g, '$1E$2');
    expr = expr.replace(/E/g, 'E'); // Ensure literal E stays E
    expr = expr.replace(/pi/g, '\u03C0');
    expr = expr.replace(/e/g, 'e');
    return expr;
}

let parenFlashTimer;


function updateUI(val) {
    // Batch all class removals in one call — avoids separate style-flush triggers
    decimalDisplay.classList.remove('error-text', 'result-anim');
    exprDisplay.classList.remove('shown');

    // Build display HTML
    const marker = "\uE000";
    const strWithMarker = val.slice(0, cursorPos) + marker + val.slice(cursorPos);
    const formatted = formatDisplayExpr(strWithMarker);
    const cursorHtml = `<span class="cursor-container"><span class="cursor"></span><span class="cursor-handle"></span></span>`;
    const finalHtml = formatted
        ? formatted.replace(marker, cursorHtml)
        : (val === "" ? cursorHtml : "");

    // Skip DOM write if nothing changed — prevents unnecessary repaints
    if (finalHtml !== _lastFormattedUI) {
        decimalDisplay.innerHTML = finalHtml;
        _lastFormattedUI = finalHtml;
    }

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

    // Defer storage write off the critical paint path
    queueMicrotask(() => sessionStorage.setItem('calc_current_input', val));
}

function adjustFontSize() {
    const isError = decimalDisplay.classList.contains('error-text');

    // Error path: reset bucket caches and apply size directly
    if (isError) {
        _lastFontBucket = -1;
        _lastFracBucket = -1;
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

    const len = decimalDisplay.innerText.length;
    const bucket = len < 9 ? 0 : len < 13 ? 1 : len < 17 ? 2 : 3;

    // Only write style if the size bucket changed — avoids redundant style recalcs
    if (bucket !== _lastFontBucket) {
        _lastFontBucket = bucket;
        const sizes = [
            'clamp(2.5rem, 12vw, 4rem)',
            'clamp(2rem, 10vw, 3rem)',
            'clamp(1.5rem, 8vw, 2.2rem)',
            'clamp(1rem, 6vw, 1.5rem)'
        ];
        decimalDisplay.style.fontSize = sizes[bucket];
    }

    const fracLen = fractionDisplay.innerText.length;
    const fracBucket = fracLen < 25 ? 0 : 1;
    if (fracBucket !== _lastFracBucket) {
        _lastFracBucket = fracBucket;
        fractionDisplay.style.fontSize = fracBucket === 0 ? '1.15rem' : '0.9rem';
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

// â”€â”€ Scientific Mode State â”€â”€
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
    const btnSin = document.querySelector('button[data-fn="sin"]');
    const btnCos = document.querySelector('button[data-fn="cos"]');
    const btnTan = document.querySelector('button[data-fn="tan"]');
    const btnSqrt = document.querySelector('button[data-fn="sqrt"]');
    const btnCbrt = document.querySelector('.btn-cbrt');
    const btnLog = document.querySelector('button[data-fn="log"]');
    const btnLn = document.querySelector('button[data-fn="ln"]');
    const btnPow = document.querySelector('button[data-fn="pow"]');
    const btnNcr = document.querySelector('button[data-fn="nCr"]');

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

// ── Delegated Input & Proximity Glow Setup ──
function refreshActiveBtns() {
    const allBtns = Array.from(document.querySelectorAll('#main-grid .btn'));
    _activeBtns = allBtns.filter(b => getComputedStyle(b).display !== 'none');
}

function initGridDelegation() {
    const mainGrid = document.getElementById('main-grid');
    if (!mainGrid) return;

    refreshActiveBtns();

    let proxRafId = null;
    let lastPointerMoveEvent = null;

    const applyProximityGlow = (pressedBtn) => {
        if (isAnimatingMode || !_activeBtns.length) return;
        const index = _activeBtns.indexOf(pressedBtn);
        if (index === -1) return;

        const cols = sciMode ? 5 : 4;
        const row = Math.floor(index / cols);
        const col = index % cols;
        const color = getComputedStyle(pressedBtn).getPropertyValue('--glow-color').trim() || 'rgba(255, 255, 255, 0.3)';

        _activeBtns.forEach((other, otherIdx) => {
            if (other === pressedBtn) {
                other.style.transition = 'none';
                if (pressedBtn.classList.contains('ac') || pressedBtn.classList.contains('equal')) {
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
            } else {
                other.style.transition = '';
                other.style.setProperty('--prox-glow', 'inset 0 0 0 transparent, inset 0 0 0 transparent');
            }
        });
    };

    const clearProximityGlow = () => {
        if (isAnimatingMode) return;
        if (proxRafId) {
            cancelAnimationFrame(proxRafId);
            proxRafId = null;
        }
        _activeBtns.forEach(other => {
            other.style.transition = '';
            other.style.setProperty('--prox-glow', 'inset 0 0 0 transparent, inset 0 0 0 transparent');
        });
    };


    // Single delegated pointerdown for instant zero-latency touch response & action routing
    mainGrid.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn || btn.disabled) return;

        // Visual tap feedback
        btn.style.transition = 'none';
        btn.classList.add('tapped');
        setTimeout(() => {
            btn.style.transition = '';
            btn.classList.remove('tapped');
        }, 100);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(45);

        // Proximity glow effect
        applyProximityGlow(btn);

        // Input Action Routing
        const action = btn.dataset.action;
        const val = btn.dataset.val;
        const fn = btn.dataset.fn;

        if (action === 'append' && val !== undefined) {
            append(val);
        } else if (action === 'sci' && fn !== undefined) {
            sciFunc(fn);
        } else if (action === 'ac') {
            clearAll();
        } else if (action === 'parens') {
            handleParentheses();
        } else if (action === 'calculate') {
            calculate();
        } else if (action === 'deg-rad') {
            toggleDegRad();
        } else if (action === 'inv') {
            toggleInv();
        }
    });

    // Clear proximity lighting on pointer release or exit
    mainGrid.addEventListener('pointerup', clearProximityGlow);
    mainGrid.addEventListener('pointercancel', clearProximityGlow);
    mainGrid.addEventListener('pointerleave', clearProximityGlow);
}

// Initialize delegation once on startup
initGridDelegation();

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

// CE Hold-to-AC functionality (unified with Pointer Events for zero touch latency)
const btnCE = document.getElementById('btn-ce');
if (btnCE) {
    let ceFired = false;
    let ceDurTimer;

    const startCE = () => {
        ceFired = false;
        if (navigator.vibrate) navigator.vibrate(15);

        ceDurTimer = setTimeout(() => {
            clearAll();
            if (navigator.vibrate) navigator.vibrate([50, 40, 50, 40, 120]);
            ceFired = true;
        }, 500);
    };

    const endCE = () => {
        clearTimeout(ceDurTimer);
        if (!ceFired) {
            backspace();
            if (navigator.vibrate) navigator.vibrate(12);
        }
        ceFired = false;
    };

    btnCE.addEventListener('pointerdown', startCE);
    btnCE.addEventListener('pointerup', endCE);
    btnCE.addEventListener('pointercancel', () => {
        clearTimeout(ceDurTimer);
        ceFired = false;
    });
}

// â”€â”€ Liquid Glass Switcher: Mode Toggle Integration â”€â”€
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
            // Button is common to both modes â€” scale and translate its position seamlessly
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
            btn.style.willChange = '';
        });

        refreshActiveBtns();
    }, duration + 100);
}

// â”€â”€ Hamburger Menu & Mode Selection â”€â”€
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
    if (btnMenu.getAttribute('data-action') === 'back-unit') {
        if (typeof window.closeUnitCategory === 'function') {
            window.closeUnitCategory();
        }
        return;
    }
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
    const currencyPanel = document.getElementById('currency-calc-panel');
    const unitPanel = document.getElementById('unit-converter-panel');
    const calcDisplay = document.querySelector('.display');
    const mainGrid = document.getElementById('main-grid');
    const dateModeLabel = document.getElementById('date-mode-label');

    if (typeof window.closeUnitCategory === 'function') {
        window.closeUnitCategory();
    }

    if (mode === 'date') {
        if (calcDisplay) calcDisplay.style.display = 'none';
        if (mainGrid) mainGrid.style.display = 'none';
        if (currencyPanel) currencyPanel.style.display = 'none';
        if (unitPanel) unitPanel.style.display = 'none';
        if (datePanel) datePanel.style.display = 'flex';
        if (dateModeLabel) {
            dateModeLabel.textContent = 'Date Calculation';
            dateModeLabel.style.display = 'inline';
        }
        if (typeof initDateCalc === 'function') initDateCalc();
    } else if (mode === 'currency') {
        if (calcDisplay) calcDisplay.style.display = 'none';
        if (mainGrid) mainGrid.style.display = 'none';
        if (datePanel) datePanel.style.display = 'none';
        if (unitPanel) unitPanel.style.display = 'none';
        if (currencyPanel) currencyPanel.style.display = 'flex';
        if (dateModeLabel) {
            dateModeLabel.textContent = 'Currency Converter';
            dateModeLabel.style.display = 'inline';
        }
        if (typeof initCurrencyCalc === 'function') initCurrencyCalc();
    } else if (mode === 'unit') {
        if (calcDisplay) calcDisplay.style.display = 'none';
        if (mainGrid) mainGrid.style.display = 'none';
        if (datePanel) datePanel.style.display = 'none';
        if (currencyPanel) currencyPanel.style.display = 'none';
        if (unitPanel) unitPanel.style.display = 'flex';
        if (dateModeLabel) {
            dateModeLabel.textContent = 'Unit Converter';
            dateModeLabel.style.display = 'inline';
        }
        if (typeof initUnitConverter === 'function') initUnitConverter();
    } else {
        if (calcDisplay) calcDisplay.style.display = '';
        if (mainGrid) mainGrid.style.display = '';
        if (datePanel) datePanel.style.display = 'none';
        if (currencyPanel) currencyPanel.style.display = 'none';
        if (unitPanel) unitPanel.style.display = 'none';
        if (dateModeLabel) dateModeLabel.style.display = 'none';
    }

    // Only standard / scientific drive the calculator grid for now
    if (mode === 'scientific') {
        activateSciMode(true);
    } else if (mode === 'standard') {
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

// â”€â”€ Initialize App State from Storage â”€â”€
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

// â”€â”€ History Panel â”€â”€
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

// â”€â”€ Scientific Constants â”€â”€

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
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
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
    const funcs = ['nthRoot(', 'asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'sin(', 'cos(', 'tan(', 'log(', 'e^(', 'ln(', '^2 ', '^3 '];

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

// Initial UI Synchronization
if (savedMode === 'date' || savedMode === 'currency' || savedMode === 'unit') {
    selectMode(savedMode);
} else {
    updateUI(currentInput);
}