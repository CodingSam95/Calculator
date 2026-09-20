(function () {
    // ── Master Unit Datasets by Category ──
    const UNIT_CATEGORIES = {
        length: {
            title: "Length",
            defaultFrom: "m",
            defaultTo: "km",
            units: [
                { name: "Light Year", symbol: "Ly", factor: 9460730472580800 },
                { name: "Millimetre", symbol: "mm", factor: 0.001 },
                { name: "Kilometre", symbol: "km", factor: 1000 },
                { name: "Centimetre", symbol: "cm", factor: 0.01 },
                { name: "Metre", symbol: "m", factor: 1 },
                { name: "Micrometre", symbol: "μm", factor: 0.000001 },
                { name: "Parsec", symbol: "pc", factor: 30856775814913673 },
                { name: "Astronomical Unit", symbol: "AU", factor: 149597870700 },
                { name: "Lunar Distance", symbol: "LD", factor: 384400000 },
                { name: "Picometre", symbol: "pm", factor: 1e-12 },
                { name: "Nanometre", symbol: "nm", factor: 1e-9 },
                { name: "Angstrom", symbol: "Å", factor: 1e-10 },
                { name: "Fermi", symbol: "fm", factor: 1e-15 },
                { name: "Furlong", symbol: "fur", factor: 201.168 },
                { name: "Yard", symbol: "yd", factor: 0.9144 },
                { name: "Nautical Mile", symbol: "nmi", factor: 1852 },
                { name: "Foot", symbol: "ft", factor: 0.3048 },
                { name: "Mile", symbol: "mi", factor: 1609.344 },
                { name: "Inch", symbol: "in", factor: 0.0254 }
            ]
        },
        area: {
            title: "Area",
            defaultFrom: "m²",
            defaultTo: "ha",
            units: [
                { name: "Square Metre", symbol: "m²", factor: 1 },
                { name: "Square Decimetre", symbol: "dm²", factor: 0.01 },
                { name: "Square Centimetre", symbol: "cm²", factor: 0.0001 },
                { name: "Square Kilometre", symbol: "km²", factor: 1000000 },
                { name: "Square Millimetre", symbol: "mm²", factor: 0.000001 },
                { name: "Are", symbol: "a", factor: 100 },
                { name: "Hectare", symbol: "ha", factor: 10000 },
                { name: "Square Mile", symbol: "mi²", factor: 2589988.110336 },
                { name: "Square Rod", symbol: "rd²", factor: 25.29285264 },
                { name: "Square Yard", symbol: "yd²", factor: 0.83612736 },
                { name: "Square Foot", symbol: "ft²", factor: 0.09290304 },
                { name: "Acre", symbol: "ac", factor: 4046.8564224 },
                { name: "Square Inch", symbol: "in²", factor: 0.00064516 }
            ]
        },
        volume: {
            title: "Volume",
            defaultFrom: "L",
            defaultTo: "mL",
            units: [
                { name: "Hectolitre", symbol: "hl", factor: 100 },
                { name: "Cubic Metre", symbol: "m³", factor: 1000 },
                { name: "Cubic Centimetre", symbol: "cm³", factor: 0.001 },
                { name: "Decilitre", symbol: "dl", factor: 0.1 },
                { name: "Centilitre", symbol: "cl", factor: 0.01 },
                { name: "Cubic Decimetre", symbol: "dm³", factor: 1 },
                { name: "Litre", symbol: "L", factor: 1 },
                { name: "Cubic Millimetre", symbol: "mm³", factor: 0.000001 },
                { name: "Millilitre", symbol: "mL", factor: 0.001 },
                { name: "Cubic Foot", symbol: "ft³", factor: 28.316846592 },
                { name: "US Fluid Ounce", symbol: "US fl oz", factor: 0.0295735295625 },
                { name: "UK Fluid Ounce", symbol: "UK fl oz", factor: 0.0284130625 },
                { name: "Cubic Yard", symbol: "yd³", factor: 764.554857984 },
                { name: "Cubic Inch", symbol: "in³", factor: 0.016387064 },
                { name: "Acre-foot", symbol: "ac ft", factor: 1233481.83754752 },
                { name: "US Gallon", symbol: "US gal", factor: 3.785411784 },
                { name: "UK Gallon", symbol: "UK gal", factor: 4.54609 }
            ]
        },
        mass: {
            title: "Mass",
            defaultFrom: "kg",
            defaultTo: "lb",
            units: [
                { name: "Gram", symbol: "g", factor: 0.001 },
                { name: "Milligram", symbol: "mg", factor: 0.000001 },
                { name: "Centigram", symbol: "cg", factor: 0.00001 },
                { name: "Decigram", symbol: "dg", factor: 0.0001 },
                { name: "Decagram", symbol: "dag", factor: 0.01 },
                { name: "Hectogram", symbol: "hg", factor: 0.1 },
                { name: "Microgram", symbol: "μg", factor: 0.000000001 },
                { name: "Atomic Mass Unit", symbol: "amu", factor: 1.6605390666e-27 },
                { name: "Quintal", symbol: "q", factor: 100 },
                { name: "Carat", symbol: "ct", factor: 0.0002 },
                { name: "Tonne", symbol: "t", factor: 1000 },
                { name: "Kilogram", symbol: "kg", factor: 1 },
                { name: "Short Tonne", symbol: "sh t", factor: 907.18474 },
                { name: "Long Tonne", symbol: "lg t", factor: 1016.0469088 },
                { name: "Ounce", symbol: "oz", factor: 0.028349523125 },
                { name: "Grain", symbol: "gr", factor: 0.00006479891 },
                { name: "Dram", symbol: "dr", factor: 0.0017718451953125 },
                { name: "Short Hundredweight", symbol: "sh cwt", factor: 45.359237 },
                { name: "Long Hundredweight", symbol: "lg cwt", factor: 50.80234544 },
                { name: "Pound", symbol: "lb", factor: 0.45359237 },
                { name: "Stone", symbol: "st", factor: 6.35029318 }
            ]
        },
        temperature: {
            title: "Temperature",
            defaultFrom: "°C",
            defaultTo: "°F",
            units: [
                { name: "Rankine", symbol: "°Ra" },
                { name: "Celsius", symbol: "°C" },
                { name: "R\u00e9aumur", symbol: "\u00b0R\u00e9" },
                { name: "Fahrenheit", symbol: "°F" },
                { name: "Kelvin", symbol: "K" }
            ]
        },
        energy: {
            title: "Energy",
            defaultFrom: "J",
            defaultTo: "kcal",
            units: [
                { name: "Joule", symbol: "J", factor: 1 },
                { name: "Kilojoule", symbol: "kJ", factor: 1000 },
                { name: "Thermal calorie", symbol: "cal", factor: 4.184 },
                { name: "Food calorie", symbol: "kcal", factor: 4184 },
                { name: "Watt-hour", symbol: "Wh", factor: 3600 },
                { name: "Kilowatt-hour", symbol: "kWh", factor: 3600000 },
                { name: "Electron volt", symbol: "eV", factor: 1.602176634e-19 },
                { name: "British Thermal Unit", symbol: "BTU", factor: 1055.06 },
                { name: "Foot-pounds", symbol: "ft·lbf", factor: 1.355817948331409 }
            ]
        },
        speed: {
            title: "Speed",
            defaultFrom: "km/h",
            defaultTo: "mph",
            units: [
                { name: "Speed of Light", symbol: "c", factor: 299792458 },
                { name: "Kilometre/second", symbol: "km/s", factor: 1000 },
                { name: "Mile/hour", symbol: "mph", factor: 0.44704 },
                { name: "Mach", symbol: "Ma", factor: 343 },
                { name: "Knot", symbol: "kn", factor: 0.5144444444444444 },
                { name: "Inch/second", symbol: "in/s", factor: 0.0254 },
                { name: "Metre/second", symbol: "m/s", factor: 1 },
                { name: "Centimetre/second", symbol: "cm/s", factor: 0.01 },
                { name: "Kilometre/hour", symbol: "km/h", factor: 0.2777777777777778 }
            ]
        },
        pressure: {
            title: "Pressure",
            defaultFrom: "kPa",
            defaultTo: "psi",
            units: [
                { name: "Millimetre of Water", symbol: "mmH₂O", factor: 9.80665 },
                { name: "Pound/square foot", symbol: "psf", factor: 47.8802589803 },
                { name: "Kilogram-force/square centimetre", symbol: "kgf/cm²", factor: 98066.5 },
                { name: "Pound/square inch", symbol: "psi", factor: 6894.757293168 },
                { name: "Millimetre of Mercury", symbol: "mmHg", factor: 133.322368421 },
                { name: "Pascal", symbol: "Pa", factor: 1 },
                { name: "Torr", symbol: "Torr", factor: 133.322368421 },
                { name: "Bar", symbol: "bar", factor: 100000 },
                { name: "Inch of Mercury", symbol: "inHg", factor: 3386.388640341 },
                { name: "Millibar", symbol: "mbar", factor: 100 },
                { name: "Hectopascal", symbol: "hPa", factor: 100 },
                { name: "Atmosphere", symbol: "atm", factor: 101325 },
                { name: "Kilopascal", symbol: "kPa", factor: 1000 },
                { name: "Kilogram-force/square metre", symbol: "kgf/m²", factor: 9.80665 },
                { name: "Megapascal", symbol: "MPa", factor: 1000000 }
            ]
        },
        power: {
            title: "Power",
            defaultFrom: "kW",
            defaultTo: "hp",
            units: [
                { name: "Joule/second", symbol: "J/s", factor: 1 },
                { name: "BTU/second", symbol: "Btu/s", factor: 1055.05585262 },
                { name: "BTU/minute", symbol: "Btu/min", factor: 17.5842642104 },
                { name: "Metric Horsepower", symbol: "PS", factor: 735.49875 },
                { name: "Imperial Horsepower", symbol: "hp", factor: 745.6998715822702 },
                { name: "Kilogram-metre/second", symbol: "kgf·m/s", factor: 9.80665 },
                { name: "Kilocalorie/second", symbol: "kcal/s", factor: 4184 },
                { name: "Watt", symbol: "W", factor: 1 },
                { name: "Foot-Pound/second", symbol: "ft·lbf/s", factor: 1.3558179483314004 },
                { name: "Foot-Pound/minute", symbol: "ft·lbf/min", factor: 0.02259696580552334 },
                { name: "Newton-metre/second", symbol: "N·m/s", factor: 1 },
                { name: "Kilowatt", symbol: "kW", factor: 1000 }
            ]
        },
        data: {
            title: "Data",
            defaultFrom: "MB",
            defaultTo: "GB",
            units: [
                { name: "Bit", symbol: "b", factor: 0.125 },
                { name: "Nibble", symbol: "nibble", factor: 0.5 },
                { name: "Byte", symbol: "B", factor: 1 },
                { name: "Kilobit", symbol: "kb", factor: 125 },
                { name: "Kibibit", symbol: "Kib", factor: 128 },
                { name: "Kilobyte", symbol: "KB", factor: 1000 },
                { name: "Kibibyte", symbol: "KiB", factor: 1024 },
                { name: "Megabit", symbol: "Mb", factor: 125000 },
                { name: "Mebibit", symbol: "Mib", factor: 131072 },
                { name: "Megabyte", symbol: "MB", factor: 1000000 },
                { name: "Mebibyte", symbol: "MiB", factor: 1048576 },
                { name: "Gigabit", symbol: "Gb", factor: 125000000 },
                { name: "Gibibit", symbol: "Gib", factor: 134217728 },
                { name: "Gigabyte", symbol: "GB", factor: 1000000000 },
                { name: "Gibibyte", symbol: "GiB", factor: 1073741824 },
                { name: "Terabit", symbol: "Tb", factor: 125000000000 },
                { name: "Tebibit", symbol: "Tib", factor: 137438953472 },
                { name: "Terabyte", symbol: "TB", factor: 1000000000000 },
                { name: "Tebibyte", symbol: "TiB", factor: 1099511627776 },
                { name: "Petabyte", symbol: "PB", factor: 1e15 },
                { name: "Pebibyte", symbol: "PiB", factor: 1125899906842624 },
                { name: "Exabit", symbol: "Eb", factor: 1.25e17 },
                { name: "Exbibit", symbol: "Eib", factor: 144115188075855872 },
                { name: "Exabyte", symbol: "EB", factor: 1e18 },
                { name: "Exbibyte", symbol: "EiB", factor: 1.152921504606847e18 },
                { name: "Zetabit", symbol: "Zb", factor: 1.25e20 },
                { name: "Zebibit", symbol: "Zib", factor: 1.4757395258967641e20 },
                { name: "Zetabyte", symbol: "ZB", factor: 1e21 },
                { name: "Zebibyte", symbol: "ZiB", factor: 1.1805916207174113e21 },
                { name: "Yottabit", symbol: "Yb", factor: 1.25e23 },
                { name: "Yobibit", symbol: "Yib", factor: 1.5111572745182865e23 },
                { name: "Yottabyte", symbol: "YB", factor: 1e24 },
                { name: "Yobibyte", symbol: "YiB", factor: 1.2089258196146292e24 }
            ]
        },
        angle: {
            title: "Angle",
            defaultFrom: "°",
            defaultTo: "rad",
            units: [
                { name: "Degree", symbol: "°", factor: 1 },
                { name: "Radian", symbol: "rad", factor: 57.29577951308232 },
                { name: "Gradian", symbol: "grad", factor: 0.9 },
                { name: "Arcminute", symbol: "'", factor: 1 / 60 },
                { name: "Arcsecond", symbol: '"', factor: 1 / 3600 }
            ]
        },
        cooking: {
            title: "Cooking",
            defaultFrom: "US cup",
            defaultTo: "ml",
            units: [
                { name: "Litre", symbol: "L", factor: 1 },
                { name: "Millilitre", symbol: "ml", factor: 0.001 },
                { name: "US Teaspoon", symbol: "tsp", factor: 0.00492892159375 },
                { name: "US Tablespoon", symbol: "tbsp", factor: 0.01478676478125 },
                { name: "US Fluid Ounce", symbol: "US fl oz", factor: 0.0295735295625 },
                { name: "US Cup", symbol: "cup", factor: 0.2365882 },
                { name: "US Pint", symbol: "US pt", factor: 0.473176473 },
                { name: "US Quart", symbol: "US qt", factor: 0.946352946 },
                { name: "US Gallon", symbol: "US gal", factor: 3.785411784 },
                { name: "Metric Teaspoon", symbol: "tsp", factor: 0.005 },
                { name: "Metric Tablespoon", symbol: "tbsp", factor: 0.015 },
                { name: "Metric Cup", symbol: "cup", factor: 0.25 },
                { name: "UK Teaspoon", symbol: "tsp", factor: 0.005919388 },
                { name: "UK Tablespoon", symbol: "tbsp", factor: 0.01775816 },
                { name: "UK Fluid Ounce", symbol: "UK fl oz", factor: 0.0284130625 },
                { name: "UK Pint", symbol: "UK pt", factor: 0.56826125 },
                { name: "UK Quart", symbol: "UK qt", factor: 1.1365225 },
                { name: "UK Gallon", symbol: "UK gal", factor: 4.54609 },
                { name: "Australian Tablespoon", symbol: "tbsp", factor: 0.02 }
            ]
        }
    };

    let currentCategoryKey = "length";
    let activeInput = 'from'; // 'from' or 'to'
    let fromAmount = "0";
    let toAmount = "0";
    let fromUnitSymbol = "m";
    let toUnitSymbol = "km";
    let targetPickerCard = 'from';
    let isUnitConverterInitialized = false;

    // Helper: Get unit object by symbol within current category
    function getUnitObj(categoryKey, symbol) {
        const cat = UNIT_CATEGORIES[categoryKey];
        if (!cat) return null;
        return cat.units.find(u => u.symbol === symbol) || cat.units[0];
    }

    // ── Temperature Helper Conversion ──
    function toCelsius(val, symbol) {
        if (symbol === '°C') return val;
        if (symbol === '°F') return (val - 32) * 5 / 9;
        if (symbol === 'K') return val - 273.15;
        if (symbol === '°Ra') return (val - 491.67) * 5 / 9;
        if (symbol === '°R\u00e9') return val * 5 / 4;
        return val;
    }

    function fromCelsius(cVal, symbol) {
        if (symbol === '°C') return cVal;
        if (symbol === '°F') return (cVal * 9 / 5) + 32;
        if (symbol === 'K') return cVal + 273.15;
        if (symbol === '°Ra') return (cVal + 273.15) * 9 / 5;
        if (symbol === '°R\u00e9') return cVal * 4 / 5;
        return cVal;
    }

    function formatNumberDisplay(valStr) {
        if (!valStr || valStr === "0") return "0";
        if (valStr.includes('e') || valStr.includes('E')) return valStr;
        const parts = valStr.split('.');
        const intPart = Number(parts[0]).toLocaleString('en-US');
        return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
    }

    function calculateConversion() {
        const fromValueDisplay = document.getElementById('from-unit-val');
        const toValueDisplay = document.getElementById('to-unit-val');

        if (!fromValueDisplay || !toValueDisplay) return;

        const cat = UNIT_CATEGORIES[currentCategoryKey];
        if (!cat) return;

        let result = 0;

        if (currentCategoryKey === 'temperature') {
            if (activeInput === 'from') {
                const num = parseFloat(fromAmount) || 0;
                const cVal = toCelsius(num, fromUnitSymbol);
                result = fromCelsius(cVal, toUnitSymbol);
                toAmount = num === 0 ? (fromCelsius(0, toUnitSymbol) === 0 ? "0" : formatCalcResult(result)) : formatCalcResult(result);
            } else {
                const num = parseFloat(toAmount) || 0;
                const cVal = toCelsius(num, toUnitSymbol);
                result = fromCelsius(cVal, fromUnitSymbol);
                fromAmount = num === 0 ? (fromCelsius(0, fromUnitSymbol) === 0 ? "0" : formatCalcResult(result)) : formatCalcResult(result);
            }
        } else {
            const uFrom = getUnitObj(currentCategoryKey, fromUnitSymbol);
            const uTo = getUnitObj(currentCategoryKey, toUnitSymbol);

            if (!uFrom || !uTo) return;

            if (activeInput === 'from') {
                const num = parseFloat(fromAmount) || 0;
                const baseVal = num * uFrom.factor;
                result = baseVal / uTo.factor;
                toAmount = num === 0 ? "0" : formatCalcResult(result);
            } else {
                const num = parseFloat(toAmount) || 0;
                const baseVal = num * uTo.factor;
                result = baseVal / uFrom.factor;
                fromAmount = num === 0 ? "0" : formatCalcResult(result);
            }
        }

        fromValueDisplay.textContent = formatNumberDisplay(fromAmount);
        toValueDisplay.textContent = formatNumberDisplay(toAmount);

        // Update conversion ratio status bar (matches Currency Converter footer)
        const ratioEl = document.getElementById('unit-ratio-text');
        if (ratioEl) {
            const uFrom = getUnitObj(currentCategoryKey, fromUnitSymbol);
            const uTo = getUnitObj(currentCategoryKey, toUnitSymbol);
            if (uFrom && uTo) {
                if (currentCategoryKey === 'temperature') {
                    const cVal = toCelsius(1, uFrom.symbol);
                    const converted = formatCalcResult(fromCelsius(cVal, uTo.symbol));
                    ratioEl.textContent = `1 ${uFrom.symbol} = ${converted} ${uTo.symbol}`;
                } else {
                    const ratio = uFrom.factor / uTo.factor;
                    ratioEl.textContent = `1 ${uFrom.symbol} = ${formatCalcResult(ratio)} ${uTo.symbol}`;
                }
            }
        }
    }

    function formatCalcResult(num) {
        if (isNaN(num)) return "0";
        if (num === 0) return "0";
        const abs = Math.abs(num);
        if (abs < 1e-6 || abs >= 1e12) {
            return num.toExponential(6).replace(/\.?0+e/, 'e');
        }
        if (Number.isInteger(num)) return num.toString();
        return parseFloat(num.toFixed(8)).toString();
    }

    function handleKeypadInput(val, action) {
        let targetAmount = activeInput === 'from' ? fromAmount : toAmount;

        if (val !== null && val !== undefined) {
            if (targetAmount === "0" && val !== ".") {
                targetAmount = val;
            } else if (val === "." && targetAmount.includes(".")) {
                return;
            } else {
                targetAmount += val;
            }
        } else if (action === 'ac') {
            targetAmount = "0";
        } else if (action === 'backspace') {
            targetAmount = targetAmount.length > 1 ? targetAmount.slice(0, -1) : "0";
        }

        if (activeInput === 'from') {
            fromAmount = targetAmount;
        } else {
            toAmount = targetAmount;
        }

        calculateConversion();
    }

    function updateCardLabels() {
        const fromNameEl = document.getElementById('from-unit-name');
        const toNameEl = document.getElementById('to-unit-name');
        const uFrom = getUnitObj(currentCategoryKey, fromUnitSymbol);
        const uTo = getUnitObj(currentCategoryKey, toUnitSymbol);

        if (fromNameEl && uFrom) fromNameEl.textContent = `${uFrom.name} (${uFrom.symbol})`;
        if (toNameEl && uTo) toNameEl.textContent = `${uTo.name} (${uTo.symbol})`;
    }

    // ── Screen Navigation (Grid View vs Detail View) ──
    function openCategory(categoryKey) {
        const cat = UNIT_CATEGORIES[categoryKey];
        if (!cat) return;

        currentCategoryKey = categoryKey;
        fromUnitSymbol = cat.defaultFrom;
        toUnitSymbol = cat.defaultTo;
        fromAmount = "0";
        toAmount = "0";
        activeInput = "from";

        const titleEl = document.getElementById('unit-screen-title');
        if (titleEl) titleEl.textContent = cat.title;

        // Update Top Bar Heading to Section Title
        const topBarLabel = document.getElementById('date-mode-label');
        if (topBarLabel) topBarLabel.textContent = cat.title;

        // Swap top bar menu icon to back button icon
        const btnMenu = document.getElementById('btn-menu');
        if (btnMenu) {
            btnMenu.setAttribute('data-action', 'back-unit');
            const icon = btnMenu.querySelector('i');
            if (icon) icon.className = 'fi fi-rr-angle-left';
        }

        const fromCard = document.getElementById('fromUnitCard');
        const toCard = document.getElementById('toUnitCard');
        if (fromCard) fromCard.classList.add('active');
        if (toCard) toCard.classList.remove('active');

        updateCardLabels();
        calculateConversion();

        const gridView = document.getElementById('unit-grid-view');
        const calcScreen = document.getElementById('unit-calc-screen');
        if (gridView) gridView.style.display = 'none';
        if (calcScreen) calcScreen.style.display = 'flex';
    }

    function closeCategory() {
        closeUnitPicker();

        // Restore Top Bar Heading to Unit Converter
        const topBarLabel = document.getElementById('date-mode-label');
        if (topBarLabel) topBarLabel.textContent = 'Unit Converter';

        // Restore top bar menu icon to burger icon
        const btnMenu = document.getElementById('btn-menu');
        if (btnMenu) {
            btnMenu.removeAttribute('data-action');
            const icon = btnMenu.querySelector('i');
            if (icon) icon.className = 'fi fi-rr-menu-burger';
        }

        const gridView = document.getElementById('unit-grid-view');
        const calcScreen = document.getElementById('unit-calc-screen');
        if (gridView) gridView.style.display = 'grid';
        if (calcScreen) calcScreen.style.display = 'none';
    }

    window.closeUnitCategory = closeCategory;

    // ── Unit Picker Modal Logic ──
    function renderUnitPicker(filter = "") {
        const listContainer = document.getElementById('unitPickerList');
        if (!listContainer) return;

        const cat = UNIT_CATEGORIES[currentCategoryKey];
        if (!cat) return;

        const currentActiveSymbol = targetPickerCard === 'from' ? fromUnitSymbol : toUnitSymbol;
        const q = filter.trim().toLowerCase();

        const filteredUnits = cat.units.filter(u =>
            u.name.toLowerCase().includes(q) || u.symbol.toLowerCase().includes(q)
        );

        if (filteredUnits.length === 0) {
            listContainer.innerHTML = `<div class="unit-picker-empty">No matching units found</div>`;
            return;
        }

        listContainer.innerHTML = filteredUnits.map(u => {
            const isSelected = u.symbol === currentActiveSymbol;
            return `
                <div class="unit-picker-item ${isSelected ? 'selected' : ''}" data-symbol="${u.symbol}">
                    <div class="item-info">
                        <span class="item-name">${u.name}</span>
                    </div>
                    <span class="item-symbol-badge">${u.symbol}</span>
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.unit-picker-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const symbol = el.getAttribute('data-symbol');
                selectUnit(symbol);
                closeUnitPicker();
            });
        });
    }

    function selectUnit(symbol) {
        if (targetPickerCard === 'from') {
            if (symbol === toUnitSymbol) {
                toUnitSymbol = fromUnitSymbol;
            }
            fromUnitSymbol = symbol;
        } else {
            if (symbol === fromUnitSymbol) {
                fromUnitSymbol = toUnitSymbol;
            }
            toUnitSymbol = symbol;
        }
        updateCardLabels();
        calculateConversion();
    }

    function openUnitPicker(cardTarget) {
        targetPickerCard = cardTarget;
        const modal = document.getElementById('unitPickerModal');
        const searchInput = document.getElementById('unitSearchInput');
        if (modal) {
            modal.classList.add('show');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            renderUnitPicker();
        }
    }

    function closeUnitPicker() {
        const modal = document.getElementById('unitPickerModal');
        if (modal) modal.classList.remove('show');
    }

    function setupEventListeners() {
        if (isUnitConverterInitialized) return;
        isUnitConverterInitialized = true;

        const gridContainer = document.getElementById('unit-grid-view');
        if (gridContainer) {
            gridContainer.querySelectorAll('.unit-converter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const catKey = btn.getAttribute('data-unit');
                    openCategory(catKey);
                });
            });
        }

        const backBtn = document.getElementById('unitBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', closeCategory);
        }

        const fromCard = document.getElementById('fromUnitCard');
        const toCard = document.getElementById('toUnitCard');
        const swapBtn = document.getElementById('unitSwapBtn');

        if (fromCard) {
            fromCard.addEventListener('click', (e) => {
                activeInput = 'from';
                fromCard.classList.add('active');
                toCard.classList.remove('active');

                if (e.target.closest('.card-header') || e.target.closest('.dropdown-arrow')) {
                    openUnitPicker('from');
                }
            });
        }

        if (toCard) {
            toCard.addEventListener('click', (e) => {
                activeInput = 'to';
                toCard.classList.add('active');
                fromCard.classList.remove('active');

                if (e.target.closest('.card-header') || e.target.closest('.dropdown-arrow')) {
                    openUnitPicker('to');
                }
            });
        }

        if (swapBtn) {
            swapBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tempSymbol = fromUnitSymbol;
                fromUnitSymbol = toUnitSymbol;
                toUnitSymbol = tempSymbol;

                const tempVal = fromAmount;
                fromAmount = toAmount;
                toAmount = tempVal;

                updateCardLabels();
                calculateConversion();
            });
        }

        // Keypad buttons — event delegation on #unit-calc-screen .unit-keypad
        const unitKeypad = document.querySelector('#unit-calc-screen .unit-keypad');
        if (unitKeypad) {
            const unitBtns = Array.from(unitKeypad.querySelectorAll('.unit-btn'));
            const unitBtnCoords = [
                { row: 0, col: 0 }, // 7
                { row: 0, col: 1 }, // 8
                { row: 0, col: 2 }, // 9
                { row: 0, col: 3, rowSpan: 2 }, // AC
                { row: 1, col: 0 }, // 4
                { row: 1, col: 1 }, // 5
                { row: 1, col: 2 }, // 6
                { row: 2, col: 0 }, // 1
                { row: 2, col: 1 }, // 2
                { row: 2, col: 2 }, // 3
                { row: 2, col: 3, rowSpan: 2 }, // Backspace
                { row: 3, col: 0 }, // 00
                { row: 3, col: 1 }, // 0
                { row: 3, col: 2 }  // .
            ];

            const applyUnitProximityGlow = (pressedBtn) => {
                const index = unitBtns.indexOf(pressedBtn);
                if (index === -1) return;

                const pressedCoord = unitBtnCoords[index];
                const color = getComputedStyle(pressedBtn).getPropertyValue('--glow-color').trim() || 'rgba(255, 255, 255, 0.3)';

                unitBtns.forEach((other, otherIdx) => {
                    const otherCoord = unitBtnCoords[otherIdx];
                    if (!otherCoord) return;
                    if (other === pressedBtn) {
                        other.style.transition = 'none';
                        if (other.classList.contains('btn-ac') || other.classList.contains('btn-backspace')) {
                            other.style.setProperty('--prox-glow', `inset 0 0 15px 0px ${color}, inset 0 0 0 transparent`);
                        } else {
                            other.style.setProperty('--prox-glow', `inset 0 0 60px 20px ${color}, inset 0 0 15px 0px ${color}`);
                        }
                        return;
                    }

                    const dx = otherCoord.col - pressedCoord.col;
                    const pMinRow = pressedCoord.row;
                    const pMaxRow = pressedCoord.row + (pressedCoord.rowSpan || 1) - 1;
                    const oMinRow = otherCoord.row;
                    const oMaxRow = otherCoord.row + (otherCoord.rowSpan || 1) - 1;

                    let dy = 0;
                    if (oMaxRow < pMinRow) {
                        dy = oMaxRow - pMinRow;
                    } else if (oMinRow > pMaxRow) {
                        dy = oMinRow - pMaxRow;
                    }

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

            const clearUnitProximityGlow = () => {
                unitBtns.forEach(other => {
                    other.style.transition = '';
                    other.style.setProperty('--prox-glow', 'inset 0 0 0 transparent, inset 0 0 0 transparent');
                });
            };

            unitKeypad.addEventListener('pointerdown', (e) => {
                const btn = e.target.closest('.unit-btn');
                if (!btn) return;
                e.stopPropagation();

                btn.style.transition = 'none';
                btn.classList.add('tapped');
                setTimeout(() => {
                    btn.style.transition = '';
                    btn.classList.remove('tapped');
                }, 100);

                if (navigator.vibrate) navigator.vibrate(45);

                applyUnitProximityGlow(btn);

                const val = btn.getAttribute('data-val');
                const action = btn.getAttribute('data-action');
                handleKeypadInput(val, action);
            });

            unitKeypad.addEventListener('pointerup', clearUnitProximityGlow);
            unitKeypad.addEventListener('pointercancel', clearUnitProximityGlow);
            unitKeypad.addEventListener('pointerleave', clearUnitProximityGlow);
        }

        // Picker search
        const searchInput = document.getElementById('unitSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderUnitPicker(e.target.value);
            });
        }

        // Close picker button
        const closePickerBtn = document.getElementById('closeUnitPicker');
        if (closePickerBtn) {
            closePickerBtn.addEventListener('click', closeUnitPicker);
        }

        // Close picker on outside click
        const pickerModal = document.getElementById('unitPickerModal');
        if (pickerModal) {
            pickerModal.addEventListener('click', (e) => {
                if (e.target === pickerModal) closeUnitPicker();
            });
        }
    }

    window.initUnitConverter = function () {
        setupEventListeners();
    };
})();
