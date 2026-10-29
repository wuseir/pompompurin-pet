// Small original geometric tray icon, generated locally without external art.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const size=64,raw=Buffer.alloc(size*(1+size*4));
function ellipse(x,y,cx,cy,rx,ry){return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1;}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let color=[0,0,0,0];
  if(ellipse(x,y,12,37,8,18)||ellipse(x,y,52,37,8,18))color=[220,182,94,255];
  if(ellipse(x,y,32,38,24,21))color=[255,225,144,255];
  if(ellipse(x,y,32,18,20,9)||ellipse(x,y,32,13,14,7)||ellipse(x,y,33,7,3,4))color=[110,75,43,255];
  if(ellipse(x,y,23,37,2,3)||ellipse(x,y,41,37,2,3)||ellipse(x,y,32,44,3,2))color=[81,53,31,255];
  if(y===49&&x>28&&x<36)color=[81,53,31,255];
  const pos=y*(1+size*4)+1+x*4;for(let i=0;i<4;i++)raw[pos+i]=color[i];
}
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),body=Buffer.concat([type,data]),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(body));return Buffer.concat([len,body,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
writeFileSync('public/tray.png',Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
