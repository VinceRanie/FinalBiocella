const MicrobialInfo = require('../models/MicrobialInfo');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const db = require('../config/mysql');
const CollectionActivity = require('../models/CollectionActivity');

const PUBLISH_STATUSES = new Set(['published', 'unpublished']);
const PRIVILEGED_ROLES = new Set(['admin', 'staff']);

const normalizeCodeValue = (value) => String(value || '').trim().toLowerCase();

const findSpecimenDuplicate = async (codeName, excludeId = null) => {
  const normalizedCode = normalizeCodeValue(codeName);
  if (!normalizedCode) return null;

  const filter = {
    code_name: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return MicrobialInfo.findOne(filter).lean();
};

const normalizeRole = (role) => {
  if (!role) return '';
  const normalized = String(role).trim().toLowerCase();
  return normalized === 'ra' ? 'staff' : normalized;
};

const normalizePublishStatus = (status, fallback = 'unpublished') => {
  const normalized = String(status || '').trim().toLowerCase();
  return PUBLISH_STATUSES.has(normalized) ? normalized : fallback;
};

const getActivityUserId = (req) => {
  const headerValue = req.headers?.['x-user-id'];
  const bodyValue = req.body?.user_id;
  const queryValue = req.query?.user_id;
  const candidate = headerValue || bodyValue || queryValue;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildActivityDescription = (specimen) => {
  if (!specimen) return 'Specimen activity';
  const parts = [specimen.code_name, specimen.classification].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : 'Specimen activity';
};

const logCollectionActivity = async ({ req, specimen, action, status }) => {
  try {
    const payload = {
      specimen_id: specimen?._id,
      project_id: specimen?.project_id?._id || specimen?.project_id || null,
      user_id: getActivityUserId(req),
      action: String(action || '').toLowerCase() || 'update',
      status: status ? String(status).toLowerCase() : undefined,
      description: buildActivityDescription(specimen),
    };

    if (!payload.specimen_id) return;
    await CollectionActivity.create(payload);
  } catch (error) {
    console.warn('Collection activity log failed:', error.message);
  }
};

const canViewUnpublished = (req) => {
  const roleFromQuery = req.query?.role;
  const roleFromHeader = req.headers?.['x-user-role'];
  const normalized = normalizeRole(roleFromQuery || roleFromHeader);
  return PRIVILEGED_ROLES.has(normalized);
};

const publishedFilter = {
  $or: [
    { publish_status: 'published' },
    { publish_status: { $exists: false } }
  ]
};

const buildVisibilityFilter = (req) => {
  const requestedStatus = normalizePublishStatus(req.query?.status, '');

  if (canViewUnpublished(req)) {
    if (PUBLISH_STATUSES.has(requestedStatus)) {
      return { publish_status: requestedStatus };
    }
    return {};
  }

  return publishedFilter;
};

const normalizeImageDescriptionValue = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      image_url: String(value.image_url || ''),
      description: String(value.description || ''),
    };
  }

  return {
    image_url: '',
    description: String(value || ''),
  };
};

const applyCustomImageUploads = ({ customFields, customImageMapRaw, uploadedCustomImages, oldCustomFields }) => {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
    return customFields;
  }

  let customImageMap = customImageMapRaw;
  if (typeof customImageMap === 'string') {
    try {
      customImageMap = JSON.parse(customImageMap);
    } catch {
      customImageMap = null;
    }
  }

  if (!customImageMap || typeof customImageMap !== 'object' || Array.isArray(customImageMap)) {
    return customFields;
  }

  const nextCustomFields = { ...customFields };
  const oldFields = oldCustomFields && typeof oldCustomFields === 'object' ? oldCustomFields : {};

  Object.entries(customImageMap).forEach(([fieldId, fileIndexValue]) => {
    const field = nextCustomFields[fieldId];
    if (!field || typeof field !== 'object' || Array.isArray(field)) {
      return;
    }

    if (String(field.type || '').toLowerCase() !== 'image_description') {
      return;
    }

    const fileIndex = Number(fileIndexValue);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= uploadedCustomImages.length) {
      return;
    }

    const uploadedFile = uploadedCustomImages[fileIndex];
    if (!uploadedFile?.filename) {
      return;
    }

    const previousValue = normalizeImageDescriptionValue(field.value);
    const oldField = oldFields[fieldId];
    const oldValue = oldField && typeof oldField === 'object' && !Array.isArray(oldField)
      ? normalizeImageDescriptionValue(oldField.value)
      : null;

    if (oldValue?.image_url && oldValue.image_url.startsWith('/uploads/')) {
      const oldImagePath = path.join(__dirname, '..', oldValue.image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    nextCustomFields[fieldId] = {
      ...field,
      value: {
        ...previousValue,
        image_url: `/uploads/specimens/${uploadedFile.filename}`,
      },
    };
  });

  return nextCustomFields;
};

