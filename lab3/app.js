var inputP = document.getElementById('inputP');
var inputQ = document.getElementById('inputQ');
var inputB = document.getElementById('inputB');
var pHint = document.getElementById('pHint');
var qHint = document.getElementById('qHint');
var bHint = document.getElementById('bHint');

var fileInput = document.getElementById('fileInput');
var fileInfo = document.getElementById('fileInfo');
var btnEncrypt = document.getElementById('btnEncrypt');
var btnDecrypt = document.getElementById('btnDecrypt');
var btnDownload = document.getElementById('btnDownload');

var statusEl = document.getElementById('status');
var errorBoxEl = document.getElementById('errorBox');

var originalView = document.getElementById('originalView');
var cipherView = document.getElementById('cipherView');
var resultView = document.getElementById('resultView');

var fileBytes = null;     // Uint8Array
var fileName = '';
var fileIsCipher = false; // эвристика для предпросмотра
var resultBytes = null;   // последний результат (для скачивания)
var resultIsCipher = false;

// ---------- Параметры: фильтр ввода + индикатор валидности ----------

function digitsOnly(el) {
    el.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
        validateParamsLive();
    });
    el.addEventListener('paste', function (e) {
        e.preventDefault();
        var pasted = (e.clipboardData || window.clipboardData).getData('text');
        var filtered = pasted.replace(/\D/g, '');
        var s = this.selectionStart, en = this.selectionEnd;
        this.value = (this.value.substring(0, s) + filtered + this.value.substring(en));
        validateParamsLive();
    });
}
digitsOnly(inputP);
digitsOnly(inputQ);
digitsOnly(inputB);

function setHint(el, msg, kind) {
    el.textContent = msg;
    el.className = 'param-hint ' + (kind || '');
}

function tryBig(s) {
    if (!s || !/^\d+$/.test(s)) return null;
    try { return BigInt(s); } catch (_) { return null; }
}

function validateParamsLive() {
    var p = tryBig(inputP.value);
    var q = tryBig(inputQ.value);
    var b = tryBig(inputB.value);

    setHint(pHint, paramHintFor('p', p), paramHintKind('p', p));
    setHint(qHint, paramHintFor('q', q), paramHintKind('q', q));
    setHint(bHint, paramHintFor('b', b), paramHintKind('b', b));

    updateButtons();
}

function paramHintFor(name, v) {
    if (v === null) return 'не введено';
    if (name === 'p') {
        if (v <= 3n) return 'нужно > 3';
        if (v % 4n !== 3n) return 'нужно ≡ 3 (mod 4)';
        if (!isPrime(v)) return 'не простое';
        return '✓ p ≡ 3 mod 4';
    }
    if (name === 'q') {
        if (v <= 3511n) return 'нужно > 3511';
        if (v % 4n !== 3n) return 'нужно ≡ 3 (mod 4)';
        if (!isPrime(v)) return 'не простое';
        return '✓ q ≡ 3 mod 4';
    }
    if (name === 'b') {
        if (v <= 0n) return 'нужно > 0';
        if (v >= 10533n) return 'нужно < 10533';
        return '✓ натуральное < 10533';
    }
    return '';
}

function paramHintKind(name, v) {
    if (v === null) return '';
    return paramHintFor(name, v).startsWith('✓') ? 'valid' : 'invalid';
}

function paramsAllValid() {
    var p = tryBig(inputP.value);
    var q = tryBig(inputQ.value);
    var b = tryBig(inputB.value);
    if (p === null || q === null || b === null) return null;
    return { p: p, q: q, b: b };
}

function showErrors(errors) {
    if (!errors || errors.length === 0) {
        errorBoxEl.classList.remove('visible');
        errorBoxEl.innerHTML = '';
        return;
    }
    var html = '<strong>Ошибки валидации параметров:</strong><ul>';
    for (var i = 0; i < errors.length; i++) html += '<li>' + escapeHtml(errors[i]) + '</li>';
    html += '</ul>';
    errorBoxEl.innerHTML = html;
    errorBoxEl.classList.add('visible');
}

// → {p,q,b,n} или null
function getValidatedParams() {
    var raw = paramsAllValid();
    if (raw === null) {
        showErrors(['Введите p, q, b — целые положительные числа']);
        showStatus('Заполните все три параметра', 'error');
        return null;
    }
    var v = Rabin.validate(raw.p, raw.q, raw.b);
    if (!v.ok) {
        showErrors(v.errors);
        showStatus('Параметры не прошли валидацию', 'error');
        return null;
    }
    showErrors([]);
    return { p: raw.p, q: raw.q, b: raw.b, n: v.n };
}

