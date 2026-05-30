const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27018/s22102959_BiocellaNoSQL';

async function createUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected successfully!\n');
    
    // Create user using native MongoDB command
    const result = await mongoose.connection.db.command({
      createUser: 's22102959_BiocellaNoSQL',
      pwd: 'Teravoid123',
      roles: [
        { role: 'readWrite', db: 's22102959_BiocellaNoSQL' },
        { role: 'dbAdmin', db: 's22102959_BiocellaNoSQL' }
      ]
    });
    
    console.log('✅ User created successfully!');
    console.log('   Username: s22102959_BiocellaNoSQL');
    console.log('   Database: s22102959_BiocellaNoSQL');
    console.log('   Roles: readWrite, dbAdmin');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

createUser();
