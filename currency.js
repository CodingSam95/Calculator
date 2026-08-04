(function () {
    const API_BASE_URL = "https://open.er-api.com/v6/latest/";

    // ── Manually-pegged non-tradable currencies (rate is vs USD) ──
    // These are injected into currentRates after every API fetch.
    const NON_TRADABLE_PEGGED = {
        KPW: { rateVsUsd: 900, label: "Official govt. rate. Not a tradable currency." }
    };

    // ── Master Currency List (Country - Currency Name - Code) ──
    const MASTER_CURRENCIES = [
        { country: "Afghanistan", name: "Afghani", code: "AFN" },
        { country: "Albania", name: "Lek", code: "ALL" },
        { country: "Algeria", name: "Dinar", code: "DZD" },
        { country: "Angola", name: "Kwanza", code: "AOA" },
        { country: "Anguilla", name: "Eastern Caribbean Dollar", code: "XCD" },
        { country: "Argentina", name: "Peso", code: "ARS" },
        { country: "Armenia", name: "Dram", code: "AMD" },
        { country: "Aruba", name: "Aruban Florin", code: "AWG" },
        { country: "Australia", name: "Australian Dollar", code: "AUD" },
        { country: "Austria", name: "Euro", code: "EUR" },
        { country: "Azerbaijan", name: "Manat", code: "AZN" },
        { country: "Bahamas, The", name: "Bahamian Dollar", code: "BSD" },
        { country: "Bahrain", name: "Dinar", code: "BHD" },
        { country: "Bangladesh", name: "Taka", code: "BDT" },
        { country: "Barbados", name: "Barbados Dollar", code: "BBD" },
        { country: "Belarus", name: "Ruble", code: "BYN" },
        { country: "Belgium", name: "Euro", code: "EUR" },
        { country: "Belize", name: "Belize Dollar", code: "BZD" },
        { country: "Bermuda", name: "Bermudian Dollar", code: "BMD" },
        { country: "Benin", name: "West African CFA Franc", code: "XOF" },
        { country: "Bhutan", name: "Ngultrum", code: "BTN" },
        { country: "Bolivia", name: "Boliviano", code: "BOB" },
        { country: "Bosnia and Herzegovina", name: "Convertible Mark", code: "BAM" },
        { country: "Botswana", name: "Pula", code: "BWP" },
        { country: "Brazil", name: "Real", code: "BRL" },
        { country: "British Antarctic Territory", name: "Pound Sterling", code: "GBP" },
        { country: "British Indian Ocean Territory", name: "US Dollar", code: "USD" },
        { country: "Brunei", name: "Brunei Dollar", code: "BND" },
        { country: "Bulgaria", name: "Lev", code: "BGN" },
        { country: "Burkina Faso", name: "West African CFA Franc", code: "XOF" },
        { country: "Burundi", name: "Burundi Franc", code: "BIF" },
        { country: "Cabo Verde", name: "Escudo", code: "CVE" },
        { country: "Cambodia", name: "Riel", code: "KHR" },
        { country: "Cameroon", name: "Central African CFA Franc", code: "XAF" },
        { country: "Canada", name: "Canadian Dollar", code: "CAD" },
        { country: "Cayman Islands", name: "Cayman Islands Dollar", code: "KYD" },
        { country: "Central African Republic", name: "Central African CFA Franc", code: "XAF" },
        { country: "Chad", name: "Central African CFA Franc", code: "XAF" },
        { country: "Chile", name: "Chilean Peso", code: "CLP" },
        { country: "China", name: "Yuan", code: "CNY" },
        { country: "China (Offshore)", name: "Offshore Yuan", code: "CNH" },
        { country: "Colombia", name: "Peso", code: "COP" },
        { country: "Comoros", name: "Comorian Franc", code: "KMF" },
        { country: "Republic of Congo", name: "Central African CFA Franc", code: "XAF" },
        { country: "Costa Rica", name: "Colón", code: "CRC" },
        { country: "Cote d'Ivoire", name: "West African CFA Franc", code: "XOF" },
        { country: "Croatia", name: "Euro", code: "EUR" },
        { country: "Cuba", name: "Peso", code: "CUP" },
        { country: "Cyprus", name: "Euro", code: "EUR" },
        { country: "Czech Republic", name: "Koruna", code: "CZK" },
        { country: "Denmark", name: "Krone", code: "DKK" },
        { country: "Djibouti", name: "Franc", code: "DJF" },
        { country: "Dominican Republic", name: "Peso", code: "DOP" },
        { country: "Egypt", name: "Pound", code: "EGP" },
        { country: "Equatorial Guinea", name: "Central African CFA Franc", code: "XAF" },
        { country: "Ethiopia", name: "Birr", code: "ETB" },
        { country: "Estonia", name: "Euro", code: "EUR" },
        { country: "Falkland Islands", name: "Falkland Islands Pound", code: "FKP" },
        { country: "Fiji", name: "Fiji Dollar", code: "FJD" },
        { country: "Finland", name: "Euro", code: "EUR" },
        { country: "France", name: "Euro", code: "EUR" },
        { country: "French Guiana", name: "Euro", code: "EUR" },
        { country: "French Polynesia", name: "CFP Franc", code: "XPF" },
        { country: "Gabon", name: "Central African CFA Franc", code: "XAF" },
        { country: "Gambia, The", name: "Dalasi", code: "GMD" },
        { country: "Germany", name: "Euro", code: "EUR" },
        { country: "Georgia", name: "Lari", code: "GEL" },
        { country: "Ghana", name: "Cedi", code: "GHS" },
        { country: "Gibraltar", name: "Gibraltar Pound", code: "GIP" },
        { country: "Greece", name: "Euro", code: "EUR" },
        { country: "Guadeloupe", name: "Euro", code: "EUR" },
        { country: "Guatemala", name: "Quetzal", code: "GTQ" },
        { country: "Guinea", name: "Guinean Franc", code: "GNF" },
        { country: "Guinea-Bissau", name: "West African CFA Franc", code: "XOF" },
        { country: "Guyana", name: "Guyanese Dollar", code: "GYD" },
        { country: "Haiti", name: "Gourde", code: "HTG" },
        { country: "Honduras", name: "Lempira", code: "HNL" },
        { country: "Hong Kong SAR", name: "Hong Kong Dollar", code: "HKD" },
        { country: "Hungary", name: "Forint", code: "HUF" },
        { country: "Iceland", name: "Króna", code: "ISK" },
        { country: "India", name: "Rupee", code: "INR" },
        { country: "Indonesia", name: "Rupiah", code: "IDR" },
        { country: "Iran", name: "Rial", code: "IRR" },
        { country: "Iraq", name: "Dinar", code: "IQD" },
        { country: "Ireland", name: "Euro", code: "EUR" },
        { country: "Israel", name: "New Shekel", code: "ILS" },
        { country: "Italy", name: "Euro", code: "EUR" },
        { country: "Jamaica", name: "Jamaican Dollar", code: "JMD" },
        { country: "Japan", name: "Yen", code: "JPY" },
        { country: "Jordan", name: "Dinar", code: "JOD" },
        { country: "Kazakhstan", name: "Tenge", code: "KZT" },
        { country: "Kenya", name: "Shilling", code: "KES" },
        { country: "Kuwait", name: "Dinar", code: "KWD" },
        { country: "Laos", name: "Kip", code: "LAK" },
        { country: "Latvia", name: "Euro", code: "EUR" },
        { country: "Lebanon", name: "Pound", code: "LBP" },
        { country: "Lesotho", name: "Loti", code: "LSL" },
        { country: "Liberia", name: "Liberian Dollar", code: "LRD" },
        { country: "Libya", name: "Dinar", code: "LYD" },
        { country: "Lithuania", name: "Euro", code: "EUR" },
        { country: "Luxembourg", name: "Euro", code: "EUR" },
        { country: "Macao SAR", name: "Pataca", code: "MOP" },
        { country: "Madagascar", name: "Ariary", code: "MGA" },
        { country: "Malawi", name: "Kwacha", code: "MWK" },
        { country: "Malaysia", name: "Ringgit", code: "MYR" },
        { country: "Maldives", name: "Rufiyaa", code: "MVR" },
        { country: "Mali", name: "West African CFA Franc", code: "XOF" },
        { country: "Malta", name: "Euro", code: "EUR" },
        { country: "Martinique", name: "Euro", code: "EUR" },
        { country: "Mauritania", name: "Ouguiya", code: "MRU" },
        { country: "Mauritius", name: "Rupee", code: "MUR" },
        { country: "Mayotte", name: "Euro", code: "EUR" },
        { country: "Mexico", name: "Mexican Peso", code: "MXN" },
        { country: "Moldova", name: "Leu", code: "MDL" },
        { country: "Mongolia", name: "Tugrik", code: "MNT" },
        { country: "Montserrat", name: "Eastern Caribbean Dollar", code: "XCD" },
        { country: "Morocco", name: "Dirham", code: "MAD" },
        { country: "Mozambique", name: "Metical", code: "MZN" },
        { country: "Myanmar", name: "Kyat", code: "MMK" },
        { country: "Namibia", name: "Namibian Dollar", code: "NAD" },
        { country: "Nepal", name: "Rupee", code: "NPR" },
        { country: "Netherlands", name: "Euro", code: "EUR" },
        { country: "New Zealand", name: "New Zealand Dollar", code: "NZD" },
        { country: "Nicaragua", name: "Córdoba", code: "NIO" },
        { country: "Niger", name: "West African CFA Franc", code: "XOF" },
        { country: "Nigeria", name: "Naira", code: "NGN" },
        { country: "North Korea", name: "Won", code: "KPW", nonTradable: true },
        { country: "North Macedonia", name: "Denar", code: "MKD" },
        { country: "Norway", name: "Krone", code: "NOK" },
        { country: "Oman", name: "Dinar", code: "OMR" },
        { country: "Pakistan", name: "Rupee", code: "PKR" },
        { country: "Panama", name: "Balboa", code: "PAB" },
        { country: "Papua New Guinea", name: "Kina", code: "PGK" },
        { country: "Paraguay", name: "Guaraní", code: "PYG" },
        { country: "Peru", name: "Sol", code: "PEN" },
        { country: "Philippines", name: "Peso", code: "PHP" },
        { country: "Pitcairn Islands", name: "New Zealand Dollar", code: "NZD" },
        { country: "Poland", name: "Zloty", code: "PLN" },
        { country: "Portugal", name: "Euro", code: "EUR" },
        { country: "Qatar", name: "Riyal", code: "QAR" },
        { country: "Reunion", name: "Euro", code: "EUR" },
        { country: "Romania", name: "Leu", code: "RON" },
        { country: "Russia", name: "Ruble", code: "RUB" },
        { country: "Rwanda", name: "Rwanda Franc", code: "RWF" },
        { country: "Saint Barthelemy", name: "Euro", code: "EUR" },
        { country: "Saint Helena, Ascension and Tristan de Cunha", name: "Saint Helena Pound", code: "SHP" },
        { country: "Saint Martin", name: "Euro", code: "EUR" },
        { country: "Saint Pierre and Miquelon", name: "Euro", code: "EUR" },
        { country: "Sao Tome and Principe", name: "Dobra", code: "STN" },
        { country: "Saudi Arabia", name: "Riyal", code: "SAR" },
        { country: "Senegal", name: "West African CFA Franc", code: "XOF" },
        { country: "Serbia", name: "Dinar", code: "RSD" },
        { country: "Seychelles", name: "Rupee", code: "SCR" },
        { country: "Singapore", name: "Singapore Dollar", code: "SGD" },
        { country: "Slovakia", name: "Euro", code: "EUR" },
        { country: "Slovenia", name: "Euro", code: "EUR" },
        { country: "Somalia", name: "Shilling", code: "SOS" },
        { country: "South Africa", name: "Rand", code: "ZAR" },
        { country: "South Georgia and the South Sandwich Islands", name: "Pound Sterling", code: "GBP" },
        { country: "South Korea", name: "Won", code: "KRW" },
        { country: "Spain", name: "Euro", code: "EUR" },
        { country: "Sri Lanka", name: "Rupee", code: "LKR" },
        { country: "Sudan", name: "Pound", code: "SDG" },
        { country: "Swaziland", name: "Lilangeni", code: "SZL" },
        { country: "Sweden", name: "Krona", code: "SEK" },
        { country: "Switzerland", name: "Swiss Franc", code: "CHF" },
        { country: "Syria", name: "Pound", code: "SYP" },
        { country: "Taiwan", name: "New Taiwan Dollar", code: "TWD" },
        { country: "Tanzania", name: "Shilling", code: "TZS" },
        { country: "Thailand", name: "Baht", code: "THB" },
        { country: "Togo", name: "West African CFA Franc", code: "XOF" },
        { country: "Trinidad and Tobago", name: "Trinidad and Tobago Dollar", code: "TTD" },
        { country: "Tunisia", name: "Dinar", code: "TND" },
        { country: "Turkey", name: "Lira", code: "TRY" },
        { country: "Turkmenistan", name: "Manat", code: "TMT" },
        { country: "Turks and Caicos Islands", name: "US Dollar", code: "USD" },
        { country: "Uganda", name: "Shilling", code: "UGX" },
        { country: "Ukraine", name: "Hryvnia", code: "UAH" },
        { country: "United Arab Emirates", name: "Dirham", code: "AED" },
        { country: "United Kingdom", name: "Pound Sterling", code: "GBP" },
        { country: "United States", name: "US Dollar", code: "USD" },
        { country: "Uruguay", name: "Peso Uruguayo", code: "UYU" },
        { country: "Uzbekistan", name: "Som", code: "UZS" },
        { country: "Vanuatu", name: "Vatu", code: "VUV" },
        { country: "Venezuela", name: "Bolívar", code: "VES" },
        { country: "Vietnam", name: "Dong", code: "VND" },
        { country: "Wallis and Futuna", name: "CFP Franc", code: "XPF" },
        { country: "Yemen", name: "Rial", code: "YER" },
        { country: "Zambia", name: "Kwacha", code: "ZMW" }
    ];

    // Top 20 Most Widely Used Currencies Globally
    const TOP_20_CODES = [
        "USD", "EUR", "GBP", "JPY", "AUD",
        "CAD", "CHF", "CNY", "INR", "NZD",
        "SGD", "HKD", "SEK", "KRW", "MXN",
        "BRL", "RUB", "ZAR", "AED", "SAR"
    ];

    let currentRates = {};
    let activeInput = 'from'; // 'from' or 'to'
    let fromAmount = "0";
    let toAmount = "0";
    let fromCurrency = "INR";
    let toCurrency = "AUD";
    let targetPickerCard = 'from';
    let isCurrencyInitialized = false;

    // ── Grouped Currency Map (code → {code, name, countries[], nonTradable?}) ──
    // Built once from MASTER_CURRENCIES; merges all countries sharing a code.
    const GROUPED_CURRENCIES = (function () {
        const map = new Map();
        MASTER_CURRENCIES.forEach(({ country, name, code, nonTradable }) => {
            if (!map.has(code)) {
                map.set(code, { code, name, countries: [], nonTradable: !!nonTradable });
            }
            const entry = map.get(code);
            if (!entry.countries.includes(country)) {
                entry.countries.push(country);
            }
            // Propagate nonTradable flag if any entry for this code sets it
            if (nonTradable) entry.nonTradable = true;
        });
        // Sort each country list alphabetically
        map.forEach(entry => entry.countries.sort((a, b) => a.localeCompare(b)));
        return map;
    })();

    // Helper: Get grouped currency object for a code
    function getCurrencyInfo(code) {
        if (GROUPED_CURRENCIES.has(code)) return GROUPED_CURRENCIES.get(code);
        return { code, name: code, countries: [code] };
    }

    // ── API Validation Logic ──
    // Returns true if the currency code exists in currentRates (including manually injected non-tradable ones)
    function isCurrencySupportedByApi(code) {
        if (!currentRates || Object.keys(currentRates).length === 0) return true;
        // Always allow manually-pegged non-tradable currencies
        if (NON_TRADABLE_PEGGED[code]) return true;
        return Object.prototype.hasOwnProperty.call(currentRates, code);
    }

    // Returns deduplicated, API-validated grouped currency entries, sorted by name
    function getValidatedCurrencies() {
        const result = [];
        GROUPED_CURRENCIES.forEach((entry) => {
            if (isCurrencySupportedByApi(entry.code)) {
                result.push(entry);
            }
        });
        return result;
    }

    async function fetchRates(base) {
        try {
            const updateStatusText = document.getElementById('currency-update-time');
            if (updateStatusText) updateStatusText.textContent = "Updating rates...";

            // If the base currency is a non-tradable pegged one (e.g. KPW),
            // the API doesn't have it — fetch USD instead and rescale.
            const pegInfo = NON_TRADABLE_PEGGED[base.toUpperCase()];
            const fetchBase = pegInfo ? "USD" : base;

            const response = await fetch(`${API_BASE_URL}${fetchBase}`);
            const data = await response.json();
            if (data && data.rates) {
                if (pegInfo) {
                    // Rescale: 1 base = 1/pegRate USD, so every rate ÷ pegRate
                    const scaleFactor = pegInfo.rateVsUsd; // 1 USD = scaleFactor [base]
                    const rescaled = {};
                    Object.entries(data.rates).forEach(([code, rate]) => {
                        // data.rates[code] = how many [code] per 1 USD
                        // We want: how many [code] per 1 [base]
                        // 1 [base] = (1/scaleFactor) USD → [code] per [base] = rate / scaleFactor
                        rescaled[code] = rate / scaleFactor;
                    });
                    rescaled[base.toUpperCase()] = 1;
                    // Also inject other pegged currencies
                    Object.entries(NON_TRADABLE_PEGGED).forEach(([code, peg]) => {
                        if (code !== base.toUpperCase()) {
                            // peg.rateVsUsd KPW = 1 USD; other pegged: peg.rateVsUsd [code] = 1 USD
                            // [code] per 1 [base] = peg.rateVsUsd / scaleFactor
                            rescaled[code] = peg.rateVsUsd / scaleFactor;
                        }
                    });
                    currentRates = rescaled;
                } else {
                    currentRates = data.rates;
                    // Inject non-tradable pegged currencies relative to this base.
                    const usdToBase = currentRates["USD"] || 1;
                    Object.entries(NON_TRADABLE_PEGGED).forEach(([code, peg]) => {
                        // KPW/base = (KPW/USD) × (USD/base)
                        currentRates[code] = peg.rateVsUsd * usdToBase;
                    });
                }
                calculateConversion();
                updateTimestamp();
                // Re-render picker to apply API validation filtering once rates arrive
                const pickerModal = document.getElementById('currencyPickerModal');
                if (pickerModal && pickerModal.classList.contains('show')) {
                    const searchInput = document.getElementById('currencySearchInput');
                    renderCurrencyPicker(searchInput ? searchInput.value : "");
                }
            }
        } catch (err) {
            console.error("Failed to fetch currency rates", err);
            const updateStatusText = document.getElementById('currency-update-time');
            if (updateStatusText) updateStatusText.textContent = "Rate update offline";
        }
    }

    function updateTimestamp() {
        const updateStatusText = document.getElementById('currency-update-time');
        if (updateStatusText) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            updateStatusText.textContent = `Last updated: ${dateStr}, ${timeStr}`;
        }
    }

    function formatNumberDisplay(valStr) {
        if (!valStr || valStr === "0") return "0";
        const parts = valStr.split('.');
        const intPart = Number(parts[0]).toLocaleString('en-US');
        return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
    }

    function calculateConversion() {
        const fromValueDisplay = document.getElementById('from-currency-val');
        const toValueDisplay = document.getElementById('to-currency-val');

        if (!fromValueDisplay || !toValueDisplay) return;

        if (!currentRates[toCurrency]) {
            fromValueDisplay.textContent = formatNumberDisplay(fromAmount);
            toValueDisplay.textContent = formatNumberDisplay(toAmount);
            return;
        }

        const rate = currentRates[toCurrency];

        if (activeInput === 'from') {
            const num = parseFloat(fromAmount) || 0;
            const result = num * rate;
            toAmount = num === 0 ? "0" : (result % 1 === 0 ? result.toString() : result.toFixed(2));
        } else {
            const num = parseFloat(toAmount) || 0;
            const result = num / rate;
            fromAmount = num === 0 ? "0" : (result % 1 === 0 ? result.toString() : result.toFixed(2));
        }

        fromValueDisplay.textContent = formatNumberDisplay(fromAmount);
        toValueDisplay.textContent = formatNumberDisplay(toAmount);
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

    // ── Render Categorized Currency Selection UI ──
    function renderCurrencyPicker(filter = "") {
        const listContainer = document.getElementById('currencyPickerList');
        if (!listContainer) return;

        const currentActiveCurr = targetPickerCard === 'from' ? fromCurrency : toCurrency;
        const q = filter.trim().toLowerCase();
        const allValidated = getValidatedCurrencies();

        if (q.length > 0) {
            // Search across code, name, and all countries in each grouped entry
            const searchResults = allValidated.filter(item =>
                item.code.toLowerCase().includes(q) ||
                item.name.toLowerCase().includes(q) ||
                item.countries.some(c => c.toLowerCase().includes(q))
            );

            if (searchResults.length === 0) {
                listContainer.innerHTML = `<div class="currency-picker-empty">No matching currencies found</div>`;
                return;
            }

            listContainer.innerHTML = `
                <div class="currency-picker-section-title">SEARCH RESULTS (${searchResults.length})</div>
                <div class="currency-list-group">
                    ${searchResults.map(item => renderCurrencyRow(item, currentActiveCurr)).join('')}
                </div>
            `;
        } else {
            // Categorized Default View: Top Currencies + All Currencies
            const top20Validated = TOP_20_CODES
                .filter(code => isCurrencySupportedByApi(code))
                .map(code => getCurrencyInfo(code))
                .filter(Boolean);

            // All valid grouped currencies sorted by currency name
            const sortedAll = [...allValidated].sort((a, b) => a.name.localeCompare(b.name));

            listContainer.innerHTML = `
                <!-- 1. Top Section (Top Currencies) -->
                <div class="currency-picker-section-title">TOP CURRENCIES</div>
                <div class="currency-list-group">
                    ${top20Validated.map(item => renderCurrencyRow(item, currentActiveCurr)).join('')}
                </div>

                <!-- 2. Scrollable All Section -->
                <div class="currency-picker-section-title">ALL CURRENCIES (${sortedAll.length})</div>
                <div class="currency-list-group">
                    ${sortedAll.map(item => renderCurrencyRow(item, currentActiveCurr)).join('')}
                </div>
            `;
        }

        // Attach click handlers to currency items & top chips
        listContainer.querySelectorAll('[data-code]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = el.getAttribute('data-code');
                selectCurrency(code);
                closeCurrencyPicker();
            });
        });
    }

    function renderCurrencyRow(item, activeCode) {
        const isSelected = item.code === activeCode;
        const fullCountriesStr = item.countries.join(', ');
        const isNonTradable = !!item.nonTradable;
        const nonTradablePeg = NON_TRADABLE_PEGGED[item.code];

        let countryMarkup = '';
        if (item.countries.length > 1) {
            const duration = Math.max(10, Math.round(fullCountriesStr.length * 0.35));
            countryMarkup = `
                <div class="item-country-wrapper marquee">
                    <div class="marquee-content" style="animation-duration: ${duration}s;">
                        <span>${fullCountriesStr}&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
                        <span>${fullCountriesStr}&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
                    </div>
                </div>
            `;
        } else {
            countryMarkup = `
                <div class="item-country-wrapper">
                    <span>${fullCountriesStr}</span>
                </div>
            `;
        }

        const warningBadge = isNonTradable ? `
            <span class="item-non-tradable-badge" title="${nonTradablePeg ? nonTradablePeg.label : 'Non-tradable currency'}">
                <i class="fi fi-rr-triangle-warning"></i>
            </span>
        ` : '';

        return `
            <div class="currency-picker-item ${isSelected ? 'selected' : ''} ${isNonTradable ? 'non-tradable' : ''}" data-code="${item.code}">
                <div class="item-info">
                    <div class="item-country">${countryMarkup}</div>
                    <span class="item-name">${item.name}</span>
                </div>
                <div class="item-right">
                    ${warningBadge}
                    <span class="item-code-badge">${item.code}</span>
                </div>
            </div>
        `;
    }

    function selectCurrency(code) {
        if (targetPickerCard === 'from') {
            if (code === toCurrency) {
                toCurrency = fromCurrency;
            }
            fromCurrency = code;
        } else {
            if (code === fromCurrency) {
                fromCurrency = toCurrency;
            }
            toCurrency = code;
        }
        updateCardLabels();
        fetchRates(fromCurrency);
    }

    function updateCardLabels() {
        const fromNameEl = document.getElementById('from-currency-name');
        const toNameEl = document.getElementById('to-currency-name');
        const fromInfo = getCurrencyInfo(fromCurrency);
        const toInfo = getCurrencyInfo(toCurrency);

        function buildLabel(info, code) {
            const isNonTradable = NON_TRADABLE_PEGGED[code];
            const warningIcon = isNonTradable
                ? ` <i class="fi fi-rr-triangle-warning currency-bar-warning-icon" title="${NON_TRADABLE_PEGGED[code].label}"></i>`
                : '';
            return `${info.name} (${code})${warningIcon}`;
        }

        // Use innerHTML so the warning icon renders
        if (fromNameEl) fromNameEl.innerHTML = buildLabel(fromInfo, fromCurrency);
        if (toNameEl) toNameEl.innerHTML = buildLabel(toInfo, toCurrency);
    }

    function openCurrencyPicker(cardTarget) {
        targetPickerCard = cardTarget;
        const modal = document.getElementById('currencyPickerModal');
        const searchInput = document.getElementById('currencySearchInput');
        if (modal) {
            modal.classList.add('show');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            renderCurrencyPicker();
        }
    }

    function closeCurrencyPicker() {
        const modal = document.getElementById('currencyPickerModal');
        if (modal) modal.classList.remove('show');
    }

    function setupEventListeners() {
        if (isCurrencyInitialized) return;
        isCurrencyInitialized = true;

        const fromCard = document.getElementById('fromCurrencyCard');
        const toCard = document.getElementById('toCurrencyCard');
        const swapBtn = document.getElementById('currencySwapBtn');
        const refreshBtn = document.getElementById('currencyRefreshBtn');

        if (fromCard) {
            fromCard.addEventListener('click', (e) => {
                activeInput = 'from';
                fromCard.classList.add('active');
                toCard.classList.remove('active');

                if (e.target.closest('.card-header') || e.target.closest('.dropdown-arrow')) {
                    openCurrencyPicker('from');
                }
            });
        }

        if (toCard) {
            toCard.addEventListener('click', (e) => {
                activeInput = 'to';
                toCard.classList.add('active');
                fromCard.classList.remove('active');

                if (e.target.closest('.card-header') || e.target.closest('.dropdown-arrow')) {
                    openCurrencyPicker('to');
                }
            });
        }

        if (swapBtn) {
            swapBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tempCurr = fromCurrency;
                fromCurrency = toCurrency;
                toCurrency = tempCurr;

                const tempVal = fromAmount;
                fromAmount = toAmount;
                toAmount = tempVal;

                updateCardLabels();
                fetchRates(fromCurrency);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fetchRates(fromCurrency);
            });
        }

        // Keypad buttons — event delegation on .currency-keypad with pointerdown for zero touch latency & ambient proximity lighting
        const currencyKeypad = document.querySelector('#currency-calc-panel .currency-keypad');
        if (currencyKeypad) {
            const currencyBtns = Array.from(currencyKeypad.querySelectorAll('.currency-btn'));
            const currencyBtnCoords = [
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

            const applyCurrencyProximityGlow = (pressedBtn) => {
                const index = currencyBtns.indexOf(pressedBtn);
                if (index === -1) return;

                const pressedCoord = currencyBtnCoords[index];
                const color = getComputedStyle(pressedBtn).getPropertyValue('--glow-color').trim() || 'rgba(255, 255, 255, 0.3)';

                currencyBtns.forEach((other, otherIdx) => {
                    const otherCoord = currencyBtnCoords[otherIdx];
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

            const clearCurrencyProximityGlow = () => {
                currencyBtns.forEach(other => {
                    other.style.transition = '';
                    other.style.setProperty('--prox-glow', 'inset 0 0 0 transparent, inset 0 0 0 transparent');
                });
            };

            currencyKeypad.addEventListener('pointerdown', (e) => {
                const btn = e.target.closest('.currency-btn');
                if (!btn) return;
                e.stopPropagation();

                // Visual tap feedback (instant zero latency)
                btn.style.transition = 'none';
                btn.classList.add('tapped');
                setTimeout(() => {
                    btn.style.transition = '';
                    btn.classList.remove('tapped');
                }, 100);

                if (navigator.vibrate) navigator.vibrate(45);

                // Instant proximity lighting on tap
                applyCurrencyProximityGlow(btn);

                const val = btn.getAttribute('data-val');
                const action = btn.getAttribute('data-action');
                handleKeypadInput(val, action);
            });

            currencyKeypad.addEventListener('pointerup', clearCurrencyProximityGlow);
            currencyKeypad.addEventListener('pointercancel', clearCurrencyProximityGlow);
            currencyKeypad.addEventListener('pointerleave', clearCurrencyProximityGlow);
        }

        // Picker search
        const searchInput = document.getElementById('currencySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderCurrencyPicker(e.target.value);
            });
        }

        // Close picker button
        const closePickerBtn = document.getElementById('closeCurrencyPicker');
        if (closePickerBtn) {
            closePickerBtn.addEventListener('click', closeCurrencyPicker);
        }

        // Close picker on outside click
        const pickerModal = document.getElementById('currencyPickerModal');
        if (pickerModal) {
            pickerModal.addEventListener('click', (e) => {
                if (e.target === pickerModal) closeCurrencyPicker();
            });
        }
    }

    window.initCurrencyCalc = function () {
        setupEventListeners();
        updateCardLabels();
        fetchRates(fromCurrency);
    };
})();
