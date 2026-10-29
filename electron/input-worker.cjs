// Win32 event adapter reused from chiikawa-pets' MIT-licensed native module.
// No text translation, keypress history, clipboard, network or disk writes.
// This module's upstream stop() joins a native thread without releasing its
// TSFN. The parent terminates this isolated process instead; Windows removes
// its hooks. Nothing runs in the renderer or the application's UI thread.
const hook = require('@lysyyds/win32-mouse-keyboard-hook');
let enabled = false;
hook.start((type, eventType, vk) => {
  if (!enabled || type !== 'key' || (eventType !== 1 && eventType !== 2)) return;
  if (Number.isInteger(vk) && vk > 0 && vk <= 255)
    process.parentPort.postMessage({ type:'key', vk, down:eventType===1 });
});
// start() returns after launching its native thread. This is a process-ready
// acknowledgement, NOT a proof that Windows successfully installed the hook.
setTimeout(() => { enabled=true;process.parentPort.postMessage({type:'ready'}); },100);
setInterval(() => process.parentPort.postMessage({type:'alive'}),1000);
