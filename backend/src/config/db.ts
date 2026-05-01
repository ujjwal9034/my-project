import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

let mongoServer: any = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri) {
      // Production mode: Use real MongoDB (Atlas or self-hosted)
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } else if (process.env.NODE_ENV === 'production') {
      // Safety net: Don't allow memory server in production
      console.error('❌ FATAL: MONGO_URI is required in production mode.');
      console.error('   Set MONGO_URI to your MongoDB Atlas connection string.');
      process.exit(1);
    } else {
      // Development mode: Use MongoMemoryServer with persistent storage
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const dbPath = path.join(__dirname, '..', '..', 'data', 'mongodb');

      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }

      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbPath: dbPath,
          storageEngine: 'wiredTiger',
        },
      });
      const devUri = mongoServer.getUri();
      console.log('✅ Using PERSISTENT local MongoDB (dev mode)');
      console.log(`   Database path: ${dbPath}`);

      const conn = await mongoose.connect(devUri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error: any) {
    console.error(`❌ Database Error: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
  await mongoose.connection.close();
  process.exit(0);
});

// For nodemon restarts
process.on('SIGUSR2', async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
  await mongoose.connection.close();
  process.kill(process.pid, 'SIGUSR2');
});

export default connectDB;
