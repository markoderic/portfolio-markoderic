// Portfolio game assets and corresponding source, shared by release and local review builds.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./cat-mario/',import.meta.url));
function files(dir=root,prefix='') { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(path.join(dir,item.name),`${prefix}${item.name}/`):[`${prefix}${item.name}`]); }
export default function classicPrivateAssets(){
  let base='/';
  return {name:'private-classic-cat-mario',
    configResolved(config){base=config.base;},
    configureServer(server){server.middlewares.use((req,res,next)=>{
      const prefix=`${base}prototype-vendor/cat-mario/`;
      let url;try{url=decodeURIComponent((req.url||'').split('?')[0]);}catch{return next();}
      if(!url.startsWith(prefix))return next();
      const file=url.slice(prefix.length);if(!files().includes(file))return next();
      const type={'.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.html':'text/html; charset=utf-8','.zip':'application/zip','.png':'image/png'}[path.extname(file).toLowerCase()]||'text/plain; charset=utf-8';
      res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-cache');
      const data=fs.readFileSync(path.join(root,file));res.setHeader('Content-Length',data.length);res.end(req.method==='HEAD'?undefined:data);
    });},
    generateBundle(){for(const file of files())this.emitFile({type:'asset',fileName:`prototype-vendor/cat-mario/${file}`,source:fs.readFileSync(path.join(root,file))});},
  };
}
