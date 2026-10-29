import { existsSync } from 'node:fs';
import { readFile,writeFile,stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const out=path.resolve('release',version);
const archives=[
  {name:`PuddingPet-${version}-win32-x64.zip`,cwd:out,files:['PuddingPet-win32-x64']},
  {name:`PuddingPet-${version}-source.zip`,cwd:path.resolve('.'),files:['.gitignore','LICENSE','README.md','THIRD_PARTY_NOTICES.md','package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','src','shared','electron','public','scripts','tests','docs','upstream']},
];
const result=[];
for(const archive of archives){
  const destination=path.join(out,archive.name);
  if(existsSync(destination))throw Error(`保留已有文件，请先移动旧压缩包：${destination}`);
  execFileSync('tar.exe',['-a','-c','-f',destination,'-C',archive.cwd,...archive.files],{windowsHide:true,timeout:120000});
  const listing=execFileSync('tar.exe',['-t','-f',destination],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if(!listing.includes(archive.files[0]))throw Error('Archive verification failed');
  result.push({file:archive.name,bytes:(await stat(destination)).size,sha256:crypto.createHash('sha256').update(await readFile(destination)).digest('hex')});
}
await writeFile(path.join(out,'SHA256SUMS.txt'),result.map(x=>`${x.sha256}  ${x.file}`).join('\n')+'\n');
console.log(JSON.stringify(result,null,2));
