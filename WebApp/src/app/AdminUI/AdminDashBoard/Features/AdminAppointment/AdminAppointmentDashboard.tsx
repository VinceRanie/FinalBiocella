'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import jsQR from 'jsqr';

interface Appointment {
  appointment_id: number;
  user_id: number | null;
  student_id: string | null;
  department: string;
  purpose: string;
  date: string;
  appointment_source?: 'internal' | 'outsider';
  requester_name?: string | null;
  requester_email?: string | null;
  user_email?: string | null;
  user_first_name?: string | null;
  user_last_name?: string | null;
  user_role?: string | null;
  user_department?: string | null;
  status: 'pending' | 'approved' | 'denied' | 'ongoing' | 'visited' | 'no_show';
  qr_code: string | null;
  created_at: string;
  pending_at: string | null;
  approved_at: string | null;
  denied_at: string | null;
  ongoing_at: string | null;
  visited_at: string | null;
  no_show_at: string | null;
  denial_reason: string | null;
  admin_remarks: string | null;
}

interface UnavailableDate {
  unavailable_id: number;
  unavailable_date: string;
  reason: string;
  is_emergency?: number | boolean;
}

type TabType = 'pending' | 'ongoing' | 'visited' | 'denied' | 'no_show';
type AudienceFilter = 'all' | 'internal' | 'outsider';

