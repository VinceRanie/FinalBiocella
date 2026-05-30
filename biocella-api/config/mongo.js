const mongoose = require('mongoose');
require('dotenv').config();

const connectMongo = async () => {
  try {
    // Connection URI with authentication - uses environment variables or defaults
    const MONGO_USER = process.env.MONGO_USER || 's22102959_BiocellaNoSQL';
    const MONGO_PASSWORD = process.env.MONGO_PASSWORD || 'Teravoid123';
    const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
    const MONGO_PORT = process.env.MONGO_PORT || '27018';
    const MONGO_DB = process.env.MONGO_DB || 's22102959_BiocellaNoSQL';
    
    const uri = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;
    
    await mongoose.connect(uri, {
      authSource: MONGO_DB, // Database to authenticate against
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('📦 Database:', mongoose.connection.name);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err; // Rethrow to handle in app.js if needed
  }
};

module.exports = connectMongo;
