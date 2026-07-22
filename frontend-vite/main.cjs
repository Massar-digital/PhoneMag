const { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn, exec, execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const os = require('os');
const { machineIdSync } = require('node-machine-id');
const axios = require('axios');
const crypto = require('crypto');

// --- Keygen Licensing Configuration ---
const KEYGEN_ACCOUNT_ID = '5d66c27f-cc98-4aca-83eb-7a24c04fac84';
const PRODUCT_ID = '2267e999-6c95-4fb5-bbe3-cd38324a9948';
const licenseFilePath = path.join(app.getPath('userData'), 'license.json');
const LICENSE_SALT = 'phonemag-robust-security-2024-v1'; // Sel pour la signature locale

// --- Platform detection ---
const isWayland = process.env.XDG_SESSION_TYPE === 'wayland' ||
                  process.env.GDK_BACKEND === 'wayland' ||
                  process.env.WAYLAND_DISPLAY !== undefined;

// --- Global variables ---
let backendProcess;
let mainWindow;
let isPrinting = false;
let isPrintingTimestamp = 0;
const PRINT_TIMEOUT_MS = 60000; // 60s max for any print operation

/**
 * Génère une signature locale pour lier la licence à la machine
 * Empêche le simple copier-coller du fichier de licence sur une autre machine
 */
function generateSignature(key, fingerprint) {
  return crypto
    .createHash('sha256')
    .update(`${key}-${fingerprint}-${LICENSE_SALT}`)
    .digest('hex');
}

/**
 * Récupère l'ID unique du PC (Fingerprint)
 */
function getMachineId() {
  try {
    return machineIdSync();
  } catch (error) {
    console.error('Machine ID Error:', error);
    return 'default-fingerprint';
  }
}

/**
 * Phase 1: Activation de la licence
 */
async function activateLicense(licenseKey) {
  const fingerprint = getMachineId();
  const headers = {
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json'
  };
  
  try {
    // ÉTAPE 1 : Valider la clé pour obtenir les infos de la licence
    const validation = await axios.post(
      `https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key`,
      {
        meta: {
          key: licenseKey,
          scope: { product: PRODUCT_ID }
        }
      },
      { headers }
    );

    const { data: license } = validation.data;

    // ÉTAPE 2 : Si la licence est trouvée, on enregistre ce PC (Machine)
    try {
      await axios.post(
        `https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/machines`,
        {
          data: {
            type: 'machines',
            attributes: {
              fingerprint: fingerprint,
              name: `PC-${fingerprint.substring(0, 8)}`
            },
            relationships: {
              license: {
                data: { type: 'licenses', id: license.id }
              }
            }
          }
        },
        { 
          headers: {
            ...headers,
            'Authorization': `License ${licenseKey}`
          }
        }
      );
    } catch (machineError) {
      const detail = machineError.response?.data?.errors?.[0]?.detail || "";
      // Si la machine existe déjà pour cette licence, ce n'est pas une erreur
      if (!detail.includes("already exists") && !detail.includes("taken")) {
        throw machineError;
      }
    }

    // Sauvegarde locale sécurisée avec signature liée au hardware
    const signature = generateSignature(licenseKey, fingerprint);
    const licenseData = {
      key: licenseKey,
      id: license.id,
      fingerprint: fingerprint,
      activatedAt: new Date().toISOString(),
      signature: signature,
      lastOnlineStatus: 'valid',
      lastOnlineCheck: new Date().toISOString()
    };

    fs.writeFileSync(licenseFilePath, JSON.stringify(licenseData, null, 2));
    
    
    return { success: true };

  } catch (error) {
    const errorData = error.response?.data;
    const errorDetail = errorData?.errors?.[0]?.detail || error.message;
    const errorCode = errorData?.errors?.[0]?.code;
    
    console.error('Erreur Activation:', JSON.stringify(errorData || error.message));
    
    if (errorCode === 'MACHINE_LIMIT_REACHED') {
      return { success: false, message: 'Limite de postes atteinte (max 1 PC).' };
    }
    if (errorCode === 'NOT_FOUND' || errorDetail.includes('not found')) {
      return { success: false, message: 'Clé de licence invalide ou introuvable.' };
    }
    
    return { success: false, message: `Erreur: ${errorDetail}` };
  }
}

/**
 * Migration rétroactive : Met à jour les anciens fichiers de licence
 * pour les rendre compatibles avec le nouveau système sécurisé
 */
function migrateOldLicense(licenseData, currentFingerprint) {
  try {
    // Si la licence a déjà les champs modernes, pas besoin de migrer
    if (licenseData.fingerprint && licenseData.signature) {
      return null; // Pas de migration nécessaire
    }

    // Sinon, on met à jour l'ancien format vers le nouveau
    console.log("Migration: Mise à jour du fichier de licence au nouveau format sécurisé...");
    
    const migratedData = {
      key: licenseData.key,
      id: licenseData.id,
      fingerprint: currentFingerprint,
      activatedAt: licenseData.activatedAt || new Date().toISOString(),
      signature: generateSignature(licenseData.key, currentFingerprint)
    };

    // Sauvegarde la version mise à jour
    fs.writeFileSync(licenseFilePath, JSON.stringify(migratedData, null, 2));
    console.log("Migration: Fichier de licence migré avec succès.");
    
    return migratedData;
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return null;
  }
}

/**
 * Phase 2: Validation de la licence au démarrage (RAPIDE & LOCALE)
 * - Première ouverture (pas de fichier) → page d'activation
 * - Ouvertures suivantes → accepter immédiatement si la validation locale passe
 * - Vérification en ligne uniquement en arrière-plan et seulement si connecté
 * - Hors ligne → utiliser le dernier résultat en ligne connu
 */
async function validateLicense() {
  if (!fs.existsSync(licenseFilePath)) {
    console.log("Validation: Aucun fichier de licence trouvé (première installation).");
    return { success: false, reason: 'NOT_FOUND', message: 'Aucune licence trouvée.' };
  }

  try {
    const fileContent = fs.readFileSync(licenseFilePath, 'utf8');
    let licenseData = JSON.parse(fileContent);
    const currentFingerprint = getMachineId();

    // 0. Migration
    if (!licenseData.fingerprint || !licenseData.signature) {
      const migratedData = migrateOldLicense(licenseData, currentFingerprint);
      if (migratedData) licenseData = migratedData;
      else return { success: false, reason: 'MIGRATION_FAILED' };
    }

    // 1. Validation Locale (Hardware + Signature) - TRÈS RAPIDE
    const expectedSignature = generateSignature(licenseData.key, licenseData.fingerprint);
    
    if (licenseData.signature !== expectedSignature) {
      console.error("Validation: Signature locale invalide.");
      return { success: false, reason: 'INVALID_SIGNATURE' };
    }

    if (licenseData.fingerprint !== currentFingerprint) {
      console.error("Validation: Hardware mismatch.");
      return { success: false, reason: 'HARDWARE_MISMATCH' };
    }

    // 2. Vérifier le dernier statut en ligne connu
    //    Si la dernière vérification en ligne a trouvé la clé révoquée, bloquer
    if (licenseData.lastOnlineStatus === 'revoked') {
      console.warn("Validation: Licence révoquée lors de la dernière vérification en ligne.");
      return { success: false, reason: 'REVOKED', message: 'Votre licence a été révoquée. Veuillez contacter le support.' };
    }

    // 3. Licence locale valide → accepter immédiatement
    console.log("Validation: Licence locale valide. Démarrage rapide...");

    // 4. Vérification en ligne en arrière-plan (non-bloquant)
    //    Ne se lance que si on est connecté. Résultat sauvegardé pour les prochains lancements.
    setTimeout(() => {
      performBackgroundOnlineCheck(licenseData.key).catch(console.error);
    }, 5000);

    return { success: true };

  } catch (error) {
    console.error('Erreur validation locale:', error);
    return { success: false, reason: 'ERROR' };
  }
}

/**
 * Vérification asynchrone en arrière-plan (non-bloquante)
 * - Vérifie d'abord si on est en ligne avant de faire l'appel API
 * - Si en ligne et la clé est révoquée → marque le statut dans le fichier (JAMAIS de suppression)
 * - Si hors ligne → ne fait rien, garde le dernier résultat connu
 */
async function performBackgroundOnlineCheck(licenseKey) {
  try {
    // Vérifier la connectivité avant d'appeler l'API
    try {
      await axios.get('https://api.keygen.sh', { timeout: 5000 });
    } catch (connectError) {
      console.log("Background: Hors ligne. Aucune vérification effectuée, statut local préservé.");
      return; // Pas de connexion → on ne fait rien
    }

    console.log("Background: En ligne. Vérification de la validité de la clé...");
    const headers = {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json'
    };
    
    const response = await axios.post(
      `https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key`,
      {
        meta: {
          key: licenseKey,
          scope: { product: PRODUCT_ID }
        }
      },
      { headers, timeout: 10000 }
    );

    const { meta } = response.data;

    // Mettre à jour le statut dans le fichier de licence (JAMAIS supprimer le fichier)
    if (fs.existsSync(licenseFilePath)) {
      try {
        const fileContent = fs.readFileSync(licenseFilePath, 'utf8');
        const licenseData = JSON.parse(fileContent);

        if (meta && !meta.valid) {
          console.warn("Background: La licence a été révoquée en ligne. Statut mis à jour.");
          licenseData.lastOnlineStatus = 'revoked';
        } else {
          console.log("Background: Licence confirmée en ligne.");
          licenseData.lastOnlineStatus = 'valid';
        }

        licenseData.lastOnlineCheck = new Date().toISOString();
        fs.writeFileSync(licenseFilePath, JSON.stringify(licenseData, null, 2));
      } catch (fileError) {
        console.error("Background: Erreur lors de la mise à jour du fichier de licence:", fileError);
      }
    }
  } catch (error) {
    // Erreur réseau inattendue → on ne touche à rien
    console.log("Background: Erreur lors de la vérification en ligne. Statut local préservé.");
  }
}


// --- IPC Handlers pour la licence ---
ipcMain.handle('license:activate', async (event, key) => {
  return await activateLicense(key);
});

ipcMain.handle('license:check', async () => {
  return await validateLicense();
});

ipcMain.handle('license:get-machine-id', () => {
  return getMachineId();
});

// App version IPC
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.quit(); // Fix: use quit() instead of exit(0) to allow graceful shutdown
});

