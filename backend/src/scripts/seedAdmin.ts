import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Admin Seeder Script
 * Creates the initial admin account for FreshMarket.
 *
 * Usage (while the backend server is running):
 *   npm run seed:admin
 */

const findMongoPort = (): number | null => {
  try {
    const output = execSync('lsof -i -P | grep mongod | grep LISTEN', { encoding: 'utf-8' });
    const match = output.match(/:(\d+)\s+\(LISTEN\)/);
    return match ? parseInt(match[1]) : null;
  } catch {
    return null;
  }
};

const seedAdmin = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      // Find the running MongoMemoryServer port
      const port = findMongoPort();
      if (port) {
        mongoUri = `mongodb://127.0.0.1:${port}/`;
        console.log(`📂 Found local MongoDB on port ${port}`);
      } else {
        console.error('❌ Could not find a running MongoDB instance.');
        console.error('   Make sure the backend server is running first: npm run dev');
        console.error('   Or set MONGO_URI in your .env file.');
        process.exit(1);
      }
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import User model
    const User = (await import('../models/User')).default;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@freshmarket.com';
    const adminName = process.env.ADMIN_NAME || 'Admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️  Admin already exists: ${adminEmail} (role: ${existingAdmin.role})`);

      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('   → Upgraded to admin role');
      }
    } else {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isApproved: true,
      });

      console.log('✅ Admin account created!');
      console.log(`   Email:    ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  Change the password after first login!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done. You can now login as admin.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seeder error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
