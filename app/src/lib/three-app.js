import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json";
const MODEL_URL = "/assets/iphone-15-pro.glb";
const SCREEN_MATERIAL = "pIJKfZsazmcpEiU"; // emissive display material inside the GLB
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Shared reflection environment (studio room) — gives metals real reflections.
// NOTE: deliberately a single shared texture. Strictly speaking a PMREM
// texture belongs to the WebGL context that generated it, so most canvases
// effectively render with direct lights only — but that IS the established
// look of the metal name. A per-renderer cache was tried (2026-06-12) and it
// visibly changed the name's finish; Marko wants the original look, so do
// NOT "fix" this again.
// ---------------------------------------------------------------------------
let sharedEnv = null;
function buildStudioEnvScene() {
  // Bright studio "lightbox": a gradient sky sphere (white top -> silver -> dark
  // floor) so polished chrome reads as bright silver with a premium gradient,
  // plus a couple of crisp softboxes for highlights.
  const envScene = new THREE.Scene();

  const c = document.createElement("canvas");
  c.width = 16; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  // Kept bright all the way around so the metal reflects light at every angle
  // (like polished metal in sunlight) instead of catching dark spots.
  g.addColorStop(0.0, "#ffffff");
  g.addColorStop(0.5, "#f7f9fb");
  g.addColorStop(0.82, "#eaedf0");
  g.addColorStop(1.0, "#dadee2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const gradTex = new THREE.CanvasTexture(c);
  gradTex.colorSpace = THREE.SRGBColorSpace;
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 32),
    new THREE.MeshBasicMaterial({ map: gradTex, side: THREE.BackSide })
  ));

  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const panel = new THREE.PlaneGeometry(18, 18);
  const addBox = (x, y, z, s) => {
    const m = new THREE.Mesh(panel, white);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    m.lookAt(0, 0, 0);
    envScene.add(m);
  };
  addBox(0, 3, 13, 1.0);     // front softbox -> head-on shine
  addBox(-14, 4, 6, 0.95);   // left side softbox -> shine when turned left
  addBox(14, 2, 6, 0.95);    // right side softbox -> shine when turned right
  addBox(-9, 11, 11, 0.7);
  // Wrap lights all the way around so a sharp mirror never reflects a dark gap,
  // no matter how far the letters / phone / cube rotate.
  addBox(0, -9, 9, 0.9);     // under-light -> downward reflections stay bright
  addBox(0, 3, -13, 0.9);    // back light -> grazing / far-rotated reflections
  addBox(13, -4, 8, 0.7);    // lower-right
  addBox(-13, -4, 8, 0.7);   // lower-left

  return envScene;
}

function getEnv(renderer) {
  if (sharedEnv) return sharedEnv;
  const pmrem = new THREE.PMREMGenerator(renderer);
  sharedEnv = pmrem.fromScene(buildStudioEnvScene(), 0.035).texture;
  return sharedEnv;
}

// The cube generates its own env on ITS OWN context: its big flat faces need
// real reflections to read as chrome (the name's beveled letters get away
// with direct lights alone — flat faces don't). This room has CONTRAST — a
// bright ceiling falling to a dark floor, plus crisp window panels — so each
// face picks up a different value and visible highlight streaks: that
// light/dark separation is what sells the 3D.
function buildCubeEnvScene() {
  const envScene = new THREE.Scene();

  const c = document.createElement("canvas");
  c.width = 16; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, "#ffffff");
  g.addColorStop(0.38, "#cdd2d7");
  g.addColorStop(0.72, "#70777e");
  g.addColorStop(1.0, "#23282d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const gradTex = new THREE.CanvasTexture(c);
  gradTex.colorSpace = THREE.SRGBColorSpace;
  envScene.add(new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 32),
    new THREE.MeshBasicMaterial({ map: gradTex, side: THREE.BackSide })
  ));

  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const panel = new THREE.PlaneGeometry(7, 16);
  const addPanel = (x, y, z) => {
    const m = new THREE.Mesh(panel, white);
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    envScene.add(m);
  };
  addPanel(0, 5, 14);     // main window, high front
  addPanel(-14, 2, 7);    // left streak
  addPanel(14, -1, 7);    // right streak
  addPanel(2, 12, -10);   // top-back rim
  return envScene;
}

function getOwnEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(buildCubeEnvScene(), 0.03).texture;
  pmrem.dispose();
  return tex;
}

