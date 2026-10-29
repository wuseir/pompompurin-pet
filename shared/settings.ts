import type { Settings } from './types';
export const defaults:Settings={keyboardEnabled:true,mouseTracking:true,scale:1,opacity:1,keyBubble:false,fps:60,reducedMotion:false};
export function cleanSettings(value:unknown):Settings {
  const v=(value&&typeof value==='object'?value:{}) as Partial<Settings>;
  const result={...defaults};
  for(const key of ['keyboardEnabled','mouseTracking','keyBubble','reducedMotion'] as const)if(typeof v[key]==='boolean')result[key]=v[key];
  if(typeof v.scale==='number'&&Number.isFinite(v.scale))result.scale=Math.max(.5,Math.min(1.8,v.scale));
  if(typeof v.opacity==='number'&&Number.isFinite(v.opacity))result.opacity=Math.max(.45,Math.min(1,v.opacity));
  if(v.fps===30||v.fps===60)result.fps=v.fps;
  if(v.position&&Number.isFinite(v.position.x)&&Number.isFinite(v.position.y))result.position={x:Math.round(v.position.x),y:Math.round(v.position.y)};
  return result;
}
