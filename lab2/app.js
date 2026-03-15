var initialStateInput = document.getElementById('initialState');
var stateCounter = document.getElementById('stateCounter');
var fileInput = document.getElementById('fileInput');
var fileInfo = document.getElementById('fileInfo');
var btnEncrypt = document.getElementById('btnEncrypt');
var btnDecrypt = document.getElementById('btnDecrypt');
var btnDownload = document.getElementById('btnDownload');
var btnCSV = document.getElementById('btnCSV');
var statusEl = document.getElementById('status');

var originalBinaryEl = document.getElementById('originalBinary');
var resultBinaryEl = document.getElementById('resultBinary');
var keyBinaryEl = document.getElementById('keyBinary');
var registerTableEl = document.getElementById('registerTable');

var fileData = null;
var fileName = '';
var resultData = null;
var lastLFSR = null;

// фильтр ввода — только 0 и 1
initialStateInput.addEventListener('input', function () {
    this.value = this.value.replace(/[^01]/g, '');
    updateStateCounter();
    updateButtons();
});

initialStateInput.addEventListener('paste', function (e) {
    e.preventDefault();
    var paste = (e.clipboardData || window.clipboardData).getData('text');
    var filtered = paste.replace(/[^01]/g, '');
    var start = this.selectionStart;
    var before = this.value.substring(0, start);
    var after = this.value.substring(this.selectionEnd);
    this.value = (before + filtered + after).substring(0, 33);
    updateStateCounter();
    updateButtons();
});

function updateStateCounter() {
    var len = initialStateInput.value.length;
    stateCounter.textContent = len + '/33';
    stateCounter.className = 'state-counter ' + (len === 33 ? 'valid' : 'invalid');
}

// загрузка файла
fileInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;

    fileName = file.name;
    fileInfo.textContent = file.name + ' (' + formatSize(file.size) + ')';

    var reader = new FileReader();
    reader.onload = function (e) {
        fileData = e.target.result;
        originalBinaryEl.textContent = bufferToBinaryString(fileData);
        updateButtons();
        clearResult();
    };
    reader.readAsArrayBuffer(file);
});

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function updateButtons() {
    var stateValid = initialStateInput.value.length === 33;
    var hasFile = fileData !== null;
    btnEncrypt.disabled = !(stateValid && hasFile);
    btnDecrypt.disabled = !(stateValid && hasFile);
    btnDownload.disabled = resultData === null;
    btnCSV.disabled = lastLFSR === null;
}

function clearResult() {
    resultData = null;
    lastLFSR = null;
    resultBinaryEl.textContent = '';
    keyBinaryEl.textContent = '';
    registerTableEl.innerHTML = '';
    btnDownload.disabled = true;
    btnCSV.disabled = true;
}

function processFile(mode) {
    var stateStr = initialStateInput.value;

    if (stateStr.length !== 33) {
        showStatus('Введите ровно 33 бита начального состояния', 'error');
        return;
    }
    if (stateStr === '0'.repeat(33)) {
        showStatus('Начальное состояние не может быть нулевым', 'error');
        return;
    }
    if (!fileData) {
        showStatus('Выберите файл', 'error');
        return;
    }

    showStatus('Обработка...', 'success');

    setTimeout(function () {
        try {
            var res = streamCipher(fileData, stateStr);

            resultData = res.result;
            lastLFSR = res.lfsr;

            resultBinaryEl.textContent = bufferToBinaryString(res.result);
            keyBinaryEl.textContent = keyBitsToBinaryString(res.keyBits);
            renderRegisterTable(res.lfsr.history);

            updateButtons();

            var action = mode === 'encrypt' ? 'Зашифровано' : 'Расшифровано';
            showStatus(action + ' успешно! Размер: ' + formatSize(new Uint8Array(res.result).length), 'success');
        } catch (e) {
            showStatus('Ошибка: ' + e.message, 'error');
        }
    }, 50);
}

btnEncrypt.addEventListener('click', function () { processFile('encrypt'); });
btnDecrypt.addEventListener('click', function () { processFile('decrypt'); });

// скачивание результата
btnDownload.addEventListener('click', function () {
    if (!resultData) return;

    var blob = new Blob([resultData], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lfsr_' + fileName;
    a.click();
    URL.revokeObjectURL(url);
});

// экспорт CSV
btnCSV.addEventListener('click', function () {
    if (!lastLFSR) return;

    var csv = lastLFSR.exportHistoryCSV();
    var bom = '\uFEFF';
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lfsr_register_table.csv';
    a.click();
    URL.revokeObjectURL(url);
});

// отрисовка таблицы регистра
function renderRegisterTable(history) {
    if (!history || history.length === 0) {
        registerTableEl.innerHTML = '';
        return;
    }

    var html = '<table><thead><tr><th>Такт</th>';
    for (var i = 33; i >= 1; i--)
        html += '<th>b' + i + '</th>';
    html += '<th>XOR</th></tr></thead><tbody>';

    for (var h = 0; h < history.length; h++) {
        var entry = history[h];
        html += '<tr><td>' + entry.tact + '</td>';
        for (var j = 0; j < 33; j++)
            html += '<td>' + entry.state[j] + '</td>';
        html += '<td>' + entry.xorBit + '</td></tr>';
    }

    html += '</tbody></table>';
    registerTableEl.innerHTML = html;
}

function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

updateStateCounter();
updateButtons();
