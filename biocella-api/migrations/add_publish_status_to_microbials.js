require('dotenv').config();

const mongoose = require('mongoose');
const connectMongo = require('../config/mongo');
const MicrobialInfo = require('../models/MicrobialInfo');

async function runMigration() {
  try {
    await connectMongo();

    const result = await MicrobialInfo.updateMany(
      { publish_status: { $exists: false } },
      { $set: { publish_status: 'published' } }
    );

    console.log('Migration completed.');
    console.log(`Matched documents: ${result.matchedCount}`);
    console.log(`Updated documents: ${result.modifiedCount}`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

runMigration();
