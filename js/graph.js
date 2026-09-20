(function () {
    'use strict';

    /* ── Color Palette ─────────────────────────── */
    const COLOR_PALETTE = [
        '#20e3b2', // Mint
        '#ff4757', // Coral Red
        '#3742fa', // Blue
        '#a174ff', // Purple
        '#ffa502', // Amber
        '#e84393', // Pink
        '#ff7067', // Red
        '#2ed573', // Green
        '#ff9326', // Orange
        '#eccc68', // Yellow
        '#70a1ff'  // Sky Blue
    ];

    /* ── State ────────────────────────────────────────────────────────── */
    let functions = [
        { id: 1, fn: 'sin(x)', color: COLOR_PALETTE[0] }
    ];
    let nextId = 2;

    let renderTimer = null;

    // Equal baseline domain span for 1:1 physical square canvas (12 units, range [-6, 6])
    const initialDomainSpan = 12;

    /* ── Convert Expression to LaTeX ─────────────────────────────────── */
    function convertToLatex(expr) {
        if (!expr || !expr.trim()) return 'y = \\text{...}';
        let s = expr.trim();
        s = s.replace(/\*/g, ' \\cdot ');
        s = s.replace(/sin\(/g, '\\sin(');
        s = s.replace(/cos\(/g, '\\cos(');
        s = s.replace(/tan\(/g, '\\tan(');
        s = s.replace(/asin\(/g, '\\arcsin(');
        s = s.replace(/acos\(/g, '\\arccos(');
        s = s.replace(/atan\(/g, '\\arctan(');
        s = s.replace(/log\(/g, '\\log(');
        s = s.replace(/ln\(/g, '\\ln(');
        s = s.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
        s = s.replace(/(\d+)\/(\d+|\w+)/g, '\\frac{$1}{$2}');
        s = s.replace(/pi/g, '\\pi');
        return 'y = ' + s;
    }

    function renderLatex(element, text) {
        if (!element) return;
        if (window.katex && typeof window.katex.render === 'function') {
            try {
                window.katex.render(convertToLatex(text), element, { throwOnError: false, displayMode: false });
                return;
            } catch (e) { }
        }
        element.textContent = 'y = ' + (text || '...');
    }

    /* ── Sanitize Expression for functionPlot ─────────────────────────── */
    function sanitizeFn(str) {
        if (!str || !str.trim()) return null;
        let s = str.trim();
        s = s.replace(/×/g, '*').replace(/÷/g, '/');
        s = s.replace(/x²/g, 'x^2').replace(/x³/g, 'x^3');
        return s;
    }

    /* ── Render Plot Canvas (1:1 Physical Square Layout) ─────────────── */
    function renderPlot() {
        const container = document.getElementById('function-plot-canvas');
        if (!container) return;

        container.innerHTML = '';

        // Physical container is a 1:1 square tied to parent height
        const squareSide = container.clientHeight || container.clientWidth || window.innerHeight || 500;

        // Equal symmetric numerical domains for 1:1 square canvas ([-6, 6])
        const halfSpan = initialDomainSpan / 2;
        const xDomain = [-halfSpan, halfSpan];
        const yDomain = [-halfSpan, halfSpan];

        const data = functions
            .map(f => {
                const sanitized = sanitizeFn(f.fn);
                if (!sanitized) return null;
                return {
                    fn: sanitized,
                    color: f.color,
                    graphType: 'polyline'
                };
            })
            .filter(Boolean);

        if (typeof window.functionPlot !== 'function') {
            console.warn('[graph.js] functionPlot library not loaded yet.');
            return;
        }

        try {
            const plotInstance = window.functionPlot({
                target: '#function-plot-canvas',
                width: squareSide,
                height: squareSide,
                grid: true,
                disableShiftDragZoom: true,
                xAxis: { label: '', position: 'sticky', domain: xDomain, ticks: 12 },
                yAxis: { label: '', position: 'sticky', domain: yDomain, ticks: 12 },
                data: data.length > 0 ? data : [{ fn: '0', color: 'transparent' }]
            });

            // Hide the Y-axis "0" tick label — X-axis already shows the origin zero
            function hideYAxisZero() {
                const canvas = document.getElementById('function-plot-canvas');
                if (!canvas) return;
                canvas.querySelectorAll('.y.axis .tick text').forEach(el => {
                    if (el.textContent.trim() === '0') el.style.visibility = 'hidden';
                    else el.style.visibility = '';
                });
            }
            hideYAxisZero();

            // Equal zoom multiplier handler for 1:1 square canvas
            plotInstance.on('all:zoom', () => {
                if (plotInstance.meta && plotInstance.meta.xScale && plotInstance.meta.yScale) {
                    const currentXDomain = plotInstance.meta.xScale.domain();
                    const currentXSpan = currentXDomain[1] - currentXDomain[0];

                    const zoomMultiplier = currentXSpan / initialDomainSpan;
                    const newSpan = initialDomainSpan * zoomMultiplier;

                    const yDomainCurrent = plotInstance.meta.yScale.domain();
                    const yCenter = (yDomainCurrent[0] + yDomainCurrent[1]) / 2;
                    const coupledYDomain = [yCenter - newSpan / 2, yCenter + newSpan / 2];

                    plotInstance.meta.yScale.domain(coupledYDomain);
                    if (plotInstance.meta.yAxis) {
                        plotInstance.meta.yAxis.scale(plotInstance.meta.yScale);
                    }
                    if (typeof plotInstance.draw === 'function') {
                        plotInstance.draw();
                    }
                    hideYAxisZero();
                }
            });

        } catch (err) {
            // Silently handle incomplete syntax during typing
        }
    }

    function debouncedRenderPlot() {
        if (renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(renderPlot, 150);
    }

    /* ── Render Single-Line LaTeX Equation Controls UI ───────────────── */
    function renderInputList() {
        const listEl = document.getElementById('graph-inputs-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        functions.forEach((f) => {
            const row = document.createElement('div');
            row.className = 'func-row';

            // Flat Color Dot
            const badge = document.createElement('div');
            badge.className = 'func-color-badge';
            badge.style.backgroundColor = f.color;

            const eqWrap = document.createElement('div');
            eqWrap.className = 'func-eq-wrap';

            const latexPreview = document.createElement('div');
            latexPreview.className = 'func-latex-preview';
            renderLatex(latexPreview, f.fn);

            eqWrap.appendChild(latexPreview);

            // Open keyboard on row click
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('func-delete-btn')) return;
                openMathKeyboard(f, latexPreview);
            });

            row.appendChild(badge);
            row.appendChild(eqWrap);

            if (functions.length > 1) {
                const delBtn = document.createElement('button');
                delBtn.className = 'func-delete-btn';
                delBtn.innerHTML = '&times;';
                delBtn.title = 'Remove Equation';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    functions = functions.filter(item => item.id !== f.id);
                    renderInputList();
                    renderPlot();
                });
                row.appendChild(delBtn);
            }

            listEl.appendChild(row);
        });
    }

    /* ── Math Keyboard Controller ─────────────────────────────────────── */
    let activeFunc = null;
    let activeLatexEl = null;

    function openMathKeyboard(funcObj, latexEl) {
        activeFunc = funcObj;
        activeLatexEl = latexEl;

        const kbd = document.getElementById('math-keyboard');
        const display = document.getElementById('mkb-input-display');
        if (!kbd || !display) return;

        display.textContent = 'y = ' + (funcObj.fn || '');
        kbd.classList.add('open');
    }

    function closeMathKeyboard() {
        const kbd = document.getElementById('math-keyboard');
        if (kbd) kbd.classList.remove('open');
        activeFunc = null;
        activeLatexEl = null;
    }

    function initMathKeyboard() {
        const kbd = document.getElementById('math-keyboard');
        if (!kbd) return;

        const display = document.getElementById('mkb-input-display');
        const doneBtn = document.getElementById('mkb-done-btn');

        // Done button
        doneBtn.addEventListener('click', () => {
            closeMathKeyboard();
        });

        // Tab switching
        kbd.querySelectorAll('.mkb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                kbd.querySelectorAll('.mkb-tab').forEach(t => t.classList.remove('active'));
                kbd.querySelectorAll('.mkb-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panelId = 'mkb-panel-' + tab.dataset.tab;
                const panel = document.getElementById(panelId);
                if (panel) panel.classList.add('active');
            });
        });

        // Key presses
        kbd.querySelectorAll('.mkb-key').forEach(key => {
            key.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeFunc) return;

                if (key.dataset.action === 'backspace') {
                    activeFunc.fn = activeFunc.fn.slice(0, -1);
                } else if (key.dataset.insert !== undefined) {
                    activeFunc.fn = (activeFunc.fn || '') + key.dataset.insert;
                }

                // Update display and LaTeX preview
                display.textContent = 'y = ' + activeFunc.fn;
                // Scroll display to end
                display.scrollLeft = display.scrollWidth;

                if (activeLatexEl) renderLatex(activeLatexEl, activeFunc.fn);
                debouncedRenderPlot();
            });
        });
    }

    /* ── DOM Init & Listeners ─────────────────────────────────────────── */
    function initGraphingUI() {
        renderInputList();
        initMathKeyboard();

        const addBtn = document.getElementById('btn-add-func');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const color = COLOR_PALETTE[functions.length % COLOR_PALETTE.length];
                const newFunc = { id: nextId++, fn: '', color };
                functions.push(newFunc);
                renderInputList();

                // Open keyboard for the newly added equation
                const listEl = document.getElementById('graph-inputs-list');
                if (listEl && listEl.lastChild) {
                    const lastPreview = listEl.lastChild.querySelector('.func-latex-preview');
                    openMathKeyboard(newFunc, lastPreview);
                }
            });
        }

        // Collapse equations panel downward
        const collapseBtn = document.getElementById('btn-collapse-equations');
        const expandBtn = document.getElementById('btn-expand-equations');
        const eqSection = document.getElementById('graph-equations-section');

        if (collapseBtn && expandBtn && eqSection) {
            collapseBtn.addEventListener('click', () => {
                eqSection.classList.add('collapsed');
                expandBtn.classList.add('visible');
                closeMathKeyboard();
            });

            expandBtn.addEventListener('click', () => {
                eqSection.classList.remove('collapsed');
                expandBtn.classList.remove('visible');
            });
        }
    }

    /* ── Window Resize ────────────────────────────────────────────────── */
    window.addEventListener('resize', () => {
        const panel = document.getElementById('graphing-panel');
        if (panel && panel.style.display !== 'none') {
            renderPlot();
        }
    });

    /* ── Hook into selectMode ─────────────────────────────────────────── */
    function hookSelectMode() {
        const originalSelectMode = window.selectMode;

        if (typeof originalSelectMode !== 'function') {
            console.warn('[graph.js] selectMode not found — cannot hook.');
            return;
        }

        window.selectMode = function (mode) {
            const graphingPanel = document.getElementById('graphing-panel');

            if (mode === 'graphing') {
                const calcDisplay = document.querySelector('.display');
                const mainGrid = document.getElementById('main-grid');
                const datePanel = document.getElementById('date-calc-panel');
                const currencyPanel = document.getElementById('currency-calc-panel');
                const unitPanel = document.getElementById('unit-converter-panel');
                const dateModeLabel = document.getElementById('date-mode-label');
                const btnHistory = document.getElementById('btn-history');
                const historyPanel = document.getElementById('history-panel');
                const constantsSheet = document.getElementById('constants-sheet');

                if (calcDisplay) calcDisplay.style.display = 'none';
                if (mainGrid) mainGrid.style.display = 'none';
                if (datePanel) datePanel.style.display = 'none';
                if (currencyPanel) currencyPanel.style.display = 'none';
                if (unitPanel) unitPanel.style.display = 'none';

                if (dateModeLabel) {
                    dateModeLabel.style.display = 'none';
                }

                // Hide History button and panel when in graphing mode
                if (btnHistory) {
                    btnHistory.classList.add('hidden-element');
                    btnHistory.setAttribute('disabled', 'true');
                }
                if (historyPanel) {
                    historyPanel.classList.add('hidden-element');
                }
                if (typeof window.closeHistory === 'function') {
                    window.closeHistory();
                }

                // Close and hide constants sheet
                if (constantsSheet) {
                    constantsSheet.classList.remove('open');
                }
                if (typeof window.closeConstants === 'function') {
                    window.closeConstants();
                }

                if (typeof window.updateFeaturesForMode === 'function') {
                    window.updateFeaturesForMode('graphing');
                }

                if (graphingPanel) graphingPanel.style.display = 'block';

                document.querySelectorAll('.mode-row').forEach(row => {
                    row.classList.toggle('active', row.dataset.mode === 'graphing');
                });

                sessionStorage.setItem('calc_mode', 'graphing');

                if (typeof window.closeMenu === 'function') window.closeMenu();
                if (navigator.vibrate) navigator.vibrate(15);

                requestAnimationFrame(() => {
                    renderPlot();
                });

            } else {
                if (graphingPanel) graphingPanel.style.display = 'none';
                originalSelectMode(mode);
            }
        };
    }

    /* ── Boot ─────────────────────────────────────────────────────────── */
    function bootGraph() {
        initGraphingUI();
        hookSelectMode();
        const savedMode = sessionStorage.getItem('calc_mode');
        if (savedMode === 'graphing' && typeof window.selectMode === 'function') {
            window.selectMode('graphing');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootGraph);
    } else {
        bootGraph();
    }

})();