// Track every renderer so orphaned ones (whose canvas left the DOM on a route
// change) can have their WebGL context freed — browsers only allow ~16 live.
const _instances = [];
function disposeOrphans() {
  for (let i = _instances.length - 1; i >= 0; i--) {
    const { renderer, canvas } = _instances[i];
    if (!document.body.contains(canvas)) {
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
      _instances.splice(i, 1);
    }
  }
}

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  _instances.push({ renderer, canvas });
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
      // Overview: scroll progress through the section turns the phone (~65°)
      // and swells it as it crosses the middle of the viewport, layered with
      // the idle sway and the pointer follow.
      const sect = container.closest("section") || container;
      const r = sect.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const sp = clamp((vh - r.top) / (vh + r.height), 0, 1);
      targetY = BASE_Y + (sp - 0.5) * 1.15 + Math.sin(t * 0.5) * 0.22 + pointer.x * 0.45;
      targetX = BASE_X + (0.5 - sp) * 0.22 + Math.cos(t * 0.42) * 0.06 + pointer.y * 0.26;
      targetScale = 0.94 + Math.sin(sp * Math.PI) * 0.1 + Math.sin(t * 0.6) * 0.012;
    }

    curRotY = lerp(curRotY, targetY, 0.09);
    curRotX = lerp(curRotX, targetX, 0.09);
    curScale = lerp(curScale, targetScale, 0.09);
    pivot.rotation.set(curRotX, curRotY, 0);
    pivot.scale.setScalar(curScale);
    // Floats gently like it's hovering (overview only — scroll mode stays put).
    if (mode === "overview") pivot.position.y = Math.sin(t * 0.7) * 0.12;

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
  // Sky/ground fill so faces angled away from the softboxes still pick up light.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaab0b8, 0.7));

  const group = new THREE.Group();
  scene.add(group);

  // Polished liquid chrome: physically-based metal with a clearcoat sheen on
  // top so the letters read like real wet-polished steel, not flat silver.
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf7f9fb,
    metalness: 1.0,
    roughness: 0.26,        // softer mirror -> averages the bright env, no dark patches
    envMapIntensity: 1.6,
    clearcoat: 0.55,
    clearcoatRoughness: 0.12,
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
    const depth = size * 0.72;         // deep extrusion so the letters feel solid
    lineH = size * 1.04;

    const meshes = [];
    let maxW = 0;
    lines.forEach((text) => {
      const geo = new TextGeometry(text, {
        font,
        size,
        height: depth,
        depth,
        curveSegments: 14,
        bevelEnabled: true,
        bevelThickness: size * 0.06,
        bevelSize: size * 0.04,
        bevelSegments: 7,
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
    // Cursor rotation (follows the cursor) + a slow idle sway. Clamped so the
    // letters never turn far enough to catch a dark reflection angle.
    const targetY = clamp(pointer.x * 0.5, -0.5, 0.5) + Math.sin(t * 0.5) * 0.05;
    const targetX = clamp(pointer.y * 0.32, -0.3, 0.3) + Math.cos(t * 0.4) * 0.03;
    ry = lerp(ry, targetY, 0.09);
    rx = lerp(rx, targetX, 0.09);
    group.rotation.set(rx, ry, 0);
    renderer.render(scene, camera);
  }
  frame();
}

// ===========================================================================
// Metallic chrome cube (logo) — auto-spins, drag to rotate
// ===========================================================================
function initCube(container) {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const renderer = makeRenderer(canvas);

  const scene = new THREE.Scene();
  scene.environment = getOwnEnv(renderer); // same studio lightbox as the metal name

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4); // extra room so corners never clip when spinning

  // Same lighting rig as the metal name so the chrome reads identically.
  const l1 = new THREE.DirectionalLight(0xffffff, 3.0);
  l1.position.set(-4, 5, 6);
  scene.add(l1);
  const l2 = new THREE.PointLight(0xbcd4ff, 2.2, 0);
  l2.position.set(7, -2, 6);
  scene.add(l2);
  const lFront = new THREE.DirectionalLight(0xffffff, 1.4);
  lFront.position.set(0, 0, 10);
  scene.add(lFront);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaab0b8, 0.7));

  // Solid polished-chrome cube — the exact material of the hero name, so the
  // two metal pieces bookend the site in the same finish.
  const S = 1.9; // sized so the spinning corners stay inside the (roomier) frame
  const cube = new THREE.Mesh(
    new RoundedBoxGeometry(S, S, S, 5, 0.12),
    new THREE.MeshPhysicalMaterial({
      color: 0xf7f9fb,
      metalness: 1.0,
      roughness: 0.16, // crisper than the name so the window streaks stay sharp
      envMapIntensity: 1.5,
      clearcoat: 0.55,
      clearcoatRoughness: 0.12,
    })
  );
  cube.rotation.set(0.4, -0.6, 0);
  scene.add(cube);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  // Hold + drag to rotate. Velocity-based so it feels weighty: it has a steady
  // idle spin, takes some effort to push (heavier), and carries real momentum
  // that eases back to idle — buttery smooth, no jumps.
  let dragging = false, lastX = 0, lastY = 0;
  let velY = 0.006, velX = 0;       // current angular velocity
  let targetVelY = 0, targetVelX = 0;
  const IDLE = 0.006;               // steady base spin
  const DRAG = 0.0062;              // pointer motion -> spin energy
  const RESPONSE = 0.085;           // how fast the mass picks up the drag (low = heavy)
  const MAXV = 0.24;                // hard cap so a violent fling can't blur out

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    targetVelY = targetVelX = 0;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    targetVelY = dx * DRAG;
    targetVelX = dy * DRAG;
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = () => { dragging = false; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);

  container.classList.add("is-ready");
  document.documentElement.classList.add("webgl-ready");

  function frame() {
    requestAnimationFrame(frame);
    if (!pageVisible) return;
    if (dragging) {
      // ease velocity toward the pointer's motion; the slow response is what
      // makes the cube feel like a heavy mass instead of a weightless toy.
      velY = lerp(velY, targetVelY, RESPONSE);
      velX = lerp(velX, targetVelX, RESPONSE);
      targetVelY *= 0.93; targetVelX *= 0.93;
    } else {
      // flywheel momentum: a hard fling keeps it spinning for seconds before
      // it slowly bleeds back down to the gentle idle rotation.
      velY = lerp(velY, IDLE, 0.01);
      velX = lerp(velX, 0, 0.016);
    }
    velY = clamp(velY, -MAXV, MAXV);
    velX = clamp(velX, -MAXV, MAXV);
    cube.rotation.y += velY;
    cube.rotation.x = Math.max(-1.15, Math.min(1.15, cube.rotation.x + velX));

    renderer.render(scene, camera);
  }
  frame();
}

