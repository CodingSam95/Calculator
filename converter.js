(function () {
    let isUnitConverterInitialized = false;

    function initUnitConverter() {
        if (isUnitConverterInitialized) return;
        isUnitConverterInitialized = true;

        const container = document.getElementById('unit-converter-panel');
        if (!container) return;

        // Category button click handlers
        const buttons = container.querySelectorAll('.unit-converter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = btn.getAttribute('data-unit');
                console.log(`Unit Converter Category Clicked: ${category}`);

                // Visual active toggle feedback
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Custom event dispatch for future implementation
                const event = new CustomEvent('unitCategorySelect', {
                    detail: { category: category }
                });
                window.dispatchEvent(event);
            });
        });
    }

    // Expose globally so main.js can invoke it on mode switch
    window.initUnitConverter = initUnitConverter;
})();
