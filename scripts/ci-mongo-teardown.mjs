import { promises as fs } from 'node:fs';
import path from 'node:path';

async function main() {
  const tempDir = path.resolve(process.cwd(), '.tmp');
  const pidFile = path.resolve(tempDir, 'mongo-e2e-pid.txt');

  try {
    const pidStr = await fs.readFile(pidFile, 'utf8');
    const pid = parseInt(pidStr, 10);
    if (!isNaN(pid)) {
      console.log(`Stopping mongodb-memory-server daemon (PID ${pid})...`);
      process.kill(pid, 'SIGINT'); // Trigger the daemon's SIGINT handler to gracefully shutdown
      
      // Wait briefly for daemon to clean up
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch(e) {
    console.log('No daemon PID found, or process already dead.');
  }

  // Clean up data directories
  try {
    const mongoDataDir = path.resolve(tempDir, 'mongo-e2e');
    await fs.rm(mongoDataDir, { recursive: true, force: true });
    console.log('Cleaned up local MongoDB data directory:', mongoDataDir);
  } catch (err) {
    console.warn('Could not remove database directory:', err.message);
  }
}

main();
