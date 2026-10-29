// Development-only, bounded desktop acceptance harness. Not packaged.
// Samples rendered poses, never subscribes to or records real keyboard events.
import { _electron as electron } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=path.resolve('test-results');await fs.mkdir(dir,{recursive:true});
const env={...process.env,PET_TEST_MODE:'1'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:['.'],env});
const pet=await app.firstWindow();await pet.locator('svg.pet').waitFor();
await pet.evaluate(()=>window.pet.update({keyboardEnabled:true,scale:1,opacity:1}));
await pet.locator('.status.on').waitFor();
await fs.writeFile(path.join(dir,'live-ready.json'),JSON.stringify({ready:true,pid:app.process().pid}));
let last='';let running=true;
while(running){
  await new Promise(resolve=>setTimeout(resolve,80));
  let request;try{request=JSON.parse(await fs.readFile(path.join(dir,'live-command.json'),'utf8'));}catch{continue;}
  if(request.id===last)continue;last=request.id;
  try{
    let result;
    if(request.action==='observe'){
      result=await pet.evaluate(duration=>new Promise(resolve=>{
        let maxLeft=0,maxRight=0,minX=1,maxX=-1,minY=1,maxY=-1,frames=0;
        const timer=setInterval(()=>{const s=document.querySelector('svg.pet').dataset;maxLeft=Math.max(maxLeft,+s.left);maxRight=Math.max(maxRight,+s.right);minX=Math.min(minX,+s.gazeX);maxX=Math.max(maxX,+s.gazeX);minY=Math.min(minY,+s.gazeY);maxY=Math.max(maxY,+s.gazeY);frames++;},8);
        setTimeout(()=>{clearInterval(timer);resolve({maxLeft,maxRight,minX,maxX,minY,maxY,frames,status:document.querySelector('.status').textContent});},duration);
      }),Math.min(15000,request.duration??4000));
    }else if(request.action==='state'){
      result=await app.evaluate(({BrowserWindow,screen,app})=>({windows:BrowserWindow.getAllWindows().map(w=>({title:w.getTitle(),bounds:w.getBounds(),visible:w.isVisible(),focusable:w.isFocusable(),focused:w.isFocused()})),displays:screen.getAllDisplays().map(d=>({bounds:d.bounds,scaleFactor:d.scaleFactor})),metrics:app.getAppMetrics().map(m=>({type:m.type,name:m.name,cpu:m.cpu,memory:m.memory}))}));
    }else if(request.action==='toggle'){
      await pet.evaluate(value=>window.pet.update({keyboardEnabled:value}),request.enabled);result=await pet.locator('.status').innerText();
    }else if(request.action==='place'){
      result=await app.evaluate(({BrowserWindow},bounds)=>{const w=BrowserWindow.getAllWindows()[0];w.setBounds(bounds);return w.getBounds();},request.bounds);
    }else if(request.action==='settings'){
      await pet.evaluate(()=>window.pet.command('settings'));result='opened';
    }else if(request.action==='screenshot'){
      await pet.screenshot({path:path.join(dir,'live-prototype.png'),omitBackground:true});result='saved';
    }else if(request.action==='quit'){running=false;result='closing';}
    await fs.writeFile(path.join(dir,'live-result.json'),JSON.stringify({id:last,result},null,2));
  }catch(error){await fs.writeFile(path.join(dir,'live-result.json'),JSON.stringify({id:last,error:String(error)}));}
}
await app.close();
