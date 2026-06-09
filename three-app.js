import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json";
const MODEL_URL = "assets/iphone-15-pro.glb";
const SCREEN_MATERIAL = "pIJKfZsazmcpEiU"; // emissive display material inside the GLB
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Shared reflection environment (studio room) — gives metals real reflections.
// ---------------------------------------------------------------------------
let sharedEnv = null;
function getEnv(renderer) {
  if (sharedEnv) return sharedEnv;
  const pmrem = new THREE.PMREMGenerator(renderer);
  sharedEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  return sharedEnv;
}

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  return renderer;
}

// Pointer (normalised -0.5..0.5), shared across scenes.
const pointer = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX / window.innerWidth - 0.5;
  pointer.y = e.clientY / window.innerHeight - 0.5;
}, { passive: true });

// Render by default; only pause once the tab is actually hidden.
let pageVisible = true;
document.addEventListener("visibilitychange", () => { pageVisible = !document.hidden; });

// ===========================================================================
// iPhone viewer
// ===========================================================================
function initPhone(container) {
  const mode = container.dataset.iphone || "overview"; // "overview" | "scroll"
  const shotUrl = container.dataset.screenshot || "planner-app-screenshot.png";
  const scrubSource = mode === "scroll" ? document.querySelector("[data-scrub]") : null;

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const renderer = makeRenderer(canvas);

  const scene = new THREE.Scene();
  scene.environment = getEnv(renderer);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0, 17);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(5, 8, 9);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2ff, 1.0);
  fill.position.set(-7, 1, 5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 2.0);
  rim.position.set(-4, 6, -8);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const pivot = new THREE.Group();
  scene.add(pivot);

  // Screenshot texture for the screen.
  const tex = new THREE.TextureLoader().load(shotUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;          // glTF UV convention
  tex.center.set(0.5, 0.5);   // screen UVs are flipped vs default; correct it
  tex.rotation = Math.PI;
  tex.repeat.x = -1;          // un-mirror horizontally
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  let ready = false;

  new GLTFLoader().load(MODEL_URL, (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const mat = o.material;
      if (mat && mat.name === SCREEN_MATERIAL) {
        mat.emissiveMap = tex;
        mat.map = tex;
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 1.0;
        mat.metalness = 0.0;
        mat.roughness = 0.22;
        mat.toneMapped = true;
        mat.needsUpdate = true;
      }
    });

    // Center + scale to a consistent on-screen height.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const targetH = 6.2;
    model.scale.setScalar(targetH / size.y);
    pivot.add(model);

    ready = true;
    container.classList.add("is-ready");
    document.documentElement.classList.add("webgl-ready");
  }, undefined, (err) => {
    console.error("iPhone model failed:", err);
    document.documentElement.classList.remove("webgl");
    container.remove();
  });

  // Base orientation offsets (tuned so the screen faces the camera, upright).
  const BASE_Y = Math.PI;     // flip to face the screen toward camera
  const BASE_X = 0;

  let curRotY = BASE_Y, curRotX = BASE_X, curScale = 0.92;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!ready || !pageVisible) return;
    const t = clock.getElapsedTime();

    let targetY = BASE_Y, targetX = BASE_X, targetScale = 1;
    if (mode === "scroll") {
      let p = 0;
      if (scrubSource) p = parseFloat(getComputedStyle(scrubSource).getPropertyValue("--p")) || 0;
      // Spin through ~70° as you scroll, plus a slow idle drift.
      targetY = BASE_Y + (0.5 - p) * 1.3 + Math.sin(t * 0.25) * 0.06;
      targetX = BASE_X + (0.12 - p * 0.16);
      targetScale = 0.9 + p * 0.16;
    } else {
      // Overview: gentle idle sway + subtle pointer parallax.
      targetY = BASE_Y + Math.sin(t * 0.45) * 0.26 + pointer.x * 0.5;
      targetX = BASE_X + Math.cos(t * 0.4) * 0.05 - pointer.y * 0.3;
      targetScale = 1;
    }

    curRotY = lerp(curRotY, targetY, 0.08);
    curRotX = lerp(curRotX, targetX, 0.08);
    curScale = lerp(curScale, targetScale, 0.08);
    pivot.rotation.set(curRotX, curRotY, 0);
    pivot.scale.setScalar(curScale);

    renderer.render(scene, camera);
  }
  frame();
}

