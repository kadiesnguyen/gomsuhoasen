import * as mongoose from 'mongoose';
import { runSeed } from '../../src/seed';

export async function resetAndSeedE2E(uri: string): Promise<void> {
  // 1) reset the isolated test database once for this profile
  // 2) run seed profile e2e & 3) verify
  await runSeed(uri, 'e2e', { resetDatabase: true });
  
  // Cleanup connection left by runSeed (since we called it programmatically)
  await mongoose.disconnect();
}
