import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";
import { projects, profile } from "./projects.js";

// ------------------------------------------------------------------
// Renderer / scene / camera
// ------------------------------------------------------------------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060d, 0.035);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.5, 11);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 16;
controls.minPolarAngle = Math.PI * 0.28;
controls.maxPolarAngle = Math.PI * 0.72;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

// ------------------------------------------------------------------
// Starfield background (two parallax layers)
// ------------------------------------------------------------------
function makeStars(count, radius, size, color) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // distribute in a spherical shell
    const r = radius * (0.5 + Math.random() * 0.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

const starsFar = makeStars(1400, 60, 0.18, 0x6f7bbd);
const starsNear = makeStars(500, 34, 0.32, 0x9fb4ff);
scene.add(starsFar, starsNear);

// ------------------------------------------------------------------
// Project cards
// ------------------------------------------------------------------
const CARD_W = 2.4;
const CARD_H = 3.2;
const loader = new THREE.TextureLoader(); // unused but handy if you add images later

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + " ";
      y += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y;
}

function makeCardTexture(p) {
  const W = 512;
  const H = 683;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  // background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#141a30");
  g.addColorStop(1, "#0a0d1c");
  roundRect(ctx, 0, 0, W, H, 38);
  ctx.fillStyle = g;
  ctx.fill();

  // accent glow blob top
  const accent = p.accent || "#38bdf8";
  const blob = ctx.createRadialGradient(W * 0.7, 120, 20, W * 0.7, 120, 320);
  blob.addColorStop(0, accent + "55");
  blob.addColorStop(1, "transparent");
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, W, H);

  // border
  roundRect(ctx, 2, 2, W - 4, H - 4, 36);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();

  // accent bar
  roundRect(ctx, 54, 90, 70, 8, 4);
  ctx.fillStyle = accent;
  ctx.fill();

  // title
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 56px 'Space Grotesk', sans-serif";
  ctx.fillText(p.title, 52, 180);

  // subtitle
  ctx.fillStyle = "#9aa3c4";
  ctx.font = "400 26px Inter, sans-serif";
  ctx.fillText(p.subtitle || "", 52, 220);

  // blurb (trimmed)
  ctx.fillStyle = "#c9d0ee";
  ctx.font = "400 24px Inter, sans-serif";
  const short = p.blurb.length > 180 ? p.blurb.slice(0, 177) + "…" : p.blurb;
  wrapText(ctx, short, 52, 290, W - 104, 34);

  // tag chips
  let tx = 52;
  const ty = H - 150;
  ctx.font = "500 21px Inter, sans-serif";
  for (const tag of (p.tags || []).slice(0, 3)) {
    const tw = ctx.measureText(tag).width + 30;
    roundRect(ctx, tx, ty, tw, 40, 20);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#aeb6d8";
    ctx.fillText(tag, tx + 15, ty + 27);
    tx += tw + 12;
  }

  // call to action
  ctx.fillStyle = accent;
  ctx.font = "700 24px 'Space Grotesk', sans-serif";
  ctx.fillText(p.placeholder ? "Stay tuned" : "View project  →", 52, H - 64);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const cardGroup = new THREE.Group();
scene.add(cardGroup);
const cards = [];

const count = projects.length;
const arc = Math.min(Math.PI * 0.62, count * 0.42); // total angular spread
const arcRadius = 6.2;

projects.forEach((p, i) => {
  const tex = makeCardTexture(p);
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);

  // glow backing (slightly larger additive plane)
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(p.accent || "#38bdf8"),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W + 0.4, CARD_H + 0.4), glowMat);
  glow.position.z = -0.05;
  mesh.add(glow);

  // position along an arc facing the centre
  const t = count === 1 ? 0 : i / (count - 1) - 0.5;
  const angle = t * arc;
  mesh.position.set(Math.sin(angle) * arcRadius, 0, -Math.cos(angle) * arcRadius + arcRadius * 0.2);
  mesh.lookAt(0, 0, camera.position.z);
  mesh.userData = { project: p, glow, baseY: 0, phase: i * 0.9, baseScale: 1 };

  cardGroup.add(mesh);
  cards.push(mesh);
});

