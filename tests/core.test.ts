import { describe,it,expect } from 'vitest';
import { readFileSync,mkdtempSync,writeFileSync,cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AnimationController } from '../src/animation';
import { validateKeyMap,bindingFor,maskHit } from '../shared/input';
import { cleanSettings } from '../shared/settings';
import { loadModel } from '../electron/models';
import { keyboardKeys,keyForVK,keyCenter,pawHomes } from '../shared/keyboard-layout';
const map=validateKeyMap(JSON.parse(readFileSync('public/keymap.json','utf8')));
describe('完整键盘及逐键定位',()=>{
  it('104 个独立键帽，26 个字母、功能键、导航和数字区完整',()=>{
    expect(keyboardKeys).toHaveLength(104);expect(new Set(keyboardKeys.map(k=>k.id)).size).toBe(104);
    for(const vk of [...Array.from({length:26},(_,i)=>65+i),...Array.from({length:12},(_,i)=>112+i),...Array.from({length:10},(_,i)=>96+i),8,9,13,27,32,37,38,39,40,160,161,162,163,164,165])expect(keyForVK(vk)).toBeDefined();
    for(const k of keyboardKeys){expect(bindingFor(k.vk,map).action).not.toBe('none');expect(k.x+k.width).toBeLessThan(318);expect(k.y+k.height).toBeLessThan(274);}
  });
  it('每个字母的对应爪都移动到该字母键帽中心',()=>{
    for(let vk=65;vk<=90;vk++){
      const a=new AnimationController(),binding=bindingFor(vk,map);a.stroke({id:vk,down:true,action:binding.action,kind:'tap'},0);
      for(let now=10;now<=120;now+=10)a.step(.01,now);
      const p=binding.action==='left'?a.left:a.right;
      expect(p.key).toBe(vk);expect(p.position).toEqual(keyCenter(keyForVK(vk)!));
    }
  });
  it('同一只爪的连续字母会换位置，起点连续且不重置敲击相位',()=>{
    const a=new AnimationController();a.stroke({id:65,down:true,action:'left',kind:'tap'},0);
    for(let i=0;i<10;i++)a.step(.01,i*10);
    const old={...a.left.position},phase=a.left.phase;
    a.stroke({id:65,down:false,action:'left',kind:'tap'},101);a.stroke({id:84,down:true,action:'left',kind:'tap'},102);
    expect(a.left.position).toEqual(old);a.step(.01,112);expect(a.left.phase).toBeGreaterThan(phase);expect(a.left.position).not.toEqual(keyCenter(keyForVK(84)!));
    for(let i=0;i<9;i++)a.step(.01,122+i*10);expect(a.left.position).toEqual(keyCenter(keyForVK(84)!));
  });
  it('组合键保持高亮，松开字母后仍指向按住的 Ctrl，关闭清除并回家',()=>{
    const a=new AnimationController();a.stroke({id:162,down:true,action:'left',kind:'modifier'},0);a.stroke({id:65,down:true,action:'left',kind:'tap'},5);a.step(.016,21);
    expect(a.left.key).toBe(65);expect(a.visualKeys.has(65)&&a.visualKeys.has(162)).toBe(true);
    a.stroke({id:65,down:false,action:'left',kind:'tap'},22);a.step(.016,38);expect(a.left.key).toBe(162);
    a.reset();for(let i=0;i<15;i++)a.step(.01,50+i*10);expect(a.left.position).toEqual(pawHomes.left);expect(a.visualKeys.size).toBe(0);
  });
  it('空格两爪同时落在空格范围内，松开后反馈自动消失',()=>{
    const a=new AnimationController();a.stroke({id:32,down:true,action:'both',kind:'space'},0);for(let i=0;i<10;i++)a.step(.01,i*10);
    const k=keyForVK(32)!;expect(a.left.position.x).toBeGreaterThan(k.x);expect(a.right.position.x).toBeLessThan(k.x+k.width);expect(a.left.position.x).toBeLessThan(a.right.position.x);
    a.stroke({id:32,down:false,action:'both',kind:'space'},100);a.step(.016,200);expect(a.visualKeys.size).toBe(0);
  });
});
describe('Windows 虚拟键码映射',()=>{
  it('左右手常用字母数字和左右修饰键',()=>{
    for(const vk of [65,81,84,66,49,53,160,162,164])expect(bindingFor(vk,map).action).toBe('left');
    for(const vk of [74,89,78,54,48,161,163,165])expect(bindingFor(vk,map).action).toBe('right');
    expect(bindingFor(32,map)).toEqual({action:'both',kind:'space'});
    expect(bindingFor(13,map).kind).toBe('enter');expect(bindingFor(37,map).kind).toBe('arrow');
  });
  it('未知键不误触，映射可覆盖',()=>{expect(bindingFor(255,map).action).toBe('none');expect(bindingFor(65,validateKeyMap({'65':{action:'both'}})).action).toBe('both');});
  it('拒绝越界或损坏的配置',()=>{for(const v of [null,[],{'256':{action:'left'}},{'12':{action:'evil'}},{'13':{action:'both',kind:'text'}}])expect(()=>validateKeyMap(v)).toThrow();});
});
describe('连续动画与恢复',()=>{
  it('同侧同时按住多个键，松开一个不会清除另一个',()=>{
    const a=new AnimationController();a.stroke({id:65,down:true,action:'left',kind:'tap'},0);a.stroke({id:83,down:true,action:'left',kind:'tap'},10);a.stroke({id:65,down:false,action:'left',kind:'tap'},20);expect([...a.left.held.keys()]).toEqual([83]);
  });
  it('快速打字不重置运动相位，持续帧无 NaN 且释放后恢复',()=>{
    const a=new AnimationController();let lastPhase=0;
    for(let t=0;t<3000;t+=5){
      if(t%20===0)a.stroke({id:65,down:true,action:'left',kind:'tap'},t);
      a.step(.005,t);expect(a.left.phase).toBeGreaterThan(lastPhase);lastPhase=a.left.phase;
      expect(Number.isFinite(a.left.value)).toBe(true);expect(a.left.value).toBeGreaterThanOrEqual(-.06);expect(a.left.value).toBeLessThanOrEqual(1.25);
    }
    a.stroke({id:65,down:false,action:'left',kind:'tap'},3000);
    for(let t=3000;t<6000;t+=16)a.step(.016,t);
    expect(Math.abs(a.left.value)).toBeLessThan(.001);
  });
  it('双爪动作、丢失松开与监听关闭恢复',()=>{
    const a=new AnimationController();a.stroke({id:32,down:true,action:'both',kind:'space'},0);expect(a.right.held.size).toBe(1);
    a.step(.016,1700);expect(a.left.held.size+a.right.held.size).toBe(0);
    a.stroke({id:65,down:true,action:'left',kind:'tap'},1800);a.reset();expect(a.left.held.size).toBe(0);
  });
  it('全局坐标的左右上下平滑且眼球不越界',()=>{
    const a=new AnimationController();a.look(-100,100);a.step(.016,0);expect(a.gaze.x).toBeLessThan(0);expect(a.gaze.y).toBeGreaterThan(0);expect(a.gaze.x).toBeGreaterThan(-.7072);
    for(let i=0;i<200;i++)a.step(.016,i*16);expect(Math.hypot(a.gaze.x,a.gaze.y)).toBeLessThanOrEqual(1.00001);
    a.look(1,-1);a.step(.016,4000);expect(a.gaze.x).toBeLessThan(0); // movement cannot snap across on one frame
  });
});
describe('透明命中与设置边界',()=>{
  it('透明区域与负坐标穿透，alpha 内容含小范围移动余量',()=>{const alpha=new Uint8Array(100);alpha[55]=255;expect(maskHit(alpha,10,10,0,0)).toBe(false);expect(maskHit(alpha,10,10,-1,5)).toBe(false);expect(maskHit(alpha,10,10,5,5)).toBe(true);expect(maskHit(alpha,10,10,7,5)).toBe(true);});
  it('损坏设置不造成不可见或无限大窗口，仅保存白名单',()=>{expect(cleanSettings({scale:Infinity,opacity:-1,keyboardEnabled:'yes',keyHistory:['secret']})).toEqual({keyboardEnabled:true,mouseTracking:true,scale:1,opacity:.45,keyBubble:false,fps:60,reducedMotion:false});});
});
describe('可替换模型及拒绝活动内容',()=>{
  it('内置模型四图层完整且离线',()=>{const m=loadModel(path.resolve('public/models/prototype'));expect(Object.values(m.layers).every(x=>x.startsWith('data:image/svg+xml;base64,'))).toBe(true);});
  it('拒绝模型路径穿越及脚本 SVG',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'pudding-model-test-'));cpSync('public/models/prototype',dir,{recursive:true});
    const m=JSON.parse(readFileSync(path.join(dir,'model.json'),'utf8'));m.layers.body='../body.svg';writeFileSync(path.join(dir,'model.json'),JSON.stringify(m));expect(()=>loadModel(dir)).toThrow();
    m.layers.body='body.svg';writeFileSync(path.join(dir,'model.json'),JSON.stringify(m));writeFileSync(path.join(dir,'body.svg'),'<svg><script>alert(1)</script></svg>');expect(()=>loadModel(dir)).toThrow();
  });
});
