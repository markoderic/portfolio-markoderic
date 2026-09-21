// Mac-style ANSI proportions. One atlas holds every legend; keys remain physical meshes.
const rows = [
  ['esc','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','⏻'],
  ['`','1','2','3','4','5','6','7','8','9','0','−','=','delete'],
  ['tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
  ['caps','A','S','D','F','G','H','J','K','L',';',"'",'return'],
  ['shift','Z','X','C','V','B','N','M',',','.','/','shift','↑'],
  ['fn','control','option','⌘','space','⌘','option','←','↓','→'],
];
export const keyboardKeys = rows.flatMap((row,r) => {
  const weights=row.map(label=>label==='space'?5:['shift','return','delete','tab','caps'].includes(label)?1.45:1);
  const unit=2.54/weights.reduce((a,b)=>a+b,0);let left=-1.27;
  return row.map((label,c)=>{const width=weights[c]*unit;const key={label,x:left+width/2,z:-.745+r*.177,w:width-.017,h:r===0?.105:.139};left+=width;return key;});
});