ipcMain.handle('os:get-boot-time', () => {
  return Math.round(Date.now() / 1000 - os.uptime());
});

// --- CPCL Thermal Label Printer Handler ---
/**
 * Send raw CPCL commands to USB thermal printer (XPrinter XP-233B)
 * CPCL is page-based, ensuring one complete label per print job
 * unlike ESC/POS which treats output as continuous paper.
 */
ipcMain.handle('printer:send-cpcl', async (event, { cpclData, printerName }) => {
  return new Promise((resolve, reject) => {
    try {
      const targetPrinter = printerName || 'Xprinter XP-233B';
      
      // Create temporary files
      const timestamp = Date.now();
      const tempDataFile = path.join(os.tmpdir(), `cpcl-label-${timestamp}.prn`);
      const tempScriptFile = path.join(os.tmpdir(), `print-raw-${timestamp}.ps1`);
      
      // Write CPCL data to temp file
      fs.writeFileSync(tempDataFile, cpclData, 'utf8');
      
      // Also save a copy for debugging
      const debugFile = path.join(app.getPath('userData'), 'last-cpcl-print.prn');
      fs.writeFileSync(debugFile, cpclData, 'utf8');
      console.log(`CPCL data saved to: ${debugFile}`);
      console.log(`CPCL data length: ${cpclData.length} bytes`);
      console.log('First 200 chars:', cpclData.substring(0, 200));

      if (process.platform === 'win32') {
        // Create PowerShell script file (avoids escaping issues)
        const psScript = `
param([string]$DataFile, [string]$PrinterName)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] data) {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "CPCL Raw Label";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            return false;
        }

        if (!StartDocPrinter(hPrinter, 1, di)) {
            ClosePrinter(hPrinter);
            return false;
        }

        if (!StartPagePrinter(hPrinter)) {
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return false;
        }

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(data.Length);
        Marshal.Copy(data, 0, pUnmanagedBytes, data.Length);

        int dwWritten;
        bool success = WritePrinter(hPrinter, pUnmanagedBytes, data.Length, out dwWritten);

        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);

        return success && (dwWritten == data.Length);
    }
}
'@

try {
    $content = [System.IO.File]::ReadAllBytes($DataFile)
    $result = [RawPrinterHelper]::SendBytesToPrinter($PrinterName, $content)
    if ($result) {
        Write-Output "SUCCESS"
        exit 0
    } else {
        Write-Output "FAILED: Could not send data to printer"
        exit 1
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    exit 1
}
`;
        // Write the PowerShell script
        fs.writeFileSync(tempScriptFile, psScript, 'utf8');

        // Execute the script with parameters safely using execFile
        const args = ['-ExecutionPolicy', 'Bypass', '-File', tempScriptFile, '-DataFile', tempDataFile, '-PrinterName', targetPrinter];
        
        execFile('powershell', args, { timeout: 30000 }, (error, stdout, stderr) => {
          // Clean up temp files
          try { fs.unlinkSync(tempDataFile); } catch (e) { /* ignore */ }
          try { fs.unlinkSync(tempScriptFile); } catch (e) { /* ignore */ }
          
          const output = stdout.trim();
          console.log('CPCL Print Output:', output);
          
          if (error) {
            console.error('CPCL Print Error:', error.message);
            console.error('STDERR:', stderr);
            reject(new Error(`Print failed: ${stderr || error.message}`));
          } else if (output.startsWith('SUCCESS')) {
            console.log('CPCL Print Success');
            resolve({ success: true, message: 'Label printed successfully' });
          } else {
            reject(new Error(output || 'Failed to send data to printer'));
          }
        });
      } else {
        // On Linux/Mac, use lp command for raw printing (CUPS is built-in on macOS)
        const installHint = process.platform === 'darwin'
          ? 'CUPS is built into macOS. Enable it in System Settings > Printers.'
          : 'Install CUPS: sudo apt install cups';
        // Check if lp is available first
        execFile('which', ['lp'], { timeout: 5000 }, (whichError) => {
          if (whichError) {
            try { fs.unlinkSync(tempDataFile); } catch (e) { /* ignore */ }
            console.error('CPCL Print Error: lp command not found');
            reject(new Error(`CUPS/lp not found. ${installHint}`));
            return;
          }

          execFile('lp', ['-d', targetPrinter, '-o', 'raw', tempDataFile],
            { timeout: 30000 },
            (error, stdout, stderr) => {
              try { fs.unlinkSync(tempDataFile); } catch (e) { /* ignore */ }
              
              if (error) {
                const msg = stderr || error.message;
                console.error('CPCL Print Error:', msg);
                if (msg.includes('not found') || msg.includes('unknown printer')) {
                  reject(new Error(`Printer "${targetPrinter}" not found. Run 'lpstat -p' to list available printers.`));
                } else if (msg.includes('permission') || msg.includes('denied')) {
                  const permHint = process.platform === 'darwin'
                    ? 'Check System Settings > Printers & Scanners for printer permissions.'
                    : 'Add user to lp group: sudo usermod -a -G lp $USER';
                  reject(new Error(`Permission denied. ${permHint}`));
                } else {
                  reject(new Error(`Print failed: ${msg}`));
                }
              } else {
                console.log('CPCL Print Success');
                resolve({ success: true, message: 'Label printed successfully' });
              }
            }
          );
        });
      }
    } catch (error) {
      console.error('CPCL Print Error:', error);
      reject(error);
    }
  });
});

