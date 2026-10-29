import type { Stroke } from '../shared/types';
import { keyForVK,keyCenter,pawHomes } from '../shared/keyboard-layout';
type Point={x:number;y:number};
type Paw={value:number;velocity:number;phase:number;until:number;held:Map<number,number>;key:number|null;lastKey:number|null;position:Point;destination:Point;from:Point;travel:number};
const paw=(home:Point):Paw=>({value:0,velocity:0,phase:0,until:0,held:new Map(),key:null,lastKey:null,position:{...home},destination:{...home},from:{...home},travel:1});
export class AnimationController {
  left=paw(pawHomes.left);right=paw(pawHomes.right);gaze={x:0,y:0};target={x:0,y:0};lastKind='tap';
  // Current held keys and brief visual feedback only, never a sequential log.
  visualKeys=new Map<number,{down:boolean;until:number}>();
  stroke(s:Stroke,now:number){
    this.lastKind=s.kind;
    if(s.down&&keyForVK(s.id))this.visualKeys.set(s.id,{down:true,until:now+1600});
    else if(!s.down&&this.visualKeys.has(s.id))this.visualKeys.set(s.id,{down:false,until:now+90});
    for(const side of ['left','right'] as const){
      const p=this[side];
      if(!s.down){p.held.delete(s.id);continue;}
      if(s.action===side||s.action==='both'){
        p.held.set(s.id,now);p.lastKey=keyForVK(s.id)?s.id:null;
        p.until=Math.max(p.until,now+170);
        // Add velocity instead of resetting phase, position or an animation.
        p.velocity=Math.min(16,p.velocity+5);
      }
    }
  }
  reset(){for(const p of [this.left,this.right]){p.held.clear();p.until=0;p.lastKey=null;}this.visualKeys.clear();}
  look(x:number,y:number){const length=Math.hypot(x,y);this.target={x:x/Math.max(1,length),y:y/Math.max(1,length)};}
  step(dt:number,now:number){
    dt=Math.max(0,Math.min(.05,dt));
    const mix=1-Math.exp(-dt/0.095);
    this.gaze.x+=(this.target.x-this.gaze.x)*mix;this.gaze.y+=(this.target.y-this.gaze.y)*mix;
    for(const [id,v] of this.visualKeys)if(now>v.until)this.visualKeys.delete(id);
    for(const side of ['left','right'] as const){
      const p=this[side];
      // A bounded lease recovers from missing releases on secure desktop/device changes.
      for(const [key,t] of p.held)if(now-t>1600)p.held.delete(key);
      let newest:number|null=null,newestTime=-Infinity;
      for(const [key,t] of p.held)if(t>=newestTime&&keyForVK(key)){newest=key;newestTime=t;}
      const active=p.held.size>0||now<p.until;
      p.key=active?(newest??p.lastKey):null;
      let destination=p.key===null?pawHomes[side]:keyCenter(keyForVK(p.key)!);
      if(p.key===32)destination={x:destination.x+(side==='left'?-10:10),y:destination.y};
      if(destination.x!==p.destination.x||destination.y!==p.destination.y){p.from={...p.position};p.destination={...destination};p.travel=0;}
      p.travel=Math.min(1,p.travel+dt/.075);
      const t=p.travel*p.travel*(3-2*p.travel);
      p.position={x:p.from.x+(p.destination.x-p.from.x)*t,y:p.from.y+(p.destination.y-p.from.y)*t};
      p.phase+=dt*2*Math.PI/0.155;
      const target=active?.54+.42*Math.sin(p.phase):0;
      const steps=Math.max(1,Math.ceil(dt/.008));const h=dt/steps;
      for(let i=0;i<steps;i++){p.velocity+=(300*(target-p.value)-27*p.velocity)*h;p.value+=p.velocity*h;}
      p.value=Math.max(-.06,Math.min(1.25,p.value));
    }
  }
}
