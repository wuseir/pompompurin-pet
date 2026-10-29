// Window/tray/IPC foundation derived from chiikawa-pets, Copyright 2026 YiSen Luo.
import { app,BrowserWindow,screen,Tray,Menu,ipcMain,nativeImage,powerMonitor,session,shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaults,cleanSettings } from '../shared/settings';
import { validateKeyMap,maskHit } from '../shared/input';
import type { Settings,InputStatus,Command,Model } from '../shared/types';
import { KeyboardListener } from './keyboard';
import { loadModel } from './models';
import { petWindowSize } from '../shared/keyboard-layout';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(dirname,'..');
const testMode=!app.isPackaged&&process.env.PET_TEST_MODE==='1';
app.setName('PuddingPet');
app.setPath('userData',testMode?path.join(root,'test-results','profile'):path.join(app.getPath('appData'),'PuddingPet'));
if(!app.requestSingleInstanceLock())app.quit();
let win:BrowserWindow,settingsWindow:BrowserWindow|null=null,tray:Tray,keyboard:KeyboardListener;
let settings:Settings={...defaults},status:InputStatus='off',model:Model;
let modelWarning='',configWarning='',saveTimer:ReturnType<typeof setTimeout>|undefined;
let tracker:ReturnType<typeof setInterval>|undefined,drag:{cursor:Electron.Point;bounds:Electron.Rectangle}|null=null;
let hitMask={alpha:new Uint8Array(320*300),width:320,height:300},ignoring=true,quitting=false,suspended=false;
const dataRoot=app.getPath('userData'),configFile=path.join(dataRoot,'settings.json'),keymapFile=path.join(dataRoot,'keymap.json');
const modelRoot=path.join(dataRoot,'models','custom');
const publicRoot=app.isPackaged?path.join(root,'dist'):path.join(root,'public');
function send(channel:string,...args:unknown[]){if(win&&!win.isDestroyed())win.webContents.send(channel,...args);}
function broadcast(){
  const state={settings,status};send('pet:state',state);
  if(settingsWindow&&!settingsWindow.isDestroyed())settingsWindow.webContents.send('pet:state',state);
  if(tray){tray.setToolTip(`布丁桌宠 · 键盘${({on:'已开启',off:'已关闭',error:'异常',starting:'启动中',suspended:'暂停'})[status]}`);tray.setContextMenu(buildMenu());}
}
function writeSettings(){clearTimeout(saveTimer);try{fs.writeFileSync(configFile+'.tmp',JSON.stringify(settings,null,2));fs.renameSync(configFile+'.tmp',configFile);}catch{configWarning='设置保存失败，请检查目录权限。';}}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(writeSettings,350);}
function setInteractive(interactive:boolean){const ignore=!interactive;if(ignore!==ignoring){ignoring=ignore;win.setIgnoreMouseEvents(ignore,{forward:true});}}
function place(scale=settings.scale,reset=false){
  const old=win.getBounds();const width=Math.round(petWindowSize.width*scale),height=Math.round(petWindowSize.height*scale);
  const display=reset?screen.getDisplayNearestPoint(screen.getCursorScreenPoint()):screen.getDisplayMatching(old);
  const a=display.workArea;
  const position=reset?{x:a.x+a.width-width-24,y:a.y+a.height-height-18}:settings.position??{x:a.x+a.width-width-24,y:a.y+a.height-height-18};
  const x=Math.max(a.x,Math.min(position.x,a.x+a.width-width));
  const y=Math.max(a.y,Math.min(position.y,a.y+a.height-height));
  win.setBounds({x:Math.round(x),y:Math.round(y),width,height});settings.position={x:Math.round(x),y:Math.round(y)};
}
async function update(patch:Partial<Settings>){
  const before=settings;settings=cleanSettings({...settings,...patch});
  if(before.scale!==settings.scale)place();
  win.setOpacity(settings.opacity);
  if(before.keyboardEnabled!==settings.keyboardEnabled){if(settings.keyboardEnabled&&!suspended)keyboard.start();else keyboard.stop(suspended?'suspended':'off');}
  save();broadcast();
}
function buildMenu():Menu {return Menu.buildFromTemplate([
  {label:`键盘监听：${({on:'已开启',off:'已关闭',error:'异常，请重试',starting:'启动中',suspended:'系统暂停'})[status]}`,enabled:false},
  {label:'启用全局键盘监听',type:'checkbox',checked:settings.keyboardEnabled,click:item=>{void update({keyboardEnabled:item.checked});}},
  ...(status==='error'?[{label:'重试键盘监听',click:()=>{if(settings.keyboardEnabled&&!suspended)keyboard.start();}}]:[]),
  {label:'眼睛跟随全局鼠标',type:'checkbox',checked:settings.mouseTracking,click:item=>{void update({mouseTracking:item.checked});}},
  {type:'separator'},
  {label:'设置…',click:openSettings},
  {label:'大小',submenu:[.65,.85,1,1.25,1.5].map(scale=>({label:`${Math.round(scale*100)}%`,type:'radio' as const,checked:Math.abs(scale-settings.scale)<.01,click:()=>{void update({scale});}}))},
  {label:win?.isVisible()?'隐藏桌宠':'显示桌宠',click:()=>command(win?.isVisible()?'hide':'show')},
  {label:'移回当前屏幕',click:()=>command('reset-position')},
  {type:'separator'},{label:'退出',click:()=>app.quit()},
]);}
function loadPage(target:BrowserWindow,query?:Record<string,string>){
  target.on('page-title-updated',event=>event.preventDefault());
  const dev=process.env.VITE_DEV_SERVER_URL;
  if(dev&&!app.isPackaged){const u=new URL(dev);for(const [k,v] of Object.entries(query??{}))u.searchParams.set(k,v);void target.loadURL(u.href);}
  else void target.loadFile(path.join(root,'dist','index.html'),{query});
  target.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  target.webContents.on('will-navigate',event=>event.preventDefault());
  target.webContents.on('will-attach-webview',event=>event.preventDefault());
}
function openSettings(){
  if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();return;}
  settingsWindow=new BrowserWindow({title:'布丁桌宠设置',width:600,height:720,minWidth:480,minHeight:560,autoHideMenuBar:true,backgroundColor:'#fffaf0',show:false,webPreferences:{preload:path.join(dirname,'preload.mjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  loadPage(settingsWindow,{settings:'1'});
  settingsWindow.once('ready-to-show',()=>settingsWindow?.show());
  settingsWindow.on('closed',()=>{settingsWindow=null;});
}
function command(c:Command){switch(c){
  case 'settings':openSettings();break;
  case 'hide':drag=null;win.hide();send('pet:reset');broadcast();break;
  case 'show':win.showInactive();broadcast();break;
  case 'quit':app.quit();break;
  case 'menu':buildMenu().popup({window:win});break;
  case 'reset-position':place(settings.scale,true);win.showInactive();save();broadcast();break;
  case 'open-models':void shell.openPath(modelRoot);break;
  case 'open-keymap':void shell.openPath(keymapFile);break;
  case 'reload':{
    keyboard.stop();
    try{keyboard.keymap={...validateKeyMap(JSON.parse(fs.readFileSync(path.join(publicRoot,'keymap.json'),'utf8'))),...validateKeyMap(JSON.parse(fs.readFileSync(keymapFile,'utf8')))};configWarning='';}
    catch{configWarning='键位配置无效，继续使用上次有效映射。';}
    readModel();
    if(settings.keyboardEnabled&&!suspended)keyboard.start();
    void win.reload();if(settingsWindow)settingsWindow.reload();
    break;
  }
}}
function readModel(){
  modelWarning='';
  if(fs.existsSync(path.join(modelRoot,'model.json'))){try{model=loadModel(modelRoot);return;}catch{modelWarning='自定义模型加载失败，已使用内置原型。';}}
  model=loadModel(path.join(publicRoot,'models','prototype'));
}
function allowed(event:Electron.IpcMainEvent|Electron.IpcMainInvokeEvent){return event.sender===win?.webContents||event.sender===settingsWindow?.webContents;}
app.whenReady().then(()=>{
  fs.mkdirSync(dataRoot,{recursive:true});fs.mkdirSync(modelRoot,{recursive:true});
  fs.copyFileSync(path.join(publicRoot,'models','README.txt'),path.join(modelRoot,'README.txt'));
  try{settings=cleanSettings(JSON.parse(fs.readFileSync(configFile,'utf8')));}catch{if(fs.existsSync(configFile))configWarning='设置无法读取，本次使用默认设置。';}
  if(!fs.existsSync(keymapFile))fs.copyFileSync(path.join(publicRoot,'keymap.json'),keymapFile);
  let map=validateKeyMap(JSON.parse(fs.readFileSync(path.join(publicRoot,'keymap.json'),'utf8')));
  try{map={...map,...validateKeyMap(JSON.parse(fs.readFileSync(keymapFile,'utf8')))};}catch{configWarning='键位配置无效，已使用默认映射。';}
  readModel();
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
    const dev=process.env.VITE_DEV_SERVER_URL;
    const localDev=!!dev&&!app.isPackaged&&(details.url.startsWith(dev)||details.url.startsWith(dev.replace('http:','ws:')));
    callback({cancel:/^(https?|wss?):/.test(details.url)&&!localDev});
  });
  // No focus() call, no keyboard shortcut interception, no renderer Node API.
  win=new BrowserWindow({title:'布丁桌宠',width:320,height:300,frame:false,transparent:true,backgroundColor:'#00000000',alwaysOnTop:true,focusable:false,skipTaskbar:true,resizable:false,maximizable:false,minimizable:false,hasShadow:false,show:false,webPreferences:{preload:path.join(dirname,'preload.mjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:true,spellcheck:false}});
  win.setMenu(null);win.setIgnoreMouseEvents(true,{forward:true});win.setAlwaysOnTop(true,'floating');place();win.setOpacity(settings.opacity);
  keyboard=new KeyboardListener(path.join(dirname,'input-worker.cjs'),map,s=>{if(win.isVisible())send('pet:stroke',s);},s=>{status=s;broadcast();},()=>send('pet:reset'));
  win.once('ready-to-show',()=>{win.showInactive();if(settings.keyboardEnabled)keyboard.start();});
  win.webContents.on('render-process-gone',()=>{keyboard.stop('error');win.hide();});
  win.on('close',event=>{if(!quitting){event.preventDefault();command('hide');}});
  loadPage(win);
  const icon=nativeImage.createFromPath(path.join(publicRoot,'tray.png'));
  tray=new Tray(icon);tray.on('double-click',()=>command('show'));broadcast();
  tracker=setInterval(()=>{
    if(!win.isVisible())return;
    const cursor=screen.getCursorScreenPoint(); // DIP coordinates for all monitors, including negative origins.
    if(drag){
      const x=Math.round(drag.bounds.x+cursor.x-drag.cursor.x),y=Math.round(drag.bounds.y+cursor.y-drag.cursor.y);
      const b=win.getBounds();if(b.x!==x||b.y!==y)win.setPosition(x,y);
      return;
    }
    const b=win.getBounds(),x=(cursor.x-b.x)*320/b.width,y=(cursor.y-b.y)*300/b.height;
    setInteractive(maskHit(hitMask.alpha,hitMask.width,hitMask.height,x,y));
    send('pet:cursor',{x,y});
  },1000/30);
  ipcMain.handle('pet:initial',e=>{if(!allowed(e))return null;return {settings,status,model,modelWarning,configWarning};});
  ipcMain.handle('pet:update',(e,patch)=>{if(allowed(e)&&patch&&typeof patch==='object')return update(patch);});
  ipcMain.on('pet:command',(e,c)=>{if(allowed(e)&&['settings','hide','show','quit','menu','reset-position','open-models','open-keymap','reload'].includes(c))command(c);});
  ipcMain.on('pet:mask',(e,m)=>{
    if(e.sender!==win.webContents||!m||m.width!==320||m.height!==300||!Array.isArray(m.alpha)||m.alpha.length!==96000)return;
    hitMask={width:320,height:300,alpha:Uint8Array.from(m.alpha)};
  });
  ipcMain.on('pet:drag',(e,start)=>{
    if(e.sender!==win.webContents)return;
    if(start===true){drag={cursor:screen.getCursorScreenPoint(),bounds:win.getBounds()};setInteractive(true);}
    else{drag=null;const b=win.getBounds();settings.position={x:b.x,y:b.y};place();save();}
  });
  const suspend=()=>{suspended=true;drag=null;keyboard.stop('suspended');};
  const resume=()=>{suspended=false;if(settings.keyboardEnabled)keyboard.start();else keyboard.stop();};
  powerMonitor.on('suspend',suspend);powerMonitor.on('lock-screen',suspend);
  powerMonitor.on('resume',resume);powerMonitor.on('unlock-screen',resume);
  screen.on('display-removed',()=>{place(settings.scale,true);save();});
  screen.on('display-metrics-changed',()=>{if(!drag){place();save();}});
});
app.on('second-instance',()=>{if(win)command('show');});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
app.on('before-quit',()=>{quitting=true;clearInterval(tracker);keyboard?.stop();writeSettings();tray?.destroy();});
