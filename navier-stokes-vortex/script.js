'use strict';

const Vortex = (() => {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const FLOW = Object.freeze({
    circulation: 0.9,
    coreRadius: 0.28,
    stretch: 0.35,
    spawnHeight: [0, 0.05],
    upwardBias: 0.56,
    trail: 34,
  });

  const LAYERS = Object.freeze([
    [0.00, 0.09, 0.10, 0.8, 1.00, 0.10, 1.3],
    [0.33, 0.19, 0.21, 0.8, 0.82, 0.10, 1.3],
    [0.38, 0.24, 0.30, 0.6, 0.66, 0.08, 1.05],
    [0.70, 0.37, 0.46, 0.6, 0.48, 0.07, 0.95],
    [0.74, 0.37, 0.58, 0.24, 0.30, 0.04, 0.6],
    [1.00, 0.40, 1.15, 0.22, 0.06, 0.04, 0.5],
  ]);

  const LAYER_BANDS = Object.freeze([[0.38, 0.3], [0.74, 0.22], [1, 0.48]]);

  const pickLayer = (u) => {
    let from = 0;
    let below = 0;
    for (const [to, share] of LAYER_BANDS) {
      if (u < below + share) return from + (to - from) * ((u - below) / share);
      from = to;
      below += share;
    }
    return 1;
  };

  const layerShape = (layer) => {
    const k = Math.min(Math.max(LAYERS.findIndex(([at]) => at >= layer), 1), LAYERS.length - 1);
    const a = LAYERS[k - 1];
    const b = LAYERS[k];
    const f = clamp((layer - a[0]) / (b[0] - a[0]), 0, 1);
    const [, end, middle, belly, tone, rise, ceiling] = a.map((v, i) => v + (b[i] - v) * f);
    return { end, middle, belly, tone, rise, ceiling };
  };

  const radiusAt = (shape, z) =>
    shape.end + (shape.middle - shape.end) * Math.exp(-((z / shape.belly) ** 2));

  const axialSpeed = (shape, z) => Math.sign(z || 1) * (shape.rise + FLOW.stretch * Math.abs(z));

  const omega = (r) => {
    const { circulation, coreRadius } = FLOW;
    return (circulation * (1 - Math.exp(-(r * r) / (coreRadius * coreRadius)))) / (r * r);
  };

  const relativeSpin = (r) => omega(r) / omega(1);

  const motion = ({ shape, z }) => {
    const uz = axialSpeed(shape, z);
    const slope = (-2 * z / shape.belly ** 2) * (shape.middle - shape.end) * Math.exp(-((z / shape.belly) ** 2));
    return { ur: slope * uz, uz };
  };

  const phaseOf = (p) => {
    const { ur, uz } = motion(p);
    return Math.abs(ur) > Math.abs(uz) ? 'inward' : 'axial';
  };

  const createTracer = () => ({
    layer: 0, shape: layerShape(0), r: 0, theta: 0, z: 0,
    age: 0, len: 0, head: 0, generation: 0,
    pts: new Float32Array(FLOW.trail * 3),
  });

  const spawn = (p, { random = Math.random } = {}) => {
    p.layer = pickLayer(random());
    p.shape = layerShape(p.layer);
    p.theta = random() * Math.PI * 2;
    const [low, high] = FLOW.spawnHeight;
    p.z = (random() < FLOW.upwardBias ? 1 : -1) * (low + random() * (high - low));
    p.r = radiusAt(p.shape, p.z);
    p.age = 0;
    p.len = 0;
    p.head = 0;
    p.generation += 1;
    return p;
  };

  const advanceHeight = (shape, z, dt) =>
    z + axialSpeed(shape, z + axialSpeed(shape, z) * dt / 2) * dt;

  const step = (p, dt, { random = Math.random, spin = 1, record = true } = {}) => {
    const { trail } = FLOW;
    p.theta += omega(p.r) * spin * dt;
    p.z = advanceHeight(p.shape, p.z, dt);
    p.r = radiusAt(p.shape, p.z);
    p.age += dt;
    if (Math.abs(p.z) > p.shape.ceiling) spawn(p, { random });
    else if (!record) return p;
    p.head = (p.head + 1) % trail;
    const i = p.head * 3;
    p.pts[i] = p.r * Math.cos(p.theta);
    p.pts[i + 1] = p.z;
    p.pts[i + 2] = p.r * Math.sin(p.theta);
    p.len = Math.min(p.len + 1, trail);
    return p;
  };

  const predictPath = (p, { horizon = 6, maxTurn = 0.25 } = {}) => {
    const path = [];
    let { r, theta, z } = p;
    for (let t = 0; t < horizon && path.length < 600;) {
      const spin = omega(r);
      const dt = Math.min(0.08, maxTurn / spin);
      theta += spin * dt;
      z = advanceHeight(p.shape, z, dt);
      r = radiusAt(p.shape, z);
      t += dt;
      if (Math.abs(z) > p.shape.ceiling) break;
      path.push([r * Math.cos(theta), z, r * Math.sin(theta)]);
    }
    return path;
  };

  const COLLAPSE = Object.freeze({
    duration: 5,
    minScale: 0.3,
    anisotropy: 0.2,
    reach: 0.65,
    maxRate: 4,
    restore: 1.6,
  });

  const collapseScale = (t) => Math.max(1 - t / COLLAPSE.duration, 0);

  const drawnScale = (scale) => Math.max(scale, COLLAPSE.minScale);

  const axialScale = (radial) => radial ** (1 - 2 * COLLAPSE.anisotropy);

  const contraction = (r, radial) => {
    const weight = Math.exp(-((r / COLLAPSE.reach) ** 2));
    return {
      kr: 1 - weight * (1 - radial),
      kz: 1 - weight * (1 - axialScale(radial)),
    };
  };

  const timeRate = (scale) => Math.min(1 / scale, COLLAPSE.maxRate);

  const STOPS = Object.freeze([
    [0, [67, 208, 220]], [0.35, [30, 168, 200]], [0.6, [44, 108, 216]],
    [0.78, [118, 122, 178]], [0.9, [230, 152, 76]], [1, [246, 172, 84]],
  ]);
  const PALETTE_SIZE = 64;
  const OMEGA_RIM = omega(1.1);
  const OMEGA_CORE = omega(0.14);

  const interpolate = (stops, s) => {
    const k = Math.max(stops.findIndex(([at]) => at >= s), 1);
    const [a, ca] = stops[k - 1];
    const [b, cb] = stops[k];
    const f = clamp((s - a) / (b - a), 0, 1);
    return ca.map((c, j) => Math.round(c + (cb[j] - c) * f));
  };

  const PALETTE = Array.from({ length: PALETTE_SIZE }, (_, i) => {
    const rgb = interpolate(STOPS, i / (PALETTE_SIZE - 1));
    const light = rgb.map((c) => Math.round(c + (255 - c) * 0.5));
    return { base: `rgb(${rgb})`, light: `rgb(${light})` };
  });

  const speedFraction = (r, spin = 1) =>
    clamp(Math.log((omega(r) * spin) / OMEGA_RIM) / Math.log(OMEGA_CORE / OMEGA_RIM), 0, 1);

  const colorAt = (tone) => PALETTE[Math.round(clamp(tone, 0, 1) * (PALETTE_SIZE - 1))];

  const colorOf = (r, spin = 1) => colorAt(speedFraction(r, spin));

  const layerTone = (layer) => layerShape(layer).tone;

  const toneOf = ({ shape }, spin = 1) =>
    (spin === 1 ? shape.tone : shape.tone + (1 - shape.tone) * (1 - 1 / spin));

  const highlightBand = (center, halfWidth) => {
    const c = clamp(center, halfWidth, 1 - halfWidth);
    return [c - halfWidth, c + halfWidth];
  };

  const formatPlayback = (rate) => (rate === 0 ? 'paused' : `${rate}×`);

  const rampGradient = () =>
    `linear-gradient(to right, ${STOPS.map(([at, rgb]) => `rgb(${rgb}) ${at * 100}%`).join(', ')})`;

  const createCamera = ({ yaw = 0, pitch = -0.33, distance = 5 } = {}) => {
    let cosY = 1, sinY = 0, cosP = 1, sinP = 0;
    let radialScale = 1;
    const orient = (y, p) => {
      cosY = Math.cos(y);
      sinY = Math.sin(y);
      cosP = Math.cos(p);
      sinP = Math.sin(p);
    };
    orient(yaw, pitch);

    const setContraction = (scale) => { radialScale = scale; };
    const squeeze = (r) => (radialScale === 1 ? { kr: 1, kz: 1 } : contraction(r, radialScale));
    const depthOf = (p) => {
      const i = p.head * 3;
      const z1 = -p.pts[i] * sinY + p.pts[i + 2] * cosY;
      return p.pts[i + 1] * sinP + z1 * cosP;
    };

    const sideOf = (p) => {
      const i = p.head * 3;
      return -p.pts[i] * sinY + p.pts[i + 2] * cosY;
    };

    const point = (x0, y0, z0, { cx, cy, scale }, { contract = true } = {}) => {
      const { kr, kz } = contract ? squeeze(Math.hypot(x0, z0)) : { kr: 1, kz: 1 };
      const x = x0 * kr;
      const y = y0 * kz;
      const z = z0 * kr;
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const yc = y * cosP - z1 * sinP;
      const zc = y * sinP + z1 * cosP;
      const f = distance / (distance - zc);
      return { x: cx + x1 * f * scale, y: cy - yc * f * scale, f, depth: zc, side: z1 };
    };

    const project = (p, out, { cx, cy, scale }) => {
      const { trail } = FLOW;
      for (let k = 0; k < p.len; k++) {
        const i = ((p.head - k + trail) % trail) * 3;
        const { kr, kz } = squeeze(Math.hypot(p.pts[i], p.pts[i + 2]));
        const x = p.pts[i] * kr;
        const y = p.pts[i + 1] * kz;
        const z = p.pts[i + 2] * kr;
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const yc = y * cosP - z1 * sinP;
        const zc = y * sinP + z1 * cosP;
        const f = distance / (distance - zc);
        out[k * 3] = cx + x1 * f * scale;
        out[k * 3 + 1] = cy - yc * f * scale;
        out[k * 3 + 2] = f;
      }
      return out;
    };

    return { orient, setContraction, squeeze, depthOf, sideOf, point, project };
  };

  const pickNearest = (heads, x, y, radius) => {
    let best = -1;
    let bestDistance = radius * radius;
    for (let i = 0; i < heads.length / 2; i++) {
      const dx = heads[i * 2] - x;
      const dy = heads[i * 2 + 1] - y;
      const d = dx * dx + dy * dy;
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    }
    return best;
  };

  const CHUNKS = 6;
  const AXIS_LENGTH = 1.45;

  const trailAlpha = (p) => {
    const fadeIn = Math.min(p.age / 0.8, 1);
    const fadeOut = Math.min((p.shape.ceiling - Math.abs(p.z)) / 0.25, 1);
    return Math.max(fadeIn * fadeOut, 0);
  };

  const fog = (depth) => 0.45 + 0.55 * clamp((depth + 1.3) / 2.6, 0, 1);

  const drawTrail = (ctx, p, screen, unit, opacity, spin) => {
    const n = p.len;
    const alpha = trailAlpha(p) * opacity;
    if (n < 3 || alpha <= 0.01) return;
    const color = colorAt(toneOf(p, spin));
    const width = (2 + 3 * p.layer) * screen[2] * (unit / 230);
    for (let c = CHUNKS - 1; c >= 0; c--) {
      const from = Math.floor((c * (n - 1)) / CHUNKS);
      const to = Math.floor(((c + 1) * (n - 1)) / CHUNKS);
      const fall = 1 - c / CHUNKS;
      ctx.beginPath();
      ctx.moveTo(screen[from * 3], screen[from * 3 + 1]);
      for (let k = from + 1; k <= to; k++) ctx.lineTo(screen[k * 3], screen[k * 3 + 1]);
      ctx.lineCap = c === 0 ? 'round' : 'butt';
      ctx.globalAlpha = alpha * fall;
      ctx.strokeStyle = color.base;
      ctx.lineWidth = width * (0.35 + 0.65 * fall);
      ctx.stroke();
      if (c < 3) {
        ctx.globalAlpha = alpha * fall * 0.6;
        ctx.strokeStyle = color.light;
        ctx.lineWidth = width * 0.3;
        ctx.stroke();
      }
    }
  };

  const createRenderer = (ctx, camera, tracers) => {
    const screen = new Float32Array(FLOW.trail * 3);
    const heads = new Float32Array(tracers.length * 2).fill(NaN);
    const order = tracers.map((p, index) => ({ p, index, depth: 0, side: 0 }));

    const spinOf = (p) => 1 / camera.squeeze(p.r).kr ** 2;

    const arrowhead = (tip, from, size) => {
      const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x - size * Math.cos(angle - 0.4), tip.y - size * Math.sin(angle - 0.4));
      ctx.lineTo(tip.x - size * Math.cos(angle + 0.4), tip.y - size * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    };

    const drawAxis = (view, color) => {
      const bottom = camera.point(0, -AXIS_LENGTH, 0, view, { contract: false });
      const top = camera.point(0, AXIS_LENGTH, 0, view, { contract: false });
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(bottom.x, bottom.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      arrowhead(top, bottom, 9);
      arrowhead(bottom, top, 9);
    };

    const drawFocus = (p, view) => {
      const spin = spinOf(p);
      const color = colorAt(toneOf(p, spin));
      const path = predictPath(p);
      camera.project(p, screen, view);
      if (p.len > 0 && path.length > 1) {
        ctx.save();
        ctx.setLineDash([2, 6]);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = color.light;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(screen[0], screen[1]);
        path.forEach(([x, y, z]) => {
          const s = camera.point(x, y, z, view);
          ctx.lineTo(s.x, s.y);
        });
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.shadowColor = color.base;
      ctx.shadowBlur = 14;
      drawTrail(ctx, p, screen, view.unit * 1.6, 1, spin);
      ctx.restore();
      if (p.len > 0) {
        ctx.globalAlpha = trailAlpha(p);
        ctx.strokeStyle = color.light;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(screen[0], screen[1], 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const drawFlash = (view, strength, color) => {
      const radius = view.unit * (0.15 + 1.2 * (1 - strength));
      const glow = ctx.createRadialGradient(view.cx, view.cy, 0, view.cx, view.cy, radius);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = strength;
      ctx.fillStyle = glow;
      ctx.fillRect(view.cx - radius, view.cy - radius, radius * 2, radius * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(view.cx, view.cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    };

    const render = (view, {
      focus = -1, band = null, axisColor, flash = 0, flashColor,
    } = {}) => {
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.lineJoin = 'round';
      order.forEach((entry) => {
        entry.depth = camera.depthOf(entry.p);
        entry.side = camera.sideOf(entry.p);
      });
      order.sort((a, b) => a.depth - b.depth); // back to front

      const dimmed = focus >= 0 || band !== null;
      const opacityOf = ({ p, index, depth }) => {
        if (index === focus) return 0; // drawn last, on top
        if (!dimmed) return fog(depth);
        const s = toneOf(p, spinOf(p));
        const lit = band !== null && s >= band[0] && s <= band[1];
        return fog(depth) * (lit ? 1 : 0.12);
      };
      const drawEntry = (entry) => {
        const { p, index } = entry;
        camera.project(p, screen, view);
        const pickable = p.len > 0 && trailAlpha(p) > 0.2;
        heads[index * 2] = pickable ? screen[0] : NaN;
        heads[index * 2 + 1] = pickable ? screen[1] : NaN;
        const opacity = opacityOf(entry);
        if (opacity > 0) drawTrail(ctx, p, screen, view.unit, opacity, spinOf(p));
      };

      order.forEach((entry) => { if (entry.side < 0) drawEntry(entry); });
      drawAxis(view, axisColor);
      order.forEach((entry) => { if (entry.side >= 0) drawEntry(entry); });
      if (focus >= 0) drawFocus(tracers[focus], view);
      if (flash > 0) drawFlash(view, flash, flashColor);
      ctx.globalAlpha = 1;
    };

    return { heads, render };
  };

  return Object.freeze({
    FLOW, LAYERS, LAYER_BANDS, pickLayer, layerShape, radiusAt, axialSpeed, motion, omega, relativeSpin,
    phaseOf, createTracer, spawn, step, predictPath,
    COLLAPSE, collapseScale, drawnScale, axialScale, contraction, timeRate,
    STOPS, PALETTE, interpolate, speedFraction, colorAt, colorOf, layerTone, toneOf, highlightBand, formatPlayback, rampGradient,
    createCamera, pickNearest, trailAlpha, fog, createRenderer,
  });
})();

(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  const COUNT = 560;
  const MAX_DPR = 2;
  const SCALE = 0.33;
  const HOME = Object.freeze({ yaw: 0.108, pitch: 0.207 });
  const PITCH_LIMIT = [-1.25, 0.7];
  const DRAG_SPEED = 0.008;
  const HOVER_RADIUS = 22;
  const TAP_RADIUS = 34;
  const BAND = 0.09;
  const TOOLTIP_REFRESH = 0.15;
  const {
    FLOW, COLLAPSE, createTracer, spawn, step, createCamera, createRenderer, pickNearest,
    phaseOf, relativeSpin, collapseScale, drawnScale, contraction, timeRate, rampGradient,
    highlightBand, formatPlayback,
  } = Vortex;

  const $ = (selector) => document.querySelector(selector);
  const ui = {
    stage: $('.stage'),
    notes: [...document.querySelectorAll('.note')].map((el) => ({
      el, anchor: el.dataset.anchor.split(',').map(Number), opacity: -1,
    })),
    tooltip: $('.tooltip'),
    tipTitle: $('.tooltip-title'),
    tipText: $('.tooltip-text'),
    tipStats: $('.tooltip-stats'),
    hint: $('.hint'),
    legend: $('.legend'),
    legendNote: $('.legend .control-note'),
    legendBar: $('.legend-bar'),
    legendBand: $('.legend-band'),
    speed: $('.speed input'),
    speedValue: $('.speed-value'),
    blowup: $('.blowup'),
    blowupFill: $('.blowup-fill'),
    blowupStatus: $('.blowup-status'),
  };

  const ctx = canvas.getContext('2d');
  const camera = createCamera(HOME);
  const tracers = Array.from({ length: COUNT }, () => spawn(createTracer()));
  const renderer = createRenderer(ctx, camera, tracers);
  const media = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    coarse: window.matchMedia('(pointer: coarse)'),
  };
  const view = { width: 0, height: 0, cx: 0, cy: 0, scale: 1, unit: 1 };
  const theme = { axis: '', flash: '' };

  const state = {
    yaw: HOME.yaw, pitch: HOME.pitch, spinYaw: 0, spinPitch: 0, resetting: false,
    pointer: null,
    drag: null,
    hover: -1, pinned: -1, focusGeneration: 0,
    band: null,
    collapse: null,
    radial: 1, rate: 1, flash: 0, playback: 1,
    tooltipClock: 0, shownFocus: -1,
  };

  const readTheme = () => {
    const styles = getComputedStyle(document.documentElement);
    theme.axis = styles.getPropertyValue('--axis').trim();
    theme.flash = styles.getPropertyValue('--flash').trim();
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = width * SCALE;
    Object.assign(view, { width, height, cx: width / 2, cy: height / 2, scale: unit, unit });
  };

  const markInteracted = () => ui.hint.classList.add('is-done');

  const rotate = (dYaw, dPitch) => {
    state.yaw += dYaw;
    state.pitch = Math.min(Math.max(state.pitch + dPitch, PITCH_LIMIT[0]), PITCH_LIMIT[1]);
  };

  const resetView = () => {
    state.yaw = Math.atan2(Math.sin(state.yaw), Math.cos(state.yaw));
    state.spinYaw = 0;
    state.spinPitch = 0;
    state.resetting = true;
  };

  const updateOrbit = (dt) => {
    if (state.resetting) {
      const k = Math.min(dt * 6, 1);
      state.yaw += (HOME.yaw - state.yaw) * k;
      state.pitch += (HOME.pitch - state.pitch) * k;
      if (Math.abs(state.yaw - HOME.yaw) + Math.abs(state.pitch - HOME.pitch) < 1e-3) {
        state.resetting = false;
      }
    } else if (!state.drag) {
      rotate(state.spinYaw * dt, state.spinPitch * dt);
      const decay = Math.exp(-dt * 3.5);
      state.spinYaw *= decay;
      state.spinPitch *= decay;
    }
    camera.orient(state.yaw, state.pitch);
  };

  const focusIndex = () => (state.pinned >= 0 ? state.pinned : state.hover);

  const setPinned = (index) => {
    state.pinned = index;
    if (index >= 0) state.focusGeneration = tracers[index].generation;
  };

  const updateHover = () => {
    if (!state.pointer || state.drag || state.pinned >= 0) return;
    const { heads } = renderer;
    const current = state.hover;
    if (current >= 0) {
      const dx = heads[current * 2] - state.pointer.x;
      const dy = heads[current * 2 + 1] - state.pointer.y;
      if (dx * dx + dy * dy < (HOVER_RADIUS * 2) ** 2) return;
    }
    state.hover = pickNearest(heads, state.pointer.x, state.pointer.y, HOVER_RADIUS);
    if (state.hover >= 0) {
      state.focusGeneration = tracers[state.hover].generation;
      markInteracted();
    }
  };

  const dropStaleFocus = () => {
    const index = focusIndex();
    if (index >= 0 && tracers[index].generation !== state.focusGeneration) {
      state.pinned = -1;
      state.hover = -1;
    }
  };

  const localPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  canvas.addEventListener('pointerdown', (event) => {
    state.drag = { ...localPoint(event), moved: 0, time: event.timeStamp };
    canvas.setPointerCapture(event.pointerId);
    state.resetting = false;
    state.spinYaw = 0;
    state.spinPitch = 0;
    markInteracted();
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = localPoint(event);
    if (event.pointerType === 'mouse') state.pointer = point;
    if (!state.drag) return;
    const dx = point.x - state.drag.x;
    const dy = point.y - state.drag.y;
    const elapsed = Math.max((event.timeStamp - state.drag.time) / 1000, 1 / 120);
    rotate(dx * DRAG_SPEED, -dy * DRAG_SPEED);
    state.spinYaw = (dx * DRAG_SPEED) / elapsed;
    state.spinPitch = (-dy * DRAG_SPEED) / elapsed;
    state.drag = { ...point, moved: state.drag.moved + Math.abs(dx) + Math.abs(dy), time: event.timeStamp };
  });

  const endDrag = (event) => {
    if (!state.drag) return;
    if (state.drag.moved < 6) {
      const { x, y } = localPoint(event);
      const radius = event.pointerType === 'mouse' ? HOVER_RADIUS : TAP_RADIUS;
      setPinned(pickNearest(renderer.heads, x, y, radius));
      state.spinYaw = 0;
      state.spinPitch = 0;
    } else if (event.timeStamp - state.drag.time > 80) {
      state.spinYaw = 0;
      state.spinPitch = 0;
    }
    state.drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    state.pointer = null;
    state.hover = -1;
  });
  canvas.addEventListener('dblclick', resetView);

  canvas.addEventListener('keydown', (event) => {
    const turns = {
      ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08],
    };
    if (turns[event.key]) {
      event.preventDefault();
      state.resetting = false;
      rotate(...turns[event.key]);
      markInteracted();
    } else if (event.key === 'Escape') {
      setPinned(-1);
    } else if (event.key === 'r' || event.key === 'R' || event.key === 'Home') {
      resetView();
    }
  });

  const legend = { center: 0.5, pointer: false, focused: false };

  const showBand = () => {
    const active = legend.pointer || legend.focused;
    const [low] = highlightBand(legend.center, BAND);
    state.band = active ? highlightBand(legend.center, BAND) : null;
    ui.legend.classList.toggle('is-active', active);
    ui.legendBand.style.left = `${low * 100}%`;
  };

  const fractionAt = (event) => {
    const rect = ui.legendBar.getBoundingClientRect();
    return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  };

  document.documentElement.style.setProperty('--ramp', rampGradient());
  ui.legendBand.style.width = `${BAND * 200}%`;
  ui.legendBar.addEventListener('pointerenter', (event) => {
    legend.pointer = true;
    legend.center = fractionAt(event);
    showBand();
  });
  ui.legendBar.addEventListener('pointermove', (event) => {
    legend.center = fractionAt(event);
    showBand();
  });
  ui.legendBar.addEventListener('pointerdown', (event) => {
    // touch has no hover: highlight while the finger is on the bar
    legend.pointer = true;
    legend.center = fractionAt(event);
    ui.legendBar.setPointerCapture(event.pointerId);
    showBand();
  });
  const releaseLegend = (event) => {
    if (event.pointerType === 'mouse' && event.type === 'pointerup') return;
    legend.pointer = false;
    showBand();
  };
  ui.legendBar.addEventListener('pointerup', releaseLegend);
  ui.legendBar.addEventListener('pointercancel', releaseLegend);
  ui.legendBar.addEventListener('pointerleave', releaseLegend);
  ui.legend.addEventListener('focus', () => { legend.focused = true; showBand(); });
  ui.legend.addEventListener('blur', () => { legend.focused = false; showBand(); });
  ui.legend.addEventListener('keydown', (event) => {
    const moves = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 };
    if (!moves[event.key]) return;
    event.preventDefault();
    legend.center = highlightBand(legend.center + moves[event.key], BAND)[0] + BAND;
    showBand();
  });

  const setPlayback = () => {
    state.playback = Number(ui.speed.value);
    ui.speedValue.textContent = formatPlayback(state.playback);
  };
  ui.speed.addEventListener('input', setPlayback);

  const BLOWUP_STATUS = 'the core collapses at T*';

  const showBlowup = (text, progress) => {
    if (ui.blowupStatus.textContent !== text) ui.blowupStatus.textContent = text;
    ui.blowupFill.style.transform = `scaleX(${progress.toFixed(3)})`;
  };

  ui.blowup.addEventListener('click', () => {
    if (state.collapse) return;
    state.collapse = { t: 0, phase: 'collapsing' };
    setPinned(-1);
    state.hover = -1;
    ui.blowup.setAttribute('aria-busy', 'true');
  });

  const updateCollapse = (dt) => {
    state.flash = Math.max(state.flash - dt * 1.4, 0);
    const run = state.collapse;
    if (!run) return;
    run.t += dt;
    if (run.phase === 'collapsing') {
      const scale = collapseScale(run.t);
      state.radial = drawnScale(scale);
      state.rate = timeRate(scale);
      const speed = scale > 0.01 ? `×${(1 / scale).toFixed(1)}` : '→ ∞';
      showBlowup(`core ${(scale * 100).toFixed(0)}% · speed ${speed}`, 1 - scale);
      if (run.t >= COLLAPSE.duration) {
        Object.assign(run, { t: 0, phase: 'restoring' });
        state.flash = 1;
      }
    } else {
      const k = Math.min(run.t / COLLAPSE.restore, 1);
      const eased = k * k * (3 - 2 * k);
      state.radial = COLLAPSE.minScale + (1 - COLLAPSE.minScale) * eased;
      state.rate = 1;
      showBlowup('velocity unbounded at T*', 1 - eased);
      if (k >= 1) {
        state.collapse = null;
        state.radial = 1;
        ui.blowup.removeAttribute('aria-busy');
        showBlowup(BLOWUP_STATUS, 0);
      }
    }
  };

  const placeNotes = () => {
    const quiet = focusIndex() < 0 && state.band === null && !state.collapse;
    ui.notes.forEach((note) => {
      const [x, y, z] = note.anchor;
      const s = camera.point(x, y, z, view);
      const opacity = quiet ? (s.side >= -0.05 ? 1 : 0.35) : 0;
      note.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      if (opacity !== note.opacity) {
        note.el.style.opacity = String(opacity);
        note.opacity = opacity;
      }
    });
  };

  const PHASES = {
    inward: {
      title: 'Inward spiral',
      text: 'Drawn toward the axis while it circles it.',
    },
    axial: {
      title: 'Axial stretching',
      text: 'Flung along the axis as it spins up.',
    },
  };

  const updatePanel = (dt) => {
    const index = focusIndex();
    if (index < 0 || Number.isNaN(renderer.heads[index * 2])) {
      ui.tooltip.classList.remove('is-visible');
      state.shownFocus = -1;
      return;
    }
    const p = tracers[index];
    state.tooltipClock -= dt;
    if (state.shownFocus !== index || state.tooltipClock <= 0) {
      const phase = PHASES[phaseOf(p)];
      ui.tipTitle.textContent = phase.title;
      ui.tipText.textContent = phase.text;
      ui.tipStats.textContent =
        `Spinning ${(relativeSpin(p.r) * spinBoost(p.r)).toFixed(1)}× faster than the rim · radius ${p.r.toFixed(2)} · height ${p.z.toFixed(2)}`;
      ui.tooltip.classList.add('is-visible');
      state.shownFocus = index;
      state.tooltipClock = TOOLTIP_REFRESH;
    }
  };

  const spinBoost = (r) => (state.radial === 1 ? 1 : 1 / contraction(r, state.radial).kr ** 2);

  const stepOptions = { spin: 1, record: true };
  const advance = (dt, substeps = 1) => {
    const stride = Math.max(1, Math.round(substeps / 4));
    for (let i = 0; i < substeps; i++) {
      stepOptions.record = (substeps - 1 - i) % stride === 0;
      tracers.forEach((p) => {
        stepOptions.spin = spinBoost(p.r);
        step(p, dt / substeps, stepOptions);
      });
    }
  };

  const draw = () => {
    camera.setContraction(state.radial);
    renderer.render(view, {
      focus: focusIndex(),
      band: state.band,
      axisColor: theme.axis,
      flash: state.flash,
      flashColor: theme.flash,
    });
  };

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    updateOrbit(dt);
    updateCollapse(dt);
    const playback = state.collapse ? Math.max(state.playback, 1) : state.playback;
    if (playback > 0) {
      const speed = state.rate * playback;
      advance(dt * speed, Math.min(Math.ceil(speed / state.radial ** 2), 24));
    }
    dropStaleFocus();
    draw();
    updateHover();
    placeNotes();
    updatePanel(dt);
    requestAnimationFrame(frame);
  };

  if (media.reducedMotion.matches) ui.speed.value = '0';
  setPlayback();
  readTheme();
  if (media.coarse.matches) ui.legendNote.textContent = 'touch to highlight';
  ui.hint.textContent = media.coarse.matches
    ? 'Drag to orbit · tap a streamline to follow it'
    : 'Drag to orbit · hover a streamline to follow it, click to pin it';
  resize();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  const quiet = { record: false };
  tracers.forEach((p) => {
    for (let i = Math.floor(Math.random() * 160); i > 0; i--) step(p, 0.05, quiet);
  });
  for (let i = 0; i < 60; i++) advance(0.1);
  for (let i = 0; i < FLOW.trail; i++) advance(1 / 60);
  draw();
  requestAnimationFrame(frame);
})();
