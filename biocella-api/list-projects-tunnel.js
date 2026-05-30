const mongoose = require('mongoose');
require('dotenv').config();

async function listProjects() {
  try {
    // Force port 27018 for tunnel
    const uri = 'mongodb://s22102959_BiocellaNoSQL:Teravoid123@localhost:27018/s22102959_BiocellaNoSQL';
    
    await mongoose.connect(uri, {
      authSource: 's22102959_BiocellaNoSQL'
    });
    
    console.log('✅ Connected through SSH tunnel\n');
    
    const Project = mongoose.connection.collection('projects');
    const projects = await Project.find({}).toArray();
    
    console.log(`📦 Found ${projects.length} project(s):\n`);
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   Code: ${project.code}`);
      console.log(`   Classification: ${project.classification}`);
      console.log(`   ID: ${project._id}`);
      console.log('');
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listProjects();
