// Quick script to check projects on server MongoDB
const fetch = require('node-fetch');

async function checkProjects() {
  try {
    console.log('🔍 Fetching projects from server...\n');
    
    const response = await fetch('https://22102959.dcism.org/biocella-api/projects');
    
    if (!response.ok) {
      console.error('❌ Failed to fetch:', response.status, response.statusText);
      return;
    }
    
    const projects = await response.json();
    
    console.log(`✅ Found ${projects.length} project(s) on server:\n`);
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   Code: ${project.code}`);
      console.log(`   Classification: ${project.classification}`);
      console.log(`   ID: ${project._id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProjects();
