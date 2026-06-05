import * as THREE from "three";
import "./style.css";
import { projects, profile } from "./projects.js";

// ==================================================================
// Shaders — a noise-displaced sphere with recomputed normals,
// fresnel rim light, and a two-color iridescent body.
// ==================================================================
const noiseGLSL = /* glsl */ `
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uFreq;
  uniform float uSpeed;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;
  ${noiseGLSL}

  float getDisp(vec3 p){
    float n  = snoise(p * uFreq + vec3(0.0, uTime * uSpeed, 0.0));
    n += 0.5 * snoise(p * uFreq * 2.1 + vec3(uTime * uSpeed * 1.4));
    return n * uIntensity;
  }
  vec3 displace(vec3 p){ return p + normalize(p) * getDisp(p); }

  void main(){
    vec3 p = position;
    vec3 dir = normalize(p);
    vec3 ref = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(dir, ref));
    vec3 bitangent = normalize(cross(dir, tangent));
    float eps = 0.1;
    vec3 P = displace(p);
    vec3 A = displace(p + tangent * eps);
    vec3 B = displace(p + bitangent * eps);
    vec3 n = normalize(cross(A - P, B - P));
    if (dot(n, dir) < 0.0) n = -n;

    vDisp = getDisp(p);
    vNormal = normalize(normalMatrix * n);
    vec4 mv = modelViewMatrix * vec4(P, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uRim;
  uniform float uFresnel;
  uniform float uRimStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;

  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uFresnel);
    vec3 base = mix(uColorA, uColorB, smoothstep(-0.8, 0.8, vDisp));
    float light = clamp(dot(N, normalize(vec3(0.45, 0.7, 0.55))), 0.0, 1.0);
    base *= 0.5 + 0.7 * light;
    vec3 col = base + uRim * fres * uRimStrength;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ==================================================================
// Renderer / scene / camera
// ==================================================================
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4.2);

const isMobile = window.matchMedia("(max-width: 820px)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- color helpers (work in linear space to match sRGB output) ----
function lin(hex) {
  return new THREE.Color(hex).convertSRGBToLinear();
}
function accentPair(hex) {
  const base = new THREE.Color(hex);
  const a = base.clone().lerp(new THREE.Color("#05060c"), 0.1).convertSRGBToLinear();
  const b = base.clone().lerp(new THREE.Color("#ffffff"), 0.5).convertSRGBToLinear();
  return [a, b];
}

const uniforms = {
  uTime: { value: 0 },
  uIntensity: { value: 0.3 },
  uFreq: { value: 1.15 },
  uSpeed: { value: 0.26 },
  uColorA: { value: lin("#3a5bd9") },
  uColorB: { value: lin("#a78bfa") },
  uRim: { value: lin("#bcd2ff") },
  uFresnel: { value: 2.6 },
  uRimStrength: { value: 0.9 },
};

const detail = isMobile ? 24 : 64;
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });

const blob = new THREE.Mesh(geometry, material);
const blobGroup = new THREE.Group(); // group = position/tilt, mesh = spin
blobGroup.add(blob);
scene.add(blobGroup);

// faint dust for depth (very subtle, not a starfield)
const dustGeo = new THREE.BufferGeometry();
const dustN = 120;
const dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 16;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
  dustPos[i * 3 + 2] = -2 - Math.random() * 6;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ color: 0x8aa0ff, size: 0.025, transparent: true, opacity: 0.5, depthWrite: false })
);
scene.add(dust);

// ==================================================================
// Section state — drives blob color / offset / intensity on scroll
// ==================================================================
const SECTIONS = {
  hero:    { colors: [lin("#3a5bd9"), lin("#a78bfa")], x: 0.0,  intensity: 0.32, scale: 1.18 },
  about:   { colors: [lin("#0ea5b7"), lin("#6366f1")], x: -2.1, intensity: 0.27, scale: 0.95 },
  work:    { colors: accentPair(projects[0].accent),   x: 2.1,  intensity: 0.30, scale: 0.95 },
  contact: { colors: [lin("#22c98a"), lin("#38bdf8")], x: 0.0,  intensity: 0.36, scale: 1.1 },
};

let activeId = "hero";
let workAccent = projects[0].accent;

// current (eased) targets
const curA = uniforms.uColorA.value;
const curB = uniforms.uColorB.value;
const target = {
  a: SECTIONS.hero.colors[0].clone(),
  b: SECTIONS.hero.colors[1].clone(),
  x: 0,
  intensity: 0.32,
  scale: isMobile ? 0.78 : 1.18,
};
blobGroup.scale.setScalar(target.scale);

function applyTargets() {
  const s = SECTIONS[activeId];
  if (!s) return;
  const colors = activeId === "work" ? accentPair(workAccent) : s.colors;
  target.a.copy(colors[0]);
  target.b.copy(colors[1]);
  // on mobile keep the blob centered but smaller so text stays readable
  target.x = isMobile ? 0 : s.x;
  target.scale = isMobile ? s.scale * 0.62 : s.scale;
  target.intensity = s.intensity;
  // reflect accent into the CSS theme too
  document.documentElement.style.setProperty(
    "--accent",
    activeId === "work" ? workAccent : "#5b8cff"
  );
}

// ==================================================================
// Build the DOM (about text, project rows, contact links)
// ==================================================================
document.getElementById("brand-name").textContent = profile.name;
document.getElementById("hero-name").textContent = profile.name;
document.getElementById("hero-tag").textContent = profile.tagline;
document.getElementById("about-text").innerHTML = profile.about.replace(
  /Edgeable/g,
  "<b>Edgeable</b>"
);

const projectsEl = document.getElementById("projects");
projects.forEach((p, i) => {
  const li = document.createElement("li");
  li.className = "project";
  li.style.setProperty("--proj", p.accent);

  const linksHTML = p.links && p.links.length
    ? p.links
        .map((l, idx) =>
          `<a href="${l.url}" target="_blank" rel="noopener"${idx > 0 ? ' class="ghost"' : ""}>${l.label}</a>`
        )
        .join("")
    : `<p class="project-note">${p.placeholder ? "Nothing to show here yet." : "Private project — link available on request."}</p>`;

  li.innerHTML = `
    <button class="project-head" aria-expanded="false">
      <span class="project-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="project-title">${p.title}</span>
      <span class="project-toggle">+</span>
      <span class="project-sub">${p.subtitle || ""}</span>
    </button>
    <div class="project-body">
      <div>
        <p class="project-blurb">${p.blurb}</p>
        <div class="project-tags">${(p.tags || []).map((t) => `<span>${t}</span>`).join("")}</div>
        <div class="project-links">${linksHTML}</div>
      </div>
    </div>`;

  const head = li.querySelector(".project-head");
  head.addEventListener("click", () => {
    const open = li.classList.contains("open");
    projectsEl.querySelectorAll(".project.open").forEach((o) => {
      o.classList.remove("open");
      o.querySelector(".project-head").setAttribute("aria-expanded", "false");
    });
    if (!open) {
      li.classList.add("open");
      head.setAttribute("aria-expanded", "true");
    }
  });
  // hovering a project recolors the blob to its accent
  const setAccent = () => { workAccent = p.accent; if (activeId === "work") applyTargets(); };
  head.addEventListener("pointerenter", setAccent);
  head.addEventListener("focusin", setAccent);

  projectsEl.appendChild(li);
});

const contactEl = document.getElementById("contact-links");
contactEl.innerHTML = profile.links
  .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`)
  .join("");

