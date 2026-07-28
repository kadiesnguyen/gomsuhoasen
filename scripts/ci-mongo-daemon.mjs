import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { promises as fs } from 'node:fs';

async function main() {
  const replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ port: 27019 }],
    replSet: { name: 'rs0', count: 1 }
  });
  const uri = replSet.getUri();
  await fs.writeFile('.tmp/mongo-e2e-uri.txt', uri);

  console.log(`[MongoDaemon] Started Replica Set at ${uri}`);

  process.on('SIGINT', async () => {
    console.log('[MongoDaemon] SIGINT received, stopping...');
    await replSet.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    console.log('[MongoDaemon] SIGTERM received, stopping...');
    await replSet.stop();
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {}, 1000000);
}

main().catch(err => {
  console.error('[MongoDaemon] Fatal error:', err);
  process.exit(1);
});
