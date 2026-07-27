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
