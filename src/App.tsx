import { useEffect,useRef,useState } from 'react';
import type { Settings,Snapshot,InputStatus } from '../shared/types';
import { AnimationController } from './animation';
import { Keyboard } from './Keyboard';
import { keyboardBounds } from '../shared/keyboard-layout';
const labels:Record<InputStatus,string>={on:'键盘 · 已开启',off:'键盘 · 已关闭',starting:'键盘 · 启动中',error:'键盘 · 异常',suspended:'键盘 · 已暂停'};
function Pet({initial}:{initial:Snapshot}){
  const [state,setState]=useState(initial);
  const live=useRef(initial),animation=useRef(new AnimationController());
  const body=useRef<SVGGElement>(null),left=useRef<SVGGElement>(null),right=useRef<SVGGElement>(null),eyes=useRef<SVGGElement>(null),gaze=useRef<SVGGElement>(null),bubble=useRef<HTMLDivElement>(null);
  const keyboard=useRef<SVGGElement>(null),leftArm=useRef<SVGPathElement>(null),rightArm=useRef<SVGPathElement>(null);
  const pressed=useRef(false),root=useRef<SVGSVGElement>(null);
  useEffect(()=>{
    const off=[window.pet.onState(s=>{live.current={...live.current,...s};setState({...live.current});}),window.pet.onStroke(s=>{
      animation.current.stroke(s,performance.now());
      if(s.down&&live.current.settings.keyBubble&&bubble.current){bubble.current.textContent=({space:'空格',enter:'回车',modifier:'修饰键',arrow:'方向键',tap:s.action==='left'?'左爪':s.action==='right'?'右爪':'双爪'})[s.kind];bubble.current.classList.remove('pop');void bubble.current.offsetWidth;bubble.current.classList.add('pop');}
    }),window.pet.onReset(()=>{animation.current.reset();pressed.current=false;}),window.pet.onCursor(p=>{
      const follow=live.current.settings.mouseTracking;
      animation.current.look(follow?(p.x-160)/210:0,follow?(p.y-140)/170:0);
    })];
    const keyElements=Array.from(keyboard.current?.querySelectorAll<SVGGElement>('[data-vk]')??[]).map(element=>({element,vk:Number(element.dataset.vk)}));
    let frame=0,previous=performance.now(),nextBlink=previous+2000+Math.random()*3500,blinkStart=-1000;
    const render=(now:number)=>{
      frame=requestAnimationFrame(render);
      if(now-previous<1000/live.current.settings.fps-1)return;
      const dt=(now-previous)/1000;previous=now;animation.current.step(dt,now);
      const a=animation.current,quiet=live.current.settings.reducedMotion;
      const tilt=quiet?0:Math.sin(now/3300)*1.15+Math.sin(now/9700)*.8;
      const breath=quiet?0:Math.sin(now/950)*1.35;
      body.current?.setAttribute('transform',`translate(0 ${breath}) rotate(${tilt} 160 210)`);
      for(const side of ['left','right'] as const){
        const p=a[side],image=side==='left'?left.current:right.current,arm=side==='left'?leftArm.current:rightArm.current;
        const x=p.position.x,y=p.position.y-1.2+p.value*1.2;
        image?.setAttribute('transform',`translate(${x} ${y}) rotate(${(side==='left'?-1:1)*p.value*3}) scale(.3) translate(${- (side==='left'?112:208)} -215)`);
        const startX=side==='left'?106:214;
        arm?.setAttribute('d',`M ${startX} 189 Q ${startX} ${Math.max(193,y-12)} ${x} ${y-2}`);
        if(image){image.dataset.key=p.key===null?'':String(p.key);image.dataset.x=x.toFixed(3);image.dataset.y=y.toFixed(3);}
      }
      for(const {element,vk} of keyElements){
        const alias=vk===160?16:vk===162?17:vk===164?18:-1;
        const active=String(a.visualKeys.has(vk)||a.visualKeys.has(alias));
        if(element.dataset.active!==active)element.dataset.active=active;
      }
      gaze.current?.setAttribute('transform',`translate(${a.gaze.x*state.model.eyes.maxX} ${a.gaze.y*state.model.eyes.maxY})`);
      if(now>nextBlink){blinkStart=now;nextBlink=now+2800+Math.random()*4200;}
      const progress=(now-blinkStart)/160,blink=progress>=0&&progress<=1?Math.max(.08,1-Math.sin(progress*Math.PI)):1;
      eyes.current?.setAttribute('transform',`translate(0 ${139*(1-blink)}) scale(1 ${blink})`);
      if(root.current){root.current.dataset.left=a.left.value.toFixed(3);root.current.dataset.right=a.right.value.toFixed(3);root.current.dataset.gazeX=a.gaze.x.toFixed(3);root.current.dataset.gazeY=a.gaze.y.toFixed(3);}
    };
    frame=requestAnimationFrame(render);
    const visibility=()=>{if(document.hidden){animation.current.reset();pressed.current=false;}};
    document.addEventListener('visibilitychange',visibility);
    return ()=>{off.forEach(fn=>fn());cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[state.model]);
  useEffect(()=>{
    let cancelled=false;
    void (async()=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=300;
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
      for(const key of ['body','left','right'] as const){
        const image=new Image();image.src=state.model.layers[key];await image.decode();ctx.drawImage(image,0,0,320,300);
      }
      ctx.fillStyle='#000';ctx.beginPath();ctx.roundRect(keyboardBounds.x,keyboardBounds.y,keyboardBounds.width,keyboardBounds.height,4);ctx.fill();
      ctx.fillStyle='#000';ctx.fillRect(86,276,148,19);
      const pixels=ctx.getImageData(0,0,320,300).data;
      if(!cancelled)window.pet.mask({width:320,height:300,alpha:Array.from({length:96000},(_,i)=>pixels[i*4+3])});
    })().catch(()=>{window.pet.command('settings');});
    return ()=>{cancelled=true;};
  },[state.model]);
  const end=()=>{if(pressed.current){pressed.current=false;window.pet.drag(false);}};
  return <main className="pet-shell" onContextMenu={e=>{e.preventDefault();end();window.pet.command('menu');}}>
    <div ref={bubble} className="key-bubble" aria-hidden="true"/>
    <svg ref={root} viewBox="0 0 320 300" className="pet" aria-label={state.model.name} onPointerDown={e=>{if(e.button!==0)return;pressed.current=true;e.currentTarget.setPointerCapture(e.pointerId);window.pet.drag(true);}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <g ref={body}>
        <image href={state.model.layers.body} width="320" height="300"/>
        <g ref={eyes}><g ref={gaze}>{[state.model.eyes.left,state.model.eyes.right].map(([x,y],i)=><g key={i}><ellipse cx={x} cy={y} rx="5.2" ry="7" fill="#4b301f"/><ellipse cx={x-1.4} cy={y-2} rx="1.45" ry="1.9" fill="#fff7da"/></g>)}</g></g>
      </g>
      <Keyboard ref={keyboard}/>
      <g fill="none" strokeLinecap="round"><path id="left-foreleg" ref={leftArm} stroke="#bc9855" strokeWidth="9"/><use href="#left-foreleg" stroke="#f7dc8e" strokeWidth="7"/><path id="right-foreleg" ref={rightArm} stroke="#bc9855" strokeWidth="9"/><use href="#right-foreleg" stroke="#f7dc8e" strokeWidth="7"/></g>
      <g ref={left} data-paw="left"><image href={state.model.layers.left} width="320" height="300"/></g>
      <g ref={right} data-paw="right"><image href={state.model.layers.right} width="320" height="300"/></g>
    </svg>
    <div className={`status ${state.status}`} title="右键打开菜单；拖动角色移动。监听开关在托盘和设置中。"><i/>{labels[state.status]}</div>
  </main>;
}
function SettingsPanel({initial}:{initial:Snapshot}){
  const [state,setState]=useState(initial);
  useEffect(()=>window.pet.onState(s=>setState(old=>({...old,...s}))),[]);
  const update=(patch:Partial<Settings>)=>{setState(old=>({...old,settings:{...old.settings,...patch}}));void window.pet.update(patch);};
  return <main className="settings">
    <div className="eyebrow">YOUR LITTLE DESKTOP COMPANION</div><h1>布丁，陪你工作。</h1><p className="intro">一只会看向鼠标、跟着你敲键盘的小狗。</p>
    <div className={`state-card ${state.status}`}><span className="dot"/><strong>{labels[state.status]}</strong><small>仅在本机驱动动画 · 不保存输入</small></div>
    {state.status==='error'&&<p role="alert">监听进程未能启动或已停止。关闭再开启监听可重试。</p>}
    {(state.configWarning||state.modelWarning)&&<p role="alert">{state.configWarning} {state.modelWarning}</p>}
    <label className="toggle"><span>全局键盘监听<small>其他应用打字时，左右爪实时响应</small></span><input type="checkbox" checked={state.settings.keyboardEnabled} onChange={e=>update({keyboardEnabled:e.target.checked})}/></label>
    <label className="toggle"><span>眼睛跟随鼠标<small>持续读取全局鼠标位置，平滑移动</small></span><input type="checkbox" checked={state.settings.mouseTracking} onChange={e=>update({mouseTracking:e.target.checked})}/></label>
    <label className="toggle"><span>短暂动作气泡<small>只显示动作类别，不显示输入文本</small></span><input type="checkbox" checked={state.settings.keyBubble} onChange={e=>update({keyBubble:e.target.checked})}/></label>
    <label className="range"><span>大小 <b>{Math.round(state.settings.scale*100)}%</b></span><input aria-label="大小" type="range" min=".5" max="1.8" step=".05" value={state.settings.scale} onChange={e=>update({scale:+e.target.value})}/></label>
    <label className="range"><span>不透明度 <b>{Math.round(state.settings.opacity*100)}%</b></span><input aria-label="不透明度" type="range" min=".45" max="1" step=".05" value={state.settings.opacity} onChange={e=>update({opacity:+e.target.value})}/></label>
    <div className="options"><label>动画帧率 <select value={state.settings.fps} onChange={e=>update({fps:+e.target.value as 30|60})}><option value="60">60 FPS</option><option value="30">30 FPS · 节能</option></select></label><label><input type="checkbox" checked={state.settings.reducedMotion} onChange={e=>update({reducedMotion:e.target.checked})}/>减少待机摇摆</label></div>
    <div className="buttons"><button onClick={()=>window.pet.command('reset-position')}>移回当前屏幕</button><button onClick={()=>window.pet.command('hide')}>隐藏</button><button onClick={()=>window.pet.command('show')}>显示</button></div>
    <details><summary>模型与键位</summary><p>当前：{state.model.name}。自定义素材需自行确认角色授权。</p><div className="buttons"><button onClick={()=>window.pet.command('open-models')}>打开模型目录</button><button onClick={()=>window.pet.command('open-keymap')}>编辑键位映射</button><button onClick={()=>window.pet.command('reload')}>重新加载</button></div></details>
    <p className="privacy">只读取按下、松开和虚拟键码，不读取文本或剪贴板；无按键历史、统计、遥测或联网请求。锁屏/休眠时暂停。关闭设置窗口后桌宠继续运行，退出请使用托盘菜单。</p>
  </main>;
}
export default function App(){
  const [initial,setInitial]=useState<Snapshot|null>(null);
  useEffect(()=>{void window.pet.initial().then(setInitial);},[]);
  if(!initial)return null;
  return new URLSearchParams(location.search).has('settings')?<SettingsPanel initial={initial}/>:<Pet initial={initial}/>;
}
