import { appendFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// For development, we'll log to the project root.
// In production, we'd use app.getPath('userData').
const LOG_FILE = process.env.NODE_ENV === 'test' 
  ? join(process.cwd(), 'test.log')
  : join(process.cwd(), 'app.log');

export function log(message: string, ...args: any[]) {
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
  const timestamp = new Date().toISOString();
  const errorDetails = error ? (error.stack || JSON.stringify(error, null, 2)) : '';
  const entry = `[${timestamp}] ERROR: ${message}\n${errorDetails}\n`;
  
  console.error(message, error);

  try {
    appendFileSync(LOG_FILE, entry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}
