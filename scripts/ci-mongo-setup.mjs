import { MongoClient } from 'mongodb';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI || 'mongodb://127.0.0.1:27017/admin';
const MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.14';

async function checkTransactionSupport(uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    const admin = client.db('admin');
    let hello;
    try {
      hello = await admin.command({ hello: 1 });
    } catch {
      hello = await admin.command({ isMaster: 1 });
    }
    const isReplicaSet = Boolean(hello.setName);
    const isMongos = hello.msg === 'isdbgrid';
    const hasSessionTimeout = typeof hello.logicalSessionTimeoutMinutes === 'number';
    await client.close();
    return (isReplicaSet || isMongos) && hasSessionTimeout;
  } catch (err) {
    console.log(`Connection to ${uri} failed or check failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Probing database at:', E2E_MONGODB_URI);
  const supports = await checkTransactionSupport(E2E_MONGODB_URI);
  if (supports) {
    console.log('MongoDB supports transactions. Setup bypass.');
    console.log('=== MONGO_SETUP_BYPASS ===');
    process.exit(0);
  }

  console.log('MongoDB does not support transactions or is unreachable. Starting a local MongoMemoryReplSet on port 27019...');

  const tempDir = path.resolve(process.cwd(), '.tmp');
  await fs.mkdir(tempDir, { recursive: true });
  
  try { await fs.rm(path.resolve(tempDir, 'mongo-e2e-pid.txt')); } catch(e){}
  try { await fs.rm(path.resolve(tempDir, 'mongo-e2e-uri.txt')); } catch(e){}

  const logFile = path.resolve(tempDir, 'mongo-e2e.log');
  const logStream = await fs.open(logFile, 'w');

  const child = spawn(process.argv[0], ['scripts/ci-mongo-daemon.mjs'], {
    detached: true,
    stdio: ['ignore', logStream.fd, logStream.fd],
    env: {
      ...process.env,
      MONGOMS_VERSION,
    },
  });
  
  await fs.writeFile(path.resolve(tempDir, 'mongo-e2e-pid.txt'), child.pid.toString());
  child.unref();

  console.log('Waiting for local mongodb-memory-server to be ready to accept connections...');
  const replicaUri = 'mongodb://127.0.0.1:27019/admin?directConnection=true';
  let connected = false;
  
  // Wait up to 60 seconds (it has to download the binary first if not cached)
  for (let i = 0; i < 60; i++) {
    const client = new MongoClient(replicaUri, { serverSelectionTimeoutMS: 1000 });
    try {
      await client.connect();
      await client.close();
      connected = true;
      break;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!connected) {
    throw new Error('Failed to connect to local mongodb-memory-server on port 27019 after 60 attempts.');
  }

  console.log('=== MONGO_SETUP_STARTED ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to setup MongoDB replica set:', err);
  process.exit(1);
});
