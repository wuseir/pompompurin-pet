import { utilityProcess, type UtilityProcess } from 'electron';
import type { InputStatus, KeyMap, Stroke } from '../shared/types';
import { bindingFor } from '../shared/input';
export class KeyboardListener {
  private child:UtilityProcess|null=null;
  private watchdog:ReturnType<typeof setInterval>|undefined;
  private startup:ReturnType<typeof setTimeout>|undefined;
  status:InputStatus='off';
  constructor(private script:string,public keymap:KeyMap,private stroke:(s:Stroke)=>void,private state:(s:InputStatus)=>void,private reset:()=>void){}
  private report(s:InputStatus){this.status=s;this.state(s);}
  start(){
    if(this.child)return;
    this.report('starting');
    try{
      const child=utilityProcess.fork(this.script,[],{serviceName:'Pudding keyboard listener',stdio:'ignore'});
      this.child=child;
      let alive=Date.now();
      this.startup=setTimeout(()=>{if(this.child===child){this.stop();this.report('error');}},5000);
      child.on('message',(msg:unknown)=>{
        if(this.child!==child||!msg||typeof msg!=='object')return;
        const m=msg as {type:string;vk:number;down:boolean};
        if(m.type==='ready') {clearTimeout(this.startup);alive=Date.now();this.report('on');return;}
        if(m.type==='alive'){alive=Date.now();return;}
        if(m.type==='key'&&this.status==='on'&&Number.isInteger(m.vk)&&m.vk>0&&m.vk<=255&&typeof m.down==='boolean'){
          const b=bindingFor(m.vk,this.keymap);
          if(b.action!=='none')this.stroke({id:m.vk,down:m.down,action:b.action,kind:b.kind??'tap'});
        }
      });
      this.watchdog=setInterval(()=>{if(Date.now()-alive>4500){this.stop();this.report('error');}},1500);
      child.on('exit',()=>{if(this.child===child){this.stop();this.report('error');}});
    }catch{this.stop();this.report('error');}
  }
  stop(status:InputStatus='off'){
    clearTimeout(this.startup);clearInterval(this.watchdog);
    const child=this.child;this.child=null;
    child?.kill(); // Unhooking is guaranteed by OS process teardown, independent of addon state.
    this.reset();this.report(status);
  }
}
