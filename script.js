document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });

    const invoiceBody = document.getElementById('invoice-body');
    const addRowBtn = document.getElementById('add-row');
    const newInvoiceBtn = document.getElementById('new-invoice');
    const generatePdfBtn = document.getElementById('generate-pdf');
    const saveInvoiceBtn = document.getElementById('save-invoice');
    const historyBtn = document.getElementById('history-btn');

    let currentPayments = [];

    // ── Prefetching Strategy for Instant IDs ──
    let prefetchedInvoiceID = null;
    let isPrefetching = false;

    async function loadNextInvoiceID() {
        if (isPrefetching) return;
        isPrefetching = true;
        try {
            prefetchedInvoiceID = await InvoiceService.getNextSequenceID('INV', 4);
        } catch (error) {
            console.error("Failed to prefetch ID:", error);
        } finally {
            isPrefetching = false;
        }
    }

    // ── New Invoice Reset ──
    if (newInvoiceBtn) {
        newInvoiceBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to start a new invoice? This will clear all current unsaved data.")) {
                resetToNewInvoice();
            }
        });
    }

    async function generateNewInvoiceID() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
        
        // Compact date for ID (YYMMDD) for the student_id part
        const yy = now.getFullYear().toString().slice(-2);
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const dateCode = `${yy}${mm}${dd}`;
        
        // Use PREFETCHED ID or fetch now if not ready
        let sequentialID = prefetchedInvoiceID;
        if (!sequentialID) {
            sequentialID = await InvoiceService.getNextSequenceID('INV', 4);
        }
        
        // Immediately start prefetching the UNUSED one for the NEXT click
        prefetchedInvoiceID = null;
        loadNextInvoiceID();
        
        return {
            invoiceId: sequentialID,
            studentId: `STU-${dateCode}-${Math.floor(100+Math.random()*900)}`,
            date: dateStr
        };
    }

    async function resetToNewInvoice() {
        // Reset UI immediately for speed
        document.getElementById('invoice-id').textContent = 'Generating...';
        document.getElementById('invoice-date').textContent = '...';
        document.getElementById('student-id').textContent = '...';

        // Clear Items (Keep one blank row)
        invoiceBody.innerHTML = '';
        addItemRow(); // use the helper if available, or recreate row
        
        // Reset fields to placeholders
        document.querySelectorAll('.to-val')[0].textContent = '[Enter Name]';
        document.querySelectorAll('.to-val')[2].textContent = 'Email';
        document.querySelectorAll('.to-val')[3].textContent = 'Phone';

        // Clear Payments
        currentPayments = [];
        renderPayments();
        recalc();

        // Background fetch of IDs
        const ids = await generateNewInvoiceID();
        document.getElementById('invoice-id').textContent = ids.invoiceId;
        document.getElementById('invoice-date').textContent = ids.date;
        document.getElementById('student-id').textContent = ids.studentId;
    }

    function addItemRow() {
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
    }

    // ── Payment Log Logic ──
    const addPaymentBtn = document.getElementById('add-payment-btn');
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', () => {
            const amtStr = document.getElementById('new-payment-amt').value;
            const amt = parseFloat(amtStr);
            const dateStr = document.getElementById('new-payment-date').value;
            const methodStr = document.getElementById('new-payment-method').value;

            if (isNaN(amt) || amt <= 0) {
                alert("Please enter a valid amount.");
                return;
            }

            // Validation: Prevent overpayment
            const subtotalEl = document.getElementById('subtotal');
            const totalAmount = parseFloat(subtotalEl ? subtotalEl.textContent.replace(/[^\d.\-]/g, '') : '0');
            const alreadyPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0);
            const remaining = totalAmount - alreadyPaid;

            if (amt > remaining) {
                alert(`Amount exceeds the remaining balance. Maximum allowed: ${Math.round(remaining)} AED`);
                return;
            }

            if (!dateStr) {
                alert("Please select a date.");
                return;
            }

            // Format date for display
            const d = new Date(dateStr);
            const formattedDate = d.toLocaleDateString('en-GB').replace(/\//g, '-');

            currentPayments.push({
                amount: amt,
                date: formattedDate,
                method: methodStr
            });

            document.getElementById('new-payment-amt').value = '';
            renderPayments();
            recalc();
        });
    }

    function renderPayments() {
        const tbody = document.getElementById('payments-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        currentPayments.forEach((p, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.date}</td>
                <td>${p.method}</td>
                <td style="text-align: right; font-weight: 600;">
                    ${Math.round(p.amount)} <small>AED</small>
                    <button class="btn-x no-print del-payment" data-index="${index}" style="font-size:14px; margin-left: 5px;">&times;</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach delete listeners
        document.querySelectorAll('.del-payment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentPayments.splice(idx, 1);
                renderPayments();
                recalc();
            });
        });
    }

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

            if (el.classList.contains('num') || el.classList.contains('col-qty')) {
                el.onkeydown = (e) => {
                    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                        (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.keyCode >= 35 && e.keyCode <= 39)) {
                        return;
                    }
                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                        e.preventDefault();
                    }
                };

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
            auth.signOut().then(() => {
                window.location.reload();
            });
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

        // Calc total paid
        let totalPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0);
        let remaining = grandTotal - totalPaid;

        setText('subtotal', Math.round(grandTotal));
        setText('paid-amount', Math.round(totalPaid));
        setText('remaining-amount', Math.round(remaining));

        const balanceRow = document.querySelector('.balance-row');
        const balanceLabel = balanceRow ? balanceRow.querySelector('.info-label') : null;

        if (balanceRow && balanceLabel) {
            if (remaining <= 0 && grandTotal > 0) {
                balanceRow.classList.add('is-paid');
                balanceLabel.textContent = 'PAID';
            } else {
                balanceRow.classList.remove('is-paid');
                balanceLabel.textContent = 'Remaining Balance';
            }
        }

        // Update Payment Card Header
        const prevCountEl = document.getElementById('prev-payment-count');
        const paymentControls = document.querySelector('.add-payment-controls');

        if (prevCountEl) prevCountEl.textContent = `${currentPayments.length} Payments`;

        // Hide payment controls if fully paid to prevent negative balance
        if (paymentControls) {
            if (remaining <= 0 && grandTotal > 0) {
                paymentControls.style.display = 'none';
            } else {
                paymentControls.style.display = 'flex';
            }
        }

        // Status Badge (PAID / PARTIAL / UNPAID)
        const statusEl = document.getElementById('invoice-status');
        if (statusEl) {
            statusEl.className = ''; 
            if (remaining <= 0 && grandTotal > 0) {
                statusEl.textContent = 'PAID';
                statusEl.classList.add('badge-paid');
            } else if (totalPaid > 0) {
                statusEl.textContent = 'PARTIAL';
                statusEl.classList.add('badge-partial');
            } else {
                statusEl.textContent = 'UNPAID';
                statusEl.classList.add('badge-unpaid');
            }
        }
    }

    function parseNum(el) {
        if (!el) return 0;
        const raw = el.textContent.replace(/[^\d.\-]/g, '');
        return parseFloat(raw) || 0;
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `${val} <small>AED</small>`;
    }

    // ── Generate PDF ──
    generatePdfBtn.addEventListener('click', () => {
        if (document.activeElement) document.activeElement.blur();
        window.print();
    });

    // ── Save Invoice (With Validation) ──
    saveInvoiceBtn.addEventListener('click', async () => {
        // Validation: Collect all fields
        const studentName = document.querySelectorAll('.to-val')[0].textContent.trim();
        const studentEmail = document.querySelectorAll('.to-val')[2].textContent.trim();
        const studentPhone = document.querySelectorAll('.to-val')[3].textContent.trim();

        // Check if phone contains only numbers
        const isNumeric = (str) => /^\d+$/.test(str.replace(/[\s\(\)\-\+]/g, ''));

        // Basic validations
        if (studentName === '' || studentName === '[Enter Name]') {
            alert('Student Name is required!');
            return;
        }

        if (studentPhone !== '' && !isNumeric(studentPhone)) {
            alert('Phone number must contain numbers only!');
            return;
        }

        const items = [];
        let missingDesc = false;

        document.querySelectorAll('#invoice-body tr').forEach(row => {
            const desc = row.querySelector('.col-desc').textContent.trim();
            const price = parseNum(row.querySelector('.col-price .num'));
            const qty = parseNum(row.querySelector('.col-qty'));
            const disc = parseNum(row.querySelector('.col-disc .num'));
            const vat = parseNum(row.querySelector('.vat-val'));
            const amount = parseNum(row.querySelector('.total-val'));
            
            if (desc === '' || desc === 'New Item') {
                missingDesc = true;
            }
            
            items.push({ desc, price, qty, disc, vat, amount });
        });

        if (items.length === 0 || missingDesc) {
            alert('At least one item with a description is required!');
            return;
        }

        saveInvoiceBtn.textContent = 'Saving...';
        
        try {
            const invoiceData = {
                id: document.getElementById('invoice-id').textContent.trim(),
                date: document.getElementById('invoice-date').textContent.trim(),
                trn: document.querySelectorAll('.meta-val')[2].textContent.trim(),
                studentName: studentName,
                studentId: document.getElementById('student-id').textContent.trim(),
                email: studentEmail,
                phone: studentPhone,
                items: items,
                payments: currentPayments,
                total: parseNum(document.getElementById('subtotal'))
            };

            await InvoiceService.saveInvoice(invoiceData);
            
            // Success: refresh ID cache
            loadNextInvoiceID();
            
            saveInvoiceBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved';
            setTimeout(() => {
                saveInvoiceBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save';
            }, 2000);
        } catch (error) {
            alert('Error saving invoice: ' + error.message);
            saveInvoiceBtn.textContent = 'Save Error';
        }
    });

    // ── History Modal ──
    const modal = document.getElementById('history-modal');
    const closeBtn = document.querySelector('.close-modal');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const historyListBody = document.getElementById('history-list-body');

    // ── History Pagination State ──
    let historyPage = 1;
    let historyPageStack = [null]; // Stores the 'lastDoc' of each page
    let currentSearchQuery = '';

    historyBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        historyPage = 1;
        historyPageStack = [null];
        currentSearchQuery = '';
        searchInput.value = '';
        performSearch('', 'new');
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if(e.target == modal) {
            modal.style.display = 'none';
        }
    });

    searchBtn.addEventListener('click', () => {
        currentSearchQuery = searchInput.value;
        historyPage = 1;
        historyPageStack = [null];
        performSearch(currentSearchQuery, 'new');
    });
    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            currentSearchQuery = searchInput.value;
            historyPage = 1;
            historyPageStack = [null];
            performSearch(currentSearchQuery, 'new');
        }
    });

    // Pagination Buttons
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageDisplay = document.getElementById('page-number-display');

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            performSearch(currentSearchQuery, 'next');
        });
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            performSearch(currentSearchQuery, 'prev');
        });
    }

    async function performSearch(query, action) {
        historyListBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
        
        try {
            let lastVisible = null;
            if (action === 'next') {
                lastVisible = historyPageStack[historyPageStack.length - 1];
            } else if (action === 'prev') {
                historyPageStack.pop(); // Remove current page end
                lastVisible = historyPageStack[historyPageStack.length - 2] || null; // Go back to start of prev page
            }

            const result = await InvoiceService.searchInvoicesPaged(query, 10, lastVisible);
            const results = result.data;
            
            if (results.length === 0) {
                historyListBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No invoices found.</td></tr>';
                if (action === 'next') historyPageStack.pop(); // Undo if next was empty
                updatePagingUI(false);
                return;
            }

            // Update state
            if (action === 'next') {
                historyPage++;
                historyPageStack.push(result.lastDoc);
            } else if (action === 'prev') {
                historyPage--;
            } else {
                // 'new'
                historyPage = 1;
                historyPageStack = [null, result.lastDoc];
            }

            historyListBody.innerHTML = '';
            results.forEach(inv => {
                const tr = document.createElement('tr');
                
                // Calculate status
                const total = inv.total || 0;
                const paid = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
                const remaining = total - paid;
                
                let statusHtml = '';
                if (remaining <= 0 && total > 0) {
                    statusHtml = '<span class="badge-paid" style="padding:2px 8px; font-size:10px;">PAID</span>';
                } else if (paid > 0) {
                    statusHtml = '<span class="badge-partial" style="padding:2px 8px; font-size:10px;">PARTIAL</span>';
                } else {
                    statusHtml = '<span class="badge-unpaid" style="padding:2px 8px; font-size:10px;">UNPAID</span>';
                }

                tr.innerHTML = `
                    <td style="padding:10px; border-bottom:1px solid #eee;">${inv.date}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee; font-weight:700;">${inv.id}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee;">${inv.studentName}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee;">${statusHtml}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${Math.round(total)} <small>AED</small></td>
                    <td style="padding:10px; border-bottom:1px solid #eee; display:flex; gap:5px;">
                        <button class="btn btn-dark load-inv-btn" data-id="${inv.id}" style="padding: 4px 10px; font-size:11px;">Load</button>
                        <button class="btn btn-x delete-inv-btn" data-id="${inv.id}" style="font-size:18px;">&times;</button>
                    </td>
                `;
                historyListBody.appendChild(tr);
            });

            updatePagingUI(results.length === 10);
            
            // Attach row actions
            attachHistoryActions();

        } catch (error) {
            console.error(error);
            historyListBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error loading invoices.</td></tr>';
        }
    }

    function updatePagingUI(hasNext) {
        if (pageDisplay) pageDisplay.textContent = `Page ${historyPage}`;
        if (prevPageBtn) prevPageBtn.disabled = (historyPage === 1);
        if (nextPageBtn) nextPageBtn.disabled = !hasNext;
    }

    function attachHistoryActions() {
        // Load buttons
        document.querySelectorAll('.load-inv-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await loadInvoice(id);
                modal.style.display = 'none';
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-inv-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete invoice ${id}?`)) {
                    await InvoiceService.deleteInvoice(id);
                    performSearch(currentSearchQuery, 'new'); // Refresh
                }
            });
        });
    }

    async function loadInvoice(id) {
        try {
            const inv = await InvoiceService.getInvoice(id);
            if (!inv) return;

            document.getElementById('invoice-id').textContent = inv.id;
            document.getElementById('invoice-date').textContent = inv.date;
            document.querySelectorAll('.meta-val')[2].textContent = inv.trn || '100234567890003';
            document.querySelectorAll('.to-val')[0].textContent = inv.studentName || '[Enter Name]';
            document.getElementById('student-id').textContent = inv.studentId || 'STU-000000';
            document.querySelectorAll('.to-val')[2].textContent = inv.email || 'Email';
            document.querySelectorAll('.to-val')[3].textContent = inv.phone || 'Phone';

            // Items
            invoiceBody.innerHTML = '';
            if(inv.items && inv.items.length > 0) {
                inv.items.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="col-desc" contenteditable="true">${item.desc}</td>
                        <td class="col-price"><span class="num" contenteditable="true">${item.price}</span><span class="cur">AED</span></td>
                        <td class="col-qty" contenteditable="true">${item.qty}</td>
                        <td class="col-disc"><span class="num" contenteditable="true">${item.disc}</span><span class="cur">AED</span></td>
                        <td class="col-vat"><span class="num vat-val">${item.vat}</span><span class="cur">AED</span></td>
                        <td class="col-amt"><span class="num total-val">${item.amount}</span><span class="cur">AED</span></td>
                        <td class="col-del no-print"><button class="btn-x" title="Remove">&times;</button></td>
                    `;
                    invoiceBody.appendChild(row);
                });
            }
            document.querySelectorAll('#invoice-body tr').forEach(attachRowListeners);

            // Payments
            currentPayments = inv.payments || [];
            renderPayments();
            recalc();

        } catch (error) {
            alert('Error loading invoice: ' + error.message);
        }
    }

    // ── Initial Load Logic ──
    async function init() {
        // Pre-fill date for new payment
        const newPaymentDateEl = document.getElementById('new-payment-date');
        if (newPaymentDateEl) {
            newPaymentDateEl.valueAsDate = new Date();
        }

        // Start background prefetching
        loadNextInvoiceID();

        if (!document.getElementById('invoice-id').textContent.includes('INV-')) {
            await resetToNewInvoice();
        } else {
            // Already has data (e.g. from loading)
            recalc();
        }

        // Add constraint for phone field (numbers only)
        const phoneField = document.querySelectorAll('.to-val')[3];
        if (phoneField) {
            phoneField.addEventListener('input', (e) => {
                const clean = phoneField.textContent.replace(/[^\d\s\(\)\-\+]/g, '');
                if (phoneField.textContent !== clean) {
                    phoneField.textContent = clean;
                }
            });
        }
    }

    init();
});
