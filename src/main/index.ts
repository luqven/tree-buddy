import { app, Tray, BrowserWindow, nativeImage, screen } from 'electron';
import { join } from 'path';
import { initIpc, setMainWindow } from './ipc';

const WINDOW_WIDTH = 320;
const WINDOW_HEIGHT = 480;

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

/**
 * Create the popup window
 */
function createWindow(): BrowserWindow {
  const preloadPath = join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer from built files
  const rendererPath = join(__dirname, '../renderer/index.html');
  win.loadFile(rendererPath);

  // Hide when focus is lost
  win.on('blur', () => {
    win.hide();
  });

  return win;
}

/**
 * Position window below tray icon
 */
function positionWindow(win: BrowserWindow, trayBounds: Electron.Rectangle) {
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  });

  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2
  );

  // Position below tray on macOS (tray is at top)
  const y = trayBounds.y + trayBounds.height + 4;

  // Ensure window stays within screen bounds
  const maxX = display.bounds.x + display.bounds.width - WINDOW_WIDTH;
  const boundedX = Math.max(display.bounds.x, Math.min(x, maxX));

  win.setPosition(boundedX, y);
}

/**
 * Toggle window visibility
 */
function toggleWindow() {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    const trayBounds = tray?.getBounds();
    if (trayBounds) {
      positionWindow(mainWindow, trayBounds);
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Initialize the app
 */
function init(): void {
  // Initialize IPC handlers
  initIpc();

  // Create tray
  const iconPath = join(app.getAppPath(), 'assets', 'tray-iconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);

  let trayIcon: Electron.NativeImage;
  if (icon.isEmpty()) {
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = 100;
      canvas[i * 4 + 1] = 100;
      canvas[i * 4 + 2] = 100;
      canvas[i * 4 + 3] = 255;
    }
    trayIcon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  } else {
    trayIcon = icon;
  }

  trayIcon.setTemplateImage(true);
  tray = new Tray(trayIcon);
  tray.setToolTip('Tree Buddy');

  // Create window
  mainWindow = createWindow();
  setMainWindow(mainWindow);

  // Handle tray click
  tray.on('click', () => {
    toggleWindow();
  });

  // Handle right-click (same as left-click for consistency)
  tray.on('right-click', () => {
    toggleWindow();
  });
}

// Hide dock icon on macOS
app.dock?.hide();

app.whenReady().then(init);

app.on('window-all-closed', (e: Event) => {
  e.preventDefault();
});