// CREATE
exports.createMicrobial = async (req, res) => {
  try {
    const incomingCodeName = String(req.body.code_name || '').trim();
    if (!incomingCodeName) {
      return res.status(400).json({ error: 'Specimen code is required.' });
    }

    const duplicate = await findSpecimenDuplicate(incomingCodeName);
    if (duplicate) {
      return res.status(409).json({ error: 'Specimen code already exists. Use a unique specimen code.' });
    }

    // Handle file uploads (image and FASTA)
    let image_url = req.body.image_url || '';
    let fasta_file = '';
    let fasta_sequence = '';
    
    if (req.files) {
      // Handle image upload
      if (req.files.image && req.files.image[0]) {
        image_url = `/uploads/specimens/${req.files.image[0].filename}`;
      }
      
      // Handle FASTA file upload
      if (req.files.fasta_file && req.files.fasta_file[0]) {
        fasta_file = `/uploads/fasta/${req.files.fasta_file[0].filename}`;
        
        // Read FASTA file content
        const fastaPath = path.join(__dirname, '..', fasta_file);
        try {
          if (fs.existsSync(fastaPath)) {
            fasta_sequence = fs.readFileSync(fastaPath, 'utf8');
          } else {
            console.warn(`FASTA file not found at ${fastaPath}`);
            fasta_sequence = '';
          }
        } catch (readErr) {
          console.error('Failed to read FASTA file:', readErr);
          fasta_sequence = '';
        }
      }
    }

    const extractedAccession = extractAccessionFromFasta(fasta_sequence);
    const providedAccession = (req.body.accession_no || '').trim();

    // Prepare specimen data
    const specimenData = {
      ...req.body,
      image_url: image_url,
      fasta_file: fasta_file,
      fasta_sequence: fasta_sequence,
      accession_no: providedAccession || extractedAccession || req.body.accession_no,
      publish_status: normalizePublishStatus(req.body.publish_status, 'unpublished')
    };

    // Parse JSON fields if they're strings (from multipart form data)
    const jsonFields = ['custom_fields', 'biochemical_tests', 'morphology'];
    jsonFields.forEach(field => {
      if (typeof specimenData[field] === 'string') {
        try {
          specimenData[field] = JSON.parse(specimenData[field]);
        } catch (e) {
          // Leave as is if not valid JSON
        }
      }
    });

    specimenData.custom_fields = applyCustomImageUploads({
      customFields: specimenData.custom_fields,
      customImageMapRaw: req.body.custom_image_map,
      uploadedCustomImages: req.files?.custom_images || [],
      oldCustomFields: null,
    });
    delete specimenData.custom_image_map;

    const microbial = new MicrobialInfo(specimenData);
    await microbial.save();

    // Generate QR code for the specimen
    const qrData = await generateSpecimenQRCode(microbial._id);
    
    // Update specimen with QR code
    microbial.qr_code = qrData.qrCodeDataUrl;
    await microbial.save();
    
    // Populate project data before returning
    await microbial.populate('project_id');

    await logCollectionActivity({
      req,
      specimen: microbial,
      action: 'create',
      status: microbial.publish_status || 'unpublished',
    });
    
    res.status(201).json({
      ...microbial.toObject(),
      qr_url: qrData.verificationUrl
    });
  } catch (err) {
    console.error(err);
    // Clean up uploaded files if there was an error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          const filePath = path.join(__dirname, '..', file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
    }
    res.status(500).json({ error: 'Failed to create microbial info', details: err.message });
  }
};

// GENERATE QR CODE for specimen
const generateSpecimenQRCode = async (specimenId) => {
  // Generate unique token for the specimen
  const qrToken = crypto.randomBytes(16).toString('hex');
  
  // Create role-resolved scan URL.
  const baseUrl = (process.env.FRONTEND_URL || 'https://testbiocella.dcism.org').replace(/\/+$/, '');
  const verificationUrl = `${baseUrl}/scan/specimen/${specimenId}?token=${qrToken}`;
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
  
  return { qrToken, qrCodeDataUrl, verificationUrl };
};

// READ ALL
exports.getMicrobials = async (req, res) => {
  try {
    const filter = buildVisibilityFilter(req);
    const microbials = await MicrobialInfo.find(filter).populate('project_id');
    res.json(microbials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch microbial info' });
  }
};

// PUBLIC HOMEPAGE STATS
exports.getPublicStats = async (_req, res) => {
  try {
    const [studentRows] = await db.execute(
      "SELECT COUNT(*) AS count FROM user WHERE role = 'student'"
    );

    const totalSpecimens = await MicrobialInfo.countDocuments(publishedFilter);

    const specimenTypesRaw = await MicrobialInfo.aggregate([
      {
        $match: publishedFilter,
      },
      {
        $project: {
          specimenType: {
            $trim: {
              input: {
                $ifNull: ['$classification', 'Unknown'],
              },
            },
          },
        },
      },
      {
        $addFields: {
          specimenType: {
            $cond: [{ $eq: ['$specimenType', ''] }, 'Unknown', '$specimenType'],
          },
        },
      },
      {
        $group: {
          _id: '$specimenType',
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
          _id: 1,
        },
      },
    ]);

    const specimenTypes = specimenTypesRaw.map((item) => ({
      type: item._id,
      count: item.count,
    }));

    res.json({
      carolinianCount: Number(studentRows?.[0]?.count || 0),
      totalSpecimens,
      specimenTypes,
    });
  } catch (err) {
    console.error('Failed to fetch public stats:', err);
    res.status(500).json({ error: 'Failed to fetch public stats' });
  }
};

// READ ONE
exports.getMicrobialById = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id).populate('project_id');
    if (!microbial) return res.status(404).json({ error: 'Not found' });

    const status = normalizePublishStatus(microbial.publish_status, 'published');
    if (status === 'unpublished' && !canViewUnpublished(req)) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(microbial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch microbial info' });
  }
};

