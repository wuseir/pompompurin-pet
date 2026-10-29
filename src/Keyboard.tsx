import { forwardRef } from 'react';
import { keyboardBounds as b,keyboardKeys } from '../shared/keyboard-layout';
export const Keyboard=forwardRef<SVGGElement>(function Keyboard(_,ref){
  return <g ref={ref} className="keyboard" aria-label="完整 104 键键盘">
    <defs><linearGradient id="keyboard-case" x2="0" y2="1"><stop stopColor="#f6ead0"/><stop offset="1" stopColor="#dbc19b"/></linearGradient></defs>
    <rect {...b} rx="4" fill="url(#keyboard-case)" stroke="#977751" strokeWidth=".8"/>
    <rect x="5" y="203" width="310" height="68" rx="3" fill="#c8ae8b"/>
    {keyboardKeys.map(k=><g key={k.id} data-key-id={k.id} data-vk={k.vk} className="keyboard-key">
      <rect x={k.x} y={k.y+.65} width={k.width} height={k.height} rx="1" fill="#947a58"/>
      <rect className="key-face" x={k.x} y={k.y} width={k.width} height={k.height} rx="1"/>
      <text x={k.x+k.width/2} y={k.y+k.height/2} dominantBaseline="central" textAnchor="middle" className={k.label.length>3?'key-legend small':'key-legend'}>{k.label}</text>
    </g>)}
  </g>;
});
