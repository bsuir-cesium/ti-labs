// Рабин: c = m*(m+b) mod n; дешифр через CRT

const Rabin = {
    validate(p, q, b) {
        const errors = [];
        const ok = (cond, msg) => { if (!cond) errors.push(msg); };

        if (typeof p !== 'bigint' || typeof q !== 'bigint' || typeof b !== 'bigint') {
            return { ok: false, errors: ['Параметры должны быть целыми числами'] };
        }

        ok(p > ZERO, 'p должно быть положительным');
        ok(q > ZERO, 'q должно быть положительным');
        ok(b > ZERO, 'b должно быть натуральным числом (b > 0)');
        if (errors.length) return { ok: false, errors };

        ok(isPrime(p), 'p должно быть простым числом');
        ok(isPrime(q), 'q должно быть простым числом');
        ok(p !== q, 'p и q должны быть различными');
        ok(p % 4n === 3n, 'p ≡ 3 (mod 4) — нарушено');
        ok(q % 4n === 3n, 'q ≡ 3 (mod 4) — нарушено');
        ok(p > 3n, 'p должно быть больше 3 (рекомендация для однозначной расшифровки)');
        ok(q > 3511n, 'q должно быть больше 3511 (рекомендация для однозначной расшифровки)');
        ok(b < 10533n, 'b должно быть меньше 10533 (рекомендация для однозначной расшифровки)');

        if (errors.length) return { ok: false, errors };
        const n = p * q;
        ok(n > 256n, 'n = p*q должно быть больше 256, чтобы шифровать любой байт');
        if (errors.length) return { ok: false, errors };

        return { ok: true, errors: [], n };
    },

    // Uint8Array → BigInt[]
    encryptBytes(bytes, p, q, b) {
        const n = p * q;
        const out = new Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            const m = BigInt(bytes[i]);
            out[i] = (m * (m + b)) % n;
        }
        return out;
    },

    serializeCipher(ciphers) {
        return ciphers.map(c => c.toString(10)).join(' ');
    },

    parseCipher(text) {
        const tokens = text.trim().split(/\s+/).filter(Boolean);
        return tokens.map(t => {
            if (!/^\d+$/.test(t)) {
                throw new Error('Шифр-файл повреждён: неверный токен "' + t + '"');
            }
            return BigInt(t);
        });
    },

    decryptCiphers(ciphers, p, q, b) {
        const n = p * q;
        const ee = extEuclid(p, q);
        if (ee.d1 !== ONE) {
            throw new Error('p и q не взаимно просты — невозможно применить CRT');
        }
        const yp = ee.x1; // x1*p + y1*q = 1
        const yq = ee.y1;

        const out = new Uint8Array(ciphers.length);
        for (let i = 0; i < ciphers.length; i++) {
            const c = ciphers[i];
            // D = b^2 + 4c (mod n)
            const D = mod(b * b + 4n * c, n);
            // √D mod p и √D mod q
            const mp = sqrtModPrime(mod(D, p), p);
            const mq = sqrtModPrime(mod(D, q), q);
            // Четыре корня √D mod n
            const roots = crtFourRoots(mp, mq, p, q, yp, yq);

            // t = di - b mod n; m = t чётно ? t/2 : (t+n)/2; первый m < 256
            let found = -1;
            for (const di of roots) {
                const t = mod(di - b, n);
                let m;
                if (t % TWO === ZERO) m = (t / TWO) % n;
                else m = ((t + n) / TWO) % n;
                if (m < 256n) {
                    found = Number(m);
                    break;
                }
            }
            if (found < 0) {
                throw new Error(
                    'Не удалось однозначно расшифровать байт #' + i +
                    ' (c=' + c.toString() + '). ' +
                    'Подберите параметры p, q, b так, чтобы среди четырёх корней ровно один был < 256.'
                );
            }
            out[i] = found;
        }
        return out;
    },
};