// Get list of available printers
ipcMain.handle('printer:get-list', async () => {
  try {
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: p.isDefault,
        status: p.status
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
});

// --- Warranty Management ---
ipcMain.handle('warranty:import-pdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Fichiers PDF', extensions: ['pdf'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const customWarrantyPath = path.join(app.getPath('userData'), 'custom_warranty.pdf');
      fs.copyFileSync(result.filePaths[0], customWarrantyPath);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'importation du PDF:', error);
      return { success: false, message: error.message };
    }
  }
  return { success: false, message: 'Annulé' };
});

ipcMain.handle('warranty:reset-to-default', async () => {
  try {
    const customWarrantyPath = path.join(app.getPath('userData'), 'custom_warranty.pdf');
    if (fs.existsSync(customWarrantyPath)) {
      fs.unlinkSync(customWarrantyPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('warranty:check-custom', async () => {
  const customWarrantyPath = path.join(app.getPath('userData'), 'custom_warranty.pdf');
  return fs.existsSync(customWarrantyPath);
});

ipcMain.handle('warranty:check-default', async () => {
  const defaultPath = path.join(process.resourcesPath || '', 'warranty.pdf');
  // Also check dev path
  const devPath = path.join(__dirname, 'public', 'warranty_template.pdf');
  return fs.existsSync(defaultPath) || fs.existsSync(devPath);
});

ipcMain.handle('warranty:open-custom', async () => {
  try {
    const customWarrantyPath = path.join(app.getPath('userData'), 'custom_warranty.pdf');
    if (fs.existsSync(customWarrantyPath)) {
      // Use openExternal with file URL as it is often more reliable for PDFs
      const fileUrl = pathToFileURL(customWarrantyPath).toString();
      await shell.openExternal(fileUrl);
      return { success: true };
    }
    return { success: false, message: 'Fichier de garantie introuvable.' };
  } catch (error) {
    // Fallback to openPath if openExternal fails
    try {
      const customWarrantyPath = path.join(app.getPath('userData'), 'custom_warranty.pdf');
      const err = await shell.openPath(customWarrantyPath);
      return { success: !err, message: err };
    } catch (fallbackError) {
      return { success: false, message: 'Erreur lors de l\'ouverture.' };
    }
  }
});

// Window controls IPC
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  // Prevent any restoration or resizing - keep it fullscreen
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win.isFullScreen()) {
    win.setFullScreen(true);
  } else {
    win.setFullScreen(false);
  }
});

// Database Backup/Restore IPC
ipcMain.handle('db:backup', async () => {
  try {
    const isDev = !app.isPackaged;
    let dbPath;
    if (isDev) {
      dbPath = path.join(__dirname, '..', 'backend', 'db.sqlite3');
    } else {
      dbPath = path.join(app.getPath('userData'), 'db.sqlite3');
    }
    
    const backupPath = dbPath + '.bak';
    fs.copyFileSync(dbPath, backupPath);
    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('db:restore', async () => {
  try {
    const isDev = !app.isPackaged;
    let dbPath;
    if (isDev) {
      dbPath = path.join(__dirname, '..', 'backend', 'db.sqlite3');
    } else {
      dbPath = path.join(app.getPath('userData'), 'db.sqlite3');
    }
    
    const backupPath = dbPath + '.bak';
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: 'Aucune sauvegarde trouvée.' };
    }
    
    // Backup current before restoring (optional but safer)
    // fs.copyFileSync(dbPath, dbPath + '.last.bak');
    
    fs.copyFileSync(backupPath, dbPath);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.close();
});

// Determine if we are in development mode
const isDev = !app.isPackaged;

// Setup logging for production
const logPath = path.join(app.getPath('userData'), 'backend.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

/**
 * Create an invisible print window.
 *
 * Wayland constraints (both must be avoided):
 *   1. show:false → zxdg_exporter_v2 protocol violation → SIGTRAP
 *   2. show:true + hide() → compositor map/unmap race → GPU buffer
 *      use-after-free → SIGSEGV in webContents.print()
 *
 * Solution: create with show:true but make the window invisible via
 * transparency/opacity so the surface lifecycle is clean (no hide).
 */
function createHiddenPrintWindow(webPreferences = {}) {
  const printWindow = new BrowserWindow({
    show: true,
    width: 1,
    height: 1,
    x: -10000,
    y: -10000,
    frame: false,
    transparent: true,
    opacity: 0,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      ...webPreferences,
    },
  });
  return printWindow;
}

function restoreMainWindowFocus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

function runWebContentsPrint(printWindow, printOptions) {
  return new Promise((resolve) => {
    if (!printWindow || printWindow.isDestroyed()) {
      restoreMainWindowFocus();
      resolve({ success: false, errorType: 'window-destroyed' });
      return;
    }
    printWindow.webContents.print(printOptions, (success, errorType) => {
      if (!success && errorType !== 'cancelled') {
        console.error(`Print failed: ${errorType}`);
        logStream.write(`[${new Date().toISOString()}] Print failed: ${errorType}\n`);
      }
      try {
        if (printWindow && !printWindow.isDestroyed()) {
          printWindow.removeAllListeners('closed');
          printWindow.close();
        }
      } catch (e) {
        console.warn('Error closing print window:', e.message);
      }
      restoreMainWindowFocus();
      resolve({ success, errorType });
    });
  });
}

// IPC handler for printing
ipcMain.handle('print', async (event, options = {}) => {
  // Concurrency guard with timeout recovery:
  // prevent simultaneous print operations from racing on GPU resources
  // and auto-recover if a print hangs (known Linux/Wayland issue).
  const now = Date.now();
  if (isPrinting) {
    if (now - isPrintingTimestamp < PRINT_TIMEOUT_MS) {
      console.warn('Print already in progress, rejecting duplicate');
      return { success: false, errorType: 'print-in-progress' };
    }
    console.warn('Print timeout expired, resetting guard and proceeding');
    isPrinting = false;
  }
  isPrinting = true;
  isPrintingTimestamp = now;
  try {
    return await handlePrint(event, options);
  } finally {
    isPrinting = false;
    isPrintingTimestamp = 0;
  }
});

async function handlePrint(event, options = {}) {
  const { html, filePath, silent = false, landscape = false, preview = false } = options;
  
  if (filePath) {
    // Resolve absolute path to the PDF
    let cleanPath = filePath.replace(/^file:\/\/\/?/, '');
    let absolutePath = path.isAbsolute(cleanPath) ? cleanPath : path.resolve(cleanPath);
    
    // Robust path detection
    if (!fs.existsSync(absolutePath)) {
      const potentialPaths = [
         path.join(app.getPath('userData'), 'custom_warranty.pdf'),
         path.join(process.resourcesPath || '', 'warranty.pdf'),
         path.join(__dirname, 'public', cleanPath),
         path.join(__dirname, 'dist', cleanPath),
         path.join(__dirname, 'public', 'warranty_template.pdf')
      ];

      for (const p of potentialPaths) {
         if (p && fs.existsSync(p)) {
           absolutePath = p;
           break;
         }
      }
    }
    
    console.log(`Directly printing PDF: ${absolutePath}`);
    
    if (!fs.existsSync(absolutePath)) {
      console.error(`PDF file not found: ${absolutePath}`);
      dialog.showErrorBox('Fichier non trouvé', `Impossible de trouver le PDF: ${absolutePath}`);
      return { success: false, errorType: 'file-not-found' };
    }

    const printWindow = createHiddenPrintWindow({ plugins: true });
    const fileUrl = pathToFileURL(absolutePath).toString();

    return new Promise((resolve) => {
      let settled = false;

      printWindow.webContents.once('did-finish-load', () => {
        if (settled) return;
        settled = true;
        setTimeout(async () => {
          const result = await runWebContentsPrint(printWindow, {
            silent: false,
            printBackground: true,
            pageSize: 'A4',
            margins: { marginType: 'printableArea' },
          });
          resolve(result);
        }, 1000);
      });

      printWindow.webContents.once('did-fail-load', (_evt, _code, description) => {
        if (settled) return;
        settled = true;
        console.error(`Failed to load PDF for printing: ${description}`);
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
        restoreMainWindowFocus();
        resolve({ success: false, errorType: description });
      });

      printWindow.loadURL(fileUrl);
    });
  }

  if (html) {
    const isLabelPrint = options.isLabelPrint || false;
    let processedHtml = html;

    if (!isDev) {
      const distPath = pathToFileURL(path.join(__dirname, 'dist')).toString() + '/';
      if (processedHtml.includes('<head>')) {
        processedHtml = processedHtml.replace('<head>', `<head><base href="${distPath}">`);
      } else if (processedHtml.includes('<html>')) {
        processedHtml = processedHtml.replace('<html>', `<html><head><base href="${distPath}"></head>`);
      } else {
        processedHtml = `<head><base href="${distPath}"></head>${processedHtml}`;
      }
    }

    const tempHtmlPath = path.join(app.getPath('userData'), `print-${Date.now()}.html`);
    try {
      fs.writeFileSync(tempHtmlPath, processedHtml, 'utf8');
    } catch (error) {
      console.error('Failed to write temp print HTML:', error);
    }

    const tempHtmlUrl = pathToFileURL(tempHtmlPath).toString();
    const cleanupTempHtml = () => {
      try {
        if (fs.existsSync(tempHtmlPath)) {
          fs.unlinkSync(tempHtmlPath);
        }
      } catch (error) {
        console.warn('Failed to cleanup temp print HTML:', error.message);
      }
    };
    
    const printWindow = createHiddenPrintWindow();
    printWindow.on('closed', cleanupTempHtml);

    return new Promise((resolve) => {
      let settled = false;

      printWindow.webContents.once('did-finish-load', async () => {
        if (settled) return;
        settled = true;
        const marginType = options.marginType || (isLabelPrint ? 'none' : 'printableArea');
        const printOptions = {
          silent: preview ? false : silent,
          printBackground: true,
          landscape: isLabelPrint ? false : landscape,
          margins: { marginType },
          pageSize: options.pageSize || 'A4',
        };

        const result = await runWebContentsPrint(printWindow, printOptions);
        resolve(result);
      });

      printWindow.webContents.once('did-fail-load', (_evt, _code, description) => {
        if (settled) return;
        settled = true;
        console.error(`Failed to load HTML for printing: ${description}`);
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
        resolve({ success: false, errorType: description });
      });

      printWindow.loadURL(tempHtmlUrl);
    });
  }

  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { success: false, errorType: 'no-window' };
  }

  return new Promise((resolve) => {
    win.webContents.print({
      silent: silent,
      printBackground: true,
      landscape: landscape,
      pageSize: 'A4',
    }, (success, errorType) => {
      if (!success && errorType !== 'cancelled') {
        console.error(`Print failed: ${errorType}`);
        logStream.write(`[${new Date().toISOString()}] Print failed: ${errorType}\n`);
      }
      restoreMainWindowFocus();
      resolve({ success, errorType });
    });
  });
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

// Helper to send update events to renderer
function sendUpdateMessage(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Configure updater logging
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  logStream.write(`[${new Date().toISOString()}] Checking for update...\n`);
  sendUpdateMessage('update_checking');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  logStream.write(`[${new Date().toISOString()}] Update available: ${info.version}\n`);
  sendUpdateMessage('update_available', info);
  
  // Show a native dialog to inform the user
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Mise à jour disponible',
    message: `Une nouvelle version (${info.version}) est disponible!`,
    detail: 'Le téléchargement va commencer automatiquement en arrière-plan. Vous serez notifié une fois le téléchargement terminé.',
    buttons: ['OK'],
    defaultId: 0
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. Current version is latest.');
  logStream.write(`[${new Date().toISOString()}] Update not available. Current version: ${info.version}\n`);
  sendUpdateMessage('update_not_available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + Math.round(progressObj.bytesPerSecond / 1024) + " KB/s";
  log_message = log_message + ' - Downloaded ' + Math.round(progressObj.percent) + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
  logStream.write(`[${new Date().toISOString()}] ${log_message}\n`);
  sendUpdateMessage('update_download_progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  logStream.write(`[${new Date().toISOString()}] Update downloaded: ${info.version}\n`);
  sendUpdateMessage('update_downloaded', info);
  
  // Show a dialog asking user to restart
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '🎉 Mise à jour prête!',
    message: `La version ${info.version} a été téléchargée avec succès!`,
    detail: 'Voulez-vous redémarrer l\'application maintenant pour installer la mise à jour?',
    buttons: ['Redémarrer maintenant', 'Plus tard'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
  logStream.write(`[${new Date().toISOString()}] UPDATER ERROR: ${err.message}\n`);
  sendUpdateMessage('update_error', err.message);
});

// Manual update check IPC
ipcMain.on('check-for-updates', () => {
  checkUpdates();
});

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

function checkUpdates() {
  if (isDev) {
    // In development mode, simulate the update check flow
    console.log('Development mode: Simulating update check...');
    sendUpdateMessage('update_checking');
    
    // Simulate a delay then report "up to date"
    setTimeout(() => {
      sendUpdateMessage('update_not_available', { version: require('./package.json').version });
    }, 1500);
    return;
  }
  
  console.log('Checking for updates...');
  logStream.write(`[${new Date().toISOString()}] Explicit update check trigger...\n`);
  autoUpdater.checkForUpdatesAndNotify();
}

function startBackend() {
  let dbPath;
  if (isDev) {
    // In development, use the database in the backend folder to match terminal scripts
    dbPath = path.join(__dirname, '..', 'backend', 'db.sqlite3');
  } else {
    // In production, use the standard AppData location
    dbPath = path.join(app.getPath('userData'), 'db.sqlite3');
  }
  
  console.log(`Using Database at: ${dbPath}`);
  
  // Skip starting backend if instructed via environment variable
  if (process.env.SKIP_BACKEND === 'true') {
    console.log('Skipping backend start as SKIP_BACKEND is set to true');
    return;
  }
  
  try {
    const backendEnv = { 
      ...process.env, 
      ELECTRON_DB_PATH: dbPath,
      // Provide defaults for critical Django settings that might be missing in production
      SECRET_KEY: process.env.SECRET_KEY || 'django-insecure-prod-key-for-electron-app-2024',
      DEBUG: 'False',
      DJANGO_ALLOWED_HOSTS: 'localhost,127.0.0.1',
      CORS_ALLOW_ALL_ORIGINS: 'True'
    };

    if (isDev) {
      // In development, assume python is in the path and run from the backend folder
      const backendPath = path.join(__dirname, '..', 'backend');
      backendProcess = spawn('python', ['manage.py', 'runserver', '8000', '--noreload'], {
        cwd: backendPath,
        shell: true,
        env: backendEnv
      });
    } else {
      // In production, run the bundled executable
      const backendName = process.platform === 'win32' ? 'serve_backend.exe' : 'serve_backend';
      const executablePath = path.join(process.resourcesPath, 'backend', backendName);
      console.log(`Launching backend from: ${executablePath}`);
      backendProcess = spawn(executablePath, [], {
        shell: false,
        env: backendEnv
      });
    }

    if (!backendProcess) {
      throw new Error("Failed to create backend process object");
    }

    backendProcess.on('error', (err) => {
      const msg = `CRITICAL: Failed to start backend process: ${err.message}`;
      console.error(msg);
      logStream.write(`[${new Date().toISOString()}] ${msg}\n`);
      if (!isDev) {
        dialog.showErrorBox("Erreur de démarrage", "Le serveur n'a pas pu démarrer. Détails: " + err.message);
      }
    });

    backendProcess.stdout.on('data', (data) => {
      const message = `[${new Date().toISOString()}] STDOUT: ${data}\n`;
      logStream.write(message);
    });

    backendProcess.stderr.on('data', (data) => {
      const message = `[${new Date().toISOString()}] STDERR: ${data}\n`;
      logStream.write(message);
    });
  } catch (error) {
    console.error("Backend spawn error:", error);
    logStream.write(`[${new Date().toISOString()}] SPAWN ERROR: ${error.message}\n`);
  }
}

function createWindow(licenseStatus) {
  // Start the backend ONLY if license is valid
  // DEVELOPMENT OVERRIDE: Allow backend to start in dev mode even without license
  if (isDev || (licenseStatus && licenseStatus.success)) {
    startBackend();
  } else {
    console.log("Backend not started: License invalid");
    logStream.write(`[${new Date().toISOString()}] Backend not started: License invalid or not found\n`);
  }

  // Create the browser window.
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    kiosk: false, // Permettre le basculement
    fullscreen: false, // Start windowed for better initial scale handling
    resizable: true,
    maximizable: true,
    title: "PhoneMAG",
    icon: path.join(__dirname, 'Logo.png'),
    autoHideMenuBar: true,
    frame: false, // Remove default title bar
    backgroundColor: '#ffffff', // Ensure white background even during load
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      zoomFactor: 1.0, // Initial zoom
    },
  });

  // Handle high DPI scaling (Windows)
  win.webContents.on('did-finish-load', () => {
    // Optional: detect scale and adjust if needed
  });

  win.maximize(); // Maximize instead of fullscreen for better taskbar visibility
  win.setMenu(null);
  win.show();

  mainWindow = win;

  // Handle external links (http, https, mailto, tel)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL() && (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:') || url.startsWith('tel:'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // and load the index.html of the app.
  // In development, load from the vite dev server URL.
  // In production, load from the built dist folder.
  let startUrl;
  if (isDev) {
    startUrl = 'http://localhost:3000';
  } else {
    // Correctly format file:// path for all OS
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    startUrl = `file://${indexPath}`.replace(/\\/g, '/');
  }

  console.log(`Loading URL: ${startUrl}`);
  logStream.write(`[${new Date().toISOString()}] Loading URL: ${startUrl}\n`);

  win.loadURL(startUrl).catch(e => {
    const errorMsg = `ERROR: Failed to load URL: ${e.message}`;
    console.error(errorMsg);
    logStream.write(`[${new Date().toISOString()}] ${errorMsg}\n`);
    
    if(isDev) {
      setTimeout(() => {
        win.loadURL('http://localhost:8000');
      }, 1000);
    } else {
      // Use startUrl since indexPath is scoped to the else block above
      dialog.showErrorBox("Erreur de chargement", "Impossible de charger l'interface. URL: " + startUrl);
    }
  });

  // Open the DevTools if in development.
  if (isDev) {
    win.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Force light mode to ignore system dark mode settings
  nativeTheme.themeSource = 'light';

  // Add DPI scaling support flags to prevent layout issues at 125%+ scaling
  // NOTE: On Wayland, --force-device-scale-factor causes GPU buffer size mismatch
  // which leads to SIGSEGV in printing (Chromium bug crbug.com/1253604).
  if (!isWayland) {
    app.commandLine.appendSwitch('force-device-scale-factor', '1');
    app.commandLine.appendSwitch('high-dpi-support', '1');
  }

  // Check license before anything else
  const licenseStatus = await validateLicense();

  createWindow(licenseStatus);
});

app.on('before-quit', () => {
  if (backendProcess) {
    if (process.platform === 'win32') {
      try {
        require('child_process').execSync(`taskkill /pid ${backendProcess.pid} /f /t`);
      } catch (e) {}
    } else {
      backendProcess.kill();
    }
    backendProcess = null;
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    const licenseStatus = await validateLicense();
    createWindow(licenseStatus);
  }
});
