import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

interface Registration {
  _id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_college: string;
  submitted_at: string;
  data: Record<string, any>;
  status: string;
}

interface AdminRegistrationsDashboardProps {
  eventId: string;
  stageId: string;
  stageName: string;
}

export const AdminRegistrationsDashboard: React.FC<AdminRegistrationsDashboardProps> = ({
  eventId,
  stageId,
  stageName
}) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Fetch registrations
  useEffect(() => {
    loadRegistrations();
  }, [eventId, stageId, page, limit]);

  const loadRegistrations = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/events/${eventId}/stage/${stageId}/registrations?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) throw new Error('Failed to load registrations');

      const data = await res.json();
      setRegistrations(data.registrations || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter registrations by search query
  const filteredRegistrations = registrations.filter(reg =>
    reg.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.user_college?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export to CSV
  const exportToCSV = () => {
    if (registrations.length === 0) return;

    // Get all unique field keys
    const allFields = new Set<string>();
    registrations.forEach(reg => {
      Object.keys(reg.data).forEach(key => allFields.add(key));
    });

    // Build CSV header
    const headers = ['Name', 'Email', 'College', 'Submitted Date', ...Array.from(allFields)];
    const rows = registrations.map(reg => [
      reg.user_name,
      reg.user_email,
      reg.user_college,
      new Date(reg.submitted_at).toLocaleDateString(),
      ...Array.from(allFields).map(field => reg.data[field] || '')
    ]);

    // Convert to CSV
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stageName}-registrations-${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-8 rounded-2xl border border-purple-100">
        <h2 className="text-4xl font-black uppercase mb-2">{stageName} Submissions</h2>
        <p className="text-slate-600 mb-4">
          Total: <span className="font-black text-purple-600">{total}</span> registrations
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or college..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl font-medium focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Export Button */}
        <button
          onClick={exportToCSV}
          disabled={registrations.length === 0}
          className="px-6 py-3 bg-green-600 text-white font-black rounded-xl flex items-center gap-2 transition-all hover:shadow-lg disabled:opacity-50"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-slate-50 rounded-2xl">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-purple-600 rounded-full" />
          </div>
          <p className="mt-4 text-slate-600 font-bold">Loading registrations...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRegistrations.length === 0 && (
        <div className="p-12 text-center bg-slate-50 rounded-2xl">
          <p className="text-slate-600 font-bold">No registrations found</p>
        </div>
      )}

      {/* Table */}
      {!loading && filteredRegistrations.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-100 to-blue-100 border-b-2 border-slate-200">
                <th className="px-6 py-4 text-left font-black text-slate-900 uppercase text-sm">
                  Name
                </th>
                <th className="px-6 py-4 text-left font-black text-slate-900 uppercase text-sm">
                  Email
                </th>
                <th className="px-6 py-4 text-left font-black text-slate-900 uppercase text-sm">
                  College
                </th>
                <th className="px-6 py-4 text-left font-black text-slate-900 uppercase text-sm">
                  Submitted
                </th>
                <th className="px-6 py-4 text-center font-black text-slate-900 uppercase text-sm">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg, idx) => (
                <tr
                  key={reg._id}
                  className={`border-b border-slate-200 hover:bg-purple-50 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{reg.user_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700 font-medium text-sm">{reg.user_email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700 font-medium text-sm">{reg.user_college || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                      <Calendar size={16} />
                      {new Date(reg.submitted_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        // Show detailed view
                        alert(JSON.stringify(reg.data, null, 2));
                      }}
                      className="px-3 py-1 bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > limit && (
        <div className="flex justify-between items-center">
          <p className="text-slate-600 font-medium">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-200 font-bold rounded-lg disabled:opacity-50 hover:bg-slate-300"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-200 font-bold rounded-lg disabled:opacity-50 hover:bg-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRegistrationsDashboard;