// ------------------------------------------------------------------
// Raycasting (hover + click)
// ------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let pointerDownAt = null;

function setPointer(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;
}

function pickCard() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(cards, false);
  return hits.length ? hits[0].object : null;
}

window.addEventListener("pointermove", (e) => {
  setPointer(e);
  const hit = pickCard();
  if (hit !== hovered) {
    hovered = hit;
    canvas.style.cursor = hit ? "pointer" : "grab";
  }
});

canvas.addEventListener("pointerdown", (e) => {
  pointerDownAt = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", (e) => {
  if (!pointerDownAt) return;
  const moved = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
  pointerDownAt = null;
  if (moved > 6) return; // it was a drag, not a click
  setPointer(e);
  const hit = pickCard();
  if (hit) openProject(hit.userData.project);
});

// ------------------------------------------------------------------
// UI wiring
// ------------------------------------------------------------------
const panel = document.getElementById("panel");
const modal = document.getElementById("modal");
const hero = document.getElementById("hero");

function openProject(p) {
  document.documentElement.style.setProperty("--accent", p.accent || "#38bdf8");
  document.getElementById("panel-accent").style.background = p.accent || "#38bdf8";
  document.getElementById("panel-title").textContent = p.title;
  document.getElementById("panel-sub").textContent = p.subtitle || "";
  document.getElementById("panel-blurb").textContent = p.blurb;

  const tagBox = document.getElementById("panel-tags");
  tagBox.innerHTML = "";
  (p.tags || []).forEach((t) => {
    const s = document.createElement("span");
    s.textContent = t;
    tagBox.appendChild(s);
  });

  const linkBox = document.getElementById("panel-links");
  linkBox.innerHTML = "";
  if (p.links && p.links.length) {
    p.links.forEach((l, idx) => {
      const a = document.createElement("a");
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = l.label;
      if (idx > 0) a.classList.add("ghost");
      linkBox.appendChild(a);
    });
  } else {
    const note = document.createElement("p");
    note.style.color = "var(--muted)";
    note.style.fontSize = "14px";
    note.textContent = p.placeholder ? "Nothing to show here yet." : "Private project — link available on request.";
    linkBox.appendChild(note);
  }

  controls.autoRotate = false;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  hero.classList.add("dim");
}

function openModal(which) {
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  if (which === "about") {
    titleEl.textContent = "About";
    bodyEl.innerHTML = `<p>${profile.about}</p>`;
  } else {
    titleEl.textContent = "Let's talk";
    const links = profile.links
      .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`)
      .join("");
    bodyEl.innerHTML = `<p>The fastest way to reach me is email. I'm open to projects, collaborations, and questions.</p><div class="modal-links">${links}</div>`;
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeAll() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  controls.autoRotate = true;
  hero.classList.remove("dim");
}

document.querySelectorAll("[data-open]").forEach((b) =>
  b.addEventListener("click", () => openModal(b.dataset.open))
);
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeAll));
modal.addEventListener("click", (e) => { if (e.target === modal) closeAll(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

// set brand name from profile
document.getElementById("brand-name").textContent = profile.name;
document.getElementById("hero-title").firstChild &&
  (document.title = `${profile.name} — Portfolio`);

// ------------------------------------------------------------------
// Resize + animation loop
// ------------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // gentle float + hover response per card
  for (const card of cards) {
    const u = card.userData;
    card.position.y = Math.sin(t * 0.8 + u.phase) * 0.12;
    const isHover = card === hovered;
    const targetScale = isHover ? 1.08 : 1;
    u.baseScale += (targetScale - u.baseScale) * 0.12;
    card.scale.setScalar(u.baseScale);
    u.glow.material.opacity += ((isHover ? 0.35 : 0.0) - u.glow.material.opacity) * 0.12;
  }

  starsFar.rotation.y = t * 0.01;
  starsNear.rotation.y = t * 0.018;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// hide loader once first frame is ready
requestAnimationFrame(() => {
  setTimeout(() => document.getElementById("loader").classList.add("hidden"), 350);
});