// UPDATE
exports.updateMicrobial = async (req, res) => {
  try {
    // Handle file uploads if new files are provided
    let updateData = { ...req.body };
    const oldSpecimen = await MicrobialInfo.findById(req.params.id);
    if (!oldSpecimen) return res.status(404).json({ error: 'Not found' });

    const hasIncomingCodeName = Object.prototype.hasOwnProperty.call(updateData, 'code_name');
    const incomingCodeName = String(updateData.code_name || '').trim();
    if (hasIncomingCodeName && !incomingCodeName) {
      return res.status(400).json({ error: 'Specimen code is required.' });
    }

    const effectiveCodeName = incomingCodeName || String(oldSpecimen.code_name || '').trim();
    const duplicate = await findSpecimenDuplicate(effectiveCodeName, req.params.id);
    if (duplicate) {
      return res.status(409).json({ error: 'Specimen code already exists. Use a unique specimen code.' });
    }
    
    if (req.files) {
      // Handle new image upload
      if (req.files.image && req.files.image[0]) {
        // Delete old image if exists
        if (oldSpecimen && oldSpecimen.image_url && oldSpecimen.image_url.startsWith('/uploads/')) {
          const oldImagePath = path.join(__dirname, '..', oldSpecimen.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updateData.image_url = `/uploads/specimens/${req.files.image[0].filename}`;
      }
      
      // Handle new FASTA file upload
      if (req.files.fasta_file && req.files.fasta_file[0]) {
        // Delete old FASTA file if exists
        if (oldSpecimen && oldSpecimen.fasta_file && oldSpecimen.fasta_file.startsWith('/uploads/')) {
          const oldFastaPath = path.join(__dirname, '..', oldSpecimen.fasta_file);
          if (fs.existsSync(oldFastaPath)) {
            fs.unlinkSync(oldFastaPath);
          }
        }
        
        updateData.fasta_file = `/uploads/fasta/${req.files.fasta_file[0].filename}`;

        // Read new FASTA file content safely
        const fastaPath = path.join(__dirname, '..', updateData.fasta_file);
        try {
          if (fs.existsSync(fastaPath)) {
            updateData.fasta_sequence = fs.readFileSync(fastaPath, 'utf8');
            const extractedAccession = extractAccessionFromFasta(updateData.fasta_sequence);
            const providedAccession = (updateData.accession_no || '').trim();
            if (!providedAccession && extractedAccession) {
              updateData.accession_no = extractedAccession;
            }
          } else {
            console.warn(`Uploaded FASTA missing at ${fastaPath}`);
            updateData.fasta_sequence = '';
          }
        } catch (readErr) {
          console.error('Failed to read uploaded FASTA file:', readErr);
          updateData.fasta_sequence = '';
        }
      }
    }

    // Parse JSON fields if they're strings (from multipart form data)
    const jsonFields = ['custom_fields', 'biochemical_tests', 'morphology'];
    jsonFields.forEach(field => {
      if (typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (e) {
          // Leave as is if not valid JSON
        }
      }
    });

    const hasCustomFieldsPayload = Object.prototype.hasOwnProperty.call(updateData, 'custom_fields');
    const hasCustomImageUploads = (req.files?.custom_images || []).length > 0;

    if (hasCustomFieldsPayload || hasCustomImageUploads) {
      updateData.custom_fields = applyCustomImageUploads({
        customFields: updateData.custom_fields,
        customImageMapRaw: req.body.custom_image_map,
        uploadedCustomImages: req.files?.custom_images || [],
        oldCustomFields: oldSpecimen?.custom_fields || null,
      });
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'publish_status')) {
      updateData.publish_status = normalizePublishStatus(updateData.publish_status, 'unpublished');
    }

    const previousPublishStatus = normalizePublishStatus(oldSpecimen?.publish_status, 'unpublished');
    const nextPublishStatus = Object.prototype.hasOwnProperty.call(updateData, 'publish_status')
      ? normalizePublishStatus(updateData.publish_status, previousPublishStatus)
      : previousPublishStatus;
    const isPublishChange = previousPublishStatus !== nextPublishStatus;
    const activityAction = isPublishChange
      ? (nextPublishStatus === 'published' ? 'publish' : 'unpublish')
      : 'update';

    delete updateData.custom_image_map;
    
    // Update timestamp
    updateData.updated_at = Date.now();

    const updated = await MicrobialInfo.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('project_id');
    
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await logCollectionActivity({
      req,
      specimen: updated,
      action: activityAction,
      status: nextPublishStatus,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    // Clean up uploaded files if there was an error
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          const filePath = path.join(__dirname, '..', file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
    }
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};

// DELETE
exports.deleteMicrobial = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) return res.status(404).json({ error: 'Not found' });
    
    // Delete associated image if exists
    if (microbial.image_url && microbial.image_url.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', microbial.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete associated FASTA file if exists
    if (microbial.fasta_file && microbial.fasta_file.startsWith('/uploads/')) {
      const fastaPath = path.join(__dirname, '..', microbial.fasta_file);
      if (fs.existsSync(fastaPath)) {
        fs.unlinkSync(fastaPath);
      }
    }

    await logCollectionActivity({
      req,
      specimen: microbial,
      action: 'delete',
      status: normalizePublishStatus(microbial.publish_status, 'unpublished'),
    });
    
    await MicrobialInfo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};

// BLAST INTEGRATION

// Submit FASTA sequence to NCBI BLAST
exports.submitBlast = async (req, res) => {
  try {
    console.log('📤 BLAST submission request for specimen:', req.params.id);
    
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) {
      console.error('❌ Specimen not found:', req.params.id);
      return res.status(404).json({ error: 'Specimen not found' });
    }
    
    if (!microbial.fasta_sequence) {
      console.error('❌ No FASTA sequence for specimen:', microbial.code_name);
      return res.status(400).json({ error: 'No FASTA sequence available for this specimen' });
    }

    const EMAIL = process.env.EMAIL_USER || '22102959@usc.edu.ph';
    const TOOL = 'biocella-backend';

    console.log('📝 Preparing NCBI BLAST submission for:', microbial.code_name);
    console.log('📊 FASTA length:', microbial.fasta_sequence.length);
    
    // Validate and clean FASTA sequence
    const fastaValidation = validateAndCleanFasta(microbial.fasta_sequence);
    
    if (!fastaValidation.isValid) {
      console.error('❌ FASTA validation failed:', fastaValidation.errors);
      return res.status(400).json({ 
        error: 'Invalid FASTA sequence',
        details: fastaValidation.errors.join('; '),
        warnings: fastaValidation.warnings
      });
    }
    
    // Log validation results
    if (fastaValidation.warnings.length > 0) {
      console.log('⚠️ FASTA warnings:');
      fastaValidation.warnings.forEach(w => console.log('  ', w));
    }
    
    if (fastaValidation.changes.length > 0) {
      console.log('✏️ FASTA changes made:');
      fastaValidation.changes.forEach(c => console.log('  ', c));
    }
    
    const cleanedFasta = fastaValidation.cleaned;

    // Submit to NCBI BLAST using form-url-encoded format
    const params = new URLSearchParams();
    params.append('CMD', 'Put');
    params.append('PROGRAM', fastaValidation.blastProgram);
    params.append('DATABASE', fastaValidation.blastDatabase);
    params.append('QUERY', cleanedFasta);
    params.append('EMAIL', EMAIL);
    params.append('TOOL', TOOL);
    params.append('HITLIST_SIZE', '10');
    params.append('EXPECT', '10');
    params.append('FORMAT_TYPE', 'JSON2');
    
    console.log(`🔬 BLAST Parameters:`);
    console.log(`  - Program: ${fastaValidation.blastProgram.toUpperCase()}`);
    console.log(`  - Database: ${fastaValidation.blastDatabase}`);
    console.log(`  - Sequence Type: ${fastaValidation.seqType.toUpperCase()}`);

    let submitRes;
    try {
      console.log('🌐 Contacting NCBI BLAST servers...');
      console.log('📬 Sending request with headers: Content-Type: application/x-www-form-urlencoded');
      
      submitRes = await axios.post('https://blast.ncbi.nlm.nih.gov/Blast.cgi', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'biocella-backend/1.0'
        },
        timeout: 30000, // 30 second timeout for submission
        maxRedirects: 5
      });
      console.log('✅ NCBI response received');
      console.log('📊 Response status:', submitRes.status);
      console.log('📊 Response headers:', submitRes.headers['content-type']);
    } catch (axiosErr) {
      console.error('❌ NCBI BLAST connection error:', {
        message: axiosErr.message,
        code: axiosErr.code,
        status: axiosErr.response?.status,
        responseData: axiosErr.response?.data?.substring?.(0, 200)
      });
      return res.status(503).json({ 
        error: 'Unable to reach NCBI BLAST servers', 
        details: 'Please try again later. NCBI BLAST services may be temporarily unavailable.',
        ncbiStatus: axiosErr.response?.status
      });
    }

    // Try multiple regex patterns to extract RID
    let rid = null;
    let ridMatch = submitRes.data.match(/RID\s*=\s*([A-Z0-9]+)/);
    if (!ridMatch) ridMatch = submitRes.data.match(/RID=([A-Z0-9]+)/);
    if (!ridMatch) ridMatch = submitRes.data.match(/"RID":"?([A-Z0-9]+)"?/);
    
    rid = ridMatch ? ridMatch[1] : null;

    if (!rid) {
      console.error('❌ Failed to extract RID from BLAST response');
      console.error('📄 Full response length:', submitRes.data.length);
      console.error('📄 Response sample (first 1000 chars):', submitRes.data.substring(0, 1000));
      
      // Check if response contains error messages
      if (submitRes.data.includes('error') || submitRes.data.includes('Error')) {
        const errorMatch = submitRes.data.match(/error[^<]*/i);
        console.error('📄 Detected error in response:', errorMatch?.[0]);
        return res.status(500).json({ 
          error: 'NCBI BLAST returned an error',
          details: 'The BLAST service rejected the request. Please check your sequence and try again.',
          ncbiError: errorMatch?.[0]?.substring(0, 200)
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to get RID from BLAST. Invalid response format.',
        details: 'Response did not contain a valid RID. The request may have been malformed.'
      });
    }

    console.log('✅ RID received:', rid);

    // Save RID to specimen for tracking
    // NCBI BLAST RIDs expire after 24-36 hours, we'll use 36 hours to be safe
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 36);
    
    try {
      microbial.blast_rid = rid;
      microbial.blast_rid_expired_at = expirationTime;
      await microbial.save();
      console.log('✅ RID saved to database for specimen:', microbial.code_name);
    } catch (saveErr) {
      console.error('❌ Failed to save RID to database:', saveErr.message);
      return res.status(500).json({ 
        error: 'BLAST submitted to NCBI but failed to save tracking information',
        rid: rid,
        details: 'RID: ' + rid + ' (save to database failed)'
      });
    }

    console.log('✅ BLAST submitted for specimen:', microbial.code_name, 'RID:', rid, 'Expires at:', expirationTime);
    
    res.json({ 
      message: 'BLAST submitted successfully',
      rid,
      status: 'pending',
      estimatedTime: '30-60 seconds',
      expiresAt: expirationTime,
      fastaValidation: {
        sequence_type: fastaValidation.seqType.toUpperCase(),
        blast_program: fastaValidation.blastProgram.toUpperCase(),
        database: fastaValidation.blastDatabase,
        original_length: microbial.fasta_sequence.length,
        cleaned_length: cleanedFasta.length,
        warnings: fastaValidation.warnings,
        changes: fastaValidation.changes
      }
    });

  } catch (err) {
    console.error('❌ BLAST submission error:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    res.status(500).json({ 
      error: 'BLAST submission failed',
      details: err.message,
      code: err.code
    });
  }
};

