import fs from 'node:fs';
import path from 'node:path';
import type { Model } from '../shared/types';
export function loadModel(root:string):Model {
  const raw=JSON.parse(fs.readFileSync(path.join(root,'model.json'),'utf8')) as Model;
  if(typeof raw.name!=='string'||raw.name.length>80||!raw.eyes||!Array.isArray(raw.eyes.left)||!Array.isArray(raw.eyes.right))throw Error('模型配置不完整');
  for(const eye of [raw.eyes.left,raw.eyes.right])if(eye.length!==2||eye.some(x=>!Number.isFinite(x)||x<0||x>320))throw Error('眼睛坐标无效');
  if(!Number.isFinite(raw.eyes.maxX)||!Number.isFinite(raw.eyes.maxY)||raw.eyes.maxX<0||raw.eyes.maxX>10||raw.eyes.maxY<0||raw.eyes.maxY>10)throw Error('眼球位移无效');
  const layers={} as Model['layers'];
  for(const key of ['body','left','right','keyboard'] as const){
    const name=raw.layers?.[key];
    if(typeof name!=='string'||!/^[-\w]+\.(png|svg)$/.test(name))throw Error('图层须为模型目录中的 PNG/SVG 文件');
    const file=path.join(root,name);
    if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>2*1024*1024)throw Error('素材过大或为链接');
    const data=fs.readFileSync(file);
    if(name.endsWith('.svg')){
      const svg=data.toString('utf8');
      if(!svg.includes('<svg')||/<script|<foreignObject|<!ENTITY|<!DOCTYPE|\bon\w+\s*=|(?:href|url)\s*[=(]\s*["']?\s*(?:https?:|file:|\/\/)/i.test(svg))throw Error('SVG 包含活动内容或外部引用');
    }else if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG 文件无效');
    layers[key]=`data:image/${name.endsWith('.svg')?'svg+xml':'png'};base64,${data.toString('base64')}`;
  }
  return {name:raw.name,layers,eyes:raw.eyes};
}