// ===========================================================================
// Metallic 3D name
// ===========================================================================
function initMetalName(container) {
  const refEl = document.querySelector("[data-name-ref]");
  const lines = (container.dataset.text || "Marko|Deric").split("|");

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const renderer = makeRenderer(canvas);

  const scene = new THREE.Scene();
  scene.environment = getEnv(renderer);

  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
  camera.position.z = 600;

  // Bright highlights so the silver reads as polished metal, plus a
  // camera-facing key so the head-on faces never go black.
  const l1 = new THREE.DirectionalLight(0xffffff, 3.0);
  l1.position.set(-4, 5, 6);
  scene.add(l1);
  const l2 = new THREE.PointLight(0xbcd4ff, 2.2, 0);
  l2.position.set(7, -2, 6);
  scene.add(l2);
  const l3 = new THREE.PointLight(0xffffff, 1.8, 0);
  l3.position.set(-7, -4, 5);
  scene.add(l3);
  const lFront = new THREE.DirectionalLight(0xffffff, 1.4);
  lFront.position.set(0, 0, 10);
  scene.add(lFront);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const group = new THREE.Group();
  scene.add(group);

  // metalness < 1 keeps a lit silver sheen head-on; the env still reflects.
  const material = new THREE.MeshStandardMaterial({
    color: 0xccd0d6,
    metalness: 0.82,
    roughness: 0.3,
    envMapIntensity: 1.7,
  });

  let built = false;
  let lineH = 1;

  function sizeRenderer() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.left = -w / 2; camera.right = w / 2;
    camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    return { w, h };
  }

  new FontLoader().load(CDN, (font) => {
    const { h } = sizeRenderer();
    const size = h * 0.46;             // each line ~46% of the box height
    const depth = size * 0.2;
    lineH = size * 1.04;

    const meshes = [];
    let maxW = 0;
    lines.forEach((text) => {
      const geo = new TextGeometry(text, {
        font,
        size,
        height: depth,
        depth,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: size * 0.03,
        bevelSize: size * 0.022,
        bevelSegments: 3,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const w = bb.max.x - bb.min.x;
      maxW = Math.max(maxW, w);
      // center each line on its own origin
      geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -depth / 2);
      const mesh = new THREE.Mesh(geo, material);
      meshes.push({ mesh, w });
    });

    meshes.forEach(({ mesh }, i) => {
      mesh.position.y = (lines.length - 1) / 2 * lineH - i * lineH;
      group.add(mesh);
    });

    // Fit width to the container.
    const targetW = (container.clientWidth) * 0.99;
    const s = Math.min(1.0, targetW / maxW);
    group.scale.setScalar(s);

    built = true;
    container.classList.add("is-ready");
    document.documentElement.classList.add("webgl-ready");
  });

  function syncSize() {
    // Match the canvas box to the (invisible) reference heading.
    if (refEl) {
      const r = refEl.getBoundingClientRect();
      container.style.width = r.width + "px";
      container.style.height = r.height + "px";
      container.style.left = "0px";
      container.style.top = "0px";
    }
    sizeRenderer();
  }
  syncSize();
  window.addEventListener("resize", () => {
    syncSize();
    // Rebuild text scale on resize.
    if (built) {
      const targetW = container.clientWidth * 0.99;
      let maxW = 0;
      group.children.forEach((m) => {
        m.geometry.computeBoundingBox();
        maxW = Math.max(maxW, m.geometry.boundingBox.max.x - m.geometry.boundingBox.min.x);
      });
      group.scale.setScalar(Math.min(1.0, (targetW / maxW)));
    }
  });

  let rx = 0, ry = 0;
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!built || !pageVisible) return;
    const t = clock.getElapsedTime();
    // Cursor rotation + a slow idle sway so the reflections always move.
    const targetY = pointer.x * 0.85 + Math.sin(t * 0.5) * 0.06;
    const targetX = -pointer.y * 0.5 + Math.cos(t * 0.4) * 0.04;
    ry = lerp(ry, targetY, 0.09);
    rx = lerp(rx, targetX, 0.09);
    group.rotation.set(rx, ry, 0);
    renderer.render(scene, camera);
  }
  frame();
}

// ===========================================================================
// Boot
// ===========================================================================
document.querySelectorAll("[data-iphone]").forEach(initPhone);
const nameEl = document.querySelector("[data-metal-name]");
if (nameEl) initMetalName(nameEl);
