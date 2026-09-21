// Source-token contrast, not computed/composited browser appearance.
import assert from 'node:assert/strict';
const luminance=hex=>{const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const pairs=[['Mac light hover','#25292b','#d8e5ee'],['Mac dark hover','#f2f4f7','#425c70'],['Mac light secondary','#545d62','#f9f9f7'],['Mac dark secondary','#bec8d1','#303841'],['Selected desktop label','#ffffff','#286cb4'],['Notch light secondary','#62676f','#eef0f5'],['Notch dark secondary','#afb7c4','#171b22'],['Code primary','#dbdce5','#1b1d23'],['Code inspector secondary','#adb7c7','#272932'],['Premiere secondary','#b0b3c2','#25262c']];
for(const [name,fg,bg] of pairs){const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${name}: ${ratio}`);console.log(`${name}: ${ratio.toFixed(2)}:1 PASS`)}
console.log('10 source-token pairs pass WCAG AA normal-text ratio; browser composition not checked.');
