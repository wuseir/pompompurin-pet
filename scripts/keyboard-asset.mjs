import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile('shared/keyboard-layout.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {keyboardKeys}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const keys=keyboardKeys.map(k=>`<g data-vk="${k.vk}"><rect x="${k.x}" y="${k.y}" width="${k.width}" height="${k.height}" rx="1" fill="#fff9e9" stroke="#cbb58d" stroke-width=".35"/><text x="${k.x+k.width/2}" y="${k.y+k.height/2}" dominant-baseline="central" text-anchor="middle" font-size="${k.label.length>3?3.9:4.8}" font-family="Consolas,monospace" fill="#62492c">${escape(k.label)}</text></g>`).join('');
await fs.writeFile('public/models/prototype/keyboard.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="300" viewBox="0 0 320 300"><rect x="3" y="201" width="314" height="72" rx="4" fill="#e5cea9" stroke="#977751" stroke-width=".8"/>${keys}</svg>\n`);
console.log(`Generated ${keyboardKeys.length} labelled keys`);
