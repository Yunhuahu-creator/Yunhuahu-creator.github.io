(()=>{
function createCoverGlass(root,decorative=false){
/*
  "The liquid glass button" from Animorio · https://animorio.com
  License: free on your own sites and your clients’ sites, paid work included.
  Not for resale, redistribution, templates or code collections · https://animorio.com/en/license/
*/
/* The liquid glass button
   A pill of thick glass over its own small picture, a rounded cobalt panel where two lines of big type slide past
   each other behind it, never stopping. The glass really bends what is behind it, in every browser, because picture
   and glass are drawn by the same WebGL canvas: first the picture into a texture, then the glass, which reads that
   texture bent. In the flat middle the glass magnifies a little; on the curved rim it reaches out for what lies just
   outside its edge and squeezes it in, more and more towards the edge, red a little less than blue, so the letters
   crossing the rim bend and split into a faint rainbow. A bright line runs along the rim on the side facing the
   pointer. The size of the pill hangs on springs: it swells under the pointer, flattens and thickens when pressed and
   wobbles back when released, and the bending changes with the shape because it is computed from it. Clicked, it
   shrinks to a round drop with a spinner while two seats are held, then grows into the answer with a mint tint. The
   words on the glass turn dark where a light letter passes under them, and light again over the blue. */

/* ---- values to change ---- */
const ROWS = ['Look', 'Through'];        /* the two lines of type that slide behind the glass */
const DRIFT = 52;                        /* how fast the type slides, in pixels a second */
const BEND = 44;                         /* how far the rim of the glass reaches out for what lies outside it, in pixels */
const BEVEL = 30;                        /* how wide the curved rim of the glass is, in pixels */
const ZOOM = 0.07;                       /* how much the flat middle of the glass magnifies */
const PRISM = 0.16;                      /* how far apart red and blue bend on the rim: the rainbow */
const FROST = 1.6;                       /* the blur inside the glass, in pixels */
const SPRING = [420, 13];                /* the spring of the glass: stiffness, and damping (lower, more wobble) */
const SQUISH = 0.16;                     /* how much the glass flattens when pressed */
const HOLD = 2;                          /* the seconds spent holding the seats */
const DONE = 3.6;                        /* the seconds the button says the seats are held before going back */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const btn = root.querySelector('[data-btn]');
const slot = root.querySelector('[data-slot]');
const canvas = root.querySelector('[data-canvas]');
const hintEl = root.querySelector('[data-hint]');
const live = root.querySelector('[data-live]');
const faces = Object.fromEntries([...root.querySelectorAll('[data-face]')].map((f) => [f.dataset.face, f]));
const HINT = hintEl.textContent.trim();
const TAP = matchMedia('(hover: none)').matches ? 'Tap' : 'Click';
const PAD = 34;                 /* the room on either side of the words, inside the glass */

/* ---------------------------------------------------------------- colours, from the CSS */
const probe = document.createElement('canvas').getContext('2d');
function rgb(name) {
  probe.fillStyle = '#000';
  probe.fillStyle = getComputedStyle(root).getPropertyValue(name).trim() || '#000';
  const n = parseInt(probe.fillStyle.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

/* ---------------------------------------------------------------- the state of the glass */
/* each number hangs on a spring: where it is, how fast it moves, where it wants to go */
const spring = (x) => ({ x, v: 0, to: x });
const g = { w: spring(0), h: spring(0), ox: spring(0), oy: spring(0), thick: spring(1) };
const look = { show: 0, rows: 0, tint: 0.35, label: 1, ly: 0, spin: 0, check: 1 };
let state = 'idle';             /* idle, busy, done */
let face = 'rest';              /* the words on the glass: rest, busy, done */
let hover = false;
let pressed = false;
let ready = false;
let pointer = null;             /* the last pointer position, or null for the slow light of nobody */
const light = { x: -0.6, y: -0.8 };
const widths = { rest: 220, busy: 76, done: 260 };
let H = 76;
let PW = 0;                     /* the panel, in CSS pixels */
let PH = 0;
let DPR = 1;
const band = { y: 0, row: 88, gap: 9 };
const centre = { x: 0, y: 0 };  /* the middle of the panel on the screen: the pointer is measured from it */
let time = REDUCED ? 7.3 : 0;
let spinTime = 0;
let holdCall = null;
let backCall = null;
let hintTl = null;
let hintBack = null;

/* ---------------------------------------------------------------- WebGL */
/* two passes, so the picture is never read more than a few times per pixel (WebGL in software must keep up too):
   1. the picture, the cobalt plus the two lines of type, into a texture the size of the panel, and copied to the
      canvas;
   2. the glass, only inside its own rectangle: it reads the picture texture, bent, three times. */
const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
  || canvas.getContext('experimental-webgl');
if (!gl) document.documentElement.classList.add('no-gl');

const VERTEX = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0., 1.); }`;

/* pass 1: the picture, the two lines of type sliding past each other over the cobalt */
const ORIGINAL_PICTURE = `
  precision highp float;
  uniform vec2 res;
  uniform float dpr;
  uniform float time;
  uniform vec3 ground;
  uniform sampler2D rowA;
  uniform sampler2D rowB;
  uniform vec3 band;
  uniform vec2 period;
  uniform float drift;
  uniform float rowsIn;
  vec4 row(sampler2D tex, vec2 p, float top, float shift, float width) {
    float v = (p.y - top) / band.y;
    float inside = step(0., v) * step(v, 1.);
    return texture2D(tex, vec2(fract((p.x + shift) / width), clamp(v, 0., 1.))) * inside * rowsIn;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / (res * dpr);
    vec2 p = vec2(uv.x, 1. - uv.y) * res;
    vec3 col = ground;
    /* the textures are premultiplied: over is col * (1 - a) + rgb */
    vec4 a = row(rowA, p, band.x - band.z * 0.5 - band.y, time * drift, period.x);
    col = col * (1. - a.a) + a.rgb;
    vec4 b = row(rowB, p, band.x + band.z * 0.5, -time * drift * 0.82 + period.y * 0.41, period.y);
    col = col * (1. - b.a) + b.rgb;
    gl_FragColor = vec4(col, 1.);
  }`;

// Site integration: sample the live cover crop instead of the original cobalt/type backdrop.
const PICTURE = `precision highp float; uniform vec2 res; uniform float dpr; uniform sampler2D backdrop; void main(){vec2 uv=gl_FragCoord.xy/(res*dpr);gl_FragColor=texture2D(backdrop,vec2(uv.x,1.-uv.y));}`;
/* the copy of the picture to the canvas */
const COPY = `
  precision highp float;
  uniform vec2 res;
  uniform float dpr;
  uniform sampler2D picture;
  void main() { gl_FragColor = texture2D(picture, gl_FragCoord.xy / (res * dpr)); }`;

/* pass 2: the glass */
const GLASS = `
  precision highp float;
  uniform vec2 res;
  uniform float dpr;
  uniform sampler2D picture;
  uniform vec2 centre;
  uniform vec2 size;
  uniform float bend;
  uniform float bevel;
  uniform float zoom;
  uniform float prism;
  uniform float frost;
  uniform vec2 light;
  uniform float show;
  uniform sampler2D label;
  uniform vec2 labelSize;
  uniform float labelAlpha;
  uniform float labelY;
  uniform float spin;
  uniform float spinTime;
  uniform float still;
  uniform vec3 white;
  uniform vec3 ink;
  uniform vec3 tint;
  uniform float tintK;

  /* the picture texture, read at a position in CSS pixels from the top left of the panel */
  vec3 under(vec2 p) {
    vec2 uv = clamp(vec2(p.x, res.y - p.y) / res, vec2(0.001), vec2(0.999));
    return texture2D(picture, uv).rgb;
  }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    vec2 p = vec2(gl_FragCoord.x, res.y * dpr - gl_FragCoord.y) / dpr;
    vec2 q = p - centre;
    float aa = 0.75 / dpr;

    /* the pill as a distance: a segment with a radius, so it can be any length, down to a round drop */
    float r = min(size.x, size.y);
    vec2 seg = size - r;
    vec2 k = q - clamp(q, -seg, seg);
    float len = length(k);
    float sd = len - r;
    vec2 n = len > 0.0001 ? k / len : vec2(0., -1.);

    vec3 back = under(p);
    /* the soft shadow the glass casts, a little below it */
    vec2 qs = q - vec2(0., 10.);
    float ds = length(qs - clamp(qs, -seg, seg)) - r;
    float shadow = (1. - smoothstep(-r * 0.4, r * 0.85, ds)) * show;
    float inside = (1. - smoothstep(-aa, aa, sd)) * show;
    vec3 col = back * (1. - shadow * 0.28);

    if (inside > 0.) {
      float d = max(-sd, 0.);
      float B = min(bevel, r);
      float s = 1. - clamp(d / B, 0., 1.);
      /* the rim's curve: 0 where the flat middle begins, 1 on the very edge, steeper and steeper towards it */
      float m = 1. - sqrt(max(1. - s * s, 0.));
      vec2 reach = n * m * bend;
      vec2 base = centre + q * (1. - zoom);
      /* three reads, one per channel: red bends least, blue most */
      vec3 g = vec3(
        under(base + reach * (1. - prism)).r,
        under(base + reach).g,
        under(base + reach * (1. + prism)).b);
      vec3 f = under(base + reach + vec2(frost, frost)) + under(base + reach - vec2(frost, frost));
      g = mix(g, f * 0.5, 0.4);
      /* glass lifts the colour a little, and makes it livelier */
      float y = luma(g);
      g = mix(vec3(y), g, 1.18);
      g = mix(g, vec3(1.), 0.07);
      g = mix(g, tint * (0.38 + y * 0.8), tintK * 0.34);
      /* the rim: a thin bright line all round, a highlight on the side facing the light, a weaker one opposite */
      float rim = pow(s, 1.5);
      float facing = max(dot(n, light), 0.);
      float away = max(dot(n, -light), 0.);
      g += vec3(1.) * (pow(facing, 4.) * rim * 0.55 + pow(away, 6.) * rim * 0.2);
      /* the specular line: a bright hairline just inside the edge, strongest where the rim faces the light */
      float hair = smoothstep(0.4, 1.3, d) * (1. - smoothstep(1.3, 3.2, d));
      g += vec3(1.) * hair * (0.12 + 0.85 * pow(facing, 3.) + 0.3 * pow(away, 4.));
      g += vec3(1.) * (1. - smoothstep(0., 0.9, d)) * 0.18;
      g *= 1. - 0.07 * smoothstep(0.35, 0.9, s) * (1. - facing);

      /* the words: the glyphs in red, a soft halo in green; their colour follows the light behind them */
      vec2 lu = (q - vec2(0., labelY)) / labelSize + 0.5;
      vec4 l = texture2D(label, clamp(lu, 0., 1.)) * step(0., lu.x) * step(lu.x, 1.) * step(0., lu.y) * step(lu.y, 1.);
      float glyph = l.r * labelAlpha;
      float halo = l.g * labelAlpha;
      /* the spinner while the seats are held: an arc with a fading tail */
      float ring = 1. - smoothstep(-aa, aa, abs(length(q) - 13.) - 1.5);
      float turn = fract(atan(q.y, q.x) / 6.28318 - spinTime * 0.85);
      float arc = still > 0.5 ? 1. : smoothstep(0.05, 0.75, turn) * (1. - smoothstep(0.75, 0.78, turn));
      glyph += ring * arc * spin;
      if (glyph + halo > 0.003) {
        /* how light the picture is around this spot, over some forty pixels: inside a letter the colour holds */
        float around = 0.;
        for (int i = 0; i < 3; i++) {
          float x = float(i - 1) * 20.;
          around += luma(under(base + vec2(x, -10.))) + luma(under(base + vec2(x, 10.)));
        }
        float lightBehind = smoothstep(0.46, 0.66, around / 6. + tintK * 0.08);
        vec3 word = mix(white, ink, lightBehind);
        vec3 soft = mix(ink, white, lightBehind);
        g = mix(g, soft, halo * 0.38);
        g = mix(g, word, clamp(glyph, 0., 1.));
      }
      col = mix(col, g, inside);
    }
    gl_FragColor = vec4(col, 1.);
  }`;

function compile(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function link(fragment) {
  const pr = gl.createProgram();
  gl.attachShader(pr, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(pr, 0, 'position');
  gl.linkProgram(pr);
  const u = {};
  for (let i = 0, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); i < n; i++) {
    const name = gl.getActiveUniform(pr, i).name;
    u[name] = gl.getUniformLocation(pr, name);
  }
  return { pr, u };
}
function texture() {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function upload(t, source) {
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}
/* a texture to draw into */
function target(w, h) {
  const t = texture();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { t, fb, w, h };
}
function free(x) {
  if (!x) return;
  gl.deleteTexture(x.t);
  gl.deleteFramebuffer(x.fb);
}

let P = {};
let tex = {};
let pictureFb = null;
if (gl) {
  P = { picture: link(PICTURE), copy: link(COPY), glass: link(GLASS) };
  /* one triangle bigger than the screen covers it all */
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  /* everything painted on a canvas goes up premultiplied */
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  tex = { rowA: texture(), rowB: texture(), label: texture(), backdrop: texture() };
}

/* ---------------------------------------------------------------- the picture's type, painted once */
const MAX_TEX = gl ? Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 4096;
const period = [1, 1];
/* painted at the size it is shown, so it stays sharp without mipmaps: the word, then the room before it comes again */
function paintRow(text) {
  const TEX_H = Math.max(32, Math.round(band.row * DPR));
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  const family = '"Unbounded Variable", system-ui, sans-serif';
  x.font = `800 100px ${family}`;
  const cap = x.measureText('H').actualBoundingBoxAscent || 72;
  /* the capitals fill the strip from top to bottom, with a hair of room */
  let size = ((TEX_H * 0.94) / cap) * 100;
  const word = text.toUpperCase();
  x.font = `800 ${size}px ${family}`;
  let tw = x.measureText(word).width;
  const space = () => size * 0.45;
  /* too long for a texture: smaller type, the same strip */
  const k = Math.min(1, MAX_TEX / (tw + space()));
  size *= k;
  tw *= k;
  const width = Math.max(1, Math.ceil(tw + space()));
  c.width = width;
  c.height = TEX_H;
  x.font = `800 ${size}px ${family}`;
  x.fillStyle = css('--type');
  x.textBaseline = 'alphabetic';
  x.fillText(word, space() * 0.5, TEX_H * 0.5 + (cap * size) / 200);
  return { canvas: c, width, height: TEX_H };
}
function paintRows() {
  if (!gl) return;
  [['rowA', ROWS[0] || ''], ['rowB', ROWS[1] || ROWS[0] || '']].forEach(([key, text], i) => {
    const r = paintRow(text);
    upload(tex[key], r.canvas);
    period[i] = r.width / r.height;
  });
}

/* ---------------------------------------------------------------- the words on the glass, painted on a canvas */
const labelCanvas = document.createElement('canvas');
const lc = labelCanvas.getContext('2d');
const LABEL = { w: 460, h: 72 };
const FONT = '"Inter Variable", system-ui, sans-serif';
function contentOf(name) {
  const f = faces[name];
  if (!f) return null;
  const text = f.querySelector('[data-text]');
  const sub = f.querySelector('[data-sub]');
  const icon = f.querySelector('svg');
  return {
    text: text ? text.textContent.trim() : '',
    sub: sub ? sub.textContent.trim() : '',
    paths: icon && name !== 'busy' ? [...icon.querySelectorAll('path')].map((p) => ({ d: p.getAttribute('d'), dashed: p.hasAttribute('data-dashed'), check: p.hasAttribute('data-check') })) : [],
  };
}
function measureFace(name) {
  const c = contentOf(name);
  if (!c || name === 'busy') return H;
  lc.font = `600 21px ${FONT}`;
  let w = c.paths.length ? 24 + 11 : 0;
  w += lc.measureText(c.text).width;
  if (c.sub) {
    lc.font = `500 16px ${FONT}`;
    w += 9 + lc.measureText(c.sub).width;
  }
  return Math.ceil(w + PAD * 2);
}
function paintLabel() {
  if (!gl) return;
  labelCanvas.width = Math.round(LABEL.w * DPR);
  labelCanvas.height = Math.round(LABEL.h * DPR);
  const c = contentOf(face);
  if (c && face !== 'busy') {
    const width = measureFace(face) - PAD * 2;
    const left = LABEL.w / 2 - width / 2;
    const mid = LABEL.h / 2;
    const draw = (colour) => {
      lc.fillStyle = colour;
      lc.strokeStyle = colour;
      let x = left;
      if (c.paths.length) {
        lc.save();
        lc.translate(x, mid - 12);
        lc.lineCap = 'round';
        lc.lineJoin = 'round';
        c.paths.forEach((p) => {
          if (p.check && look.check < 0.02) return;
          const path = new Path2D(p.d);
          lc.lineWidth = p.check ? 2.5 : 1.9;
          lc.setLineDash(p.dashed ? [1.6, 2.4] : p.check ? [26 * look.check, 40] : []);
          lc.stroke(path);
        });
        lc.restore();
        x += 35;
      }
      lc.textBaseline = 'middle';
      lc.font = `600 21px ${FONT}`;
      lc.fillText(c.text, x, mid + 1);
      if (c.sub) {
        x += lc.measureText(c.text).width + 9;
        lc.font = `500 16px ${FONT}`;
        lc.globalAlpha = 0.66;
        lc.fillText(c.sub, x, mid + 1.5);
        lc.globalAlpha = 1;
      }
    };
    lc.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* the halo first, in green: the shadow of words drawn far off to the left */
    lc.save();
    lc.shadowColor = '#00ff00';
    lc.shadowBlur = 9 * DPR;
    lc.shadowOffsetX = 2000 * DPR;
    lc.translate(-2000, 0);
    draw('#00ff00');
    lc.restore();
    /* then the words in red, added on top: red and green stay apart in the texture */
    lc.globalCompositeOperation = 'lighter';
    draw('#ff0000');
    lc.globalCompositeOperation = 'source-over';
  }
  upload(tex.label, labelCanvas);
}

/* ---------------------------------------------------------------- size */
/* where the middle of the panel is on the screen: it moves when the page scrolls */
function where() {
  const r = slot.getBoundingClientRect();
  centre.x = r.left + r.width / 2;
  centre.y = r.top + r.height / 2;
}
function measure() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  H = decorative ? root.offsetHeight : 64;
  if(decorative)slot.style.width=(root.offsetWidth+120)+'px';
  /* the panel is as wide as the CSS says; the two lines of type follow its width, and its height follows them, with
     a fifth of a line of room above and below */
  PW = slot.offsetWidth;
  band.row = Math.round(Math.min(88, Math.max(64, PW * 0.22)));
  band.gap = Math.round(band.row * 0.1);
  PH = decorative ? H+120 : 170;
  slot.style.height = `${PH}px`;
  band.y = PH / 2;
  if (gl) {
    canvas.width = Math.round(PW * DPR);
    canvas.height = Math.round(PH * DPR);
    free(pictureFb);
    pictureFb = target(canvas.width, canvas.height);
  }
  where();
  widths.rest = decorative ? root.offsetWidth : measureFace('rest');
  widths.busy = H;
  widths.done = measureFace('done');
  LABEL.w = Math.max(widths.rest, widths.done) + 40;
  paintLabel();
}

/* ---------------------------------------------------------------- the springs, every frame */
function targets() {
  const lift = hover && !pressed && !REDUCED ? 1.04 : 1;
  const w = face === 'busy' ? H : widths[face];
  const squash = pressed && !REDUCED;
  g.w.to = w * lift * (squash ? 1 + SQUISH * 0.5 : 1);
  g.h.to = H * lift * (squash ? 1 - SQUISH : 1);
  /* under the pointer the glass leans a little towards it, a little more while pressed */
  if ((hover || pressed) && pointer && !REDUCED) {
    const k = pressed ? 0.16 : 0.08;
    g.ox.to = Math.max(-10, Math.min(10, (pointer.x - centre.x) * k));
    g.oy.to = Math.max(-6, Math.min(6, (pointer.y - centre.y) * k));
  } else {
    g.ox.to = 0;
    g.oy.to = 0;
  }
  g.thick.to = squash ? 1.35 : 1;
}
function step(dt) {
  const [K, D] = SPRING;
  Object.values(g).forEach((s) => {
    if (REDUCED) {
      s.x = s.to;
      s.v = 0;
      return;
    }
    s.v += (K * (s.to - s.x) - D * s.v) * dt;
    s.x += s.v * dt;
  });
}

/* the light: towards the pointer if there is one, otherwise slowly swinging over the top left */
function aimLight(dt) {
  let tx;
  let ty;
  if (pointer) {
    /* near the middle of the glass the pointer gives no direction: the usual top left light takes over */
    tx = pointer.x - (centre.x + g.ox.x) - 50;
    ty = pointer.y - (centre.y + g.oy.x) - 60;
  } else {
    const a = -2.2 + (REDUCED ? 0 : Math.sin(time * 0.4) * 0.7);
    tx = Math.cos(a);
    ty = Math.sin(a);
  }
  const l = Math.hypot(tx, ty) || 1;
  const k = REDUCED ? 1 : 1 - Math.pow(0.001, dt);
  light.x += (tx / l - light.x) * k;
  light.y += (ty / l - light.y) * k;
  const m = Math.hypot(light.x, light.y) || 1;
  light.x /= m;
  light.y /= m;
}

function render() {
  if (!gl) return;
  const use = (prog) => {
    gl.useProgram(prog.pr);
    return {
      f: (n, a) => prog.u[n] && gl.uniform1f(prog.u[n], a),
      v2: (n, a, b) => prog.u[n] && gl.uniform2f(prog.u[n], a, b),
      v3: (n, c) => prog.u[n] && gl.uniform3f(prog.u[n], c[0], c[1], c[2]),
      t: (n, unit, t) => {
        if (!prog.u[n]) return;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.uniform1i(prog.u[n], unit);
      },
    };
  };
  const cw = canvas.width;
  const ch = canvas.height;
  /* 1. the picture, the size of the panel */
  gl.bindFramebuffer(gl.FRAMEBUFFER, pictureFb.fb);
  gl.viewport(0, 0, cw, ch);
  let s = use(P.picture);
  s.v2('res', PW, PH);
  s.f('dpr', DPR);
  s.f('time', time);
  s.t('backdrop', 2, tex.backdrop);s.v3('ground', colours.ground);
  s.t('rowA', 0, tex.rowA);
  s.t('rowB', 1, tex.rowB);
  s.v3('band', [band.y, band.row, band.gap]);
  s.v2('period', period[0] * band.row, period[1] * band.row);
  s.f('drift', DRIFT);
  s.f('rowsIn', look.rows);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  /* the picture on the canvas */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  s = use(P.copy);
  s.v2('res', PW, PH);
  s.f('dpr', DPR);
  s.t('picture', 0, pictureFb.t);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  /* 2. the glass, inside its rectangle (with room for the shadow and the lean); at rest it sits in the middle of the
     panel */
  const cx = PW / 2 + g.ox.x;
  const cy = PH / 2 + g.oy.x;
  const hw = Math.max(1, g.w.x / 2);
  const hh = Math.max(1, g.h.x / 2);
  /* the shadow reaches 0.85 radii past the edge, 10 pixels lower: the rectangle must hold all of it */
  const m = Math.min(hw, hh) * 0.9 + 4;
  const x0 = Math.max(0, Math.floor((cx - hw - m) * DPR));
  const x1 = Math.min(cw, Math.ceil((cx + hw + m) * DPR));
  const y0 = Math.max(0, Math.floor((PH - (cy + hh + m + 12)) * DPR));
  const y1 = Math.min(ch, Math.ceil((PH - (cy - hh - m)) * DPR));
  if (x1 <= x0 || y1 <= y0 || look.show <= 0) return;
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(x0, y0, x1 - x0, y1 - y0);
  s = use(P.glass);
  s.v2('res', PW, PH);
  s.f('dpr', DPR);
  s.t('picture', 0, pictureFb.t);
  s.t('label', 1, tex.label);
  s.v2('centre', cx, cy);
  s.v2('size', hw, hh);
  s.f('bend', BEND * g.thick.x);
  s.f('bevel', BEVEL);
  s.f('zoom', ZOOM);
  s.f('prism', PRISM);
  s.f('frost', FROST);
  s.v2('light', light.x, light.y);
  s.f('show', look.show);
  s.v2('labelSize', LABEL.w, LABEL.h);
  s.f('labelAlpha', look.label);
  s.f('labelY', look.ly);
  s.f('spin', look.spin);
  s.f('spinTime', spinTime);
  s.f('still', REDUCED ? 1 : 0);
  s.v3('white', colours.white);
  s.v3('ink', colours.ink);
  s.v3('tint', colours.success);
  s.f('tintK', look.tint);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.SCISSOR_TEST);
}

/* the real button follows the glass: same size, same place, so the focus ring and the touches match it */
function follow() {
  btn.style.width = `${Math.max(1, g.w.x).toFixed(2)}px`;
  btn.style.height = `${Math.max(1, g.h.x).toFixed(2)}px`;
  btn.style.transform = `translate(calc(-50% + ${g.ox.x.toFixed(2)}px), calc(-50% + ${g.oy.x.toFixed(2)}px))`;
}

let colours = {};
function readColours() {
  colours = {
    ground: rgb('--ground'), white: rgb('--label'), ink: rgb('--ink'), success: rgb('--success'),
  };
}

let last = null;
function frame(now) {
  // Driven immediately after the cover renders, so the sampled backdrop is current.
  const dt = last === null ? 1 / 60 : Math.min(1 / 30, Math.max(0, (now - last) / 1000));
  last = now;
  if (!REDUCED) {
    time += dt;
    spinTime += dt;
  } else if (face === 'busy') {
    /* with reduced motion the spinner does not turn: the ring breathes */
    look.spin = 0.55 + 0.45 * Math.cos(now / 380);
  }
  if (ready) {
    targets();
    /* small steps keep a stiff spring steady at any frame rate */
    const n = Math.ceil(dt / (1 / 240));
    for (let i = 0; i < n; i++) step(dt / n);
  }
  aimLight(dt);
  follow();
  render();
}

/* ---------------------------------------------------------------- the words under the glass change */
function setFace(next) {
  if (next === face) return;
  if (!gl || REDUCED) {
    const swap = () => {
      face = next;
      root.dataset.state = next;
      paintLabel();
      look.spin = next === 'busy' ? 1 : 0;
    };
    if (!gl) swap();
    else gsap.timeline().to(look, { label: 0, spin: 0, duration: 0.12 }).add(swap).to(look, { label: 1, duration: 0.25 });
    return;
  }
  gsap.killTweensOf(look, 'label,ly,spin');
  gsap.timeline()
    .to(look, { label: 0, ly: -5, spin: 0, duration: 0.14, ease: 'power2.in' })
    .add(() => {
      face = next;
      root.dataset.state = next;
      look.check = next === 'done' ? 0 : 1;
      paintLabel();
    })
    .fromTo(look, { ly: 6 }, { label: 1, ly: 0, duration: 0.36, ease: 'power3.out' }, '+=0.06')
    .to(look, { spin: next === 'busy' ? 1 : 0, duration: 0.3 }, '<');
  if (next === 'done') gsap.to(look, { check: 1, duration: 0.45, delay: 0.32, ease: 'power2.out', onUpdate: paintLabel });
}

/* ---------------------------------------------------------------- the line under the panel: empty at rest */
function hint(text, back) {
  if (hintTl) hintTl.kill();
  if (hintBack) hintBack.kill();
  hintBack = back ? gsap.delayedCall(back, () => hint(HINT)) : null;
  if (hintEl.textContent === text) return;
  if (REDUCED) {
    hintTl = gsap.timeline().to(hintEl, { opacity: 0, duration: 0.12 }).add(() => (hintEl.textContent = text)).to(hintEl, { opacity: 1, duration: 0.25 });
    return;
  }
  hintTl = gsap.timeline()
    .to(hintEl, { y: -6, opacity: 0, duration: 0.14, ease: 'power2.in' })
    .add(() => (hintEl.textContent = text))
    .fromTo(hintEl, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' });
}

/* ---------------------------------------------------------------- the action: holding two seats */
const LABEL_REST = () => (contentOf('rest') || {}).text || 'Get tickets';
function hold() {
  state = 'busy';
  setFace('busy');
  const busy = (contentOf('busy') || {}).text || 'Holding your seats';
  btn.setAttribute('aria-label', `${busy}. Press to cancel`);
  live.textContent = busy;
  hint(`Holding two seats. ${TAP} to cancel`);
  if (holdCall) holdCall.kill();
  holdCall = gsap.delayedCall(HOLD, held);
}
function held() {
  state = 'done';
  setFace('done');
  const c = contentOf('done') || {};
  btn.setAttribute('aria-label', `${c.text}${c.sub ? `, ${c.sub}` : ''}. Press to release them`);
  live.textContent = `${c.text}${c.sub ? `, ${c.sub}` : ''}`;
  hint(`Held for ten minutes. ${TAP} to release`);
  gsap.to(look, { tint: 1, duration: REDUCED ? 0.3 : 0.6, ease: 'power2.out' });
  /* the glass gives a little splash: thicker for a moment, then it settles on its spring */
  if (!REDUCED) g.thick.v += 9;
  if (backCall) backCall.kill();
  backCall = gsap.delayedCall(DONE, () => release(false));
}
function release(byHand) {
  if (holdCall) holdCall.kill();
  if (backCall) backCall.kill();
  const cancelled = state === 'busy';
  state = 'idle';
  setFace('rest');
  gsap.to(look, { tint: 0, duration: 0.5, ease: 'power2.out' });
  btn.setAttribute('aria-label', LABEL_REST());
  live.textContent = cancelled ? 'Cancelled, nothing was held' : byHand ? 'Seats released' : '';
  hint(cancelled ? 'Cancelled, nothing was held' : byHand ? 'Seats released' : HINT, cancelled || byHand ? 2.4 : 0);
}
function act() {
  if (!ready) return;
  if (state === 'idle') hold();
  else release(true);
}

/* ---------------------------------------------------------------- hands and keys */
// The existing #enter-audio click handler enters the website.
btn.addEventListener('pointerenter', (e) => {
  if (e.pointerType === 'mouse') hover = true;
});
btn.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') hover = false;
  pressed = false;
});
btn.addEventListener('pointerdown', (e) => {
  pressed = true;
  pointer = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', (e) => {
  /* let go: the spring throws the glass back past its size, and it wobbles */
  if (pressed && !REDUCED) g.h.v += 120;
  pressed = false;
  /* a finger lifted leaves no pointer behind: the light goes back to its slow swing */
  if (e.pointerType !== 'mouse') pointer = null;
});
addEventListener('pointercancel', () => (pressed = false));
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' || pressed) pointer = { x: e.clientX, y: e.clientY };
}, { passive: true });
document.documentElement.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') pointer = null;
});
btn.addEventListener('keydown', (e) => {
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) pressed = true;
});
btn.addEventListener('keyup', () => {
  if (pressed && !REDUCED) g.h.v += 120;
  pressed = false;
});
btn.addEventListener('blur', () => (pressed = false));

/* how the page is being used: the ring of the focus shows for the keys, not after a finger or the mouse */
addEventListener('keydown', () => (document.documentElement.dataset.using = 'keys'), true);
addEventListener('pointerdown', () => (document.documentElement.dataset.using = 'pointer'), true);
addEventListener('resize', () => {
  measure();
  if (started) paintRows();
});
/* the page scrolls (on a short screen): the pointer is measured again from where the panel is now */
addEventListener('scroll', where, { passive: true });

/* ---------------------------------------------------------------- the library's preview */
/* a click from a script (detail 0) holds the seats and, once they are held, lets them go; it never cancels */
root.addEventListener('click', (e) => {
  if (e.detail !== 0 || e.target !== root) return;
  if (state === 'idle' || state === 'done') act();
});

/* ---------------------------------------------------------------- it comes in */
let started = false;
function start() {
  if (started) return;
  started = true;
  measure();
  paintRows();
  ready = true;
  if (REDUCED || !gl) {
    Object.values(g).forEach((s) => (s.x = s.to));
    targets();
    Object.values(g).forEach((s) => (s.x = s.to));
    gsap.to(look, { show: 1, rows: 1, duration: 0.6, ease: 'power1.out' });
    return;
  }
  /* the glass drops in small and grows on its spring, wobbling as it lands */
  targets();
  g.w.x = g.w.to * 0.4;
  g.h.x = g.h.to * 0.4;
  gsap.to(look, { rows: 1, duration: 0.8, ease: 'power2.out' });
  gsap.to(look, { show: 1, duration: 0.35, delay: 0.25, ease: 'power2.out', onStart: () => (g.thick.v += 6) });
}
// Site lifecycle: no independent render loop or fake ticket reservation.
const crop=document.createElement('canvas'),cropContext=crop.getContext('2d');let running=false;
return {
 start(){if(running)return;running=true;readColours();root.dataset.state='rest';btn.setAttribute('aria-label',LABEL_REST());measure();start();root.dataset.shader='Animorio original GLASS';},
 renderBackdrop(source){if(!running||document.hidden)return;const bounds=slot.getBoundingClientRect(),w=Math.round(PW*DPR),h=Math.round(PH*DPR);if(crop.width!==w||crop.height!==h){crop.width=w;crop.height=h;}cropContext.fillStyle='#d9d9d9';cropContext.fillRect(0,0,w,h);const ratioX=source.width/innerWidth,ratioY=source.height/innerHeight;cropContext.drawImage(source,bounds.left*ratioX,bounds.top*ratioY,bounds.width*ratioX,bounds.height*ratioY,0,0,w,h);upload(tex.backdrop,crop);frame(performance.now());root.dataset.renderCount=String(Number(root.dataset.renderCount||0)+1);},
 stop(){running=false;gsap.killTweensOf(look);crop.width=crop.height=1;gl?.getExtension('WEBGL_lose_context')?.loseContext();}
};

}
const glasses=[createCoverGlass(document.querySelector('#audio-glass'))];
window.entryGlass={start(){for(const g of glasses)g.start();},renderBackdrop(source){for(const g of glasses)g.renderBackdrop(source);},stop(){for(const g of glasses)g.stop();}};
})();
