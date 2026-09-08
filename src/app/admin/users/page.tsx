'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, UserRole } from '@/types/auth';
import Logo from '@/components/ui/Logo';
import FooterCredit from '@/components/ui/FooterCredit';
import {
  Users,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  ArrowLeft,
  UserCheck,
  UserX,
  Phone,
  Radio,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Security Gate: Strict role checking
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const t = setTimeout(() => router.push('/'), 10);
        return () => clearTimeout(t);
      } else if (user?.role !== 'ADMIN') {
        const t = setTimeout(() => router.push(user?.role === 'DISPATCHER' ? '/dashboard' : '/mobile'), 10);
        return () => clearTimeout(t);
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {
      // Fallback
      const raw = localStorage.getItem('sos_guardian_local_profiles');
      if (raw) setUsersList(JSON.parse(raw));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        // Also update localStorage
        const raw = localStorage.getItem('sos_guardian_local_profiles');
        if (raw) {
          const list: UserProfile[] = JSON.parse(raw);
          const idx = list.findIndex((p) => p.id === userId);
          if (idx >= 0) {
            list[idx].role = newRole;
            localStorage.setItem('sos_guardian_local_profiles', JSON.stringify(list));
          }
        }
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>Verifying Administrator Access...</span>
        </div>
      </div>
    );
  }

  // Filtered list
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.deviceId && u.deviceId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    return matchesSearch;
  });

  const totalUsers = usersList.length;
  const adminCount = usersList.filter((u) => u.role === 'ADMIN').length;
  const dispatcherCount = usersList.filter((u) => u.role === 'DISPATCHER').length;
  const citizenCount = usersList.filter((u) => u.role === 'CITIZEN').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size="sm" showSubtitle={false} />
          <span className="text-xs font-mono font-bold bg-red-950/60 border border-red-800 text-red-300 px-2 py-0.5 rounded">
            USER ROSTER & ACCESS CONTROL
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">Admin:</span>
            <span className="font-bold text-white">{user?.fullName || user?.email}</span>
          </div>

          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all"
          >
            Command Radar
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">Total Personnel</span>
            <span className="text-3xl font-black text-white font-mono">{totalUsers}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-xs text-red-400 font-semibold block">System Administrators</span>
            <span className="text-3xl font-black text-red-400 font-mono">{adminCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-xs text-blue-400 font-semibold block">Dispatch Officers</span>
            <span className="text-3xl font-black text-blue-400 font-mono">{dispatcherCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-xs text-emerald-400 font-semibold block">Citizens & Drivers</span>
            <span className="text-3xl font-black text-emerald-400 font-mono">{citizenCount}</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search name, email, or device ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            {(['ALL', 'ADMIN', 'DISPATCHER', 'CITIZEN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  roleFilter === r
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">User / Personnel</th>
                  <th className="p-3.5">Access Role</th>
                  <th className="p-3.5">Device ID</th>
                  <th className="p-3.5">Family Relatives</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">
                      No personnel matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdmin = u.role === 'ADMIN';
                    const isDisp = u.role === 'DISPATCHER';

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white text-sm">{u.fullName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          {u.phone && <div className="text-slate-500 text-[10px]">{u.phone}</div>}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              isAdmin
                                ? 'bg-red-950 border-red-700 text-red-300'
                                : isDisp
                                ? 'bg-blue-950 border-blue-700 text-blue-300'
                                : 'bg-emerald-950 border-emerald-700 text-emerald-300'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{u.role}</span>
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-slate-400">
                          {u.deviceId || 'DEV-AUTO'}
                        </td>

                        <td className="p-3.5">
                          {u.emergencyContacts && u.emergencyContacts.length > 0 ? (
                            <span className="text-emerald-400 font-semibold">
                              {u.emergencyContacts.length} Contact(s) Armed
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Not yet added</span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-3.5 text-right">
                          <select
                            disabled={updatingId === u.id}
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as UserRole)
                            }
                            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-red-500 cursor-pointer"
                          >
                            <option value="CITIZEN">Citizen / Driver</option>
                            <option value="DISPATCHER">Dispatcher</option>
                            <option value="ADMIN">System Admin</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Tamper-Proof Persistent Security & Author Credit Footer */}
      <FooterCredit showStatus />
    </div>
  );
}
