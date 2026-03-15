// LFSR — x^33 + x^13 + 1, регистр 33 бита

class LFSR {
    constructor(initialState) {
        if (initialState.length !== 33)
            throw new Error('Начальное состояние должно содержать ровно 33 бита');
        if (initialState.every(b => b === 0))
            throw new Error('Начальное состояние не может быть нулевым');

        // reg[0] = b33, reg[32] = b1
        this.reg = initialState.slice();
        this.history = [];
    }

    _feedback() {
        return this.reg[0] ^ this.reg[20]; // b33 XOR b13
    }

    step() {
        const outputBit = this.reg[0];
        const newBit = this._feedback();

        for (let i = 0; i < 32; i++)
            this.reg[i] = this.reg[i + 1];
        this.reg[32] = newBit;

        return outputBit;
    }

    generateKeystream(bitLength, maxHistory = 60) {
        this.history = [];
        const keyBits = new Uint8Array(bitLength);

        this.history.push({
            tact: 0,
            state: this.reg.slice(),
            xorBit: this._feedback()
        });

        for (let i = 0; i < bitLength; i++) {
            const bit = this.step();
            keyBits[i] = bit;

            if (i < maxHistory) {
                this.history.push({
                    tact: i + 1,
                    state: this.reg.slice(),
                    xorBit: this._feedback()
                });
            }
        }

        return keyBits;
    }

    exportHistoryCSV() {
        const headers = ['Такт'];
        for (let i = 33; i >= 1; i--)
            headers.push('b' + i);
        headers.push('XOR');

        const rows = [headers.join(';')];

        for (const entry of this.history) {
            const row = [entry.tact];
            for (let i = 0; i < 33; i++)
                row.push(entry.state[i]);
            row.push(entry.xorBit);
            rows.push(row.join(';'));
        }

        return rows.join('\n');
    }
}
