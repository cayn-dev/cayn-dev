/* Cayn cursor field: dependency-free WebGL, rendered only while a trail fades. */
(() => {
  'use strict';

  const OPTIONS = Object.freeze({
    points: 6,
    fps: 30,
    lifetime: 850,
    sampleInterval: 55,
    radius: 82,
    maxPixels: 480000,
    maxDpr: 1,
    darkOpacity: 0.065,
    lightOpacity: 0.045
  });
  const root = document.documentElement;
  const pointerQuery = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 841px)');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const samples = Array.from({ length: OPTIONS.points }, () => ({ x: 0, y: 0, time: -Infinity, strength: 0 }));
  const packed = new Float32Array(OPTIONS.points * 4);
  let canvas = null;
  let gl = null;
  let resources = null;
  let frame = 0;
  let lastFrame = -Infinity;
  let lastSample = -Infinity;
  let nextSample = 0;
  let width = 1;
  let height = 1;
  let pixelScale = 1;
  let failed = false;
  let contextLost = false;
  let away = false;

  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 v_uv;
    uniform vec2 u_view;
    uniform vec4 u_trail[${OPTIONS.points}];
    uniform float u_radius;
    uniform float u_opacity;
    uniform vec3 u_color;
    void main() {
      vec2 p = v_uv * u_view;
      float light = 0.0;
      for (int i = 0; i < ${OPTIONS.points}; i++) {
        vec4 point = u_trail[i];
        vec2 delta = (p - point.xy * u_view) / u_radius;
        float distance = length(delta);
        float age = point.z;
        float fade = (1.0 - age) * (1.0 - age) * point.w;
        // An asymmetric, thin wave spreads gently from each sampled position.
        float wave = distance + 0.018 * sin(delta.x * 13.0 + age * 5.0)
                              * sin(delta.y * 11.0 - age * 4.0);
        float band = (wave - (0.12 + age * 0.49)) / 0.032;
        float ring = exp(-band * band);
        float halo = exp(-distance * distance * 15.0) * 0.11;
        float edge = 1.0 - smoothstep(0.72, 0.94, distance);
        light += (ring * 0.6 + halo) * fade * edge;
      }
      float alpha = min(light * u_opacity, u_opacity);
      gl_FragColor = vec4(u_color, alpha);
    }
  `;

  const eligible = () => !away && !failed && !document.hidden
    && pointerQuery.matches && !motionQuery.matches
    && root.dataset.motion !== 'reduce'
    && root.dataset.experience === 'full'
    && root.dataset.experiencePrompt !== 'open';

  const clear = () => {
    if (!gl || contextLost) return;
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = lastSample = -Infinity;
    for (const sample of samples) sample.time = -Infinity;
    clear();
    if (canvas) canvas.hidden = true;
  };

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader unavailable');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Shader compilation unavailable');
    }
    return shader;
  };

  const resize = () => {
    stop();
    width = Math.max(1, innerWidth);
    height = Math.max(1, innerHeight);
    pixelScale = Math.min(devicePixelRatio || 1, OPTIONS.maxDpr, Math.sqrt(OPTIONS.maxPixels / (width * height)));
    if (!canvas || !gl || contextLost) return;
    canvas.width = Math.max(1, Math.round(width * pixelScale));
    canvas.height = Math.max(1, Math.round(height * pixelScale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const onLost = event => {
    event.preventDefault();
    contextLost = true;
    resources = null;
    stop();
  };
  const onRestored = () => {
    contextLost = false;
    // The next mouse movement rebuilds resources. No idle animation restarts.
    resize();
  };

  const dispose = () => {
    stop();
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      canvas.remove();
    }
    if (gl && !contextLost) {
      if (resources) {
        gl.deleteBuffer(resources.buffer);
        gl.deleteProgram(resources.program);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    resources = canvas = gl = null;
    contextLost = false;
  };

  const prepare = () => {
    if (contextLost) return false;
    if (resources) return true;
    let vs = null;
    let fs = null;
    let program = null;
    let buffer = null;
    try {
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'cursor-field';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('inert', '');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
        canvas.hidden = true;
        const background = document.querySelector('.bg');
        if (background) background.after(canvas); else document.body.prepend(canvas);
        gl = canvas.getContext('webgl', {
          alpha: true, antialias: false, depth: false, stencil: false,
          premultipliedAlpha: false, preserveDrawingBuffer: false,
          powerPreference: 'low-power', failIfMajorPerformanceCaveat: true
        });
        if (!gl) throw new Error('WebGL unavailable');
        canvas.addEventListener('webglcontextlost', onLost);
        canvas.addEventListener('webglcontextrestored', onRestored);
      }
      vs = compile(gl.VERTEX_SHADER, vertex);
      fs = compile(gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram();
      if (!program) throw new Error('Program unavailable');
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program link unavailable');
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Buffer unavailable');
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      resources = {
        program, buffer,
        view: gl.getUniformLocation(program, 'u_view'),
        trail: gl.getUniformLocation(program, 'u_trail[0]'),
        radius: gl.getUniformLocation(program, 'u_radius'),
        opacity: gl.getUniformLocation(program, 'u_opacity'),
        color: gl.getUniformLocation(program, 'u_color')
      };
      resize();
      return true;
    } catch {
      if (gl && !contextLost) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      failed = true;
      dispose();
      return false;
    } finally {
      if (gl && !contextLost) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }
    }
  };

  const draw = now => {
    frame = 0;
    if (!eligible() || contextLost || !resources) { stop(); return; }
    if (now - lastFrame < 1000 / OPTIONS.fps) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    let active = false;
    let left = width;
    let right = 0;
    let bottom = height;
    let top = 0;
    for (let i = 0; i < OPTIONS.points; i++) {
      const sample = samples[i];
      const age = Math.max(0, Math.min(1, (now - sample.time) / OPTIONS.lifetime));
      packed[i * 4] = sample.x / width;
      packed[i * 4 + 1] = sample.y / height;
      packed[i * 4 + 2] = age;
      packed[i * 4 + 3] = age < 1 ? sample.strength : 0;
      if (age < 1) {
        active = true;
        left = Math.min(left, sample.x - OPTIONS.radius);
        right = Math.max(right, sample.x + OPTIONS.radius);
        bottom = Math.min(bottom, sample.y - OPTIONS.radius);
        top = Math.max(top, sample.y + OPTIONS.radius);
      }
    }
    if (!active) { stop(); return; }
    clear();
    // Shade only the small rectangle occupied by the live cursor trail.
    const x = Math.max(0, Math.floor(left * pixelScale));
    const y = Math.max(0, Math.floor(bottom * pixelScale));
    const w = Math.min(canvas.width, Math.ceil(right * pixelScale)) - x;
    const h = Math.min(canvas.height, Math.ceil(top * pixelScale)) - y;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, Math.max(0, w), Math.max(0, h));
    gl.uniform2f(resources.view, width, height);
    gl.uniform4fv(resources.trail, packed);
    gl.uniform1f(resources.radius, OPTIONS.radius);
    const light = root.dataset.theme === 'light';
    gl.uniform1f(resources.opacity, light ? OPTIONS.lightOpacity : OPTIONS.darkOpacity);
    const tone = light ? 0.12 : 0.95;
    gl.uniform3f(resources.color, tone, tone, tone);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    canvas.hidden = false;
    frame = requestAnimationFrame(draw);
  };

  const pointerMove = event => {
    if (event.pointerType !== 'mouse' || !eligible() || !prepare()) return;
    const now = performance.now();
    if (now - lastSample < OPTIONS.sampleInterval) return;
    const previous = samples[(nextSample + OPTIONS.points - 1) % OPTIONS.points];
    const x = event.clientX;
    const y = height - event.clientY;
    if (now - lastSample < OPTIONS.lifetime && Math.hypot(x - previous.x, y - previous.y) < 2) return;
    const sample = samples[nextSample];
    sample.x = x;
    sample.y = y;
    sample.time = now;
    sample.strength = 0.9;
    nextSample = (nextSample + 1) % OPTIONS.points;
    lastSample = now;
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const sync = () => { if (!eligible()) stop(); };
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-experience', 'data-experience-prompt'] });
  pointerQuery.addEventListener('change', sync);
  motionQuery.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pointermove', pointerMove, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pagehide', () => { away = true; dispose(); });
  window.addEventListener('pageshow', () => { away = false; sync(); });
})();
