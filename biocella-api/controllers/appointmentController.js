const Appointment = require("../models/appointmentModel");

// Safely import email config - don't crash if it fails
let sendEmail;
try {
  sendEmail = require('../config/email').sendEmail;
} catch (error) {
  console.error('⚠️  Warning: Failed to load email config. Email notifications will not be sent.');
  console.error('Error details:', error.message);
  // Provide a dummy sendEmail function that doesn't crash
  sendEmail = async (options) => {
    console.warn('Email sending not available:', options.subject);
    return { messageId: 'DUMMY' };
  };
}

const autoExpireOngoingAppointments = async () => {
  try {
    const expiredCount = await Appointment.expireOldAppointments();
    if (expiredCount > 0) {
      console.log(`⏰ Auto-marked ${expiredCount} appointment(s) as no-show`);
    }
  } catch (error) {
    console.error('⚠️ Failed to auto-expire ongoing appointments:', error.message);
  }
};

const autoDenyPastPendingAppointments = async () => {
  try {
    const deniedAppointments = await Appointment.autoDenyPastPendingAppointments();
    if (!deniedAppointments || deniedAppointments.length === 0) return 0;

    console.log(`📋 Auto-denied ${deniedAppointments.length} past pending appointment(s)`);

    // Notify each affected user if we have an email
    for (const appt of deniedAppointments) {
      try {
        const appointmentDate = new Date(appt.date);
        const formattedDate = appointmentDate.toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
        });

        const identityLabel = appt.student_id
          ? `<p><strong>Student ID:</strong> ${appt.student_id}</p>`
          : appt.requester_name
          ? `<p><strong>Visitor Name:</strong> ${appt.requester_name}</p>`
          : '';

        const recipientEmail = appt.user_email || appt.requester_email;
        if (!recipientEmail) continue;

        await sendEmail({
          to: recipientEmail,
          subject: 'Appointment Request Denied - Biocella',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f44336;">Your appointment request has been denied</h2>
              <p><strong>Requested Date:</strong> ${formattedDate}</p>
              <p><strong>Department:</strong> ${getAppointmentDepartment(appt)}</p>
              <p><strong>Purpose:</strong> ${appt.purpose}</p>
              ${identityLabel}
              <hr>
              <p><strong>Reason:</strong> ${appt.denial_reason}</p>
              <p>Please contact us if you have any questions or would like to reschedule.</p>
            </div>
          `
        }).catch(emailErr => {
          console.error('📧 Auto-deny email failed for', recipientEmail, emailErr.message || emailErr);
        });
      } catch (err) {
        console.error('⚠️ Error notifying about auto-deny for appointment:', appt.appointment_id, err.message || err);
      }
    }

    return deniedAppointments.length;
  } catch (error) {
    console.error('⚠️ Failed to auto-deny past pending appointments:', error.message);
    return 0;
  }
};

const hasAppointmentElapsed = (appointment) => {
  const endCandidate = appointment.end_time
    ? new Date(appointment.end_time)
    : new Date(new Date(appointment.date).getTime() + (60 * 60 * 1000));

  if (Number.isNaN(endCandidate.getTime())) {
    return false;
  }

  return endCandidate.getTime() < Date.now();
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
};

const isValidEmail = (value = '') => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
};

const getAppointmentDepartment = (appointment) => {
  return appointment.department || appointment.user_department || 'N/A';
};

const STANDARD_CANCELLATION_LEAD_HOURS = Number(process.env.APPOINTMENT_CANCELLATION_LEAD_HOURS || 24);

const isEmergencyCancellation = (value) => {
  return value === true || value === 1 || String(value).toLowerCase() === 'true';
};

// CREATE
exports.create = async (req, res) => {
  try {
    console.log('[DEBUG] Create appointment - req.body:', JSON.stringify(req.body, null, 2));

    const appointmentSource =
      String(req.body.appointment_source || 'internal').toLowerCase() === 'outsider'
        ? 'outsider'
        : 'internal';

    const payload = {
      ...req.body,
      appointment_source: appointmentSource,
      requester_name: null,
      requester_email: null,
      requester_phone: null,
      requester_ip: null
    };

    if (appointmentSource === 'outsider') {
      const requesterName = String(req.body.requester_name || '').trim();
      const requesterEmail = String(req.body.requester_email || '').trim().toLowerCase();
      const requesterPhone = String(req.body.requester_phone || '').trim();
      const honeypot = String(req.body.website || '').trim();
      const clientIp = getClientIp(req);

      if (honeypot) {
        return res.status(400).json({ error: 'Invalid appointment payload' });
      }

      if (!requesterName || !requesterEmail) {
        return res.status(400).json({
          error: 'Requester name and email are required for outsider appointments.'
        });
      }

      if (!isValidEmail(requesterEmail)) {
        return res.status(400).json({
          error: 'Please provide a valid email address.'
        });
      }

      // Anti-spam guardrails for public booking.
      const [recentByIp, recentByEmail, upcomingByEmail] = await Promise.all([
        Appointment.countRecentOutsiderByIp(clientIp, 15),
        Appointment.countRecentOutsiderByEmail(requesterEmail, 24),
        Appointment.countUpcomingOutsiderByEmail(requesterEmail)
      ]);

      if (recentByIp >= 2) {
        return res.status(429).json({
          error: 'Too many appointment attempts from this network. Please wait 15 minutes before trying again.'
        });
      }

      if (recentByEmail >= 3) {
        return res.status(429).json({
          error: 'Too many requests for this email in the last 24 hours. Please try again tomorrow.'
        });
      }

      if (upcomingByEmail >= 2) {
        return res.status(409).json({
          error: 'This email already has 2 active upcoming outsider appointments. Please wait for one to finish or cancel first.'
        });
      }

      payload.user_id = null;
      payload.student_id = null;
      payload.requester_name = requesterName;
      payload.requester_email = requesterEmail;
      payload.requester_phone = requesterPhone || null;
      payload.requester_ip = clientIp;
      payload.department = payload.department || 'N/A';
    }

    // Reject booking on dates explicitly blocked by admin/RA
    const blockedDate = await Appointment.isDateUnavailable(payload.date);
    if (blockedDate) {
      return res.status(409).json({
        error: "Selected date is unavailable",
        unavailable: true,
        reason: blockedDate.reason || null
      });
    }
    
    // Global conflict check: no overlapping time range is allowed for any user on the same date.
    const hasConflict = await Appointment.checkScheduleConflict(payload.date, payload.end_time, null, null);
    if (hasConflict) {
      return res.status(409).json({ 
        error: "Schedule conflict: This time range is already occupied by another appointment"
      });
    }
    
    const id = await Appointment.createAppointment(payload);
    res.status(201).json({ 
      message: "Appointment request submitted successfully", 
      appointment_id: id 
    });
  } catch (err) {
    console.error('[ERROR] Create appointment error:', err);
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    console.log('📋 Fetching all appointments');
    await autoExpireOngoingAppointments();
    await autoDenyPastPendingAppointments();
    const isSelfScoped = String(req.query?.scope || '').toLowerCase() === 'self';
    const userId = isSelfScoped && req.query?.user_id ? Number(req.query.user_id) : null;
    const studentId = isSelfScoped && req.query?.student_id ? String(req.query.student_id).trim() : null;

    const appointments = await Appointment.getAllAppointments({
      user_id: Number.isFinite(userId) && userId > 0 ? userId : null,
      student_id: studentId || null,
    });
    console.log(`✅ Successfully fetched ${appointments.length} appointments`);
    res.json(appointments);
  } catch (err) {
    console.error('❌ Error fetching appointments:', err);
    res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch appointments from database',
      timestamp: new Date().toISOString()
    });
  }
};

// READ BY STATUS
exports.getByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    await autoExpireOngoingAppointments();
    await autoDenyPastPendingAppointments();
    
    // Validate status parameter to prevent SQL injection and invalid queries
    const validStatuses = ['pending', 'approved', 'denied', 'ongoing', 'visited', 'no_show'];
    if (!validStatuses.includes(status.toLowerCase())) {
      console.warn(`⚠️ Invalid status requested: ${status}`);
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses: validStatuses 
      });
    }
    
    console.log(`📋 Fetching appointments with status: ${status}`);
    const appointments = await Appointment.getAppointmentsByStatus(status);
    console.log(`✅ Found ${appointments.length} appointments with status: ${status}`);
    
    res.json(appointments);
  } catch (err) {
    console.error(`❌ Error fetching appointments by status:`, err);
    res.status(500).json({ 
      error: 'Failed to fetch appointments', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const appointment = await Appointment.getAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const affected = await Appointment.updateAppointment(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// APPROVE APPOINTMENT
exports.approve = async (req, res) => {
  try {
    const appointment = await Appointment.getAppointmentWithUserEmail(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Re-check for global schedule conflicts right before approval to avoid race conditions.
    const hasConflict = await Appointment.checkScheduleConflict(
      appointment.date,
      appointment.end_time,
      appointment.appointment_id,
      null
    );

    if (hasConflict) {
      return res.status(409).json({
        message: "Cannot approve appointment due to schedule conflict with another approved/ongoing appointment."
      });
    }
    
    // Format date properly
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila'
    });
    
    // Generate QR code
    const { qrData, qrCodeDataUrl } = await Appointment.generateQRCode(req.params.id);
    
    // Update status to approved and then ongoing
    await Appointment.updateAppointmentStatus(req.params.id, 'approved', req.body.remarks);
    await Appointment.updateAppointmentStatus(req.params.id, 'ongoing');
    
    const recipientEmail = appointment.user_email || appointment.requester_email;
    const identityLabel = appointment.student_id
      ? `<p><strong>Student ID:</strong> ${appointment.student_id}</p>`
      : appointment.requester_name
      ? `<p><strong>Visitor Name:</strong> ${appointment.requester_name}</p>`
      : '';

    // Send email to user if email exists (but don't crash if it fails)
    if (recipientEmail) {
      // Remove data URL prefix to get just the base64 data
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      
      await sendEmail({
        to: recipientEmail,
        subject: 'Appointment Approved - Biocella',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Your appointment has been approved!</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Department:</strong> ${getAppointmentDepartment(appointment)}</p>
            <p><strong>Purpose:</strong> ${appointment.purpose}</p>
            ${identityLabel}
            ${req.body.remarks ? `<p><strong>Admin Remarks:</strong> ${req.body.remarks}</p>` : ''}
            <hr>
            <h3>Your QR Code:</h3>
            <p>Please present the attached QR code when you arrive at Biocella.</p>
            <p><strong>Important:</strong> Save the QR code image on your phone or print it out to show when you arrive.</p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">QR Code ID: ${qrData}</p>
          </div>
        `,
        attachments: [
          {
            filename: `appointment-${req.params.id}-qrcode.png`,
            content: base64Data,
            encoding: 'base64',
            cid: 'qrcode'
          }
        ]
      }).catch((emailErr) => {
        console.error('📧 Email send failed (non-critical):', emailErr.message || emailErr);
        // Don't throw - email failure is not critical to appointment approval
      });
    }
    
    res.json({ 
      message: "Appointment approved", 
      qrCode: qrCodeDataUrl 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DENY APPOINTMENT
exports.deny = async (req, res) => {
  try {
    const appointment = await Appointment.getAppointmentWithUserEmail(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    
    // Format date properly
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila'
    });
    
    const { reason } = req.body;
    await Appointment.updateAppointmentStatus(req.params.id, 'denied', reason);
    
    const recipientEmail = appointment.user_email || appointment.requester_email;
    const identityLabel = appointment.student_id
      ? `<p><strong>Student ID:</strong> ${appointment.student_id}</p>`
      : appointment.requester_name
      ? `<p><strong>Visitor Name:</strong> ${appointment.requester_name}</p>`
      : '';

    // Send email to user if email exists (but don't crash if it fails)
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: 'Appointment Request Denied - Biocella',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">Your appointment request has been denied</h2>
            <p><strong>Requested Date:</strong> ${formattedDate}</p>
            <p><strong>Department:</strong> ${getAppointmentDepartment(appointment)}</p>
            <p><strong>Purpose:</strong> ${appointment.purpose}</p>
            ${identityLabel}
            <hr>
            <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
            <p>Please contact us if you have any questions or would like to reschedule.</p>
          </div>
        `
      }).catch((emailErr) => {
        console.error('📧 Email send failed (non-critical):', emailErr.message || emailErr);
        // Don't throw - email failure is not critical
      });
    }
    
    res.json({ message: "Appointment denied" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// VERIFY QR CODE (Scan QR)
exports.verifyQR = async (req, res) => {
  try {
    const { qrCode, appointmentId } = req.body;
    
    console.log('🔍 Verifying QR:', { qrCode, appointmentId });
    
    if (!qrCode) {
      return res.status(400).json({ message: "QR code is required" });
    }
    
    let appointment;
    
    // If appointmentId is provided, fetch by ID
    if (appointmentId) {
      const idNum = parseInt(appointmentId, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ message: "Invalid appointment ID format" });
      }
      appointment = await Appointment.getAppointmentById(idNum);
      console.log('📋 Fetched appointment by ID:', appointment);
    } else {
      // Otherwise, look up by QR code token
      appointment = await Appointment.verifyQRCode(qrCode);
      console.log('📋 Fetched appointment by QR token:', appointment);
    }
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Verify QR code token matches
    if (appointment.qr_code !== qrCode) {
      console.warn('❌ QR code mismatch:', { stored: appointment.qr_code, provided: qrCode });
      return res.status(401).json({ message: "Invalid QR code" });
    }

    if (appointment.status === 'ongoing' && hasAppointmentElapsed(appointment)) {
      await Appointment.softDeleteAppointment(appointment.appointment_id);
      return res.status(410).json({
        message: 'Appointment already ended and has been marked as no-show.',
        currentStatus: 'no_show'
      });
    }
    
    // Check if appointment is in ongoing status
    if (appointment.status !== 'ongoing') {
      console.warn('⚠️ Appointment not ongoing:', { status: appointment.status });
      return res.status(400).json({ 
        message: `Cannot verify: Appointment is ${appointment.status}. Only ongoing appointments can be marked as visited.`,
        currentStatus: appointment.status
      });
    }
    
    // Update status to visited
    await Appointment.updateAppointmentStatus(appointment.appointment_id, 'visited');
    console.log('✅ Status updated to visited for appointment:', appointment.appointment_id);
    
    // Fetch updated appointment
    const updatedAppointment = await Appointment.getAppointmentById(appointment.appointment_id);
    
    res.json({ 
      message: "Appointment verified and marked as visited",
      appointment: updatedAppointment
    });
  } catch (err) {
    console.error('❌ QR Verification Error:', err);
    res.status(500).json({ error: err.message || "Failed to verify QR code" });
  }
};

// GET APPOINTMENT BY QR TOKEN (for verification page)
exports.getByQRToken = async (req, res) => {
  try {
    const { token, id } = req.query;
    
    const appointment = await Appointment.getAppointmentById(id);
    
    if (!appointment || appointment.qr_code !== token) {
      return res.status(404).json({ message: "Invalid QR code or appointment not found" });
    }
    
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const affected = await Appointment.deleteAppointment(req.params.id);
    if (!affected) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET AVAILABILITY FOR A DATE (for student calendar)
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required (YYYY-MM-DD)" });
    }
    
    const blockedDate = await Appointment.isDateUnavailable(date);

    // Time slots configuration (9 AM to 4 PM, 1-hour intervals)
    const timeSlots = [
      '09:00', '10:00', '11:00', '12:00', 
      '13:00', '14:00', '15:00', '16:00'
    ];

    // If date is blocked, all slots are unavailable
    if (blockedDate) {
      const unavailableSlots = timeSlots.map(time => ({
        time,
        available: false,
        booked: true
      }));

      return res.json({
        date,
        unavailable: true,
        unavailableReason: null,
        totalSlots: timeSlots.length,
        bookedCount: timeSlots.length,
        availableCount: 0,
        timeSlots: unavailableSlots
      });
    }

    // Get all appointments for this date
    const appointments = await Appointment.getAppointmentsByDate(date);
    
    // Build booked times set - mark ALL hours covered by appointment duration
    const bookedTimes = new Set();
    
    appointments.forEach(appt => {
      const startDate = new Date(appt.date);
      const endDate = appt.end_time ? new Date(appt.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
      
      // Mark all hours from start to end as booked
      let currentHour = startDate.getHours();
      const endHour = endDate.getHours();
      
      // If end_time is exact on the hour, include that hour
      // Otherwise, mark hours up to (but not including) end hour
      const endMinute = endDate.getMinutes();
      let finalEndHour = endMinute === 0 ? endHour : endHour;
      
      while (currentHour < finalEndHour) {
        bookedTimes.add(`${String(currentHour).padStart(2, '0')}:00`);
        currentHour++;
      }
    });
    
    // Build availability status
    const availability = timeSlots.map(time => ({
      time,
      available: !bookedTimes.has(time),
      booked: !!bookedTimes.has(time)
    }));
    
    res.json({
      date,
      unavailable: false,
      unavailableReason: null,
      totalSlots: timeSlots.length,
      bookedCount: bookedTimes.size,
      availableCount: timeSlots.length - bookedTimes.size,
      timeSlots: availability
    });
  } catch (err) {
    console.error('❌ Error fetching availability:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET CALENDAR OVERVIEW (for month view)
exports.getCalendarOverview = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year parameters are required" });
    }
    
    const toDateOnly = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const monthNumber = Number(month);
    const yearNumber = Number(year);
    const startDate = new Date(yearNumber, monthNumber - 1, 1);
    const endDate = new Date(yearNumber, monthNumber, 0);

    const startDateStr = toDateOnly(startDate);
    const endDateStr = toDateOnly(endDate);

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ error: "Invalid month/year values" });
    }
    
    const appointments = await Appointment.getAppointmentsByDateRange(
      startDateStr,
      endDateStr
    );
    const unavailableDates = await Appointment.getUnavailableDates(
      startDateStr,
      endDateStr
    );
    
    // Group appointments by date
    const dateStatus = {};
    appointments.forEach(appt => {
      const dateStr = toDateOnly(appt.date);
      if (!dateStr) return;

      if (!dateStatus[dateStr]) {
        dateStatus[dateStr] = { total: 0, booked: 0, available: 0 };
      }
      dateStatus[dateStr].total++;
      dateStatus[dateStr].booked++;
    });

    const blockedDateStatus = {};
    unavailableDates.forEach(item => {
      const dateStr = String(item.unavailable_date);
      blockedDateStatus[dateStr] = {
        reason: item.reason,
        unavailable: true
      };
    });
    
    res.json({
      month,
      year,
      daysWithAppointments: dateStatus,
      daysUnavailable: blockedDateStatus
    });
  } catch (err) {
    console.error('❌ Error fetching calendar overview:', err);
    res.status(500).json({ error: err.message });
  }
};

// MARK DATE AS UNAVAILABLE (Admin/RA)
exports.markDateUnavailable = async (req, res) => {
  try {
    const { date, reason, created_by_role, created_by_user_id, is_emergency } = req.body;
    const emergencyOverride = isEmergencyCancellation(is_emergency);

    if (!date) {
      return res.status(400).json({ message: "Date is required (YYYY-MM-DD)" });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const blockedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(blockedDate.getTime())) {
      return res.status(400).json({ message: "Date must be in YYYY-MM-DD format" });
    }

    const hoursUntilBlockedDate = (blockedDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (!emergencyOverride && hoursUntilBlockedDate < STANDARD_CANCELLATION_LEAD_HOURS) {
      return res.status(409).json({
        message: `Standard cancellation requires at least ${STANDARD_CANCELLATION_LEAD_HOURS} hours before the appointment date. Use Emergency Cancellation Override for urgent cases.`,
        leadTimeHours: STANDARD_CANCELLATION_LEAD_HOURS,
        hoursUntilBlockedDate: Math.max(0, Number(hoursUntilBlockedDate.toFixed(2)))
      });
    }

    const existing = await Appointment.isDateUnavailable(date);
    if (existing) {
      return res.status(409).json({
        message: "This date is already marked as unavailable",
        date,
        reason: existing.reason || null
      });
    }

    const creatorId = Number(created_by_user_id);
    const trimmedReason = String(reason).trim();

    // Get all appointments on this date (pending, approved, ongoing)
    const appointmentsOnDate = await Appointment.getAppointmentsByDateAllStatuses(date);

    // Track affected appointments for response
    const deniedAppointments = [];
    const cancelledAppointments = [];
    const emailErrors = [];
    const cancellationTypeLabel = emergencyOverride ? 'Emergency Cancellation Override' : 'Standard Cancellation';

    // Process each appointment
    for (const appointment of appointmentsOnDate) {
      const appointmentDate = new Date(appointment.date);
      const formattedDate = appointmentDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
      });

      const recipientEmail = appointment.user_email || appointment.requester_email;
      const identityLabel = appointment.student_id
        ? `<p><strong>Student ID:</strong> ${appointment.student_id}</p>`
        : appointment.requester_name
        ? `<p><strong>Visitor Name:</strong> ${appointment.requester_name}</p>`
        : '';

      if (appointment.status === 'pending') {
        // Auto-deny pending appointments
        await Appointment.updateAppointmentStatus(appointment.appointment_id, 'denied', trimmedReason);
        deniedAppointments.push(appointment.appointment_id);

        // Send denial email
        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `${cancellationTypeLabel} - Appointment Request Denied - Biocella`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f44336;">Your appointment request has been denied</h2>
                <p><strong>Requested Date:</strong> ${formattedDate}</p>
                <p><strong>Department:</strong> ${getAppointmentDepartment(appointment)}</p>
                <p><strong>Purpose:</strong> ${appointment.purpose}</p>
                <p><strong>Cancellation Type:</strong> ${cancellationTypeLabel}</p>
                ${identityLabel}
                <hr>
                <p><strong>Reason:</strong> The requested date has been marked as unavailable. ${trimmedReason}</p>
                <p>Please contact us if you would like to reschedule for another date.</p>
              </div>
            `
          }).catch((emailErr) => {
            console.error('📧 Email send failed for pending appointment:', emailErr.message);
            emailErrors.push({ appointmentId: appointment.appointment_id, error: emailErr.message });
          });
        }
      } else if (appointment.status === 'approved' || appointment.status === 'ongoing') {
        // Cancel approved/ongoing appointments
        await Appointment.updateAppointmentStatus(appointment.appointment_id, 'cancelled', trimmedReason);
        cancelledAppointments.push(appointment.appointment_id);

        // Send cancellation email
        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `${cancellationTypeLabel} - Appointment Cancelled - Biocella`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f44336;">Your appointment has been cancelled</h2>
                <p><strong>Appointment Date:</strong> ${formattedDate}</p>
                <p><strong>Department:</strong> ${getAppointmentDepartment(appointment)}</p>
                <p><strong>Purpose:</strong> ${appointment.purpose}</p>
                <p><strong>Cancellation Type:</strong> ${cancellationTypeLabel}</p>
                ${identityLabel}
                <hr>
                <p><strong>Reason for Cancellation:</strong> The scheduled date has been marked as unavailable. ${trimmedReason}</p>
                <p>We apologize for the inconvenience. Please contact us if you would like to reschedule your appointment for another available date.</p>
              </div>
            `
          }).catch((emailErr) => {
            console.error('📧 Email send failed for appointment:', emailErr.message);
            emailErrors.push({ appointmentId: appointment.appointment_id, error: emailErr.message });
          });
        }
      }
    }

    // Mark date as unavailable
    await Appointment.upsertUnavailableDate({
      date,
      reason: trimmedReason,
      created_by_role: created_by_role || null,
      created_by_user_id: Number.isFinite(creatorId) ? creatorId : null,
      is_emergency: emergencyOverride
    });

    res.status(201).json({
      message: "Date marked as unavailable",
      unavailable: true,
      date,
      reason: trimmedReason,
      is_emergency: emergencyOverride,
      leadTimeHours: STANDARD_CANCELLATION_LEAD_HOURS,
      affectedAppointments: {
        denied: deniedAppointments.length,
        cancelled: cancelledAppointments.length,
        deniedIds: deniedAppointments,
        cancelledIds: cancelledAppointments
      },
      emailErrors: emailErrors.length > 0 ? emailErrors : null,
      notificationComplete: true
    });
  } catch (err) {
    console.error('❌ Error marking date unavailable:', err);
    res.status(500).json({ error: err.message });
  }
};

// LIST UNAVAILABLE DATES
exports.getUnavailableDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = await Appointment.getUnavailableDates(startDate || null, endDate || null);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching unavailable dates:', err);
    res.status(500).json({ error: err.message });
  }
};

// REMOVE UNAVAILABLE DATE
exports.removeUnavailableDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    const affected = await Appointment.removeUnavailableDate(date);
    if (!affected) {
      return res.status(404).json({ message: "Unavailable date not found" });
    }

    res.json({ message: "Unavailable date removed", date, notificationPending: true });
  } catch (err) {
    console.error('❌ Error removing unavailable date:', err);
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE (Mark as no-show)
exports.markNoShow = async (req, res) => {
  try {
    const affected = await Appointment.softDeleteAppointment(req.params.id);
    if (!affected) {
      return res.status(404).json({ message: "Appointment not found, already deleted, or not eligible for no-show" });
    }
    res.json({ message: "Appointment marked as no-show" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