export default function AdminAppointmentDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, ongoing: 0, visited: 0, denied: 0, no_show: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'deny' | 'scan' | 'notice'>('approve');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [lastVerifiedQR, setLastVerifiedQR] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [unavailableDate, setUnavailableDate] = useState('');
  const [unavailableReason, setUnavailableReason] = useState('');
  const [isEmergencyCancellation, setIsEmergencyCancellation] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [savingUnavailable, setSavingUnavailable] = useState(false);
  const [lastUnavailableResult, setLastUnavailableResult] = useState<any>(null);
  const [showUnavailablePanel] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tabs: { key: TabType; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: 'yellow' },
    { key: 'ongoing', label: 'Ongoing', color: 'blue' },
    { key: 'visited', label: 'Visited', color: 'green' },
    { key: 'denied', label: 'Denied', color: 'red' },
    { key: 'no_show', label: 'No-Show', color: 'gray' },
  ];

  // Handle camera stream when it becomes available
  useEffect(() => {
    if (!cameraStream || !cameraActive) {
      return;
    }

    console.log('🎬 useEffect: cameraStream available and cameraActive is true');
    console.log('📹 videoRef.current:', videoRef.current);

    if (!videoRef.current) {
      console.error('❌ Video element still not available in effect');
      return;
    }

    console.log('🎥 Attaching stream to video element...');
    videoRef.current.srcObject = cameraStream;

    // Wait for video to be ready
    const checkVideoReady = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        clearInterval(checkVideoReady);
        console.log('✅ Video ready state:', videoRef.current.readyState);

        const playPromise = videoRef.current!.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('▶️ Video playing successfully');
              setTimeout(() => {
                console.log('🔍 Starting QR code scanner...');
                scanQRCode();
              }, 300);
            })
            .catch(err => {
              console.error('❌ Play error:', err);
              alert('Error playing video: ' + err.message);
              stopCamera();
            });
        }
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkVideoReady);
      if (!videoRef.current || videoRef.current.readyState < 2) {
        console.error('❌ Video did not reach ready state');
        alert('Camera stream timeout');
        stopCamera();
      }
    }, 5000);

    return () => {
      clearInterval(checkVideoReady);
      clearTimeout(timeout);
    };
  }, [cameraStream, cameraActive]);

  // Fetch appointments on initial load
  useEffect(() => {
    // On initial load, fetch all appointments to get status counts
    fetchAllAppointmentsAndCount();
    fetchUnavailableDates();
  }, []);

  const getAppointmentDisplay = (appointment: Appointment) => {
    const source = String(appointment.appointment_source || 'internal').toLowerCase();
    if (source === 'outsider') {
      const name =
        String(appointment.requester_name || '').trim() ||
        String(appointment.requester_email || '').trim() ||
        'External Visitor';
      return { primaryLabel: 'name', primaryValue: name };
    }

    const userRole = String(appointment.user_role || '').toLowerCase();
    const userName = `${appointment.user_first_name || ''} ${appointment.user_last_name || ''}`.trim();

    if (userRole === 'faculty') {
      return {
        primaryLabel: 'faculty email',
        primaryValue: appointment.user_email || 'N/A',
        secondaryLabel: 'name',
        secondaryValue: userName || 'N/A',
      };
    }

    return {
      primaryLabel: 'Student ID',
      primaryValue: appointment.student_id || 'N/A',
      secondaryLabel: 'Name',
      secondaryValue: userName || 'N/A',
    };
  };

  const getAppointmentName = (appointment: Appointment) => {
    const userName = `${appointment.user_first_name || ''} ${appointment.user_last_name || ''}`.trim();
    if (userName) {
      return userName;
    }

    const requesterName = String(appointment.requester_name || '').trim();
    if (requesterName) {
      return requesterName;
    }

    const requesterEmail = String(appointment.requester_email || '').trim();
    return requesterEmail || 'N/A';
  };

  const getAppointmentDepartment = (appointment: Appointment) => {
    return appointment.department || appointment.user_department || 'N/A';
  };

  const fetchUnavailableDates = async () => {
    try {
      const res = await fetch('/API/appointments/unavailable-dates');
      if (!res.ok) {
        throw new Error('Failed to fetch unavailable dates');
      }
      const data = await res.json();
      setUnavailableDates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching unavailable dates:', err);
    }
  };

  const getCurrentUserId = (): number | null => {
    try {
      const fromUserData = localStorage.getItem('userData');
      const fromUser = localStorage.getItem('user');
      const raw = fromUserData || fromUser;
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const id = Number(parsed.userId ?? parsed.user_id ?? parsed.id);
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  };

  const handleSetUnavailableDate = async () => {
    if (!unavailableDate || !unavailableReason.trim()) {
      alert('Please select a date and provide a reason.');
      return;
    }

    try {
      setSavingUnavailable(true);
      const response = await fetch('/API/appointments/unavailable-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: unavailableDate,
          reason: unavailableReason.trim(),
          created_by_role: 'admin',
          created_by_user_id: getCurrentUserId(),
          is_emergency: isEmergencyCancellation
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to mark date unavailable');
      }
      // store API result so the notice modal can display details
      setLastUnavailableResult(data || null);
      setModalType('notice');
      setShowModal(true);
      setUnavailableDate('');
      setUnavailableReason('');
      setIsEmergencyCancellation(false);
      fetchUnavailableDates();
    } catch (err) {
      console.error('Error marking date unavailable:', err);
      alert(err instanceof Error ? err.message : 'Failed to mark date unavailable');
    } finally {
      setSavingUnavailable(false);
    }
  };

  const handleRemoveUnavailableDate = async (date: string) => {
    try {
      const response = await fetch(`/API/appointments/unavailable-dates/${encodeURIComponent(date)}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to remove unavailable date');
      }

      fetchUnavailableDates();
    } catch (err) {
      console.error('Error removing unavailable date:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove unavailable date');
    }
  };

  // Auto-verify when a valid appointment QR URL is detected
  useEffect(() => {
    if (modalType !== 'scan' || !cameraActive || !qrInput || qrInput === lastVerifiedQR) {
      return;
    }

    // Check if it's a valid appointment verification URL.
    if (qrInput.includes('/verify-appointment?') || qrInput.includes('/scan/appointment?')) {
      try {
        const url = new URL(qrInput);
        const token = url.searchParams.get('token');
        const appointmentId = url.searchParams.get('id');

        if (token && appointmentId) {
          console.log('🎯 Valid appointment QR detected, auto-verifying...');
          setLastVerifiedQR(qrInput);
          
          // Auto-verify
          autoVerifyQR(token, appointmentId);
        }
      } catch (e) {
        console.log('Not a valid URL');
      }
    }
  }, [qrInput, modalType, cameraActive]);

  useEffect(() => {
    // When tab changes, update the displayed appointments for that tab
    if (allAppointments.length > 0) {
      const tabAppointments = allAppointments.filter((app: Appointment) => {
        const source = app.appointment_source || 'internal';
        return app.status === activeTab && (audienceFilter === 'all' || source === audienceFilter);
      });
      setAppointments(tabAppointments);
      setError(null);
    }
  }, [activeTab, allAppointments, audienceFilter]);

  // Retry helper with exponential backoff
  const fetchWithRetry = async (
    url: string,
    options: any = {},
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Fetch attempt ${attempt}/${maxRetries} for ${url}`);
        const response = await fetch(url, options);
        
        if (response.ok) {
          console.log(`✅ Fetch successful on attempt ${attempt}`);
          return response;
        }
        
        // If response not ok, wait and retry
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Response not ok (status: ${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`⚠️ Fetch attempt ${attempt} failed: ${error.message}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    // All retries failed
    if (lastError) {
      throw lastError;
    }
    
    throw new Error('All fetch attempts failed');
  };

  const fetchAllAppointmentsAndCount = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📋 Fetching all appointments for counting (with retry logic)`);
      const response = await fetchWithRetry(`/API/appointments`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, 3, 800); // 3 retries with 800ms initial delay (exponential: 800ms, 1600ms, 3200ms)
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Error fetching appointments (${response.status}):`, error);
        const errorMessage = error.error || `HTTP error! status: ${response.status}`;
        setError(errorMessage);
        setAllAppointments([]);
        setStatusCounts({ pending: 0, ongoing: 0, visited: 0, denied: 0, no_show: 0 });
      } else {
        const data = await response.json();
        console.log(`✅ Fetched ${data.data?.length || data.length || 0} total appointments`);
        
        const allAppts = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setAllAppointments(allAppts);
        
        // Count appointments by status
        const counts = {
          pending: allAppts.filter((app: Appointment) => app.status === 'pending').length,
          ongoing: allAppts.filter((app: Appointment) => app.status === 'ongoing').length,
          visited: allAppts.filter((app: Appointment) => app.status === 'visited').length,
          denied: allAppts.filter((app: Appointment) => app.status === 'denied').length,
          no_show: allAppts.filter((app: Appointment) => app.status === 'no_show').length,
        };
        
        console.log(`📊 Status counts:`, counts);
        setStatusCounts(counts);
        
        // Filter for active tab
        const tabAppointments = allAppts.filter((app: Appointment) => {
          const source = app.appointment_source || 'internal';
          return app.status === activeTab && (audienceFilter === 'all' || source === audienceFilter);
        });
        setAppointments(tabAppointments);
        setError(null);
      }
    } catch (error: any) {
      const errorMessage = `Failed to fetch appointments: ${error.message}`;
      console.error(errorMessage);
      setError(errorMessage);
      setAllAppointments([]);
      setStatusCounts({ pending: 0, ongoing: 0, visited: 0, denied: 0, no_show: 0 });
    } finally {
      setLoading(false);
    }
  };

  const refreshAppointmentCounts = async () => {
    // Refresh the counts after an action (approve, deny, etc.)
    try {
      const response = await fetchWithRetry(`/API/appointments`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, 3, 800);
      
      if (response.ok) {
        const data = await response.json();
        const allAppts = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setAllAppointments(allAppts);
        
        // Recount
        const counts = {
          pending: allAppts.filter((app: Appointment) => app.status === 'pending').length,
          ongoing: allAppts.filter((app: Appointment) => app.status === 'ongoing').length,
          visited: allAppts.filter((app: Appointment) => app.status === 'visited').length,
          denied: allAppts.filter((app: Appointment) => app.status === 'denied').length,
          no_show: allAppts.filter((app: Appointment) => app.status === 'no_show').length,
        };
        
        setStatusCounts(counts);
        
        // Update current tab display
        const tabAppointments = allAppts.filter((app: Appointment) => {
          const source = app.appointment_source || 'internal';
          return app.status === activeTab && (audienceFilter === 'all' || source === audienceFilter);
        });
        setAppointments(tabAppointments);
      }
    } catch (error) {
      console.error('Error refreshing appointment counts:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedAppointment) return;
    
    try {
      const response = await fetch(`/API/appointments/${selectedAppointment.appointment_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          remarks
        }),
      });

      if (response.ok) {
        alert('Appointment approved! Email sent to user with QR code.');
        refreshAppointmentCounts();
        closeModal();
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      alert('Failed to approve appointment');
    }
  };

  const handleDeny = async () => {
    if (!selectedAppointment) return;
    
    try {
      const response = await fetch(`/API/appointments/${selectedAppointment.appointment_id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: reason
        }),
      });

      if (response.ok) {
        alert('Appointment denied. Email sent to user.');
        refreshAppointmentCounts();
        closeModal();
      }
    } catch (error) {
      console.error('Error denying appointment:', error);
      alert('Failed to deny appointment');
    }
  };

  const handleScanQR = async () => {
    try {
      let token = qrInput;
      let appointmentId = '';

      // If the QR code contains a URL, extract token and id
      if (qrInput.includes('?')) {
        try {
          const url = new URL(qrInput);
          token = url.searchParams.get('token') || qrInput;
          appointmentId = url.searchParams.get('id') || '';
          console.log('📋 Extracted from URL - token:', token, 'appointmentId:', appointmentId);
        } catch (e) {
          console.log('ℹ️ QR input is not a URL, using as-is');
        }
      }

      if (!token) {
        alert('Invalid QR code - no token found');
        return;
      }

      const response = await fetch('/API/appointments/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: token,
          appointmentId: appointmentId || undefined  // Optional - backend will look up by token if not provided
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Appointment verified! Student: ${data.appointment.student_id}`);
        refreshAppointmentCounts();
        closeModal();
        setQrInput('');  // Clear input after successful verification
      } else {
        alert('❌ ' + (data.message || 'Invalid QR code'));
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      alert('Failed to verify QR code');
    }
  };

  const autoVerifyQR = async (token: string, appointmentId: string) => {
    try {
      const response = await fetch('/API/appointments/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: token,
          appointmentId: appointmentId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Auto-verified! Student:', data.appointment.student_id);
        alert(`✅ Appointment verified! Student: ${data.appointment.student_id}`);
        stopCamera();
        refreshAppointmentCounts();
        closeModal();
      } else {
        console.warn('⚠️ Verification failed:', data.message);
        alert('❌ ' + (data.message || 'QR verification failed'));
      }
    } catch (error) {
      console.error('❌ Auto-verify error:', error);
    }
  };

  const openModal = (appointment: Appointment, type: 'approve' | 'deny' | 'scan') => {
    setSelectedAppointment(appointment);
    setModalType(type);
    setShowModal(true);
    setRemarks('');
  };

  const closeModal = () => {
    // Stop camera when closing modal
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setShowModal(false);
    setSelectedAppointment(null);
    setRemarks('');
    setQrInput('');
    setLastVerifiedQR('');
  };

  const startCamera = async (preferredMode: 'environment' | 'user' = cameraFacingMode) => {
    try {
      console.log('📷 Requesting camera access...');
      let stream: MediaStream;
      let modeInUse: 'environment' | 'user' = preferredMode;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (firstError) {
        const fallbackMode = preferredMode === 'environment' ? 'user' : 'environment';
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: fallbackMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        modeInUse = fallbackMode;
      }
      
      console.log('✅ Camera stream obtained:', stream.getTracks());
      setCameraFacingMode(modeInUse);
      
      // Set both state at once to trigger re-render and then the effect
      setCameraStream(stream);
      setCameraActive(true);
      console.log('🚀 Camera state set, waiting for useEffect to attach stream...');
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      console.error('❌ Camera access error:', err);
      alert(`Unable to access camera: ${errorMsg}`);
      setCameraActive(false);
    }
  };

  const switchCamera = async () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    await startCamera(nextMode);
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video) {
      console.error('❌ Video ref not available');
      return;
    }

    if (!canvas) {
      console.error('❌ Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Canvas context not available');
      return;
    }

    console.log('🎬 Video element state:', {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      muted: video.muted
    });

    let lastDetectedCode = '';
    let frameCount = 0;

    const scanFrame = () => {
      // Use a ref-based check instead of state
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) {
        console.warn('⚠️ Video or canvas lost');
        return;
      }

      // Wait for video to have dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        frameCount++;
        if (frameCount % 20 === 0) {
          console.log(`⏳ Waiting for video dimensions... (attempt ${frameCount})`);
        }
        setTimeout(scanFrame, 50);
        return;
      }

      frameCount++;
      
      // Log once per second
      if (frameCount % 30 === 0) {
        console.log(`📹 Scanning... frame ${frameCount}, video: ${video.videoWidth}x${video.videoHeight}`);
      }

      try {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (!imageData || !imageData.data) {
          console.error('❌ Failed to get image data');
          setTimeout(scanFrame, 100);
          return;
        }

        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          console.log('✅ QR Code detected:', code.data);
          
          // Only update if it's a different code
          if (code.data !== lastDetectedCode) {
            lastDetectedCode = code.data;
            setQrInput(code.data);
            console.log('📝 Updated QR input: ' + code.data);
          }
        }

        // Continue scanning
        if (cameraActive) {
          requestAnimationFrame(scanFrame);
        } else {
          console.log('🛑 Camera no longer active, stopping scan');
        }
      } catch (error) {
        console.error('❌ Scan error:', error);
        if (cameraActive) {
          setTimeout(scanFrame, 100);
        }
      }
    };

    console.log('🚀 Starting scan loop...');
    scanFrame();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Camera track stopped');
      });
      setCameraStream(null);
    }
    setCameraActive(false);
    console.log('📷 Camera stopped');
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
      ongoing: 'bg-blue-100 text-blue-800',
      visited: 'bg-purple-100 text-purple-800',
      no_show: 'bg-gray-200 text-gray-700',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f4f8fb] to-[#eaf1f8] p-4 sm:p-6">

    {/* HEADER */}
    <div className="flex justify-end mb-6">

<button
  onClick={() => {
    setCameraActive(false)
    setShowModal(true)
    setModalType('scan')
    setQrInput('')
  }}
  className="cursor-pointer w-full sm:w-auto bg-[#113F67] text-white px-5 py-2.5 rounded-xl hover:bg-[#0d2f4d] transition shadow-md hover:shadow-lg font-semibold"
>
  Scan QR Code
</button>

</div>

      <div className="mb-6 rounded-lg border border-[#113F67]/20 bg-[#113F67]/5 p-3 sm:p-4">
        <div className="w-full flex items-center justify-between text-left">
          <h2 className="text-lg font-semibold text-[#113F67]">Set Date Unavailable</h2>
        </div>

        {showUnavailablePanel && (
          <>
            <p className="text-sm text-[#113F67] mb-2 mt-3">Standard cancellations must be made at least 24 hours before the appointment date. Use Emergency Cancellation Override only for urgent cases such as outages, maintenance, or safety issues.</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="date"
                value={unavailableDate}
                onChange={(e) => setUnavailableDate(e.target.value)}
                className="rounded-md border border-[#113F67]/30 px-3 py-2 focus:border-[#113F67] focus:outline-none"
              />
              <input
                type="text"
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
                placeholder="Reason (e.g. lab maintenance)"
                className="rounded-md border border-[#113F67]/30 px-3 py-2 md:col-span-2 focus:border-[#113F67] focus:outline-none"
              />
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm text-[#113F67]">
              <input
                type="checkbox"
                checked={isEmergencyCancellation}
                onChange={(e) => setIsEmergencyCancellation(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#113F67]/40 text-[#113F67] focus:ring-[#113F67]"
              />
              <span>
                Emergency Cancellation Override
                <span className="block text-xs text-[#113F67]/75">
                  Requires a reason, logs the override, and emails affected users immediately.
                </span>
              </span>
            </label>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleSetUnavailableDate}
                disabled={savingUnavailable}
                className="rounded-md bg-[#113F67] px-4 py-2 text-white hover:bg-[#0d2f4d] disabled:opacity-60"
              >
                {savingUnavailable ? 'Saving...' : 'Mark Unavailable'}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {unavailableDates.length === 0 ? (
                <p className="text-sm text-[#113F67]/80">No blocked dates yet.</p>
              ) : (
                unavailableDates.slice(0, 8).map((item) => (
                  <div key={item.unavailable_id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md bg-white px-3 py-2 text-sm border border-[#113F67]/15">
                    <span className="break-words">
                      {format(new Date(`${item.unavailable_date}T00:00:00`), 'MMM dd, yyyy')} - {item.reason}
                      {item.is_emergency ? ' • Emergency override' : ''}
                    </span>
                    <button
                      onClick={() => handleRemoveUnavailableDate(item.unavailable_date)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 sm:px-6 py-3 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-1 text-xs rounded-full font-semibold ${
              statusCounts[tab.key] > 0 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {statusCounts[tab.key]}
            </span>
          </button>
        ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-amber-700 font-bold text-base sm:text-lg">⚠️ CONNECTION WARNING</div>
            <button
              onClick={() => setError(null)}
              className="text-amber-600 hover:text-amber-800 font-semibold ml-auto"
            >
              ✕
            </button>
          </div>
          <div className="text-amber-800 mb-3">
            <p className="font-semibold mb-1">Backend API is currently unavailable or unstable</p>
            <p className="text-sm text-amber-700">
              The system attempted 3 automatic retries. Please click "Retry Now" to try again.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => refreshAppointmentCounts()}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Retrying...' : 'Retry Now'}
            </button>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Appointments List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-gray-600 font-medium">Loading appointments...</div>
            <div className="text-sm text-gray-500">If connection is unstable, it may retry automatically</div>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No {activeTab} appointments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.appointment_id}
              className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    {(() => {
                      const display = getAppointmentDisplay(appointment);
                      return (
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                          {display.primaryLabel}: {display.primaryValue}
                        </h3>
                      );
                    })()}
                    {getStatusBadge(appointment.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${appointment.appointment_source === 'outsider' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {(appointment.appointment_source || 'internal').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-gray-600 mb-3">
                    {(() => {
                      const display = getAppointmentDisplay(appointment);
                      if (!display.secondaryLabel || !display.secondaryValue) {
                        return null;
                      }
                      return (
                        <div>
                          <span className="font-medium">{display.secondaryLabel}:</span> {display.secondaryValue}
                        </div>
                      );
                    })()}
                    <div>
                      <span className="font-medium">Department:</span> {getAppointmentDepartment(appointment)}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{' '}
                      {format(new Date(appointment.date), 'MMM dd, yyyy hh:mm a')}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium">Purpose:</span> {appointment.purpose}
                    </div>
                    {appointment.requester_email && (
                      <div className="col-span-2">
                        <span className="font-medium">Contact:</span> {appointment.requester_email}
                      </div>
                    )}
                  </div>

                  {appointment.denial_reason && (
                    <div className="mt-2 p-3 bg-red-50 rounded-md">
                      <span className="font-medium text-red-800">Denial Reason:</span>
                      <p className="text-red-700 text-sm">{appointment.denial_reason}</p>
                    </div>
                  )}

                  {appointment.admin_remarks && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <span className="font-medium text-blue-800">Admin Remarks:</span>
                      <p className="text-blue-700 text-sm">{appointment.admin_remarks}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:ml-4">
                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => openModal(appointment, 'approve')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm w-full sm:w-auto"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(appointment, 'deny')}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm w-full sm:w-auto"
                      >
                        Deny
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {appointment.pending_at && (
                  <div>Pending: {format(new Date(appointment.pending_at), 'MMM dd, HH:mm')}</div>
                )}
                {appointment.approved_at && (
                  <div>Approved: {format(new Date(appointment.approved_at), 'MMM dd, HH:mm')}</div>
                )}
                {appointment.visited_at && (
                  <div>Visited: {format(new Date(appointment.visited_at), 'MMM dd, HH:mm')}</div>
                )}
                {appointment.no_show_at && (
                  <div>No-Show: {format(new Date(appointment.no_show_at), 'MMM dd, HH:mm')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 ${
            modalType === 'scan'
              ? 'bg-gradient-to-br from-black/70 via-slate-900/65 to-black/75 backdrop-blur-[2px]'
              : 'bg-gradient-to-br from-slate-950/55 via-slate-900/50 to-black/60 backdrop-blur-[3px]'
          }`}
        >
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">
              {modalType === 'scan' && 'Scan QR Code'}
              {modalType === 'approve' && 'Approve Appointment'}
              {modalType === 'deny' && 'Deny Appointment'}
              {modalType === 'notice' && 'Notice'}
            </h2>

            {modalType === 'scan' ? (
              <div className="space-y-4">
                {!cameraActive ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => startCamera()}
                      className="cursor-pointer w-full bg-[#113F67] from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold flex items-center justify-center gap-2"
                    >
                      Start Camera Scanner
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or enter manually</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg flex items-start gap-2">
                      <span>👁️</span>
                      <span>Point your camera at the QR code inside the frame. Detection runs automatically.</span>
                    </div>
                    <div className="relative w-full bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                      <video
                        ref={videoRef}
                        autoPlay={true}
                        playsInline={true}
                        muted={true}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          backgroundColor: '#000'
                        }}
                        onPlay={() => console.log('🎬 Video onPlay event fired')}
                        onLoadedMetadata={() => console.log('📊 Video onLoadedMetadata fired')}
                        onCanPlay={() => console.log('▶️ Video onCanPlay fired')}
                      />

                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-[72%] h-[58%] border-2 border-white/70 rounded-2xl shadow-[0_0_0_200vmax_rgba(0,0,0,0.45)]">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-300 rounded-tl-xl" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-300 rounded-tr-xl" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-300 rounded-bl-xl" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-300 rounded-br-xl" />
                          <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-cyan-300/80 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <canvas
                      ref={canvasRef}
                      style={{ display: 'none' }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={switchCamera}
                        className="w-full bg-[#113F67] text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                      >
                        Switch Camera
                      </button>
                      <button
                        onClick={stopCamera}
                        className="w-full bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors font-semibold"
                      >
                        ✕ Stop Camera
                      </button>
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste QR code content or result here"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleScanQR}
                    disabled={!qrInput || cameraActive}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    ✓ Verify
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : modalType === 'notice' ? (
              <div className="space-y-4">
                    <div className="rounded-lg border border-[#113F67]/20 bg-[#113F67]/5 p-4 text-sm text-[#113F67]">
                      <div>Date marked unavailable.</div>
                      {lastUnavailableResult?.affectedAppointments && (
                        <div className="mt-2 text-sm text-gray-700">
                          <div><strong>Affected appointments:</strong></div>
                          <div>Denied: {lastUnavailableResult.affectedAppointments.denied} {lastUnavailableResult.affectedAppointments.deniedIds?.length ? ` (IDs: ${lastUnavailableResult.affectedAppointments.deniedIds.join(', ')})` : ''}</div>
                          <div>Cancelled: {lastUnavailableResult.affectedAppointments.cancelled} {lastUnavailableResult.affectedAppointments.cancelledIds?.length ? ` (IDs: ${lastUnavailableResult.affectedAppointments.cancelledIds.join(', ')})` : ''}</div>
                        </div>
                      )}
                      {lastUnavailableResult?.emailErrors && lastUnavailableResult.emailErrors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          <div><strong>Email errors:</strong></div>
                          <ul className="list-disc ml-5">
                            {lastUnavailableResult.emailErrors.map((e: any) => (
                              <li key={e.appointmentId}>ID {e.appointmentId}: {e.error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                <button
                  onClick={closeModal}
                  className="w-full bg-[#113F67] text-white px-4 py-2 rounded-md hover:bg-[#0d2f4d]"
                >
                  OK
                </button>
              </div>
            ) : (
              <div>
                {selectedAppointment && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-md text-sm">
                    <p><strong>Student ID:</strong> {selectedAppointment.student_id || 'N/A'}</p>
                    <p><strong>Name:</strong> {getAppointmentName(selectedAppointment)}</p>
                    <p><strong>Scheduled Date:</strong> {format(new Date(selectedAppointment.date), 'MMM dd, yyyy hh:mm a')}</p>
                    <p><strong>Purpose:</strong> {selectedAppointment.purpose || 'N/A'}</p>
                  </div>
                )}
                
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={modalType === 'deny' ? 'Reason for denial...' : 'Optional remarks...'}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
                />
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={modalType === 'approve' ? handleApprove : handleDeny}
                    className={`flex-1 text-white px-4 py-2 rounded-md ${
                      modalType === 'approve' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {modalType === 'approve' ? 'Approve' : 'Deny'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