// nav + brand scrolling
document.querySelectorAll("[data-scroll]").forEach((b) => {
  b.addEventListener("click", () => {
    const id = b.dataset.scroll;
    if (id === "top") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    else document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
});

// ==================================================================
// Scroll handling — fade sections in, pick the active one
// ==================================================================
const sectionEls = [...document.querySelectorAll(".section")];
const wraps = [...document.querySelectorAll(".wrap")];

// reveal on enter
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.target.classList.toggle("inview", e.isIntersecting)),
  { threshold: 0.35 }
);
wraps.forEach((w) => io.observe(w));

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const cy = window.innerHeight / 2;
    let best = sectionEls[0], bestD = Infinity;
    for (const s of sectionEls) {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - cy);
      if (d < bestD) { bestD = d; best = s; }
    }
    const id = best.dataset.section;
    if (id !== activeId) { activeId = id; applyTargets(); }
    ticking = false;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });

// ==================================================================
// Pointer — parallax tilt + a "wake" that energizes the blob
// ==================================================================
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let wake = 0;
let lastX = 0, lastY = 0;
window.addEventListener("pointermove", (e) => {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY);
  wake = Math.min(wake + speed * 0.0016, 0.18);
  lastX = e.clientX; lastY = e.clientY;
});

// ==================================================================
// Resize + render loop
// ==================================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

applyTargets();
const clock = new THREE.Clock();

function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  uniforms.uTime.value = t;

  // ease colors + position + intensity
  curA.lerp(target.a, 0.05);
  curB.lerp(target.b, 0.05);
  blobGroup.position.x += (target.x - blobGroup.position.x) * 0.05;
  const sc = blobGroup.scale.x + (target.scale - blobGroup.scale.x) * 0.05;
  blobGroup.scale.setScalar(sc);
  const baseInt = reduceMotion ? target.intensity * 0.5 : target.intensity;
  uniforms.uIntensity.value += (baseInt + wake - uniforms.uIntensity.value) * 0.08;
  wake *= 0.92;

  // pointer parallax (group tilt) + slow spin (mesh)
  pointer.x += (pointer.tx - pointer.x) * 0.05;
  pointer.y += (pointer.ty - pointer.y) * 0.05;
  blobGroup.rotation.x += (pointer.y * 0.25 - blobGroup.rotation.x) * 0.06;
  blobGroup.rotation.z += (-pointer.x * 0.18 - blobGroup.rotation.z) * 0.06;
  if (!reduceMotion) blob.rotation.y += dt * 0.12;
  camera.position.x += (pointer.x * 0.25 - camera.position.x) * 0.04;
  camera.lookAt(0, 0, 0);

  dust.rotation.y = t * 0.02;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// reveal first section + hide loader once warm
onScroll();
requestAnimationFrame(() => {
  sectionEls[0].querySelector(".wrap").classList.add("inview");
  setTimeout(() => document.getElementById("loader").classList.add("hidden"), 350);
});
