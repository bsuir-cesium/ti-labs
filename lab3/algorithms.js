const ZERO = 0n;
const ONE = 1n;
const TWO = 2n;

// a^z mod n по методичке; steps снимки {a1, z1, x, action}
function fastExpMod(a, z, n) {
    a = BigInt(a); z = BigInt(z); n = BigInt(n);
    let a1 = a % n, z1 = z, x = ONE;
    const steps = [{ a1, z1, x, action: 'init' }];
    while (z1 !== ZERO) {
        while ((z1 % TWO) === ZERO) {
            z1 = z1 / TWO;
            a1 = (a1 * a1) % n;
            steps.push({ a1, z1, x, action: 'square' });
        }
        z1 = z1 - ONE;
        x = (x * a1) % n;
        steps.push({ a1, z1, x, action: 'multiply' });
    }
    return { value: x, steps };
}

function extEuclid(a, b) {
    a = BigInt(a); b = BigInt(b);
    let d0 = a, d1 = b;
    let x0 = ONE, x1 = ZERO;
    let y0 = ZERO, y1 = ONE;
    const iterations = [{ q: null, d0, d1, x0, x1, y0, y1 }];
    while (d1 > ONE) {
        const q = d0 / d1;
        const d2 = d0 - q * d1;
        const x2 = x0 - q * x1;
        const y2 = y0 - q * y1;
        d0 = d1; d1 = d2;
        x0 = x1; x1 = x2;
        y0 = y1; y1 = y2;
        iterations.push({ q, d0, d1, x0, x1, y0, y1 });
    }
    return { x1, y1, d1, iterations };
}

function isPrime(n) {
    n = BigInt(n);
    if (n < TWO) return false;
    if (n === TWO || n === 3n) return true;
    if (n % TWO === ZERO) return false;
    if (n % 3n === ZERO) return false;
    for (let i = 5n; i * i <= n; i += 6n) {
        if (n % i === ZERO) return false;
        if (n % (i + TWO) === ZERO) return false;
    }
    return true;
}

function primeFactorsDistinct(n) {
    n = BigInt(n);
    const factors = [];
    let x = n;
    for (let p = TWO; p * p <= x; p++) {
        if (x % p === ZERO) {
            factors.push(p);
            while (x % p === ZERO) x /= p;
        }
    }
    if (x > ONE) factors.push(x);
    return factors;
}

// первообразные корни mod p
// g первообразный если g^((p-1)/qi) mod p ≠ 1 для каждого qi | p-1
function primitiveRoots(p) {
    p = BigInt(p);
    const phi = p - ONE;
    const factors = primeFactorsDistinct(phi);
    const roots = [];
    const table = [];
    for (let g = TWO; g < p; g++) {
        const checks = factors.map(q => ({
            q,
            exp: phi / q,
            value: fastExpMod(g, phi / q, p).value,
        }));
        const isRoot = checks.every(c => c.value !== ONE);
        table.push({ g, checks, isRoot });
        if (isRoot) roots.push(g);
    }
    return { roots, factors, table, phi };
}

function sqrtModPrime(d, p) {
    d = BigInt(d); p = BigInt(p);
    return fastExpMod(d, (p + ONE) / 4n, p).value;
}

function mod(a, n) {
    const r = a % n;
    return r < ZERO ? r + n : r;
}

function crtFourRoots(mp, mq, p, q, yp, yq) {
    const n = p * q;
    const A = mod(yp * p * mq + yq * q * mp, n);
    const B = mod(yp * p * mq - yq * q * mp, n);
    return [A, mod(n - A, n), B, mod(n - B, n)];
}
