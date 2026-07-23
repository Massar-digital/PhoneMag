const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    print: (options) => ipcRenderer.invoke('print', options),
    isElectron: true,
    // CPCL Label Printer API (for XPrinter XP-233B)
    labelPrinter: {
      sendCPCL: (cpclData, printerName) => ipcRenderer.invoke('printer:send-cpcl', { cpclData, printerName }),
      getPrinters: () => ipcRenderer.invoke('printer:get-list')
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
    },
    updates: {
      onStatusChange: (callback) => {
        const channels = [
          'update_checking',
          'update_available',
          'update_not_available',
          'update_download_progress',
          'update_downloaded',
          'update_error'
        ];
        channels.forEach(channel => {
          ipcRenderer.on(channel, (_event, data) => callback(channel, data));
        });
        return () => {
          channels.forEach(channel => {
            ipcRenderer.removeAllListeners(channel);
          });
        };
      },
      checkForUpdates: () => ipcRenderer.send('check-for-updates'),
      quitAndInstall: () => ipcRenderer.send('quit-and-install')
    }
  }
);

// Override window.print to use Electron's native printing
// This ensures any call to window.print() (from libraries or legacy code)
// is routed through our IPC handler, avoiding the "Print Preview not supported" error.
window.print = () => {
  ipcRenderer.invoke('print');
};

contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    getMachineFingerprint: () => ipcRenderer.invoke('get-machine-fingerprint'),
    activateLicense: (code) => ipcRenderer.invoke('activate-license', code),
    notifyLicenseActivated: (code) => ipcRenderer.invoke('license-activated', code),
  }
);

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})
