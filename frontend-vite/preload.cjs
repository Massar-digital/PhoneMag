const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    print: (options) => ipcRenderer.send('print', options),
    isElectron: true,
    // CPCL Label Printer API (for XPrinter XP-233B)
    labelPrinter: {
      sendCPCL: (cpclData, printerName) => ipcRenderer.invoke('printer:send-cpcl', { cpclData, printerName }),
      getPrinters: () => ipcRenderer.invoke('printer:get-list')
    },
    license: {
      activate: (key) => ipcRenderer.invoke('license:activate', key),
      check: () => ipcRenderer.invoke('license:check'),
      getMachineId: () => ipcRenderer.invoke('license:get-machine-id')
    },
    warranty: {
      importPDF: () => ipcRenderer.invoke('warranty:import-pdf'),
      resetToDefault: () => ipcRenderer.invoke('warranty:reset-to-default'),
      checkCustom: () => ipcRenderer.invoke('warranty:check-custom'),
      checkDefault: () => ipcRenderer.invoke('warranty:check-default'),
      openCustom: () => ipcRenderer.invoke('warranty:open-custom')
    },
    window: {
      minimize: () => ipcRenderer.send('window-minimize'),
      maximize: () => ipcRenderer.send('window-maximize'),
      toggleFullscreen: () => ipcRenderer.send('window-maximize'), // Reusing serialize as toggle
      close: () => ipcRenderer.send('window-close')
    },
    database: {
      backup: () => ipcRenderer.invoke('db:backup'),
      restore: () => ipcRenderer.invoke('db:restore')
    },
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      getAppVersion: () => ipcRenderer.invoke('app:get-version'),
      getBootTime: () => ipcRenderer.invoke('os:get-boot-time'),
      relaunch: () => ipcRenderer.invoke('app:relaunch')
    }
  }
);

// Override window.print to use Electron's native printing
// This ensures any call to window.print() (from libraries or legacy code)
// is routed through our IPC handler, avoiding the "Print Preview not supported" error.
window.print = () => {
  ipcRenderer.send('print');
};

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})
