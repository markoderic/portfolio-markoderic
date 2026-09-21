import * as T from 'three';
// Bin-local units: original inside wall runs from (.28,.05) to (.36,.76).
export const BIN_SCALE = 2.1;
export const BIN_FLOOR = .075;
export const binInnerRadius = y => .28 + .08 * (y - .05) / .71;
const random = n => { const v=Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v); };

// Each original blank-paper form has an irregular folded shell, with recessed
// triangle centers rather than a smooth ball. No texture, text or private data.
export function paperGeometry(seed, scale) {
  const base=new T.IcosahedronGeometry(1,0), a=base.attributes.position;
  const points=[];
  for(let i=0;i<a.count;i++){
    const p=new T.Vector3().fromBufferAttribute(a,i), key=(p.x+2)*19+(p.y+2)*31+(p.z+2)*53;
    p.multiplyScalar(.83+.17*random(key+seed)).multiply(new T.Vector3(...scale));
    p.applyAxisAngle(new T.Vector3(0,1,0),seed*1.73);points.push(p);
  }
  base.dispose();const positions=[],colors=[];
  for(let i=0;i<points.length;i+=3){
    const tri=points.slice(i,i+3),center=tri[0].clone().add(tri[1]).add(tri[2]).multiplyScalar(1/3);
    center.multiplyScalar(.85+.08*random(seed+i));
    for(let j=0;j<3;j++){
      const shade=new T.Color(['#dedbcf','#e8e5dc','#d6d6cf','#e5e0d3'][seed%4]);
      shade.multiplyScalar(.89+.10*random(seed+i+j));
      for(const p of [tri[j],tri[(j+1)%3],center]){positions.push(...p.toArray());colors.push(...shade.toArray());}
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
// Centers measured by exact vertical triangle contact in inspect-bin-contents.
// Stable deterministic layout; no runtime physics or growing collection.
export const BIN_PAPERS = [
  {
    "seed": 1,
    "scale": [
      0.102,
      0.0755,
      0.112
    ],
    "position": [
      0.165,
      0.13539498746395112,
      0
    ]
  },
  {
    "seed": 2,
    "scale": [
      0.11099999999999999,
      0.08449999999999999,
      0.117
    ],
    "position": [
      0.05098780407186633,
      0.14442421197891236,
      0.15692432518870034
    ]
  },
  {
    "seed": 3,
    "scale": [
      0.12,
      0.0755,
      0.122
    ],
    "position": [
      -0.1334878040718663,
      0.15369274004247727,
      0.09698456662825809
    ]
  },
  {
    "seed": 4,
    "scale": [
      0.102,
      0.08449999999999999,
      0.112
    ],
    "position": [
      -0.13348780407186633,
      0.1408508911728859,
      -0.09698456662825805
    ]
  },
  {
    "seed": 5,
    "scale": [
      0.11099999999999999,
      0.0755,
      0.117
    ],
    "position": [
      0.050987804071866295,
      0.138557468354702,
      -0.15692432518870036
    ]
  },
  {
    "seed": 6,
    "scale": [
      0.12,
      0.08449999999999999,
      0.122
    ],
    "position": [
      0,
      0.23263806476281113,
      0
    ]
  },
  {
    "seed": 7,
    "scale": [
      0.102,
      0.0755,
      0.112
    ],
    "position": [
      0.13723338901821186,
      0.27633050037557855,
      0.08226175866449811
    ]
  },
  {
    "seed": 8,
    "scale": [
      0.11099999999999999,
      0.08449999999999999,
      0.117
    ],
    "position": [
      -0.0822617586644981,
      0.2842688672054381,
      0.13723338901821186
    ]
  },
  {
    "seed": 9,
    "scale": [
      0.12,
      0.0755,
      0.122
    ],
    "position": [
      -0.13723338901821186,
      0.320302215247883,
      -0.0822617586644981
    ]
  },
  {
    "seed": 10,
    "scale": [
      0.102,
      0.08449999999999999,
      0.112
    ],
    "position": [
      0.08226175866449807,
      0.3054786462113138,
      -0.13723338901821186
    ]
  },
  {
    "seed": 11,
    "scale": [
      0.11099999999999999,
      0.0755,
      0.117
    ],
    "position": [
      0,
      0.37281363615352847,
      0
    ]
  },
  {
    "seed": 12,
    "scale": [
      0.105,
      0.057,
      0.112
    ],
    "position": [
      0.135,
      0.42674857522769216,
      0.04
    ]
  },
  {
    "seed": 13,
    "scale": [
      0.11299999999999999,
      0.062,
      0.124
    ],
    "position": [
      -0.045,
      0.43319419256427083,
      0.145
    ]
  },
  {
    "seed": 14,
    "scale": [
      0.121,
      0.053,
      0.112
    ],
    "position": [
      -0.13,
      0.4510034882769022,
      -0.045
    ]
  },
  {
    "seed": 15,
    "scale": [
      0.105,
      0.06,
      0.124
    ],
    "position": [
      0.04,
      0.4252764595003878,
      -0.145
    ]
  },
  {
    "seed": 16,
    "scale": [
      0.11299999999999999,
      0.048,
      0.112
    ],
    "position": [
      0.018,
      0.49471418084736474,
      0.015
    ]
  }
];

// All strips join a small stem at the near/right rim. Cross-sections are cupped,
// with separately colored inner/outer surfaces, a real thin edge, and curled tips.
export const PEEL_ANGLE = .8;
export const PEEL_PATHS = [
  [[.374,.775,0],[.425,.767,.014],[.452,.62,.028],[.462,.47,.038],[.445,.455,.045]],
  [[.374,.775,0],[.359,.806,.016],[.294,.675,.080],[.249,.59,.103],[.255,.595,.123]],
  [[.374,.775,0],[.42,.77,-.025],[.442,.66,-.085],[.447,.575,-.126],[.463,.588,-.145]],
];
export function peelGeometry() {
  const positions=[],colors=[],indices=[];const rot=new T.Matrix4().makeRotationY(-PEEL_ANGLE);
  const outer=new T.Color('#aa9148'),inner=new T.Color('#c6b88c'),brown=new T.Color('#66503a');
  PEEL_PATHS.forEach((path,k)=>{
    const curve=new T.CatmullRomCurve3(path.map(p=>new T.Vector3(...p))),rows=48,cols=12,offset=positions.length/3;
    for(let side=0;side<2;side++)for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
      const t=i/rows,u=j/cols*2-1,c=curve.getPoint(t),tangent=curve.getTangent(t);
      const across=new T.Vector3(0,0,1),normal=new T.Vector3().crossVectors(tangent,across).normalize();
      const width=(.008+.030*Math.sin(Math.PI*t)**.65)*(1-.72*t);
      const p=c.addScaledVector(across,u*width).addScaledVector(normal,.010*u*u*Math.sin(Math.PI*t)+(side===0?.002:-.002));p.applyMatrix4(rot);positions.push(...p.toArray());
      const col=(side===0?inner:outer).clone();
      const edge=Math.abs(u)>.86;
      let spot=0;for(let n=0;n<21;n++){
        const st=.08+.87*random(n*3+k*101),su=-.85+1.7*random(n*3+1+k*101);
        const d=Math.hypot((t-st)/(.007+.015*random(n+33)),(u-su)/(.06+.10*random(n+47)));
        spot=Math.max(spot,Math.max(0,Math.min(1,(1.3-d)*2)));
      }
      col.lerp(brown,edge?.65:spot*(side===0?.20:.76)+.04*random(i+j+k));colors.push(...col.toArray());
    }
    const stride=cols+1,layer=(rows+1)*stride;
    for(let side=0;side<2;side++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const a=offset+side*layer+i*stride+j,b=a+stride;indices.push(...(side===0?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));
    }
    for(let i=0;i<rows;i++)for(const j of [0,cols]){const a=offset+i*stride+j,b=a+stride;indices.push(a,a+layer,b,b,a+layer,b+layer);}
  });
  // Short joined brown stem rests over the lip rather than floating in midair.
  const stem=new T.CylinderGeometry(.011,.016,.075,8,1),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,.18,0).normalize());stem.applyQuaternion(q);stem.translate(.352,.785,0);stem.applyMatrix4(rot);
  const s=stem.toNonIndexed(),a=s.attributes.position,offset=positions.length/3;for(let i=0;i<a.count;i++){positions.push(a.getX(i),a.getY(i),a.getZ(i));colors.push(...brown.toArray());indices.push(offset+i);}stem.dispose();s.dispose();
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Exact offline triangle contact to the unchanged rim: seats the joined strips.
  geometry.translate(0,-.010255370457607715,0);return geometry;
}
