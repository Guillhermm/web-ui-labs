# Web UI Labs

A small collection of frontend experiments focused on UI behavior, visual structure, and simple interaction logic.

Each project is self-contained and built with plain HTML, CSS, and JavaScript. No frameworks. No build steps.

The goal of this repository is experimentation, not production-ready components.

## Projects

### Calculator

A basic calculator interface implemented with HTML, CSS, and vanilla JavaScript.

The project focuses on UI layout and direct DOM interaction rather than advanced mathematical features.

**Live demo:** https://codepen.io/guillhermm/pen/EayVqaW

**Notes:**

- Uses simple string-based expression evaluation.
- Percentage values are handled by converting `%` to `/100`.
- `eval()` is intentionally used for simplicity.
- No external libraries.

### Prime Binary Display

An interactive visualization of prime numbers represented in binary form.

Prime numbers are generated up to a configurable limit and grouped by their binary length (number of bits).  
Each prime is rendered as a block of binary digits for visual inspection.

**Live demo:** https://codepen.io/guillhermm/pen/YPWqbvb

**Technical details:**

- Prime generation is based on the Sieve of Eratosthenes.
- Results are cached to avoid unnecessary recomputation.
- Slider input is debounced to prevent excessive re-rendering.
- Rendering uses `DocumentFragment` for better performance.

## Notes

These projects are intended as experiments and learning exercises.
The code prioritizes clarity and directness over abstraction.
