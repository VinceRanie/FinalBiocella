const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'examples', 'Copy of USC Microbial Culture Collection (USCMCC).xlsx');

try {
  console.log('📖 Reading Excel file...\n');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Extract field names from the form-style layout
  const fields = [];
  
  console.log('🔍 Scanning for field labels...\n');
  
  for (let i = 0; i < Math.min(50, allData.length); i++) {
    const row = allData[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      // Look for cells ending with ":" which are likely labels
      if (cell && typeof cell === 'string' && cell.trim().endsWith(':')) {
        const fieldName = cell.trim().replace(':', '');
        const value = row[j + 1] || '';
        
        if (fieldName && !fields.find(f => f.label === fieldName)) {
          fields.push({
            label: fieldName,
            exampleValue: value,
            row: i,
            col: j
          });
          console.log(`Found field: "${fieldName}" = "${value}"`);
        }
      }
    }
  }
  
  console.log(`\n✅ Found ${fields.length} fields\n`);
  
  // Organize fields for the form
  const formStructure = {
    fields: fields.map(f => ({
      name: f.label.toLowerCase().replace(/\s+/g, '_'),
      label: f.label,
      type: inferFieldType(f.label, f.exampleValue),
      exampleValue: f.exampleValue
    })),
    totalFields: fields.length
  };
  
  console.log('📋 Form Structure:');
  console.log('='.repeat(80));
  formStructure.fields.forEach((field, index) => {
    console.log(`${index + 1}. ${field.label}`);
    console.log(`   - Name: ${field.name}`);
    console.log(`   - Type: ${field.type}`);
    console.log(`   - Example: "${field.exampleValue}"`);
    console.log('');
  });
  
  fs.writeFileSync('examples/specimen-form-structure.json', JSON.stringify(formStructure, null, 2));
  console.log('💾 Saved to examples/specimen-form-structure.json\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

function inferFieldType(label, value) {
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes('date')) return 'date';
  if (lowerLabel.includes('classification')) return 'select';
  if (lowerLabel.includes('code') || lowerLabel.includes('id')) return 'text';
  if (lowerLabel.includes('description') || lowerLabel.includes('summary') || lowerLabel.includes('note')) return 'textarea';
  if (lowerLabel.includes('image') || lowerLabel.includes('photo') || lowerLabel.includes('picture')) return 'file';
  
  // Check value length
  if (value && value.length > 50) return 'textarea';
  
  return 'text';
}