// Get BLAST results for a specimen
exports.getBlastResults = async (req, res) => {
  try {
    console.log('🔍 BLAST results check for specimen:', req.params.id);
    
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) {
      console.error('❌ Specimen not found:', req.params.id);
      return res.status(404).json({ error: 'Specimen not found' });
    }
    
    if (!microbial.blast_rid) {
      console.warn('⚠️ No BLAST submission found for specimen:', microbial.code_name);
      return res.status(400).json({ error: 'No BLAST submission found for this specimen' });
    }

    console.log('📋 Checking RID:', microbial.blast_rid, 'for specimen:', microbial.code_name);

    const EMAIL = process.env.EMAIL_USER || '22102959@usc.edu.ph';
    const TOOL = 'biocella-backend';

    let statusCheck;
    try {
      console.log('🌐 Contacting NCBI for status...');
      statusCheck = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
        params: {
          CMD: 'Get',
          FORMAT_OBJECT: 'SearchInfo',
          RID: microbial.blast_rid,
          EMAIL,
          TOOL
        },
        timeout: 20000 // 20 second timeout
      });
      
      console.log('✅ BLAST status response received for RID:', microbial.blast_rid);
      console.log('📊 Response length:', statusCheck.data.length);
    } catch (axiosErr) {
      console.error('❌ NCBI status check timeout or error:', {
        message: axiosErr.message,
        code: axiosErr.code,
        status: axiosErr.response?.status
      });
      return res.json({ 
        status: 'pending', 
        message: 'NCBI server is slow or unreachable. Please try again in a moment.' 
      });
    }

    // Try multiple patterns to extract status
    let status = statusCheck.data.match(/Status\s*=\s*([A-Z]+)/);
    if (!status) status = statusCheck.data.match(/Status=([A-Z]+)/);
    if (!status) status = statusCheck.data.match(/"status":"?([A-Z]+)"?/i);
    
    console.log('📊 Parsed BLAST status:', status ? status[1] : 'NO_STATUS_FOUND');
    
    // Check if RID is expired or not found (NCBI returns UNKNOWN or empty status)
    if (!status) {
      console.log('⚠️ No status found in NCBI response - RID likely expired:', microbial.blast_rid);
      // Check for common expired/not found messages
      if (statusCheck.data.includes('expired') || statusCheck.data.includes('not found') || statusCheck.data.includes('UNKNOWN')) {
        // Mark as expired now if not already set
        if (!microbial.blast_rid_expired_at || microbial.blast_rid_expired_at > new Date()) {
          microbial.blast_rid_expired_at = new Date();
          await microbial.save();
          console.log('📝 Updated expired_at timestamp for expired RID:', microbial.blast_rid);
        }
        return res.json({ 
          status: 'expired', 
          message: 'BLAST request has expired (RIDs are valid for 24-36 hours). Please re-submit the BLAST search.' 
        });
      }
      return res.json({ status: 'pending', message: 'Unable to determine BLAST status. Please try again.' });
    }
    
    // Also check for UNKNOWN status explicitly
    if (status[1] === 'UNKNOWN') {
      if (!microbial.blast_rid_expired_at || microbial.blast_rid_expired_at > new Date()) {
        microbial.blast_rid_expired_at = new Date();
        await microbial.save();
        console.log('📝 Updated expired_at timestamp for UNKNOWN RID:', microbial.blast_rid);
      }
      return res.json({ 
        status: 'expired', 
        message: 'BLAST request ID is no longer valid. Please re-submit the BLAST search.' 
      });
    }
    
    if (status[1] === 'WAITING') {
      return res.json({ status: 'pending', message: 'BLAST search is still running' });
    }

    if (status[1] === 'FAILED') {
      return res.json({ status: 'failed', message: 'BLAST search failed' });
    }

    if (status[1] === 'UNKNOWN') {
      console.log('BLAST RID status is UNKNOWN - likely expired:', microbial.blast_rid);
      return res.json({ 
        status: 'expired', 
        message: 'BLAST request not found or has expired. Please re-submit the BLAST search.' 
      });
    }

    if (status[1] === 'READY') {
      let resultRes;
      let jsonData;
      
      try {
        // Get results with timeout - NCBI may return ZIP or JSON
        resultRes = await axios.get('https://blast.ncbi.nlm.nih.gov/Blast.cgi', {
          params: {
            CMD: 'Get',
            FORMAT_TYPE: 'JSON2',
            RID: microbial.blast_rid,
            EMAIL,
            TOOL
          },
          timeout: 25000, // 25 second timeout for results (larger files)
          responseType: 'arraybuffer', // Get binary data to handle both ZIP and JSON
          headers: {
            'Accept': 'application/json, application/zip'
          }
        });
      } catch (axiosErr) {
        console.error('NCBI results fetch timeout or error:', axiosErr.message);
        return res.json({ 
          status: 'error', 
          message: 'Failed to download results from NCBI. The results are ready but the server timed out. Please try again.' 
        });
      }

      const contentType = resultRes.headers['content-type'] || '';
      console.log('BLAST results received, content type:', contentType);
      console.log('Response data type:', typeof resultRes.data);
      
      // Handle ZIP file response (NCBI sometimes returns compressed JSON)
      if (contentType.includes('application/zip') || contentType.includes('application/x-zip')) {
        console.log('Detected ZIP file response, extracting JSON...');
        try {
          const zip = new AdmZip(Buffer.from(resultRes.data));
          const zipEntries = zip.getEntries();
          
          console.log('ZIP contains', zipEntries.length, 'files');
          
          // Try to find the main results file first (e.g., RIDNUMBER_1.json)
          // NCBI structure: RIDNUMBER.json (reference file) and RIDNUMBER_1.json (actual results)
          let jsonEntry = zipEntries.find(entry => 
            entry.entryName.endsWith('_1.json') || entry.entryName.endsWith('_1.JSON')
          );
          
          // If _1.json not found, try any .json file
          if (!jsonEntry) {
            jsonEntry = zipEntries.find(entry => entry.entryName.endsWith('.json'));
          }
          
          if (!jsonEntry) {
            console.error('No JSON file found in ZIP archive');
            return res.json({ 
              status: 'error', 
              message: 'NCBI returned compressed data but no JSON found inside.' 
            });
          }
          
          console.log('Extracting JSON file:', jsonEntry.entryName);
          const jsonString = jsonEntry.getData().toString('utf8');
          jsonData = JSON.parse(jsonString);
          console.log('Successfully extracted and parsed JSON from ZIP');
          
        } catch (zipErr) {
          console.error('Error unzipping BLAST results:', zipErr);
          return res.json({ 
            status: 'error', 
            message: 'Failed to extract results from NCBI compressed file. Please try again.' 
          });
        }
      } 
      // Handle direct JSON response
      else if (contentType.includes('application/json')) {
        console.log('Detected direct JSON response');
        try {
          const jsonString = Buffer.from(resultRes.data).toString('utf8');
          jsonData = JSON.parse(jsonString);
        } catch (parseErr) {
          console.error('Error parsing JSON response:', parseErr);
          return res.json({ 
            status: 'error', 
            message: 'Failed to parse JSON response from NCBI.' 
          });
        }
      }
      // Handle string/HTML responses (errors or still processing)
      else {
        const responseString = Buffer.from(resultRes.data).toString('utf8');
        console.error('Unexpected content type:', contentType);
        console.log('First 500 chars of response:', responseString.substring(0, 500));
        
        // Check if it's still processing
        if (responseString.includes('WAITING') || responseString.includes('still being processed')) {
          return res.json({ 
            status: 'pending', 
            message: 'BLAST results are still being processed. Please wait a moment.' 
          });
        }
        
        // Check for error messages
        if (responseString.includes('error') || responseString.includes('Error')) {
          return res.json({ 
            status: 'error', 
            message: 'NCBI returned an error. The results may have expired or are unavailable.' 
          });
        }
        
        return res.json({ 
          status: 'error', 
          message: 'Invalid response format from NCBI. Please try checking results again or re-submit BLAST.' 
        });
      }

      // Validate we have valid JSON data
      if (!jsonData || typeof jsonData !== 'object') {
        console.error('BLAST results is not a valid object:', jsonData);
        return res.json({ 
          status: 'error', 
          message: 'Received invalid data structure from NCBI. Please try again.' 
        });
      }

      // Parse and extract top 10 matches
      const results = parseBlastResults(jsonData);
      
      // Check if parsing succeeded
      if (results.error) {
        console.error('Failed to parse BLAST results:', results.error);
        return res.json({ 
          status: 'error', 
          message: results.error 
        });
      }

      // Save results to specimen
      microbial.blast_results = results;
      if (results.topHit) {
        microbial.similarity_percent = results.topHit.similarity;
        microbial.accession_no = results.topHit.accession;
      }
      await microbial.save();

      console.log(`Successfully saved BLAST results for ${microbial.code_name}: ${results.matches.length} matches`);

      return res.json({
        status: 'completed',
        results: results
      });
    }

    res.json({ status: 'unknown', message: 'Unable to determine BLAST status' });

  } catch (err) {
    console.error('❌ BLAST results error:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      specimen: req.params.id
    });
    res.status(500).json({ 
      error: 'Failed to retrieve BLAST results', 
      details: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function to detect if sequence is protein or nucleotide
function detectSequenceType(sequence) {
  // Extract just the sequence part (remove headers and whitespace)
  const seqLines = sequence.split(/\n/).filter(line => !line.startsWith('>') && line.trim().length > 0);
  const seqContent = seqLines.join('').toUpperCase().replace(/\s+/g, '');
  
  if (seqContent.length === 0) return null;

  const nucleotideSet = new Set(['A', 'T', 'G', 'C', 'U', 'R', 'Y', 'S', 'W', 'K', 'M', 'B', 'D', 'H', 'V', 'N', '-', '.']);
  // Include ambiguous/rare amino acids that NCBI BLAST can accept.
  const proteinSet = new Set(['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y', 'B', 'Z', 'X', 'J', 'O', 'U', '*', '-']);

  let proteinOnlyCount = 0;
  let nucleotideLikeCount = 0;
  let proteinLikeCount = 0;

  for (const ch of seqContent) {
    const isNucleotide = nucleotideSet.has(ch);
    const isProtein = proteinSet.has(ch);

    if (isNucleotide) nucleotideLikeCount++;
    if (isProtein) proteinLikeCount++;
    if (isProtein && !isNucleotide) proteinOnlyCount++;
  }

  // Any true amino-acid-only symbols (e.g., E, F, I, L, P, Q, Z, X, J, O, *) indicate protein input.
  if (proteinOnlyCount > 0) {
    return 'protein';
  }

  // Strong nucleotide signal defaults to nucleotide.
  if (nucleotideLikeCount >= seqContent.length * 0.9) {
    return 'nucleotide';
  }

  // Fallback: if more protein-like than nucleotide-like symbols, treat as protein.
  if (proteinLikeCount > nucleotideLikeCount) {
    return 'protein';
  }

  return 'nucleotide';
}

// Helper function to select appropriate BLAST program based on sequence types and options
function selectBlastProgram(queryType, options = {}) {
  const searchProteinDb = options.searchProteinDb !== false; // Default true
  const searchNucleotideDb = options.searchNucleotideDb !== false; // Default true
  
  // BLAST programs priority (by clarity and speed):
  // Protein query + Protein DB = BLASTP
  // Nucleotide query + Nucleotide DB = BLASTN
  // Nucleotide query + Protein DB = BLASTX (translate nucleotide to protein)
  // Protein query + Nucleotide DB = TBLASTN (search against translated nucleotide)
  // Nucleotide query + Nucleotide DB (translated) = TBLASTX (both translated)
  
  if (queryType === 'protein') {
    if (searchProteinDb) {
      return { program: 'blastp', database: 'nr', description: 'Protein query vs protein database' };
    } else if (searchNucleotideDb) {
      return { program: 'tblastn', database: 'nt', description: 'Protein query vs translated nucleotide database' };
    }
  } else {
    // nucleotide query
    // Prefer blastn/nt for typical FASTA uploads to maximize NCBI compatibility.
    if (searchNucleotideDb) {
      return { program: 'blastn', database: 'nt', description: 'Nucleotide query vs nucleotide database' };
    } else if (searchProteinDb) {
      return { program: 'blastx', database: 'nr', description: 'Translated nucleotide query vs protein database' };
    }
  }
  
  // Fallback
  return { program: queryType === 'protein' ? 'blastp' : 'blastn', 
           database: queryType === 'protein' ? 'nr' : 'nt',
           description: queryType === 'protein' ? 'Protein BLAST' : 'Nucleotide BLAST' };
}

// Helper function to validate and clean FASTA sequences for BLAST compatibility
function validateAndCleanFasta(fastaSequence) {
  console.log('🧬 Validating and cleaning FASTA sequence...');
  console.log('📊 Original length:', fastaSequence.length);
  
  const result = {
    isValid: false,
    cleaned: fastaSequence,
    seqType: null,
    blastProgram: null,
    blastDatabase: null,
    blastDescription: null,
    warnings: [],
    errors: [],
    changes: []
  };
  
  if (!fastaSequence || typeof fastaSequence !== 'string') {
    result.errors.push('FASTA sequence is not a string');
    return result;
  }
  
  let cleaned = fastaSequence.trim();
  
  // Detect sequence type BEFORE cleaning
  const detectedType = detectSequenceType(cleaned);
  if (!detectedType) {
    result.errors.push('Unable to detect sequence type from FASTA content');
    return result;
  }
  result.seqType = detectedType;
  
  // Select appropriate BLAST program
  const blastConfig = selectBlastProgram(detectedType);
  result.blastProgram = blastConfig.program;
  result.blastDatabase = blastConfig.database;
  result.blastDescription = blastConfig.description;
  
  console.log(`🧬 Detected sequence type: ${result.seqType.toUpperCase()}`);
  console.log(`🔬 Selected BLAST program: ${result.blastProgram.toUpperCase()}`);
  console.log(`📊 Database: ${result.blastDatabase}`);
  console.log(`📝 ${result.blastDescription}`);
  
  // Check for FASTA header
  if (!cleaned.includes('>')) {
    result.errors.push('No FASTA header found (missing >)');
    result.changes.push('Added auto-generated FASTA header');
    cleaned = '>sequence\n' + cleaned;
  }
  
  // Split into lines for processing
  const lines = cleaned.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    result.errors.push('FASTA sequence is empty');
    return result;
  }
  
  // Separate headers from sequence
  const processedLines = [];
  let inSequence = false;
  let currentEntryLength = 0;
  let totalSequenceLength = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('>')) {
      if (inSequence && currentEntryLength === 0) {
        result.warnings.push(`Header at line ${i + 1} found with no sequence before it`);
      }
      
      // Validate header format
      if (line.length > 1) {
        processedLines.push(line);
        inSequence = true;
        currentEntryLength = 0;
      } else {
        result.errors.push(`Invalid header at line ${i + 1}: header is too short`);
      }
    } else {
      // This is a sequence line
      if (!inSequence) {
        result.warnings.push(`Sequence data at line ${i + 1} before any header. Treating as sequence.`);
        inSequence = true;
      }
      
      // Clean sequence based on type and allow mixed characters
      let cleanedSeq = line.toUpperCase();
      
      // Try to detect if this line is protein or nucleotide
      const proteinChars = (cleanedSeq.match(/[EFIPQZ]/gi) || []).length;
      const isProteinLine = proteinChars > cleanedSeq.length * 0.05;
      
      let validPattern;
      if (result.seqType === 'protein' || isProteinLine) {
        // Protein: Allow standard plus ambiguous/rare amino acid symbols.
        validPattern = /[ACDEFGHIKLMNPQRSTVWYBXZJOU\*\-]/gi;
      } else {
        // Nucleotide: Allow IUPAC codes
        validPattern = /[ATGCNRYSWKMBDHVU\-]/gi;
      }
      
      // Extract valid characters
      const matches = cleanedSeq.match(validPattern) || [];
      const invalidChars = cleanedSeq.match(new RegExp(`[^${validPattern.source}]`, 'gi')) || [];
      
      if (invalidChars.length > 0) {
        const uniqueInvalid = [...new Set(invalidChars)];
        result.warnings.push(`Line ${i + 1}: Removed invalid characters: ${uniqueInvalid.join(', ')}`);
        cleanedSeq = matches.join('');
      }
      
      if (cleanedSeq.length > 0) {
        // Wrap long lines to 60 characters per line (standard FASTA format)
        for (let j = 0; j < cleanedSeq.length; j += 60) {
          processedLines.push(cleanedSeq.substring(j, j + 60));
        }
        currentEntryLength += cleanedSeq.length;
        totalSequenceLength += cleanedSeq.length;
      }
    }
  }
  
  // Final validation
  if (totalSequenceLength === 0) {
    result.errors.push('No valid sequence data found after cleaning');
    return result;
  }
  
  const minLength = result.seqType === 'protein' ? 20 : 30;
  if (totalSequenceLength < minLength) {
    result.errors.push(`Sequence is too short (${totalSequenceLength} ${result.seqType}). Minimum ${minLength} required for BLAST.`);
    return result;
  }
  
  if (totalSequenceLength > 5000000) {
    result.warnings.push(`Sequence is very long (${totalSequenceLength} characters). BLAST may take longer to process.`);
  }
  
  // Reconstruct cleaned FASTA
  result.cleaned = processedLines.join('\n');
  result.isValid = true;
  
  console.log('✅ FASTA validation complete:');
  console.log(`  - Sequence type: ${result.seqType.toUpperCase()}`);
  console.log(`  - BLAST program: ${result.blastProgram.toUpperCase()}`);
  console.log(`  - Database: ${result.blastDatabase.toUpperCase()} (${result.blastDatabase === 'nr' ? 'Non-redundant protein' : 'Nucleotide collection'})`);
  console.log('  - Original length:', fastaSequence.length);
  console.log('  - Cleaned sequence length:', totalSequenceLength);
  console.log('  - Warnings:', result.warnings.length);
  console.log('  - Errors:', result.errors.length);
  console.log('  - Changes made:', result.changes.length);
  
  if (result.warnings.length > 0) {
    result.changes.push('Ⓘ Warnings detected - reviewed and handled:', result.warnings.slice(0, 3).join('; '));
  }
  
  return result;
}

