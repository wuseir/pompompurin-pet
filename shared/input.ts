import type { KeyMap, KeyBinding } from './types';
export function validateKeyMap(value:unknown):KeyMap {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('键位配置须为对象');
  const result:KeyMap={};
  for(const [key,v] of Object.entries(value)){
    const binding=v as KeyBinding;
    if(!/^\d+$/.test(key)||+key<1||+key>255||!binding||!['left','right','both','none'].includes(binding.action)|| (binding.kind&&!['tap','space','enter','modifier','arrow'].includes(binding.kind)))throw Error('无效的键位配置');
    result[key]={action:binding.action,kind:binding.kind??'tap'};
  }
  return result;
}
export function bindingFor(vk:number,map:KeyMap):KeyBinding {return map[String(vk)]??{action:'none',kind:'tap'};}
export function maskHit(alpha:Uint8Array,width:number,height:number,x:number,y:number):boolean {
  const ix=Math.floor(x),iy=Math.floor(y);
  if(ix<0||iy<0||ix>=width||iy>=height)return false;
  // Two prototype pixels of tolerance cover breathing/paw movement at the edge.
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const xx=ix+dx,yy=iy+dy;if(xx>=0&&yy>=0&&xx<width&&yy<height&&alpha[yy*width+xx]>20)return true;
  }
  return false;
}
