document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const languageSelect = document.getElementById('language-select');
    const operatorEntry = document.getElementById('operator-entry');
    const courierSelect = document.getElementById('courier-select');
    const scanEntry = document.getElementById('scan-entry');
    const statusIndicator = document.getElementById('status-indicator');
    const actualIndicator = document.getElementById('actual-indicator');
    const historyTableBody = document.getElementById('history-body');
    const historyHeaderRow = document.getElementById('history-header-row');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const correctSound = document.getElementById('correct-sound');
    const incorrectSound = document.getElementById('incorrect-sound');
    const appFooter = document.getElementById('app-footer'); // Reference to the footer element

    // --- Language Texts (Including Footer) ---
    const texts = {
        "English": {
            "title": "Courier Label Verification System",
            "operator_label": "Operator:",
            "courier_label": "Select Courier Type:",
            "scan_label": "Scan Barcode:",
            "status_label": "Status:",
            "actual_label": "Actual Classification:",
            "scan_history_title": "Scan History",
            "clear_btn": "Clear History",
            "save_btn": "Save History",
            "language_label": "Language:",
            "columns": ["Operator", "Time", "Status", "Expected", "Actual", "Tracking Code"],
            "waiting": "Waiting for scan...",
            "correct": "CORRECT",
            "incorrect": "INCORRECT",
            "unknown": "Unknown",
            "no_history": "No scan history to save.",
            "save_success": "Scan history saved successfully.",
            "save_error": "Failed to save file.",
            "footer_text": "Created by On Tang for assistance purposes. Please judge usage based on actual circumstances. Responsibility for errors lies with the user."
        },
        "Chinese": {
            "title": "速遞標籤驗證系統",
            "operator_label": "操作人員:",
            "courier_label": "選擇速遞公司:",
            "scan_label": "掃描條碼:",
            "status_label": "狀態:",
            "actual_label": "實際分類:",
            "scan_history_title": "掃描紀錄",
            "clear_btn": "清除紀錄",
            "save_btn": "儲存紀錄",
            "language_label": "語言:",
            "columns": ["操作人員", "時間", "狀態", "預期", "實際", "追蹤碼"],
            "waiting": "等待掃描...",
            "correct": "正確",
            "incorrect": "錯誤",
            "unknown": "未知",
            "no_history": "沒有掃描紀錄可儲存。",
            "save_success": "掃描紀錄已成功儲存。",
            "save_error": "儲存檔案失敗。",
            "footer_text": "由 On Tang 創作，用作協助用途。實際應用請根據現場情況自行判斷。若有錯誤，使用者需自行負責。"
        }
    };

    // --- Barcode Patterns (using RegExp objects) ---
    const barcodePatterns = {
        'EVRI': [/H[0-9]{2}[A-Z]{3}[0-9]{10}$/, /^T[0-9]{2}[A-Z]{3}[0-9]{10}$/],
        'ROYAL MAIL': [/^[A-Z]{2}[0-9]{9}GB$/],
        'DPD': [/^%0C[A-Z0-9]{4,5}[0-9]{20}$/],
        'YODEL': [/^JJD[0-9]{16}$/],
        'DX': [/^G[0-9]{11}$/],
        'UPS': [/^1Z[A-Z0-9]{16}$/],
        'DHL': [/^[A-Z]{3,4}[0-9\s]{18,20}$/],
        'XDP': [/^ZDB[A-Z]{3}[0-9]{9}$/, /^[0-9]{17}$/],
        'CUK9': [/^8EMA[0-9]{8}A[0-9]{3}$/, /^[0-9]{20}$/, /^UK[0-9]{10}$/, /^[0-9]{21}$/]
    };

    // --- State ---
    let scans = []; // Array to hold scan history objects
    let currentLanguage = 'English';

    // --- Functions ---

    function getText(key) {
        return texts[currentLanguage][key] || key;
    }

    function updateUIBasedOnLanguage() {
        currentLanguage = languageSelect.value;
        document.title = getText("title");
        document.getElementById('app-title').textContent = getText("title");
        document.getElementById('language-label').textContent = getText("language_label");
        document.getElementById('operator-label').textContent = getText("operator_label");
        document.getElementById('courier-label').textContent = getText("courier_label");
        document.getElementById('scan-label').textContent = getText("scan_label");
        document.getElementById('status-label').textContent = getText("status_label");
        document.getElementById('actual-label').textContent = getText("actual_label");
        document.getElementById('scan-history-title').textContent = getText("scan_history_title");
        clearBtn.textContent = getText("clear_btn");
        saveBtn.textContent = getText("save_btn");

        // Update status if it's the default waiting message
        if (statusIndicator.textContent === texts["English"]["waiting"] || statusIndicator.textContent === texts["Chinese"]["waiting"]) {
            statusIndicator.textContent = getText("waiting");
            statusIndicator.className = ''; // Reset class
        }
         // Update actual if it's the default unknown message
        if (actualIndicator.textContent === texts["English"]["unknown"] || actualIndicator.textContent === texts["Chinese"]["unknown"]) {
            actualIndicator.textContent = getText("unknown");
        }


        populateCourierDropdown(); // Repopulate dropdown (keeps selection)
        updateHistoryTableHeaders();
        refreshHistoryTable(); // Re-render table with translated status etc.

        // Update the footer text based on language
        appFooter.textContent = getText("footer_text");
    }

    function populateCourierDropdown() {
        const selectedValue = courierSelect.value; // Preserve selection if possible
        courierSelect.innerHTML = ''; // Clear existing options
        Object.keys(barcodePatterns).forEach(courier => {
            const option = document.createElement('option');
            option.value = courier;
            option.textContent = courier;
            courierSelect.appendChild(option);
        });
        // Restore selection or default to first
        courierSelect.value = selectedValue && Object.keys(barcodePatterns).includes(selectedValue)
                            ? selectedValue
                            : Object.keys(barcodePatterns)[0];
    }

    function updateHistoryTableHeaders() {
        const columns = getText("columns");
        historyHeaderRow.innerHTML = ''; // Clear existing headers
        columns.forEach(colText => {
            const th = document.createElement('th');
            th.textContent = colText;
            historyHeaderRow.appendChild(th);
        });
    }

    function identifyCourier(barcode) {
        for (const courier in barcodePatterns) {
            for (const pattern of barcodePatterns[courier]) {
                // Ensure pattern is a RegExp object if not already
                const regex = (pattern instanceof RegExp) ? pattern : new RegExp(pattern);
                if (regex.test(barcode)) {
                    return courier;
                }
            }
        }
        return getText("unknown");
    }

    function playSound(soundElement) {
        soundElement.currentTime = 0; // Rewind to start
        soundElement.play().catch(error => {
            console.warn("Audio playback failed:", error);
            // Browsers may block autoplay until user interaction
        });
    }

    function addScanToTable(scanData) {
        const row = historyTableBody.insertRow(0); // Insert at the top
        row.className = scanData.is_correct ? 'correct-row' : 'incorrect-row';

        const cellOperator = row.insertCell();
        const cellTime = row.insertCell();
        const cellStatus = row.insertCell();
        const cellExpected = row.insertCell();
        const cellActual = row.insertCell();
        const cellBarcode = row.insertCell();

        cellOperator.textContent = scanData.operator;
        cellTime.textContent = scanData.time;
        cellStatus.textContent = scanData.status; // Already translated when created
        cellExpected.textContent = scanData.expected;
        cellActual.textContent = scanData.actual; // Could be 'Unknown' (translated)
        cellBarcode.textContent = scanData.barcode;
        // cellBarcode.style.wordBreak = 'break-all'; // (Now handled by CSS)
    }

    function refreshHistoryTable() {
        historyTableBody.innerHTML = ''; // Clear the table body
        // Add scans back from the history array (newest first as they are unshifted)
        scans.forEach(scanData => addScanToTable(scanData));
    }


    function processScan() {
        const barcode = scanEntry.value.trim();
        if (!barcode) return;

        const expectedCourier = courierSelect.value;
        const actualCourier = identifyCourier(barcode);
        const isCorrect = actualCourier === expectedCourier;
        const operator = operatorEntry.value.trim() || "Anonymous";
        // Use locale-independent format for consistency
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' '); //-MM-DD HH:MM:SS


        // Update status display
        statusIndicator.textContent = isCorrect ? getText("correct") : getText("incorrect");
        statusIndicator.className = isCorrect ? 'correct' : 'incorrect'; // Add class for CSS styling

        // Update actual classification display
        actualIndicator.textContent = actualCourier; // Already translated if 'Unknown'

        // Play sound
        if (isCorrect) {
            playSound(correctSound);
        } else {
            playSound(incorrectSound);
        }

        // Record scan details
        const scanData = {
            operator: operator,
            time: timestamp,
            status: statusIndicator.textContent, // Use the already translated status
            expected: expectedCourier,
            actual: actualCourier, // Use the identified courier name or translated 'Unknown'
            barcode: barcode,
            is_correct: isCorrect
        };

        // Add to scan history (at the beginning)
        scans.unshift(scanData);

        // Update table immediately
        addScanToTable(scanData);

        // Clear the scan entry and refocus
        scanEntry.value = '';
        scanEntry.focus();
    }

    function clearHistory() {
        scans = []; // Clear the data array
        historyTableBody.innerHTML = ''; // Clear the table display
        statusIndicator.textContent = getText("waiting"); // Reset status display
        statusIndicator.className = '';
        actualIndicator.textContent = getText("unknown"); // Reset actual display
         // Also reset focus to scan entry after clearing
        scanEntry.focus();
    }

    function saveHistory() {
        if (scans.length === 0) {
            alert(getText("no_history"));
            return;
        }

        const columns = getText("columns");
        const header = columns.join(',') + '\n';

        const rows = scans.map(scan => {
            // Escape commas within fields by quoting (basic CSV handling)
            return [
                `"${scan.operator.replace(/"/g, '""')}"`,
                `"${scan.time.replace(/"/g, '""')}"`,
                `"${scan.status.replace(/"/g, '""')}"`,
                `"${scan.expected.replace(/"/g, '""')}"`,
                `"${scan.actual.replace(/"/g, '""')}"`,
                `"${scan.barcode.replace(/"/g, '""')}"`
            ].join(',');
        }).join('\n');

        const csvContent = header + rows;

        // Prepend BOM for better Excel compatibility with UTF-8
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement("a");

        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "scan_history.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Clean up
        } else {
            alert(getText("save_error") + " (Browser might not support automatic download)");
        }
    }


    // --- Event Listeners ---
    languageSelect.addEventListener('change', updateUIBasedOnLanguage);

    // Move focus to scan entry when courier is selected
    courierSelect.addEventListener('change', () => {
        scanEntry.focus();
    });

    scanEntry.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            processScan();
        }
    });
    clearBtn.addEventListener('click', clearHistory);
    saveBtn.addEventListener('click', saveHistory);

    // --- Initial Setup ---
    updateUIBasedOnLanguage(); // Set initial language and populate UI
    scanEntry.focus(); // Set focus to scan input on load

}); // End DOMContentLoaded