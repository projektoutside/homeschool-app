import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='output/integration-2026-10-24',label=process.env.RECOVERY_LABEL||'recovery';await mkdir(out,{recursive:true});
const css=await readFile('src/styles/variables.css','utf8')+'\n'+await readFile('src/components/ErrorBoundary.css','utf8');
const rows=[];
for(const [name,engine,width,height,base] of [['desktop',chromium,1280,900,'/homeschool-app/'],['android-viewport',chromium,393,852,'/'],['iphone-webkit',webkit,390,844,'/homeschool-app/'],['tablet-webkit',webkit,1024,1366,'/homeschool-app/'],['native-relative-base',chromium,393,852,'./']]){
 const compiled=await build({stdin:{contents:`import React,{lazy,Suspense} from 'react';import{createRoot}from'react-dom/client';import{ErrorBoundary}from'./src/components/ErrorBoundary.tsx';const url=location.origin+'/route-module/'+('long-name-'.repeat(25))+'.js';const Route=lazy(()=>import(url));createRoot(document.getElementById('root')).render(<ErrorBoundary><Suspense fallback="Loading route"><Route/></Suspense></ErrorBoundary>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'esm',jsx:'automatic',define:{'import.meta.env':JSON.stringify({PROD:false,BASE_URL:base})}});
 const browser=await engine.launch(),context=await browser.newContext({viewport:{width,height},hasTouch:name!=='desktop'}),page=await context.newPage();let fail=true,requests=0;
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='https://integration-fixture.invalid')return route.abort();
  if(url.pathname.startsWith('/route-module/')){requests++;return fail?route.abort():route.fulfill({contentType:'text/javascript',body:'export default function Route(){return "Route ready"}'});}
  if(request.resourceType()==='document')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script type="module" src="/app.js"></script>`});
  if(url.pathname==='/app.js')return route.fulfill({contentType:'text/javascript',body:compiled.outputFiles[0].text});
  return route.abort();
 });
 const target='https://integration-fixture.invalid'+(base.startsWith('/')?base:'/')+'play/game?resume=1#answer';const home=base.startsWith('/')?base:'/';
 try{
  await page.goto(target,{waitUntil:"domcontentloaded"});await page.getByRole('alert').waitFor();
  const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));await page.screenshot({path:`${out}/${label}-${name}-error.png`});
  await page.evaluate(()=>sessionStorage.setItem('recovery-sentinel','keep'));
  fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();
  let retry=true;try{await page.getByText('Route ready',{exact:true}).waitFor({timeout:2000});}catch{retry=false;}
  const sameRoute=page.url()===target,retained=await page.evaluate(()=>sessionStorage.getItem('recovery-sentinel')==='keep');
  fail=true;await page.reload();await page.getByRole('alert').waitFor();fail=false;
  await page.getByRole('button',{name:'Go to home',exact:true}).click();
  await page.getByText('Route ready',{exact:true}).waitFor();
  const homePath=new URL(page.url()).pathname;
  const row={name,base,fixtureOnly:true,retryRecovered:retry,preservedRoute:sameRoute,preservedSession:retained,homePath,expectedHome:home,homeCorrect:homePath===home,noHorizontalOverflow:size.scrollWidth<=size.width+1,size,moduleRequests:requests};rows.push(row);console.log(JSON.stringify(row));
  await page.screenshot({path:`${out}/${label}-${name}-recovered.png`});
 }finally{await browser.close();}
}
await writeFile(`${out}/${label}-report.json`,JSON.stringify(rows,null,2));
assert.ok(rows.every(r=>r.retryRecovered&&r.preservedRoute&&r.preservedSession&&r.homeCorrect&&r.noHorizontalOverflow),'Recovery must work for root, GitHub Pages and native-relative bases without horizontal overflow.');