// ===========================================================================
// WebGL hover image distortion — ripple + RGB split following the cursor
// ===========================================================================
function initDistort(el) {
  const img = el.querySelector("img");
  if (!img) return;
  const src = img.currentSrc || img.src;

  const canvas = document.createElement("canvas");
  canvas.className = "distort-canvas";
  el.appendChild(canvas);
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTex: { value: null },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uHover: { value: 0 },
    uTime: { value: 0 },
  };

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTex;
        uniform vec2 uMouse;
        uniform float uHover;
        uniform float uTime;
        void main(){
          vec2 uv = vUv;
          vec2 toM = uv - uMouse;
          float d = length(toM);
          vec2 dir = toM / (d + 0.0001);
          float ripple = sin(d * 26.0 - uTime * 4.0) * 0.018 * uHover * smoothstep(0.55, 0.0, d);
          uv += dir * ripple;
          float sep = 0.008 * uHover;
          float r = texture2D(uTex, uv + dir * sep).r;
          float g = texture2D(uTex, uv).g;
          float b = texture2D(uTex, uv - dir * sep).b;
          gl_FragColor = vec4(r, g, b, 1.0);
        }`,
    })
  );
  scene.add(mesh);

  new THREE.TextureLoader().load(src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    // cover-fit the texture to the element box
    uniforms.uTex.value = tex;
    fitCover(tex);
    el.classList.add("distort-ready");
    render();
  });

  function fitCover(tex) {
    const ib = el.getBoundingClientRect();
    const ir = (tex.image.width / tex.image.height);
    const br = ib.width / ib.height;
    if (br > ir) { tex.repeat.set(1, ir / br); tex.offset.set(0, (1 - ir / br) / 2); }
    else { tex.repeat.set(br / ir, 1); tex.offset.set((1 - br / ir) / 2, 0); }
  }

  function resize() {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (uniforms.uTex.value) fitCover(uniforms.uTex.value);
  }
  resize();
  new ResizeObserver(resize).observe(el);

  let raf = null, active = false;
  const clock = new THREE.Clock();
  function render() {
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    // keep rendering while hovering or easing back
    if (active || uniforms.uHover.value > 0.001) {
      uniforms.uHover.value += ((active ? 1 : 0) - uniforms.uHover.value) * 0.12;
      raf = requestAnimationFrame(render);
    } else {
      uniforms.uHover.value = 0;
      renderer.render(scene, camera);
      raf = null;
    }
  }

  el.addEventListener("pointerenter", () => { active = true; if (!raf) render(); });
  el.addEventListener("pointerleave", () => { active = false; });
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    uniforms.uMouse.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
  });
}

// ===========================================================================
// Boot — called from React after the page markup has mounted.
// ===========================================================================
export function initThree() {
  disposeOrphans(); // free WebGL contexts left behind by the previous route
  // Skip any element that already has its canvas — initThree is called again on
  // each route change, and only the newly-mounted page's elements need building.
  const fresh = (el) => el && !el.querySelector("canvas");
  document.querySelectorAll("[data-iphone]").forEach((el) => { if (fresh(el)) initPhone(el); });
  const nameEl = document.querySelector("[data-metal-name]");
  if (fresh(nameEl)) initMetalName(nameEl);
  document.querySelectorAll("[data-metal-cube]").forEach((el) => { if (fresh(el)) initCube(el); });
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll("[data-distort]").forEach((el) => { if (fresh(el)) initDistort(el); });
  }
}
