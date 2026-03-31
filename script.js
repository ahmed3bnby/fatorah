document.addEventListener('DOMContentLoaded', () => {
    const invoiceBody = document.getElementById('invoice-body');
    const addRowBtn = document.getElementById('add-row');
    const generatePdfBtn = document.getElementById('generate-pdf');

    // ── Add Row ──
    addRowBtn.addEventListener('click', () => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="col-desc" contenteditable="true">New Item</td>
            <td class="col-price"><span class="num" contenteditable="true">0</span><span class="cur">AED</span></td>
            <td class="col-qty" contenteditable="true">1</td>
            <td class="col-disc"><span class="num" contenteditable="true">0</span><span class="cur">AED</span></td>
            <td class="col-vat"><span class="num vat-val">0</span><span class="cur">AED</span></td>
            <td class="col-amt"><span class="num total-val">0</span><span class="cur">AED</span></td>
            <td class="col-del no-print"><button class="btn-x" title="Remove">&times;</button></td>
        `;
        invoiceBody.appendChild(row);
        attachRowListeners(row);
        recalc();
    });

    // ── Delete Row ──
    invoiceBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-x')) {
            e.target.closest('tr').remove();
            recalc();
        }
    });

    // ── Listeners ──
    function attachRowListeners(row) {
        row.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.oninput = recalc;

            // Restrict numeric input
            if (el.classList.contains('num') || el.classList.contains('col-qty')) {
                el.onkeydown = (e) => {
                    // Allow: Backspace, Delete, Tab, Escape, Enter, Dot
                    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                        // Allow: Ctrl+A, Command+A, Ctrl+C, Ctrl+V, Ctrl+X
                        (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
                        // Allow: home, end, left, right
                        (e.keyCode >= 35 && e.keyCode <= 39)) {
                        return;
                    }
                    // Ensure that it is a number and stop the keypress
                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                        e.preventDefault();
                    }
                };

                // Handle empty values on blur AND round decimal inputs
                el.onblur = () => {
                    const val = el.textContent.trim();
                    if (val === '') {
                        el.textContent = (el.classList.contains('col-qty')) ? '1' : '0';
                    } else {
                        const parsed = parseFloat(val.replace(/[^\d.\-]/g, ''));
                        if (!isNaN(parsed)) {
                            el.textContent = Math.round(parsed).toString();
                        }
                    }
                    recalc();
                };
            }
        });
    }

    // ── Logout ──
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('zad_auth_session');
            window.location.reload();
        };
    }
    document.querySelectorAll('#invoice-body tr').forEach(attachRowListeners);

    // ── Recalculate ──
    function recalc() {
        let grandTotal = 0;

        document.querySelectorAll('#invoice-body tr').forEach(row => {
            const priceEl = row.querySelector('.col-price .num') || row.querySelector('.col-price');
            const qtyEl  = row.querySelector('.col-qty');
            const discEl = row.querySelector('.col-disc .num') || row.querySelector('.col-disc');

            const price = parseNum(priceEl);
            const qty   = parseNum(qtyEl);
            const disc  = parseNum(discEl);

            const sub   = (price * qty) - disc;
            const vat   = Math.round(sub * 0.05);
            const total = sub + vat;

            const vatSpan = row.querySelector('.vat-val');
            const totSpan = row.querySelector('.total-val');
            if (vatSpan) vatSpan.textContent = Math.round(vat);
            if (totSpan) totSpan.textContent = Math.round(total);

            // Discount styling
            const discCell = row.querySelector('.col-disc');
            if (discCell) {
                if (disc > 0) {
                    discCell.classList.add('has-discount');
                } else {
                    discCell.classList.remove('has-discount');
                }
            }

            grandTotal += total;
        });

        setText('subtotal',          Math.round(grandTotal));
        setText('paid-amount',       Math.round(grandTotal));
        setText('remaining-amount',  '0');
    }

    function parseNum(el) {
        if (!el) return 0;
        const raw = el.textContent.replace(/[^\d.\-]/g, '');
        return parseFloat(raw) || 0;
    }

    function fmt(n) {
        return Math.round(n).toString();
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `${val} <small>AED</small>`;
    }

    // ── PDF Generation (Native Print) ──
    generatePdfBtn.addEventListener('click', () => {
        // Blur active fields to remove outlines
        if (document.activeElement) document.activeElement.blur();
        
        // Use browser print
        window.print();
    });


    // Initial calc
    recalc();

    // ── Auto-generate Fields ──
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const dateCode = `${yy}${mm}${dd}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();

    const invoiceIdEl = document.getElementById('invoice-id');
    const invoiceDateEl = document.getElementById('invoice-date');
    const studentIdEl = document.getElementById('student-id');

    if (invoiceIdEl) invoiceIdEl.textContent = `INV-DXB-${dateCode}-${rand}`;
    if (invoiceDateEl) invoiceDateEl.textContent = dateStr;
    if (studentIdEl) studentIdEl.textContent = `STU-${dateCode}-${rand}`;
});
