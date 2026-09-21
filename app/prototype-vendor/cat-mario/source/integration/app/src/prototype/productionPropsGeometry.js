import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original, unbranded camera and yoke-mounted broadcast mic. One unit = 11.5 cm.
export const PRODUCTION={camera:[4.7,0,.60],cameraYaw:-.22,cameraScale:.6,clamp:[-5.4,0,-2.07],
 pivot:[-5.55,.34,-2.07],elbow:[-5.85,2.95,-.65],tip:[-5.55,2.15,.35],micYaw:.64,micTilt:Math.PI/2,micReach:.60};
export const PROP_MATERIALS={body:{color:'#303238',roughness:.48,metalness:.28},rubber:{color:'#17191c',roughness:.93,metalness:0},metal:{color:'#73777a',roughness:.35,metalness:.75},glass:{color:'#142d38',roughness:.12,metalness:.45},foam:{color:'#26282b',roughness:1,metalness:0},cable:{color:'#121416',roughness:.85,metalness:0}};
const v=p=>new T.Vector3(...p);
function box(size,p,r=.018){return new RoundedBoxGeometry(...size,1,r).translate(...p);}
function cylinder(radius,length,p,axis=[0,1,0],segments=24){return new T.CylinderGeometry(radius,radius,length,segments).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v(axis).normalize())).translate(...p);}
function rod(a,b,r){const x=v(a),y=v(b);return cylinder(r,x.distanceTo(y),x.clone().add(y).multiplyScalar(.5).toArray(),y.sub(x).toArray(),12);}
function tube(points,r=.025){
 const curve=new T.CatmullRomCurve3(points.map(v));
 // Resolve the small capsule loop as well as the long boom without moving anchors.
 curve.arcLengthDivisions=1024;
 return new T.TubeGeometry(curve,384,r,8,false);
}
function ring(radius,t,p){return new T.TorusGeometry(radius,t,6,32).translate(...p);}
export function productionParts(config=PRODUCTION){
 const out=[];let root='camera';const camMatrix=new T.Matrix4().makeRotationY(config.cameraYaw);
 // Scale the complete camera in its own support frame before world translation.
 // Microphone geometry switches to its independent matrix below, before batching.
 const scale=config.cameraScale??1;camMatrix.scale(new T.Vector3(scale,scale,scale));camMatrix.setPosition(...config.camera);
 let matrix=camMatrix;
 const add=(name,material,geometry)=>{geometry.applyMatrix4(matrix);out.push({root,name,material,geometry});};
 add('camera-body','body',box([1.19,.69,.43],[0,.395,0],.065));
 add('camera-top','body',box([1.22,.09,.46],[0,.775,0],.025));
 add('camera-grip','rubber',box([.32,.65,.63],[.465,.375,.11],.065));
 add('camera-front-leather','rubber',box([.75,.52,.025],[-.10,.36,.223],.012));
 for(const x of [-.42,.42])add('camera-foot-'+x,'rubber',box([.22,.05,.27],[x,.025,0],.012));
 add('camera-rear-display','glass',box([.81,.46,.018],[-.08,.37,-.225],.018));
 add('camera-viewfinder','rubber',box([.30,.16,.16],[-.41,.72,-.27],.035));
 add('camera-viewfinder-glass','glass',box([.19,.08,.008],[-.41,.72,-.355],.008));
 add('camera-hotshoe','metal',box([.23,.035,.20],[-.12,.831,-.045],.008));
 for(const x of [.18,.45]){add('camera-dial-'+x,'body',cylinder(.105,.065,[x,.838,.015]));for(let i=0;i<16;i++){const a=i*Math.PI/8;add('camera-dial-rib','rubber',box([.014,.045,.014],[x+Math.cos(a)*.102,.84,.015+Math.sin(a)*.102],.002));}}
 add('camera-shutter','metal',cylinder(.055,.025,[.46,.89,.07]));
 for(const [x,y]of [[.46,.64],[.46,.51],[.46,.34],[.26,.66]])add('camera-rear-button','rubber',cylinder(.033,.023,[x,y,-.233],[0,0,1],12));
 // Solid mount/barrel ends behind the recessed front element. The front ring is open.
 add('lens-mount','metal',cylinder(.293,.085,[-.12,.41,.252],[0,0,1]));
 add('lens-barrel','body',cylinder(.281,.39,[-.12,.41,.474],[0,0,1]));
 for(const z of [.34,.51,.62])add('lens-ring','rubber',ring(.282,.012,[-.12,.41,z]));
 for(let i=0;i<40;i++){const a=i*Math.PI/20;add('lens-focus-rib','rubber',rod([-.12+Math.cos(a)*.282,.41+Math.sin(a)*.282,.39],[-.12+Math.cos(a)*.282,.41+Math.sin(a)*.282,.48],.006));}
 add('lens-front-sleeve','body',new T.LatheGeometry([[.239,.63],[.281,.63],[.281,.705],[.239,.705],[.239,.63]].map(p=>new T.Vector2(...p)),32).rotateX(Math.PI/2).translate(-.12,.41,0));
 add('lens-optical-element','glass',cylinder(.240,.008,[-.12,.41,.675],[0,0,1],32));
 add('lens-front-lip','body',ring(.259,.023,[-.12,.41,.705]));
 root='microphone';matrix=new T.Matrix4();
 const [cx,,cz]=config.clamp;
 // Left desk edge. Upper pad bottom = 0; lower pad top = -.22, matching the top.
 add('clamp-upper-pad','rubber',box([.34,.04,.36],[cx+.17,.02,cz],.008));
 add('clamp-upper-jaw','body',box([.64,.095,.40],[cx+.03,.0875,cz],.025));
 add('clamp-spine','body',box([.12,.59,.38],[cx-.25,-.16,cz],.025));
 add('clamp-lower-jaw','body',box([.62,.09,.38],[cx+.01,-.41,cz],.024));
 add('clamp-lower-pad','rubber',cylinder(.15,.035,[cx+.16,-.2375,cz]));
 add('clamp-screw','metal',cylinder(.036,.37,[cx+.16,-.43,cz],undefined,12));
 add('clamp-handle','rubber',cylinder(.11,.07,[cx+.16,-.645,cz],undefined,16));
 add('boom-socket','body',cylinder(.13,.24,[config.pivot[0],.24,cz]));
 const points=[config.pivot,config.elbow,config.tip];
 for(let i=0;i<2;i++)for(const offset of [-.075,.075]){
  const a=v(points[i]),b=v(points[i+1]),delta=b.clone().sub(a),g=box([.095,delta.length(),.12],[0,0,0],.012);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...a.add(b).multiplyScalar(.5).add(new T.Vector3(offset,0,0)).toArray());add('boom-link-'+i,'body',g);
 }
 for(let i=0;i<3;i++){add('boom-joint-'+i,'body',cylinder(.17,.30,points[i],[1,0,0]));const p=v(points[i]).add(new T.Vector3(.17,0,0));add('boom-joint-bolt-'+i,'metal',cylinder(.07,.06,p.toArray(),[1,0,0],12));}
 // Compatible U yoke on a vertical threaded collar, not an unrelated shock mount.
 const micMatrix=new T.Matrix4().makeRotationY(config.micYaw);micMatrix.setPosition(...config.tip);matrix=micMatrix;
 add('mic-threaded-collar','metal',cylinder(.085,.18,[0,.15,0]));
 add('mic-yoke-bottom','body',box([.80,.09,.15],[0,.255,0],.025));
 // Offset the supported pivot in front of the crossbar so a downward capsule
 // clears it. Both side arms connect the unchanged crossbar to this actual axis.
 const reach=config.micReach??0,tilt=config.micTilt??0;
 for(const x of [-.355,.355]){const a=v([x,.255,0]),b=v([x,.59,reach]),delta=b.clone().sub(a),arm=box([.09,delta.length()+.08,.15],[0,0,0],.025);arm.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));arm.translate(...a.add(b).multiplyScalar(.5).toArray());add('mic-yoke-arm','body',arm);add('mic-yoke-pivot','metal',cylinder(.07,.20,[x,.59,reach],[1,0,0],16));add('mic-yoke-knob','rubber',cylinder(.105,.075,[Math.sign(x)*.448,.59,reach],[1,0,0],20));}
 // Capsule, XLR and strain relief share one rigid rotation around the yoke axis.
 const capsuleLocal=new T.Matrix4().makeTranslation(0,.59,reach).multiply(new T.Matrix4().makeRotationX(tilt)).multiply(new T.Matrix4().makeTranslation(0,-.59,0));
 const capsuleMatrix=micMatrix.clone().multiply(capsuleLocal);matrix=capsuleMatrix;
 add('mic-body','body',cylinder(.26,.76,[0,.59,-.30],[0,0,1],32));
 // Rounded foam profile, a lathed shell with a closed softly domed front.
 const profile=[[0,-.02],[.263,-.02],[.282,.04],[.282,.70],[.273,.78],[.23,.83],[.13,.86],[0,.87]].map(([r,z])=>new T.Vector2(r,z));
 add('mic-windscreen','foam',new T.LatheGeometry(profile,32).rotateX(Math.PI/2).translate(0,.59,.07));
 add('mic-windscreen-seam','rubber',ring(.266,.012,[0,.59,.08]));
 add('mic-rear-cap','rubber',cylinder(.248,.035,[0,.59,-.696],[0,0,1]));
 add('mic-xlr-connector','metal',cylinder(.085,.22,[0,.59,-.806],[0,0,1],16));
 add('mic-strain-relief','rubber',cylinder(.065,.15,[0,.59,-.966],[0,0,1],12));
 // Leave the strain relief along its rotated axis, then loop outside the body
 // before returning to the unchanged boom cable anchors.
 const cableStart=[[0,.59,-1.04],[0,.59,-1.22]].map(p=>v(p).applyMatrix4(capsuleMatrix).toArray());
 const cableReturn=[[.50,1.78,reach],[.55,.85,.22],[.38,-.02,-.10]].map(p=>v(p).applyMatrix4(micMatrix).toArray());
 const cableWorld=[...cableStart,...cableReturn];matrix=new T.Matrix4();
 const offset=new T.Vector3(.23,.04,0),along=points.map(p=>v(p).add(offset).toArray());
 add('boom-cable','cable',tube([...cableWorld,along[2],v(config.tip).lerp(v(config.elbow),.65).add(offset).toArray(),along[1],v(config.elbow).lerp(v(config.pivot),.65).add(offset).toArray(),along[0],[cx-.12,.20,cz-.17],[cx-.30,.03,cz-.21]],.021));
 for(let i=0;i<2;i++)for(const t of [.3,.7]){const p=v(points[i]).lerp(v(points[i+1]),t);add('cable-wrap','rubber',box([.56,.055,.20],p.toArray(),.012));}
 return out;
}
export function productionBatches(parts=productionParts()){
 const grouped=new Map();for(const p of parts){const key=p.root+'/'+p.material;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p.geometry);}
 const result=[...grouped].map(([key,gs])=>{const non=gs.map(g=>g.index?g.toNonIndexed():g),geometry=mergeGeometries(non);new Set([...gs,...non]).forEach(g=>g.dispose());const [root,material]=key.split('/');return {name:key,root,material,geometry};});return result;
}
