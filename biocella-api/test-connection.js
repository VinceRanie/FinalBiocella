const connectMongo = require('./config/mongo');

async function testConnection() {
  try {
    await connectMongo();
    console.log('\n🎉 Connection test successful!');
    console.log('✅ Your app can now connect to production MongoDB on port 27018');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
