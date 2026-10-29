// Derived from chiikawa-pets (MIT). Preserve its Electron + Vite + React build.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import { copyFileSync, mkdirSync } from 'node:fs';
function copyWorker(){mkdirSync('dist-electron',{recursive:true});copyFileSync('electron/input-worker.cjs','dist-electron/input-worker.cjs');}
export default defineConfig({
  base: './',
  server:{host:'127.0.0.1'},
  plugins: [react(), electron({
    main: {entry:'electron/main.ts',vite:{build:{rollupOptions:{external:['@lysyyds/win32-mouse-keyboard-hook']}}}},
    preload: {input:'electron/preload.ts'},
  }), {
    name:'input-worker',buildStart:copyWorker,closeBundle:copyWorker,
  }],
});
