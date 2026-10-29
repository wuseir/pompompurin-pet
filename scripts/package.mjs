import { packager } from '@electron/packager';
import { cp,mkdir,readFile,writeFile,stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const out=path.resolve('release',version);
if(existsSync(path.join(out,'PuddingPet-win32-x64')))throw Error('发布目录已存在。请先移动该目录以保留旧产物，再重新打包。');
await mkdir(out,{recursive:true});
const allowed=new Set(['dist','dist-electron','node_modules','docs','package.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md']);
const offline=existsSync('downloads/electron-v45.1.0-win32-x64.zip')?{electronZipDir:path.resolve('downloads')}:{};
const destinations=await packager({dir:'.',out,platform:'win32',arch:'x64',name:'PuddingPet',executableName:'PuddingPet',electronVersion:'45.1.0',...offline,tmpdir:false,asar:false,prune:true,overwrite:false,
  // Allow Windows file scanners to release freshly extracted runtime files.
  afterExtract:[async()=>{await new Promise(resolve=>setTimeout(resolve,3000));}],
  ignore:name=>{const parts=name.replaceAll('\\','/').split('/').filter(Boolean);if(!parts.length)return false;return !allowed.has(parts[0])||/\/node_modules\/\.(?:bin|vite|vite-temp|package-lock\.json)(?:\/|$)/.test(name)||/\.(obj|pdb|lib|exp|iobj|ipdb)$/.test(name)||name.includes('/build/Release/obj/');},
  win32metadata:{CompanyName:'Local desktop pet',FileDescription:'Pudding Pet',ProductName:'Pudding Pet'},
});
for(const destination of destinations){
  for(const file of ['README.md','LICENSE','THIRD_PARTY_NOTICES.md'])await cp(file,path.join(destination,file));
  await cp('docs',path.join(destination,'docs'),{recursive:true});
  await cp('public/models/prototype',path.join(destination,'model-template'),{recursive:true});
}
const exe=path.join(destinations[0],'PuddingPet.exe');const data=await readFile(exe);
if(data.subarray(0,2).toString()!=='MZ')throw Error('发布文件不是 PE 可执行文件');
const manifest={version,platform:'win32-x64',electron:'45.1.0',executable:exe,size:(await stat(exe)).size,sha256:crypto.createHash('sha256').update(data).digest('hex')};
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
