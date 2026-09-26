const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('MELKYAR_APP', {
  edition: 'FULL',
  name: 'ملک‌یار — نسخه اصلی'
});
