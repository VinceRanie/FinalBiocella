"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { User, GraduationCap, Shield, Lock, Save, Upload } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";
import SearchableSelect from "@/app/components/SearchableSelect";
import { departments, getProgramsForDepartment } from "@/app/components/departmentPrograms";
import Modal from "@/app/components/Modal";

interface UserProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_photo: string | null;
  department: string | null;
  course: string | null;
  role: string;
}

interface PasswordResetStatus {
  isLocked: boolean;
  cooldownType: "token" | "cooldown" | null;
  remainingMs: number;
  expiresAt: string | null;
  message: string | null;
}

const roleLabelMap: Record<string, string> = {
  admin: "Administrator",
  staff: "Research Assistant",
  faculty: "Faculty",
  student: "Student",
};

const DEFAULT_PROFILE_IMAGE = "/UI/img/corporateWorker.jpg";

const resolveProfilePhotoSrc = (photo: string | null | undefined) => {
  const trimmed = String(photo || "").trim();
  if (!trimmed) {
    return DEFAULT_PROFILE_IMAGE;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `${API_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
};

export default function ProfilePage() {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileImageInput, setProfileImageInput] = useState("");
  const [profileImageSrc, setProfileImageSrc] = useState(DEFAULT_PROFILE_IMAGE);
  const [passwordResetStatus, setPasswordResetStatus] = useState<PasswordResetStatus | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [modalConfig, setModalConfig] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);

  const syncPasswordResetStatus = (status: PasswordResetStatus | null) => {
    setPasswordResetStatus(status);
    setClockNow(Date.now());
  };

  const formatCountdown = (remainingMs: number) => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const response = await fetch(`${API_URL}/auth/profile`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load profile.");
      }

      const profile = data.user as UserProfile;
      setUserData(profile);
      setSelectedDepartment(profile.department || "");
      setSelectedCourse(profile.course || "");
      setProfileImageInput(profile.profile_photo || "");
      setProfileImageSrc(resolveProfilePhotoSrc(profile.profile_photo));
      syncPasswordResetStatus((data.passwordResetStatus as PasswordResetStatus) || null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!passwordResetStatus?.isLocked || !passwordResetStatus?.expiresAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [passwordResetStatus?.expiresAt, passwordResetStatus?.isLocked]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!userData) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const body: Record<string, string> = {
        department: selectedDepartment,
        course: selectedCourse,
        profile_photo: profileImageInput.trim(),
      };

      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setUserData(data.user as UserProfile);
        const updatedPhoto = (data.user as UserProfile).profile_photo || "";
        setProfileImageInput(updatedPhoto);
        setProfileImageSrc(resolveProfilePhotoSrc(updatedPhoto));
      setModalConfig({
        type: "success",
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);

      const uploadFormData = new FormData();
      uploadFormData.append("image", file);

      const response = await fetch(`${API_URL}/auth/profile/upload`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        body: uploadFormData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload profile photo.");
      }

      const updatedUser = data.user as UserProfile;
      setUserData(updatedUser);
      setProfileImageInput(updatedUser.profile_photo || "");
      setProfileImageSrc(resolveProfilePhotoSrc(updatedUser.profile_photo));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleChangePassword = async () => {
    try {
      if (isPasswordResetLocked) {
        return;
      }

      setSendingReset(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/forgot-password-authenticated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.passwordResetStatus) {
          syncPasswordResetStatus(data.passwordResetStatus as PasswordResetStatus);
        }
        throw new Error(data.message || "Failed to request password reset.");
      }

      if (data.passwordResetStatus) {
        syncPasswordResetStatus(data.passwordResetStatus as PasswordResetStatus);
      }

      setModalConfig({
        type: "success",
        title: "Password Reset Email Sent",
        message: "A password reset email has been sent to your account email.",
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to request password reset.");
    } finally {
      setSendingReset(false);
    }
  };

  const roleLabel = useMemo(() => {
    const role = (userData?.role || "").toLowerCase();
    return roleLabelMap[role] || role || "-";
  }, [userData?.role]);

  const availableCourses = getProgramsForDepartment(selectedDepartment);
  const passwordResetRemainingMs = passwordResetStatus?.expiresAt
    ? Math.max(0, new Date(passwordResetStatus.expiresAt).getTime() - clockNow)
    : 0;
  const isPasswordResetLocked = Boolean(passwordResetStatus?.isLocked && passwordResetRemainingMs > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-[#113F67] font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-red-600 font-medium">{error || "Unable to load profile."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="text-center">
        <div className="flex justify-center items-center mt-4">
  <div className="relative w-40 h-40">
    <Image
      src={profileImageSrc || DEFAULT_PROFILE_IMAGE}
      alt={`${userData.first_name} ${userData.last_name}`}
      fill
      className="rounded-full object-cover"
      sizes="120px"
      onError={() => setProfileImageSrc(DEFAULT_PROFILE_IMAGE)}
    />
  </div>
</div>
          <h1 className="text-3xl font-bold text-[#113F67]">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white shadow rounded-xl p-4 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#113F67]">
            <User className="h-5 w-5 text-[#113F67]" /> Profile Information
          </h2>
          <p className="text-sm text-gray-500">Your basic information (read-only)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#113F67]">First Name</label>
              <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.first_name} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#113F67]">Last Name</label>
              <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.last_name} readOnly />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Email</label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={userData.email || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#113F67]">Profile Photo URL</label>
            <input
              className="w-full border rounded p-2 text-[#113F67]"
              value={profileImageInput}
              onChange={(e) => {
                const nextValue = e.target.value;
                setProfileImageInput(nextValue);
                setProfileImageSrc(resolveProfilePhotoSrc(nextValue));
              }}
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to use the default profile image.</p>
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 rounded-md bg-[#113F67] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#0d2f4d]">
                <Upload className="h-4 w-4" />
                {uploadingPhoto ? "Uploading..." : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium flex items-center gap-2 text-[#113F67]">
              <Shield className="h-4 w-4 text-[#113F67]" /> Role
            </label>
            <input className="w-full border rounded p-2 bg-gray-100 text-[#113F67]" value={roleLabel} readOnly />
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-white shadow rounded-xl p-4 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#113F67]">
            <GraduationCap className="h-5 w-5 text-[#113F67]" /> Academic Information
          </h2>
          <p className="text-sm text-gray-500">Select your university department and course</p>
          <div>
            <SearchableSelect
              label="Department"
              value={selectedDepartment}
              options={departments}
              placeholder="Search department"
              onChange={(value) => {
                setSelectedDepartment(value);
                setSelectedCourse("");
              }}
            />
          </div>
          <div>
            <SearchableSelect
              label="Program"
              value={selectedCourse}
              options={availableCourses}
              placeholder={selectedDepartment ? "Search program" : "Select department first"}
              disabled={!selectedDepartment}
              autoFocus={!!selectedDepartment}
              onChange={setSelectedCourse}
            />
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white shadow rounded-xl p-4 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#113F67]">
            <Lock className="h-5 w-5 text-[#113F67]" /> Change Password
          </h2>
          <p className="text-sm text-gray-500">Send a reset link to your email to change your password.</p>
          {isPasswordResetLocked && (
            <p className="text-sm text-amber-700">
              Next request available in {formatCountdown(passwordResetRemainingMs)}.
            </p>
          )}
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={sendingReset || isPasswordResetLocked}
            className="bg-[#113F67] text-white px-4 py-2 rounded-lg shadow cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sendingReset ? "Sending..." : "Change Password"}
          </button>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#113F67] text-white px-4 py-2 rounded-lg shadow cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="inline-block h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalConfig && (
        <Modal
          isOpen={true}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onClose={() => setModalConfig(null)}
          autoCloseMs={3000}
        />
      )}
    </div>
  );
}