// ---------- Файл ----------

fileInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;

    fileName = file.name;
    fileInfo.textContent = file.name + ' (' + formatSize(file.size) + ')';
    fileIsCipher = /\.rab$/i.test(file.name);

    var reader = new FileReader();
    reader.onload = function (e) {
        fileBytes = new Uint8Array(e.target.result);
        renderBytes(originalView, fileBytes, fileIsCipher ? 'cipher-text' : 'bytes');
        clearResult();
        updateButtons();
    };
    reader.readAsArrayBuffer(file);
});

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function updateButtons() {
    var hasFile = fileBytes !== null;
    var hasParams = paramsAllValid() !== null;
    btnEncrypt.disabled = !(hasFile && hasParams);
    btnDecrypt.disabled = !(hasFile && hasParams);
    btnDownload.disabled = resultBytes === null;
}

function clearResult() {
    resultBytes = null;
    resultIsCipher = false;
    cipherView.textContent = '';
    resultView.textContent = '';
    btnDownload.disabled = true;
}

// ---------- Шифрование / дешифрование ----------

btnEncrypt.addEventListener('click', function () {
    if (!fileBytes) return;
    var key = getValidatedParams();
    if (!key) return;
    showStatus('Шифрование…', 'info');
    setTimeout(function () {
        try {
            var ciphers = Rabin.encryptBytes(fileBytes, key.p, key.q, key.b);
            var text = Rabin.serializeCipher(ciphers);
            resultBytes = textToBytes(text);
            resultIsCipher = true;
            renderBytes(originalView, fileBytes, 'bytes');
            cipherView.textContent = previewCipherText(ciphers);
            resultView.textContent = '';
            showStatus('Зашифровано: ' + fileBytes.length + ' байт → ' +
                       ciphers.length + ' чисел (' + formatSize(resultBytes.length) + ')', 'success');
            updateButtons();
        } catch (e) {
            showStatus('Ошибка шифрования: ' + e.message, 'error');
        }
    }, 30);
});

btnDecrypt.addEventListener('click', function () {
    if (!fileBytes) return;
    var key = getValidatedParams();
    if (!key) return;
    showStatus('Расшифрование…', 'info');
    setTimeout(function () {
        try {
            var text = bytesToText(fileBytes);
            var ciphers = Rabin.parseCipher(text);
            cipherView.textContent = previewCipherText(ciphers);
            var decoded = Rabin.decryptCiphers(ciphers, key.p, key.q, key.b);
            resultBytes = decoded;
            resultIsCipher = false;
            renderBytes(resultView, decoded, 'bytes');
            showStatus('Расшифровано: ' + ciphers.length + ' чисел → ' +
                       decoded.length + ' байт', 'success');
            updateButtons();
        } catch (e) {
            showStatus('Ошибка расшифрования: ' + e.message, 'error');
        }
    }, 30);
});

btnDownload.addEventListener('click', function () {
    if (!resultBytes) return;
    var blob = new Blob([resultBytes], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = resultIsCipher ? (fileName + '.rab')
                                : (fileName.replace(/\.rab$/i, '') || 'decrypted.bin');
    a.click();
    URL.revokeObjectURL(url);
});

// ---------- Превью данных ----------

function renderBytes(target, bytes, mode) {
    if (mode === 'cipher-text') {
        // файл — шифр, читаем как текст
        var text = bytesToText(bytes);
        target.textContent = text.length > 4096 ? text.slice(0, 4096) + '\n…' : text;
        return;
    }
    // байты по 16 в строку
    var max = 512;
    var lines = [];
    var line = [];
    var limit = Math.min(bytes.length, max);
    for (var i = 0; i < limit; i++) {
        line.push(String(bytes[i]).padStart(3, ' '));
        if (line.length === 16) { lines.push(line.join(' ')); line = []; }
    }
    if (line.length) lines.push(line.join(' '));
    var trunc = bytes.length > max ? '\n… (' + bytes.length + ' байт всего)' : '';
    target.textContent = lines.join('\n') + trunc;
}

function previewCipherText(ciphers) {
    var max = 256;
    var head = ciphers.slice(0, max).map(function (c) { return c.toString(10); }).join(' ');
    return ciphers.length > max
        ? head + '\n… (' + ciphers.length + ' чисел всего)'
        : head;
}

// ---------- UTF-8 ↔ байты ----------

function textToBytes(text) {
    return new TextEncoder().encode(text);
}
function bytesToText(bytes) {
    return new TextDecoder('utf-8').decode(bytes);
}

// ---------- Статус ----------

function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
}

// ---------- Инициализация ----------

validateParamsLive();
updateButtons();
