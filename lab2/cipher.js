// Потоковое шифрование — XOR с ключом от LFSR

function streamCipher(data, initialStateStr) {
    const initialState = Array.from(initialStateStr, ch => parseInt(ch));
    const lfsr = new LFSR(initialState);

    const inputBytes = new Uint8Array(data);
    const totalBits = inputBytes.length * 8;
    const keyBits = lfsr.generateKeystream(totalBits, 50);

    const outputBytes = new Uint8Array(inputBytes.length);
    for (let byteIdx = 0; byteIdx < inputBytes.length; byteIdx++) {
        let outByte = 0;
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const inputBit = (inputBytes[byteIdx] >> (7 - bitIdx)) & 1;
            const keyBit = keyBits[byteIdx * 8 + bitIdx];
            outByte |= (inputBit ^ keyBit) << (7 - bitIdx);
        }
        outputBytes[byteIdx] = outByte;
    }

    return { result: outputBytes.buffer, keyBits: keyBits, lfsr: lfsr };
}

// Байты -> бинарная строка для отображения
function bufferToBinaryString(buffer, maxBytes = 256) {
    const bytes = new Uint8Array(buffer);
    const limit = Math.min(bytes.length, maxBytes);
    const lines = [];
    let line = [];

    for (let i = 0; i < limit; i++) {
        line.push(bytes[i].toString(2).padStart(8, '0'));
        if (line.length === 8) {
            lines.push(line.join(' '));
            line = [];
        }
    }
    if (line.length > 0)
        lines.push(line.join(' '));

    const truncated = bytes.length > maxBytes;
    return lines.join('\n') + (truncated ? '\n... (' + bytes.length + ' байт всего)' : '');
}

// Биты ключа -> строка для отображения
function keyBitsToBinaryString(keyBits, maxBits = 2048) {
    const limit = Math.min(keyBits.length, maxBits);
    const lines = [];
    let line = [];

    for (let i = 0; i < limit; i++) {
        line.push(keyBits[i]);
        if (line.length === 64) {
            lines.push(line.join(''));
            line = [];
        }
    }
    if (line.length > 0)
        lines.push(line.join(''));

    const truncated = keyBits.length > maxBits;
    return lines.join('\n') + (truncated ? '\n... (' + keyBits.length + ' бит всего)' : '');
}
