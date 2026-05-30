#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MicrobialInfo = require('../models/MicrobialInfo');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/biocella';

function splitCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((s) => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function findCodeValue(rowObj) {
  const keys = Object.keys(rowObj);
  for (const k of keys) {
    const nk = k.toLowerCase().replace(/[_\s]+/g, '');
    if (nk === 'code' || nk === 'codename' || nk === 'specimencode' || nk === 'samplecode' || nk === 'sampleid' || nk === 'specimenid') {
      const v = String(rowObj[k] || '').trim();
      if (v) return v;
    }
  }
  return null;
}

async function run(inputPath, outputPath) {
  if (!inputPath || !outputPath) {
    console.error('Usage: node premerge_import.js <input.csv> <output.csv>');
    process.exit(2);
  }

  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const raw = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    console.error('Empty input file');
    process.exit(2);
  }

  const header = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => splitCsvLine(line));

  const mergedRows = [];
  for (const row of rows) {
    const obj = {};
    for (let i = 0; i < header.length; i += 1) {
      obj[header[i]] = row[i] || '';
    }

    const codeVal = findCodeValue(obj);
    if (!codeVal) {
      mergedRows.push(obj);
      continue;
    }

    const regex = new RegExp(`^${codeVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const existing = await MicrobialInfo.findOne({ code_name: { $regex: regex } }).lean();
    if (!existing) {
      mergedRows.push(obj);
      continue;
    }

    // Merge: fill empty CSV fields from existing document where possible
    for (const h of header) {
      const cur = String(obj[h] || '').trim();
      if (cur) continue;
      // try simple mapping: header normalized to existing key
      const key = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (existing[key] !== undefined && existing[key] !== null) {
        obj[h] = existing[key];
      } else if (existing[h] !== undefined && existing[h] !== null) {
        obj[h] = existing[h];
      }
    }

    mergedRows.push(obj);
  }

  // write output
  const outStream = fs.createWriteStream(path.resolve(process.cwd(), outputPath), { encoding: 'utf8' });
  outStream.write(header.map(escapeCsvValue).join(',') + '\n');
  for (const r of mergedRows) {
    const line = header.map((h) => escapeCsvValue(r[h] || '')).join(',');
    outStream.write(line + '\n');
  }
  outStream.end();

  console.log(`Wrote merged CSV to ${outputPath}`);
  await mongoose.disconnect();
}

const [,, inputPath, outputPath] = process.argv;
run(inputPath, outputPath).catch((err) => {
  console.error('Pre-merge failed:', err.message || err);
  process.exit(1);
});
