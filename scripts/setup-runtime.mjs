// Optional offline installation of the exact runtime used for this delivery.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import extract from '@electron-internal/extract-zip';
const zip=path.resolve('downloads/electron-v45.1.0-win32-x64.zip');
const expected='55eaba17abff7b5bba6c3bbc85068967379024fe742fe9c7fdba9118922ccbe2';
const actual=crypto.createHash('sha256').update(await fs.readFile(zip)).digest('hex');
if(actual!==expected)throw Error('Runtime SHA-256 mismatch');
await extract(zip,{dir:path.resolve('node_modules/electron/dist')});
await fs.writeFile('node_modules/electron/path.txt','electron.exe');
console.log({verifiedSHA256:actual});