// Extract accession IDs from FASTA headers when present.
function extractAccessionFromFasta(fastaSequence) {
  if (!fastaSequence || typeof fastaSequence !== 'string') {
    return '';
  }

  const lines = fastaSequence.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('>')) {
      continue;
    }

    const header = line.slice(1).trim();
    if (!header) {
      continue;
    }

    // NCBI-style pipe headers: gi|...|ref|NC_000913.3| or gb|MN908947.3|
    const pipeTokens = header.split('|').map(t => t.trim()).filter(Boolean);
    const pipeAccession = pipeTokens.find(token => /^[A-Z]{1,4}_[A-Z0-9]+(?:\.[0-9]+)?$/i.test(token) || /^[A-Z]{1,3}[0-9]{5,}(?:\.[0-9]+)?$/i.test(token));
    if (pipeAccession) {
      return pipeAccession.toUpperCase();
    }

    // Generic first-token accession in FASTA header.
    const firstToken = header.split(/\s+/)[0] || '';
    if (/^[A-Z]{1,4}_[A-Z0-9]+(?:\.[0-9]+)?$/i.test(firstToken) || /^[A-Z]{1,3}[0-9]{5,}(?:\.[0-9]+)?$/i.test(firstToken)) {
      return firstToken.toUpperCase();
    }
  }

  return '';
}

