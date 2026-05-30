const axios = require('axios');

const EMAIL = '22102959@usc.edu.ph'; // Replace with your actual email
const TOOL = 'biocella-backend';

// Step 1: Submit sequence to NCBI BLAST
exports.runBlast = async (req, res) => {
  const { sequence } = req.body;

  if (!sequence) return res.status(400).json({ error: 'Sequence required' });

  try {
    const params = new URLSearchParams({
      CMD: 'Put',
      PROGRAM: 'blastn',
      DATABASE: 'nt',
      QUERY: sequence,
      EMAIL,
      TOOL
    });

    const submitRes = await axios.post('https://blast.ncbi.nlm.nih.gov/Blast.cgi', params);
    const ridMatch = submitRes.data.match(/RID = ([A-Z0-9]+)/);
    const rid = ridMatch ? ridMatch[1] : null;

    if (!rid) return res.status(500).json({ error: 'Failed to get RID from BLAST' });

    console.log('RID:', rid);
    res.json({ message: 'BLAST submitted', rid });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'BLAST submission failed' });
  }
};

// Step 2: Poll for result using RID
exports.getBlastResult = async (req, res) => {
  const { rid } = req.query;

  if (!rid) return res.status(400).json({ error: 'RID required' });

  try {
    const statusCheck = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
      params: {
        CMD: 'Get',
        FORMAT_OBJECT: 'SearchInfo',
        RID: rid,
        EMAIL,
        TOOL
      }
    });

    if (statusCheck.data.includes('Status=WAITING')) {
      return res.json({ status: 'waiting' });
    }

    if (statusCheck.data.includes('Status=FAILED')) {
      return res.status(500).json({ error: 'BLAST failed on server' });
    }

    // Get final results in XML
    const resultRes = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
      params: {
        CMD: 'Get',
        FORMAT_TYPE: 'XML',
        RID: rid,
        EMAIL,
        TOOL
      }
    });

    res.send(resultRes.data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'BLAST result fetch failed' });
  }
};
