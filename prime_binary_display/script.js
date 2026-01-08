let MAX_NUMBER = 510;

let cachedPrimes = [];
let cachedLimit = 0;

const slider = document.getElementById('limit-slider');

/**
 * Prevents full rerender on every pixel move
 */
const debounce = (fn, delay = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Add number slides
 */
slider.addEventListener(
  'input',
  debounce(() => {
    MAX_NUMBER = Number(slider.value);
    main();
  }, 120)
);

/**
 * Prime logic
 */
const isPrime = (num) => {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
};

const getPrimesUpTo = (limit) => {
  const sieve = new Uint8Array(limit + 1);
  const primes = [];

  for (let i = 2; i <= limit; i++) {
    if (!sieve[i]) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) {
        sieve[j] = 1;
      }
    }
  }
  return primes;
};

const getCachedPrimes = (limit) => {
  if (limit <= cachedLimit) {
    return cachedPrimes.filter(p => p <= limit);
  }
  cachedPrimes = getPrimesUpTo(limit);
  cachedLimit = limit;
  return cachedPrimes;
};

/**
 * Binary helpers
 */
const toBinaryString = (num) => num.toString(2);

const groupBits = (binaryStr) => {
  const groups = [];
  for (let i = binaryStr.length; i > 0; i -= 8) {
    groups.push(binaryStr.slice(Math.max(0, i - 8), i));
  }
  return groups.reverse();
};

/**
 * Rendering a prime block
 */
const createPrimeBlock = (prime, binary) => {
  const groups = groupBits(binary);

  const block = document.createElement('div');
  block.className = 'prime-block';
  block.title = `Decimal Value: ${prime}`;

  const valueSpan = document.createElement('div');
  valueSpan.className = 'prime-value';
  valueSpan.textContent = prime;
  block.appendChild(valueSpan);

  const groupContainer = document.createElement('div');
  groupContainer.className = 'binary-group-container';
  block.appendChild(groupContainer);

  groups.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'binary-group';

    const padded = group.padStart(8, '0');

    for (const bit of padded) {
      const bitSpan = document.createElement('span');
      bitSpan.className = `bit bit-${bit}`;
      bitSpan.textContent = bit;
      groupDiv.appendChild(bitSpan);
    }
    
    groupContainer.appendChild(groupDiv);
  });

  return block;
};

/**
 * Main function
 */
const main = () => {
  const maxDisplay = document.getElementById('max-number-display');
  const outputDiv = document.getElementById('output');

  outputDiv.innerHTML = '';

  const primes = getCachedPrimes(MAX_NUMBER);

  const bitsGroups = new Map();
  const bitsCount = new Map();
  const fragment = document.createDocumentFragment();

  primes.forEach(prime => {
    const binary = toBinaryString(prime);
    const bits = binary.length;

    bitsCount.set(bits, (bitsCount.get(bits) || 0) + 1);

    let bitsGroup = bitsGroups.get(bits);
    if (!bitsGroup) {
      bitsGroup = document.createElement('div');
      bitsGroup.dataset.bits = bits;

      const title = document.createElement('h2');
      bitsGroup.appendChild(title);

      bitsGroups.set(bits, bitsGroup);
      fragment.appendChild(bitsGroup);
    }

    // bitsGroup.appendChild(createPrimeBlock(prime, binary));
    const block = createPrimeBlock(prime, binary);
    block.style.animationDelay = `${bitsCount.get(bits) * 50}ms`;
    bitsGroup.appendChild(block);
    maxDisplay.textContent = prime;

  });

  bitsGroups.forEach((group, bits) => {
    group.querySelector('h2').textContent =
      `${bitsCount.get(bits)} primes of ${bits} bits`;
  });

  outputDiv.appendChild(fragment);
};

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
