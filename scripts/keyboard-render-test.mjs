// Renderer integration tests. Controlled IPC fixtures, NOT physical keyboard input.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const env={...process.env,PET_TEST_MODE:'1'};delete env.ELECTRON_RUN_AS_NODE;
const packaged=!!process.env.PET_EXECUTABLE;
const app=await electron.launch({executablePath:packaged?path.resolve(process.env.PET_EXECUTABLE):path.resolve('node_modules/electron/dist/electron.exe'),args:packaged?[]:['.'],env});
const results={target:packaged?'packaged':'development',source:'controlled IPC animation fixtures, no native input injection',checks:[]};
try{
  const page=await app.firstWindow();await page.locator('svg.pet').waitFor();
  await page.evaluate(()=>window.pet.update({scale:1}));
  assert.equal(await page.locator('.keyboard-key').count(),104);
  results.checks.push('104 distinct labelled SVG keycaps');
  const map=JSON.parse(await fs.readFile('public/keymap.json','utf8'));
  async function send(vk,down){await app.evaluate(({BrowserWindow},s)=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='布丁桌宠').webContents.send('pet:stroke',s),{id:vk,down,action:map[vk].action,kind:map[vk].kind});}
  for(let vk=65;vk<=90;vk++){
    const side=map[vk].action;
    await send(vk,true);
    await page.waitForFunction(({side,vk})=>{
      const paw=document.querySelector(`[data-paw="${side}"]`),key=document.querySelector(`.keyboard-key[data-vk="${vk}"]`),rect=key?.querySelector('.key-face');
      if(!paw||!rect)return false;
      const cx=+rect.getAttribute('x') + +rect.getAttribute('width')/2,cy=+rect.getAttribute('y') + +rect.getAttribute('height')/2;
      return paw.dataset.key===String(vk)&&Math.abs(+paw.dataset.x-cx)<.1&&Math.abs(+paw.dataset.y-cy)<1.5&&key.dataset.active==='true';
    },{side,vk});
    await send(vk,false);
  }
  results.checks.push('all 26 letters move the assigned paw to the matching key and highlight it');
  await send(65,true);await send(74,true);await page.waitForTimeout(120);
  await page.screenshot({path:'test-results/keyboard-AJ.png',omitBackground:true});
  const poses=await page.locator('[data-paw]').evaluateAll(nodes=>nodes.map(n=>({...n.dataset})));
  assert.equal(poses.find(p=>p.paw==='left').key,'65');assert.equal(poses.find(p=>p.paw==='right').key,'74');results.checks.push('left A and right J can remain active at the same time');
  await send(65,false);await send(74,false);
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.keyboard-key[data-active="true"]').count(),0);
  assert.equal(await page.locator('[data-paw="left"]').getAttribute('data-key'),'');
  assert.equal(await page.locator('[data-paw="right"]').getAttribute('data-key'),'');
  results.checks.push('release clears highlights and returns both paws to idle');
  await page.screenshot({path:'test-results/keyboard-idle.png',omitBackground:true});
}finally{await app.close();await fs.writeFile('test-results/keyboard-render.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
