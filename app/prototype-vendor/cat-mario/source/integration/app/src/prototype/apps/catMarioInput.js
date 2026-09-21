// Emscripten 3.1.74 SDL compatibility symbols: 1024 + SDL scancode
// for arrows/F1; ASCII for letters. Verified against the shipped SDL.keyCodes.
export const gameKeys = { ArrowLeft:1104, ArrowRight:1103, ArrowUp:1106, ArrowDown:1105, z:122, Z:122, Enter:13, ' ':122, o:111, O:111, F1:1082, '0':48, '1':49, '2':50, '3':51, '4':52, '5':53, '6':54, '7':55, '8':56, '9':57 };
export function createClassicInput(send) {
  const sources=new Map(), captures=new Map();
  const held = key => [...sources.values()].includes(key);
  const release = id => { const key=sources.get(id);sources.delete(id);if(key!==undefined&&!held(key))send(key,false); };
  const press = (id,key) => { if(sources.has(id))return;const was=held(key);sources.set(id,key);if(!was)send(key,true); };
  const dropPointer = id => {release(`p${id}`);const node=captures.get(id);captures.delete(id);if(node?.hasPointerCapture?.(id))node.releasePointerCapture(id);};
  return {
    key(e,down,enabled) {
      const id=`k${e.code||e.key}`;
      if(!down) { if(sources.has(id)){release(id);e.preventDefault();e.stopPropagation();return true;}return false; }
      if(!enabled||e.defaultPrevented||e.isComposing||e.nativeEvent?.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return false;
      const key=gameKeys[e.key];if(key===undefined)return false;
      if(e.repeat){if(sources.has(id)){e.preventDefault();e.stopPropagation();return true;}return false;}
      press(id,key);e.preventDefault();e.stopPropagation();return true;
    },
    control(e,key,down,enabled) {
      const id=`b${e.code||e.key}`;
      if(down && (!enabled||e.isComposing||e.nativeEvent?.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey))return;
      if(down&&e.repeat){if(sources.has(id)){e.preventDefault();e.stopPropagation();}return;}
      if(down)press(id,key);else release(id);
      e.preventDefault();e.stopPropagation();
    },
    tap(key) { press(`tap${key}`,key); },
    endTap(key) { release(`tap${key}`); },
    pointer(e,key,enabled) {
      if(!enabled||e.button!==0||captures.has(e.pointerId))return;
      // Touch deliberately permits multiple simultaneous pointers.
      if(e.pointerType!=='touch'&&e.isPrimary===false)return;
      e.preventDefault();e.stopPropagation();
      try{e.currentTarget.setPointerCapture(e.pointerId);}catch{return;}
      captures.set(e.pointerId,e.currentTarget);press(`p${e.pointerId}`,key);
    },
    releasePointer(e) {if(!captures.has(e.pointerId))return;e.preventDefault?.();dropPointer(e.pointerId);},
    clear() {for(const id of [...captures.keys()])dropPointer(id);for(const id of [...sources.keys()])release(id);},
  };
}