// Helper function to parse BLAST JSON results
function parseBlastResults(data) {
  try {
    // Log the data structure for debugging
    console.log('Parsing BLAST data, type:', typeof data);
    
    // Validate data structure exists
    if (!data) {
      console.error('BLAST data is null or undefined');
      return { topHit: null, matches: [], totalHits: 0, error: 'No data received' };
    }

    // Handle different NCBI response formats
    // Some responses have BlastJSON wrapper, others have BlastOutput2 directly
    let blastData = data;
    
    if (data.BlastJSON) {
      console.log('Detected BlastJSON wrapper, extracting inner data');
      blastData = data.BlastJSON;
    }

    if (!blastData.BlastOutput2) {
      console.error('Missing BlastOutput2 in response. Data keys:', Object.keys(blastData));
      return { topHit: null, matches: [], totalHits: 0, error: 'Invalid BLAST response format' };
    }

    // Handle both array and object formats
    // Format 1: { BlastOutput2: [{ report: {...} }] }
    // Format 2: { BlastOutput2: { report: {...} } }
    let report;
    if (Array.isArray(blastData.BlastOutput2)) {
      if (blastData.BlastOutput2.length === 0) {
        console.error('BlastOutput2 array is empty');
        return { topHit: null, matches: [], totalHits: 0, error: 'Empty BLAST response' };
      }
      console.log('BlastOutput2 is an array, using first element');
      report = blastData.BlastOutput2[0].report;
    } else if (typeof blastData.BlastOutput2 === 'object') {
      console.log('BlastOutput2 is an object, using directly');
      report = blastData.BlastOutput2.report;
    } else {
      console.error('BlastOutput2 has unexpected type:', typeof blastData.BlastOutput2);
      return { topHit: null, matches: [], totalHits: 0, error: 'Invalid BlastOutput2 format' };
    }

    if (!report) {
      console.error('Missing report in BlastOutput2');
      return { topHit: null, matches: [], totalHits: 0, error: 'Missing report data' };
    }

    const results = report.results;
    if (!results) {
      console.error('Missing results in report');
      return { topHit: null, matches: [], totalHits: 0, error: 'Missing results data' };
    }

    if (!results.search) {
      console.error('Missing search in results');
      return { topHit: null, matches: [], totalHits: 0, error: 'Missing search data' };
    }

    if (!results.search.hits || !Array.isArray(results.search.hits) || results.search.hits.length === 0) {
      console.log('No BLAST hits found in search results');
      return { topHit: null, matches: [], totalHits: 0 };
    }

    const allHits = results.search.hits;
    const hits = allHits.slice(0, 10); // Top 10
    
    const matches = hits.map((hit, index) => {
      // Defensive checks for each hit
      if (!hit.hsps || !hit.hsps[0]) {
        console.warn(`Hit ${index} missing HSP data, skipping`);
        return null;
      }

      if (!hit.description || !hit.description[0]) {
        console.warn(`Hit ${index} missing description data, skipping`);
        return null;
      }

      const hsp = hit.hsps[0]; // Best HSP (High-scoring Segment Pair)
      const similarity = ((hsp.identity / hsp.align_len) * 100).toFixed(2);
      
      return {
        accession: hit.description[0].accession || 'Unknown',
        title: hit.description[0].title || 'No title available',
        similarity: parseFloat(similarity),
        evalue: hsp.evalue || 0,
        score: hsp.bit_score || 0,
        identity: hsp.identity || 0,
        alignLength: hsp.align_len || 0,
        queryFrom: hsp.query_from || 0,
        queryTo: hsp.query_to || 0,
        hitFrom: hsp.hit_from || 0,
        hitTo: hsp.hit_to || 0
      };
    }).filter(match => match !== null); // Remove any null entries

    console.log(`BLAST parsing complete: Found ${allHits.length} total hits, returning ${matches.length} valid matches`);
    
    return {
      topHit: matches[0] || null,
      matches: matches,
      totalHits: allHits.length
    };
  } catch (err) {
    console.error('Error parsing BLAST results:', err);
    console.error('Error stack:', err.stack);
    return { topHit: null, matches: [], totalHits: 0, error: `Failed to parse results: ${err.message}` };
  }
}
