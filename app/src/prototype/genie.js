// All coordinates belong to the laptop display before its common CSS projection.
// Layout offsets intentionally avoid getBoundingClientRect (already projected).
export function dockTarget(host, id) {
  const button = host?.querySelector?.(`[data-dock="${id}"]`);
  const dock = button?.closest('.icon-dock');
  const icon = button?.querySelector('.dock-icon');
  if (!dock || !icon) return null;
  return {
    x: dock.offsetLeft - dock.offsetWidth / 2 + dock.clientLeft + button.offsetLeft + icon.offsetLeft,
    y: dock.offsetTop + dock.clientTop + button.offsetTop + icon.offsetTop,
    w: icon.offsetWidth, h: icon.offsetHeight,
  };
}
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const mix = (a, b, p) => a + (b - a) * p;
export function genieCorners(bounds, dock, progress) {
  const p = clamp(progress);
  // Lower edge pinches into the dock first; the upper edge follows through the
  // funnel. Reversing this same path releases the top before the lower edge.
  const lower = smooth(p / .78), upper = smooth((p - .16) / .84);
  const left = dock.x - bounds.x, top = dock.y - bounds.y;
  return [
    [mix(0, left, upper), mix(0, top, upper)],
    [mix(bounds.w, left + dock.w, upper), mix(0, top, upper)],
    [mix(bounds.w, left + dock.w, lower), mix(bounds.h, top + dock.h, lower)],
    [mix(0, left, lower), mix(bounds.h, top + dock.h, lower)],
  ];
}
// Rectangle -> quadrilateral homography. One live surface, no DOM/image clones.
export function quadMatrix(w, h, [a,b,c,d]) {
  const dx1=b[0]-c[0], dx2=d[0]-c[0], dx3=a[0]-b[0]+c[0]-d[0];
  const dy1=b[1]-c[1], dy2=d[1]-c[1], dy3=a[1]-b[1]+c[1]-d[1];
  const det=dx1*dy2-dx2*dy1;
  const g=Math.abs(det)>1e-9?(dx3*dy2-dx2*dy3)/det:0;
  const k=Math.abs(det)>1e-9?(dx1*dy3-dx3*dy1)/det:0;
  return [(b[0]-a[0]+g*b[0])/w,(b[1]-a[1]+g*b[1])/w,0,g/w,
    (d[0]-a[0]+k*d[0])/h,(d[1]-a[1]+k*d[1])/h,0,k/h,
    0,0,1,0,a[0],a[1],0,1];
}
// Exact critically damped step. Retarget keeps both current position and velocity.
export function stepGenie(state, target, dt) {
  const omega=15, t=Math.min(.04, Math.max(0,dt));
  const x=state.value-target, c=state.velocity+omega*x, e=Math.exp(-omega*t);
  let value=target+(x+c*t)*e, velocity=(state.velocity-omega*c*t)*e;
  if (value<0 || value>1) { value=clamp(value); velocity=0; }
  const done=Math.abs(value-target)<.001 && Math.abs(velocity)<.015;
  return {value:done?target:value,velocity:done?0:velocity,done};
}
// Renderer is independently exercisable without browser automation. The caller
// owns a single RAF and provides fresh layout bounds each frame.
export function paintGenie(element, bounds, dock, progress) {
  element.style.visibility=progress===1?'hidden':'visible';
  element.style.transformOrigin='0 0';
  element.style.willChange=progress>0&&progress<1?'transform, opacity':'';
  element.style.opacity=String(1-smooth((progress-.94)/.06));
  element.style.transform=progress===0 || !dock ? '' :
    `matrix3d(${quadMatrix(bounds.w,bounds.h,genieCorners(bounds,dock,progress)).join(',')})`;
}
