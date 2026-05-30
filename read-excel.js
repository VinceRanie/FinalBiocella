const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'examples', 'Copy of USC Microbial Culture Collection (USCMCC).xlsx');

try {
  console.log('📖 Reading Excel file...\n');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  console.log(`📄 Sheet name: ${sheetName}\n`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // First, let's see all raw data
  const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  console.log('📊 First 15 rows (raw):');
  console.log('=' .repeat(80));
  allData.slice(0, 15).forEach((row, index) => {
    console.log(`Row ${index}: ${JSON.stringify(row)}`);
  });
  
  // Now try to find the header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, allData.length); i++) {
    const row = allData[i];
    // Look for a row that might be headers (has multiple non-empty values)
    const nonEmpty = row.filter(cell => cell && cell.toString().trim() !== '');
    if (nonEmpty.length > 3) {
      console.log(`\n🎯 Potential header row found at index ${i}:`, row);
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex >= 0) {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });
    
    console.log('\n📋 Column Headers (Fields):');
    console.log('=' .repeat(50));
    
    const headers = Object.keys(jsonData[0]);
    headers.forEach((header, index) => {
      console.log(`${index + 1}. ${header}`);
    });
    
    console.log('\n📊 Sample Data (First 3 rows):');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
    
    console.log('\n📊 Sample Data (First 3 rows):');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
    
    console.log('\n\n💾 Saving to JSON file for reference...');
    const fs = require('fs');
    fs.writeFileSync('examples/specimen-template.json', JSON.stringify({
      fields: headers,
      sampleData: jsonData.slice(0, 5),
      headerRowIndex: headerRowIndex
    }, null, 2));
    console.log('✅ Saved to examples/specimen-template.json');
  } else {
    console.log('⚠️  Could not find header row in the Excel file');
  }
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
}
