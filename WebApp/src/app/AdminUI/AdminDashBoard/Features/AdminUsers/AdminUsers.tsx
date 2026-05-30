"use client";

import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";
import AdminControls from "./AdminControls";
import { ChevronUp, ChevronDown } from "lucide-react";
interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  course: string;
  role: string;
  is_setup_complete: number;
  deleted_at: string | null;
}

const roleLabels: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Research Asst.",
};

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState("all");
  const [viewMode, setViewMode] = useState<"active" | "deactivated">("active");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };
      const res = await fetch(`${API_URL}/auth/users`, { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load users");
      }

      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchUsers();
    }
  }, [isMounted]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    let filtered = users.filter((u) => {
      const isDeactivated = Boolean(u.deleted_at);
      const matchesView = viewMode === "deactivated" ? isDeactivated : !isDeactivated;
      const matchesRole = activeRole === "all" ? true : u.role?.toLowerCase() === activeRole;
      const matchesSearch =
        !query ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.department || "").toLowerCase().includes(query) ||
        (u.course || "").toLowerCase().includes(query);
      return matchesView && matchesRole && matchesSearch;
    });

    // Apply sorting
    if (sortColumn) {
      filtered = filtered.sort((a, b) => {

        let aVal: any = a[sortColumn as keyof User];
        let bVal: any = b[sortColumn as keyof User];

        if (sortColumn === 'email' || sortColumn === 'department' || sortColumn === 'course' || sortColumn === 'role') {
          aVal = (aVal || '').toString().toLowerCase();
          bVal = (bVal || '').toString().toLowerCase();
        } else if (sortColumn === 'name') {
          aVal = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
          bVal = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Show newest users first by reversing
    return [...filtered].reverse();
  }, [activeRole, search, users, sortColumn, sortOrder, viewMode]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <div className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold text-white uppercase cursor-pointer hover:bg-[#0d2f4d] transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2">
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  const handleRowClick = (id: number) => {
    setSelectedUserId((prev) => (prev === id ? null : id));
  };

  const handleRoleUpdate = async (id: number, role: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const res = await fetch(`${API_URL}/auth/users/${id}/role`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update role");
      }

      setUsers((prev) => prev.map((u) => (u.user_id === id ? { ...u, role } : u)));
      setMessage({ text: "Role updated successfully", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update role", type: "error" });
    }
  };

  const submitInvite = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const res = await fetch(`${API_URL}/auth/admin-invite`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to invite user");
      }

      setMessage({ text: "Invitation sent. The user will finalize via email.", type: "success" });
      setInviteEmail("");
      setInviteRole("staff");
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to invite user", type: "error" });
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      setMessage({ text: "Email is required", type: "error" });
      return;
    }

    const roleLabel = roleLabels[inviteRole] || inviteRole;
    setConfirmDialog({
      title: "Send invitation?",
      message: `Email: ${inviteEmail}\nRole: ${roleLabel}`,
      onConfirm: () => {
        setConfirmDialog(null);
        submitInvite();
      },
    });
  };

  const confirmRoleChange = (user: User, role: string) => {
    const roleLabel = roleLabels[role] || role;
    setConfirmDialog({
      title: "Confirm role change",
      message: `User: ${user.email}\nNew role: ${roleLabel}`,
      onConfirm: () => {
        setConfirmDialog(null);
        handleRoleUpdate(user.user_id, role);
      },
    });
  };

  const handleDeactivateUser = async (id: number) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const res = await fetch(`${API_URL}/auth/users/${id}/deactivate`, {
        method: "PATCH",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to deactivate user");
      }

      setUsers((prev) =>
        prev.map((u) => (u.user_id === id ? { ...u, deleted_at: new Date().toISOString() } : u))
      );
      setSelectedUserId(null);
      setMessage({ text: "User deactivated successfully", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to deactivate user", type: "error" });
    }
  };

  const handleReactivateUser = async (id: number) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const res = await fetch(`${API_URL}/auth/users/${id}/reactivate`, {
        method: "PATCH",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reactivate user");
      }

      setUsers((prev) =>
        prev.map((u) => (u.user_id === id ? { ...u, deleted_at: null } : u))
      );
      setSelectedUserId(null);
      setMessage({ text: "User reactivated. Password setup email sent.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reactivate user", type: "error" });
    }
  };

  const confirmDeactivate = (user: User) => {
    setConfirmDialog({
      title: "Deactivate user?",
      message: `User: ${user.email}\nThis will disable login until reactivated.`,
      onConfirm: () => {
        setConfirmDialog(null);
        handleDeactivateUser(user.user_id);
      },
    });
  };

  const confirmReactivate = (user: User) => {
    setConfirmDialog({
      title: "Reactivate user?",
      message: `User: ${user.email}\nA password setup email will be sent.`,
      onConfirm: () => {
        setConfirmDialog(null);
        handleReactivateUser(user.user_id);
      },
    });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative space-y-4">
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-[#113F67]">{confirmDialog.title}</h4>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{confirmDialog.message}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-md bg-[#113F67] text-white hover:bg-[#0c2f4d] cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminControls
        active={activeRole}
        onRoleChange={setActiveRole}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-[#113F67] mb-3">Invite user (admin-only bypass)</h3>
        {message && (
          <div className={`mb-3 rounded px-3 py-2 text-sm ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message.text}
          </div>
        )}
        <form className="flex flex-col md:flex-row gap-3" onSubmit={handleInvite}>
          <input
            type="email"
            placeholder="Email"
            className="flex-1 border border-[#113F67] rounded-md px-3 py-2 text-sm"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select
            className="border border-gray-300 bg-[#113F67] text-white rounded-md px-3 py-2 text-sm"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="staff">Research Assistant</option>
          </select>
          <button
            type="submit"
            className="bg-[#113F67] text-white px-4 py-2 rounded-md shadow hover:bg-[#0c2f4d] cursor-pointer"
          >
            Send invite
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-full">
        <div className="overflow-auto max-h-[32rem] relative">
          <table className="table-auto w-full relative">
            <thead className="bg-[#113F67] sticky top-0 z-10">
              <tr>
                <SortableHeader column="name" label="Name" />
                <SortableHeader column="email" label="Email" />
                <SortableHeader column="role" label="Role" />
                <SortableHeader column="department" label="Department" />
                <SortableHeader column="course" label="Course" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-gray-600">
                    Loading users...
                  </td>
                </tr>
              )}

              {error && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-gray-600">
                    No users found.
                  </td>
                </tr>
              )}

              {!loading && !error &&
                filteredUsers.map((user, index) => (
                  <React.Fragment key={user.user_id}>
                    <tr
                      className="bg-white hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                      onClick={() => handleRowClick(user.user_id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Pending setup"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {roleLabels[user.role?.toLowerCase()] || user.role}
                        {Boolean(user.deleted_at) && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{user.department || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{user.course || "—"}</td>
                    </tr>

                    {selectedUserId === user.user_id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5}>
                          <div className="flex flex-wrap justify-end gap-3 p-3">
                            {Boolean(user.deleted_at) ? (
                              <button
                                onClick={() => confirmReactivate(user)}
                                className="px-3 py-1 rounded-md shadow text-white cursor-pointer bg-green-600 hover:bg-green-700"
                              >
                                Reactivate User
                              </button>
                            ) : (
                              <>
                                {Object.entries(roleLabels).map(([value, label]) => (
                                  <button
                                    key={value}
                                    onClick={() => confirmRoleChange(user, value)}
                                    className={`px-3 py-1 rounded-md shadow text-white cursor-pointer ${
                                      value === "student"
                                        ? "bg-green-500 hover:bg-green-600"
                                        : value === "faculty"
                                        ? "bg-blue-500 hover:bg-blue-600"
                                        : "bg-yellow-500 hover:bg-yellow-600"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                                <button
                                  onClick={() => confirmDeactivate(user)}
                                  className="px-3 py-1 rounded-md shadow text-white cursor-pointer bg-red-600 hover:bg-red-700"
                                >
                                  Deactivate User
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">Showing {filteredUsers.length} users</p>
        </div>
      </div>
    </div>
  );
}
