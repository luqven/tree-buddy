import { appendFileSync } from 'fs';
import { join } from 'path';
let electronApp: any = null;
try {
  electronApp = require('electron').app;
} catch {
  // Not in electron
}

// For development, we'll log to the project root.
// In production, we'd use app.getPath('userData').
const LOG_FILE = process.env.NODE_ENV === 'test' 
  ? join(process.cwd(), 'test.log')
  : join(process.cwd(), 'app.log');

function isVerbose(): boolean {
  // Always verbose in test mode
  if (process.env.NODE_ENV === 'test') return true;
  
  // Check if running in Electron and has --verbose
  if (electronApp) {
    return electronApp.commandLine.hasSwitch('verbose');
  }
  
  // CLI fallback: check process.argv or env
  return process.argv.includes('--verbose') || !!process.env.VERBOSE;
}

export function log(message: string, ...args: any[]) {
  if (!isVerbose()) return;

  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ' ' + args.map(a => 
    typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
  ).join(' ') : '';
  
  const entry = `[${timestamp}] ${message}${formattedArgs}\n`;
  
  // Also log to console for active debugging
  console.log(message, ...args);

  try {
    appendFileSync(LOG_FILE, entry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

export function logError(message: string, error?: any) {
  // We still want to see errors even if not verbose? 
  // User asked "make our logger optional", usually implying both logs and errors if they are part of the "logger".
  // But usually logError should always be visible. 
  // Let's stick to the request: "make our logger optional".
  if (!isVerbose()) {
    console.error(message, error);
    return;
  }

  const timestamp = new Date().toISOString();
  let details = '';
  if (error) {
    if (error.stack) details += error.stack;
    if (error.stderr) details += `\nSTDERR: ${error.stderr}`;
    if (!error.stack && !error.stderr) details += JSON.stringify(error, null, 2);
  }
  const entry = `[${timestamp}] ERROR: ${message}\n${details}\n`;
  
  console.error(message, error);

  try {
    appendFileSync(LOG_FILE, entry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}
