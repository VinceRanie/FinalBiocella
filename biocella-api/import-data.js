const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { BSON } = require('bson');

// MongoDB connection URI - Production on port 27018
const uri = 'mongodb://localhost:27018/s22102959_BiocellaNoSQL';

const connectOptions = {
  // No auth for now
};

async function importBSONFile(collectionName, filePath) {
  try {
    console.log(`\n📦 Importing ${collectionName}...`);
    
    // Read BSON file
    const bsonBuffer = fs.readFileSync(filePath);
    
    // Parse BSON data
    const documents = [];
    let offset = 0;
    
    while (offset < bsonBuffer.length) {
      try {
        const docSize = bsonBuffer.readInt32LE(offset);
        if (docSize <= 0 || offset + docSize > bsonBuffer.length) break;
        
        const docBuffer = bsonBuffer.slice(offset, offset + docSize);
        const document = BSON.deserialize(docBuffer);
        documents.push(document);
        
        offset += docSize;
      } catch (err) {
        console.log(`   ⚠️  Reached end of valid BSON data at offset ${offset}`);
        break;
      }
    }
    
    if (documents.length === 0) {
      console.log(`   ℹ️  No documents found in ${collectionName}`);
      return 0;
    }
    
    // Get or create collection
    const collection = mongoose.connection.collection(collectionName);
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    await collection.deleteMany({});
    
    // Insert documents
    await collection.insertMany(documents);
    
    console.log(`   ✅ Imported ${documents.length} documents to ${collectionName}`);
    return documents.length;
  } catch (error) {
    console.error(`   ❌ Error importing ${collectionName}:`, error.message);
    return 0;
  }
}

async function importAllData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri, connectOptions);
    console.log('✅ Connected successfully!\n');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    const dataDir = path.join(__dirname, 'biocella_nosql');
    
    // Map of BSON files to collection names
    const collections = [
      { file: 'Bioactivity.bson', name: 'bioactivities' },
      { file: 'Biochemical.bson', name: 'biochemicalcharacteristics' },
      { file: 'Genome_Sequence.bson', name: 'genomesequences' },
      { file: 'Microbial_Info.bson', name: 'microbialinfos' },
      { file: 'Morphology.bson', name: 'morphologies' },
      { file: 'projects.bson', name: 'projects' },
      { file: 'Resource.bson', name: 'resources' }
    ];
    
    let totalImported = 0;
    
    for (const { file, name } of collections) {
      const filePath = path.join(dataDir, file);
      
      if (fs.existsSync(filePath)) {
        const count = await importBSONFile(name, filePath);
        totalImported += count;
      } else {
        console.log(`   ⚠️  File not found: ${file}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`🎉 Import completed! Total documents: ${totalImported}`);
    console.log('='.repeat(50));
    
    // List all collections to verify
    console.log('\n📋 Collections in database:');
    const collections_list = await mongoose.connection.db.listCollections().toArray();
    collections_list.forEach(col => {
      console.log(`   • ${col.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

// Run the import
importAllData();
