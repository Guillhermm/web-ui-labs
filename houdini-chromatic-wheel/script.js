const root = document.documentElement;
const wheelElement = document.querySelector('.wheel');

const initFallbackWheel = () => {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'wheel';
  canvas.width = 360;
  canvas.height = 360;

  const scene = document.querySelector('.scene');
  scene.innerHTML = '';
  scene.appendChild(canvas);

  // Add fallback message
  const msg = document.createElement('div');
  msg.className = 'fallback-message';
  msg.textContent = "Your browser doesn’t support Houdini Paint API. This is a fallback version. For the full interactive effect, try Chrome or Edge!";
  scene.appendChild(msg);

  const ctx = canvas.getContext('2d');
  const size = 360;
  let t = 0;

  const draw = () => {
    const cx = size/2;
    const cy = size/2;
    const r = size/2 - 24;

    ctx.clearRect(0, 0, size, size);

    const strands = 220;
    for (let i = 0; i < strands; i++) {
      const p = i / strands;
      const angle = p * Math.PI * 2;

      const wave = Math.sin(angle * 6 + t) * 24 + Math.cos(angle * 3) * 6;
      const depth = Math.sin(angle + t);
      const radius = r + wave;

      ctx.beginPath();
      ctx.lineWidth = 2.2 + depth * 1.4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `hsl(${p*360 + t*40}, 100%, ${55 + depth*12}%)`;
      ctx.arc(cx, cy, radius, angle, angle + Math.PI/14);
      ctx.stroke();
    }

    t += 0.02;
    requestAnimationFrame(draw);
  };

  draw();
};

window.addEventListener('mousemove', e => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = (e.clientY / window.innerHeight) * 2 - 1;

  root.style.setProperty('--mx', x.toFixed(3));
  root.style.setProperty('--my', y.toFixed(3));

  wheelElement.style.transform = `
    rotateY(${x * 18}deg)
    rotateX(${-y * 18}deg)
  `;
});

if ('paintWorklet' in CSS) {
  // HOUINI: Chrome / Edge / Safari
  CSS.paintWorklet.addModule(URL.createObjectURL(new Blob([`
    class ColorWheel {
      static get inputProperties() {
        return ['--t', '--mx', '--my'];
      }

      paint(ctx, size, props) {
        const t = parseFloat(props.get('--t')) || 0;
        const mx = parseFloat(props.get('--mx')) || 0;
        const my = parseFloat(props.get('--my')) || 0;

        const cx = size.width / 2;
        const cy = size.height / 2;
        const r = Math.min(cx, cy);

        ctx.translate(cx, cy);

        const strands = 220;
        const depthAmp = 24;

        for (let i = 0; i < strands; i++) {
          const p = i / strands;
          const angle = p * Math.PI * 2;

          const wave = Math.sin(angle * 6 + t + mx * 2) * depthAmp +
                       Math.cos(angle * 3 + my * 2) * 6;

          const depth = Math.sin(angle + t);
          const radius = r - 24 + wave;

          ctx.beginPath();
          ctx.lineWidth = 2.2 + depth * 1.4;
          ctx.lineCap = 'round';
          ctx.strokeStyle = \`hsl(\${p*360 + t*40}, 100%, \${55 + depth*12}%)\`;
          ctx.arc(0, 0, radius, angle, angle + Math.PI / 14);
          ctx.stroke();
        }
      }
    }
    registerPaint('color-wheel', ColorWheel);
  `], { type: 'text/javascript' })));
} else {
  // FALLBACK: Firefox / other browsers
  initFallbackWheel();
}
