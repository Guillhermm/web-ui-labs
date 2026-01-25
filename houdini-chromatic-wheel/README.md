# Houdini Chromatic Wheel

An experimental, interactive chromatic wheel built with **CSS Houdini Paint API**, showcasing procedural graphics, custom CSS properties, and real-time user interaction.

The project explores generative art techniques using modern CSS features, with a graceful Canvas fallback for browsers that don’t support Houdini.

**Live demo:** https://codepen.io/guillhermm/pen/yyJgGVv

![Houdini Chromatic Wheel preview](./preview.png)

## Behavior

- The chromatic wheel is rendered using the **CSS Paint Worklet (Houdini)** when supported.
- Custom CSS properties (`--t`, `--mx`, `--my`) drive animation timing and interactivity.
- The wheel continuously animates over time using a CSS keyframe animation that updates `--t`.
- Mouse movement affects both the 3D rotation of the wheel using CSS transforms and the internal wave deformation, and color variation inside the paint worklet.
- The visual is composed of hundreds of arc “strands” arranged radially, with procedural wave distortion, depth-based stroke width variation, and dynamic HSL color cycling.
- A 3D perspective effect is applied using CSS `perspective` and `preserve-3d`.
- When the Paint API is **not supported** (e.g. Firefox), an equivalent wheel is rendered using an HTML `<canvas>`, with a subtle message to inform the user that a fallback version is being displayed.


## Notes

This is an experimental and visual-focused project.

It is not intended as a production-ready component, but rather as a demonstration of what’s possible with modern CSS Houdini APIs combined with procedural drawing techniques.

The fallback implementation ensures accessibility across browsers while highlighting the performance and expressiveness advantages of native CSS painting when available.