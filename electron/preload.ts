import { contextBridge,ipcRenderer } from 'electron';
import type { PetAPI } from '../shared/types';
function on<T extends unknown[]>(channel:string,cb:(...args:T)=>void){
  const listener=(_:Electron.IpcRendererEvent,...args:unknown[])=>cb(...args as T);
  ipcRenderer.on(channel,listener);return ()=>{ipcRenderer.removeListener(channel,listener);};
}
const api:PetAPI={
  initial:()=>ipcRenderer.invoke('pet:initial'),update:patch=>ipcRenderer.invoke('pet:update',patch),
  command:command=>ipcRenderer.send('pet:command',command),drag:start=>ipcRenderer.send('pet:drag',start),
  mask:mask=>ipcRenderer.send('pet:mask',mask),
  onStroke:cb=>on('pet:stroke',cb),onReset:cb=>on('pet:reset',cb),
  onState:cb=>on('pet:state',cb),onCursor:cb=>on('pet:cursor',cb),
};
contextBridge.exposeInMainWorld('pet',api);
