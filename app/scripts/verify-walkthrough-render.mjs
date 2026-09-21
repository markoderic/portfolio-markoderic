// Server-render component smoke checks in Node. No browser, DOM interaction or network.
import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".vite/walkthrough-render-test.mjs");
const source = `
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import NotchDemo,{EntityForm} from './src/prototype/notch/NotchDemo.jsx';
import FinancePanel,{financeNames} from './src/prototype/notch/FinancePanel.jsx';
import {seedDemo,sections} from './src/prototype/notch/demoState.js';
import MailComposer from './src/prototype/apps/MailComposer.jsx';
import Xcode from './src/prototype/apps/XcodeWorkspace.jsx';
import Code from './src/prototype/apps/CodeWorkspace.jsx';
import Studio from './src/prototype/apps/YouTubeStudio.jsx';
import snapshot from './src/prototype/assets/animalfeed-snapshot.json';
import {studioRanges, studioPeriod, studioValue} from './src/prototype/apps/studioData.js';
import Calendar from './src/prototype/apps/CalendarPanel.jsx';
import LineChart from './src/prototype/charts/LineChart.jsx';
import {emptyDraft} from './src/prototype/apps/mailState.js';
const state=seedDemo('2026-09-17'), noop=()=>{};
globalThis.document={activeElement:null};globalThis.innerWidth=1200;globalThis.location={hash:'',search:''};
let count=0;
const check=(name,element,pattern)=>{const html=renderToStaticMarkup(element);assert.match(html,pattern,name);assert.ok(!html.includes('NaN'),'finite output: '+name);count++;};
for(const tab of sections)check('Notch '+tab,React.createElement(NotchDemo,{state:{...state,tab},dispatch:noop,enabled:true}),/notch-demo/);
for(const section of ['overview','accounts','income','bills','spending','savings','debts','investments','forecast','tax'])check('Finance '+section,React.createElement(FinancePanel,{state,dispatch:noop,edit:noop,initialSection:section}),/finance-panel/);
for(const collection of ['tasks','habits','classes','assignments','notes','folders','reminders','reminderLists','spending','income','accounts','workouts','nutrition','trips','shopping','orders','goals',...Object.keys(financeNames)])check('Form '+collection,React.createElement(EntityForm,{sheet:{collection,id:'test',value:{}},state,dispatch:noop,close:noop}),/n-form/);
check('Mail',React.createElement(MailComposer,{mail:{draft:emptyDraft(),status:'',sending:false},setMail:noop,sendMail:noop}),/Your email/);
check('Xcode chooser',React.createElement(Xcode,{notchScreen:noop}),/Welcome to Xcode/);
check('VS Code authored default',React.createElement(Code,{navigate:noop}),/A workspace for my work/);
check('Studio dashboard',React.createElement(Studio),/Visit AnimalFeed YouTube channel/);
for(const preset of studioRanges)for(const view of [{section:'Dashboard',tab:'Overview'},{section:'Content',tab:'Overview'},...['Overview','Content','Audience'].map(tab=>({section:'Analytics',tab}))]){
 const html=renderToStaticMarkup(React.createElement(Studio,{initialView:view,initialRange:preset.id}));
 const p=studioPeriod(snapshot,preset.id);
 assert.ok(!/NaN|Updating live|dated export pending|Individual video metrics require/.test(html));
 assert.ok(!html.includes('type="date"'),'No competing chart date filters');
 if(view.section!=='Content'){
  for(const key of Object.keys(p.totals).filter(k => p.totals[k] !== null))assert.ok(html.includes(studioValue(p.totals[key],key,true)), 'Card '+key+' '+preset.id);
  const cards=html.split('yt-snapshot-metrics')[1].split('</div></div>')[0];
  assert.equal(cards.includes('Thumbnail CTR'),p.totals.ctrPercent !== null,'Null CTR omitted; Lifetime CTR retained');
  assert.ok(!cards.includes('Sum of available observations'));
  assert.ok(!html.includes('type="range"'),'Date slider removed, SVG inspection retained');
  assert.ok(html.includes(p.range.from+' – '+p.range.to));
  assert.equal(html.includes('Studio notes a change in how views are counted'),p.countingChange);
 }
 if(view.section==='Content'||view.section==='Analytics'&&view.tab==='Content'){
  assert.equal(html.split('https://www.youtube.com/watch?v=').length-1,72);
  assert.ok(html.includes('Video performance · Lifetime'));
  assert.ok(html.includes('2025-12-10 – 2026-09-15'));
  assert.ok(!html.includes('value="Shorts"'));
 }
 if(view.section==='Analytics'&&view.tab==='Overview'){
  assert.equal((html.match(/class="chart-line"/g)||[]).length,2);
  assert.ok(html.includes('Net subscriber change'));
  if(preset.id==='lifetime')assert.ok(html.includes('2025-12-10 · No observation'));
 }
 if(view.section==='Analytics'&&view.tab==='Audience'){
  assert.ok(html.includes('Net subscriber change'));
  assert.ok(html.includes('aria-valuetext='));
  assert.ok(html.includes('Demographics and new/returning viewers were not included'));
 }
 count++;
}
check('Calendar',React.createElement(Calendar,{visible:true,close:noop,requestMeeting:noop,now:new Date('2026-09-17T12:00:00Z')}),/Draft request/);
check('Chart fixture',React.createElement(LineChart,{rows:[{date:'2026-09-01',value:20},{date:'2026-09-02',value:30}],metrics:[{key:'value',label:'Fixture'}],title:'Fixture only',provenance:'Synthetic test data'}),/chart-line/);
console.log(count+' server-render component cases passed; no browser rendering or inputs exercised.');
`;
await build({
  stdin: { contents: source, resolveDir: root, loader: "jsx" },
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: output,
  jsx: "automatic",
  plugins: [
    {
      name: "raw-source",
      setup(b) {
        b.onResolve({ filter: /\?raw$/ }, (args) => ({
          path: path.resolve(args.resolveDir, args.path.slice(0, -4)),
          namespace: "raw",
        }));
        b.onLoad({ filter: /.*/, namespace: "raw" }, async (args) => ({
          contents: await fs.readFile(args.path, "utf8"),
          loader: "text",
        }));
      },
    },
  ],
  loader: { ".png": "dataurl", ".jpg": "dataurl", ".pdf": "dataurl" },
});
await import(pathToFileURL(output).href + "?v=" + Date.now());
