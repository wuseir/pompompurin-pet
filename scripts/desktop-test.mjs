import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
const resultDir=path.resolve('test-results');await mkdir(resultDir,{recursive:true});
const env={...process.env,PET_TEST_MODE:'1'};delete env.ELECTRON_RUN_AS_NODE;
const packaged=!!process.env.PET_EXECUTABLE;
const app=await electron.launch({executablePath:packaged?path.resolve(process.env.PET_EXECUTABLE):path.resolve('node_modules/electron/dist/electron.exe'),args:packaged?[]:['.'],env});
const results={target:packaged?'packaged':'development',checks:[],errors:[]};
try{
  const pet=await app.firstWindow();pet.on('pageerror',error=>results.errors.push(error.message));
  await pet.locator('svg.pet').waitFor();
  await pet.evaluate(()=>window.pet.update({keyboardEnabled:true,scale:1,opacity:1}));
  await pet.locator('.status.on').waitFor({timeout:15000});results.checks.push('native input process reaches ready state (event delivery tested separately)');
  const properties=await app.evaluate(({BrowserWindow,screen})=>{
    const w=BrowserWindow.getAllWindows().find(w=>w.getTitle()==='布丁桌宠');
    return {focusable:w.isFocusable(),top:w.isAlwaysOnTop(),bounds:w.getBounds(),displays:screen.getAllDisplays().map(d=>({bounds:d.bounds,scaleFactor:d.scaleFactor}))};
  });
  assert.equal(properties.focusable,false);assert.equal(properties.top,true);results.window=properties;
  results.checks.push('unfocusable always-on-top window');
  await pet.screenshot({path:path.join(resultDir,'prototype.png'),omitBackground:true});
  const transparency=await app.evaluate(async({BrowserWindow})=>{
    const w=BrowserWindow.getAllWindows().find(w=>w.getTitle()==='布丁桌宠');
    const image=await w.capturePage();const bitmap=image.toBitmap();let clear=0,painted=0;
    for(let i=3;i<bitmap.length;i+=4){if(bitmap[i]===0)clear++;else painted++;}
    return {clear,painted};
  });
  assert.ok(transparency.clear>1000&&transparency.painted>1000);results.transparency=transparency;results.checks.push('rendered output has transparent and painted pixels');
  await pet.evaluate(()=>window.pet.command('settings'));
  await new Promise(resolve=>setTimeout(resolve,600));
  const settings=app.windows().find(w=>w!==pet);assert.ok(settings);
  const listen=settings.getByLabel('全局键盘监听',{exact:false});
  await listen.uncheck();await pet.locator('.status.off').waitFor();
  let stopped=1;
  for(let attempt=0;attempt<30&&stopped;attempt++){
    await new Promise(resolve=>setTimeout(resolve,100));
    stopped=await app.evaluate(({app})=>app.getAppMetrics().filter(m=>m.name==='Pudding keyboard listener').length);
  }
  assert.equal(stopped,0);results.checks.push('disable stops native helper process, visible OFF status');
  await listen.check();await pet.locator('.status.on').waitFor();results.checks.push('enable creates helper again');
  await settings.getByLabel('眼睛跟随鼠标',{exact:false}).uncheck();
  await settings.getByLabel('眼睛跟随鼠标',{exact:false}).check();
  await settings.getByRole('slider',{name:'大小',exact:true}).fill('1.25');
  await new Promise(resolve=>setTimeout(resolve,250));
  const bounds=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='布丁桌宠').getBounds());
  assert.equal(bounds.width,800);assert.equal(bounds.height,750);results.checks.push('size control resizes native window');
  await settings.getByRole('slider',{name:'大小',exact:true}).fill('1');
  await settings.getByRole('button',{name:'隐藏',exact:true}).click();
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='布丁桌宠').isVisible()),false);
  await settings.getByRole('button',{name:'显示',exact:true}).click();
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='布丁桌宠').isVisible()),true);results.checks.push('hide and inactive show');
  await settings.screenshot({path:path.join(resultDir,'settings.png')});
  assert.deepEqual(results.errors,[]);
  results.checks.push('no renderer errors');results.metrics=await app.evaluate(({app})=>app.getAppMetrics().map(m=>({type:m.type,name:m.name,cpu:m.cpu,memory:m.memory})));
}finally{await app.close();await writeFile(path.join(resultDir,'desktop-smoke.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
