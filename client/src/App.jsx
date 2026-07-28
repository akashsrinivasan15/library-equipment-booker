import React, { useState, useEffect, useCallback } from 'react';
import { Package, PackageCheck, PackageX, Users, RotateCcw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// const API_BASE = 'http://localhost:5000/api';
const API_BASE = 'https://library-equipment-booker.onrender.com/api';


function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function App() {
  const [equipment, setEquipment] = useState([]);
  const [dashboard, setDashboard] = useState({ summary: null, activeCheckouts: [] });
  const [studentId, setStudentId] = useState('STU-101');
  const [loadingId, setLoadingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [catalogRes, dashboardRes] = await Promise.all([
        fetch(`${API_BASE}/equipment`),
        fetch(`${API_BASE}/dashboard`),
      ]);
      const catalogData = await catalogRes.json();
      const dashboardData = await dashboardRes.json();
      setEquipment(catalogData);
      setDashboard(dashboardData);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Could not reach the server. Is it running?');
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleReserve = async (equipmentId) => {
    if (!studentId.trim()) {
      toast.error('Please enter a valid Student ID.');
      return;
    }

    setLoadingId(equipmentId);

    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, equipmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete reservation.');

      toast.success('Equipment reserved successfully!');
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReturn = async (reservationId) => {
    setLoadingId(`return-${reservationId}`);
    try {
      const res = await fetch(`${API_BASE}/reservations/${reservationId}/return`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process return.');

      toast.success('Marked as returned.');
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  };
const handleCancelReservation = async (reservationId) => {
  setLoadingId(`cancel-${reservationId}`);

  try {
    const res = await fetch(
      `${API_BASE}/reservations/${reservationId}/cancel`,
      {
        method: "DELETE",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to cancel reservation.");
    }

    toast.success("Reservation cancelled successfully!");
    fetchAll();
  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoadingId(null);
  }
};

  const {
  summary,
  activeCheckouts = [],
} = dashboard || {};

  return (
    <div className="min-h-screen bg-[#F5F6F4] font-sans text-[#1B2430]">
      {/* Toast Notification Mount Point */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 2000,
          style: {
            borderRadius: '10px',
            background: '#1B2430',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#2FA89A',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#F43F5E',
              secondary: '#fff',
            },
          },
        }} 
      />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Top Bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E3E6E1] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipment Reservation System</h1>
            <p className="text-sm text-[#6B7280]">Borrow specialized hardware and lab equipment.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Student ID:</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="px-3 py-1.5 border border-[#D4D8D1] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2FA89A]"
            />
          </div>
        </div>

        {/* Dashboard Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
            Inventory Overview
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Package size={18} />}
              label="Total Items"
              value={summary ? summary.totalItems : '—'}
              accent="#1B2430"
            />
            <StatCard
              icon={<PackageCheck size={18} />}
              label="Available"
              value={summary ? summary.availableItems : '—'}
              accent="#2FA89A"
            />
            <StatCard
              icon={<PackageX size={18} />}
              label="Checked Out"
              value={summary ? summary.checkedOutItems : '—'}
              accent="#F2A93B"
            />
            <StatCard
              icon={<Users size={18} />}
              label="Equipment Types"
              value={summary ? summary.equipmentTypes : '—'}
              accent="#6B7280"
            />
          </div>

          <div className="bg-white rounded-xl border border-[#E3E6E1] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E3E6E1]">
              <h3 className="font-semibold text-sm">Active Checkouts</h3>
            </div>
            {activeCheckouts?.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#6B7280]">
                Nothing is checked out right now.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280] border-b border-[#E3E6E1]">
                    <th className="px-5 py-2 font-medium">Equipment</th>
                    <th className="px-5 py-2 font-medium">Student</th>
                    <th className="px-5 py-2 font-medium">Checkout Date</th>
                    <th className="px-5 py-2 font-medium">Out For</th>
                    <th className="px-5 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCheckouts.map((c) => (
                    <tr key={c.reservation_id} className="border-b border-[#F0F1EE] last:border-0">
                      <td className="px-5 py-3">{c.equipment_name}</td>
                      <td className="px-5 py-3 font-mono text-xs">{c.student_id}</td>
                      <td className="px-5 py-3 font-mono text-xs">{formatDate(c.checkout_date)}</td>
                      <td className="px-5 py-3 text-[#6B7280]">{timeAgo(c.checkout_date)}</td>
                      <td className="px-5 py-3 text-right">                        
                      <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                              <button
                                  onClick={() => handleReturn(c.reservation_id)}
                                  disabled={loadingId === `return-${c.reservation_id}`}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                  Return
                              </button>
                          </div>
                      </td>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Catalog Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
            Catalog
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.map((item) => {
              const isOutOfStock = item.currently_borrowed >= item.total_stock;
              const availableCount = item.total_stock - item.currently_borrowed;
              const fillPct = item.total_stock > 0
                ? (item.currently_borrowed / item.total_stock) * 100
                : 0;

              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-xl border border-[#E3E6E1] shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Available'}
                      </span>
                    </div>
                    <p className="text-sm text-[#6B7280] mb-2">
                      {availableCount} of {item.total_stock} units currently available
                    </p>
                    <div className="h-1.5 w-full bg-[#EEF0EC] rounded-full mb-4 overflow-hidden">
                      <div
                        className="h-full bg-[#F2A93B] rounded-full transition-all"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleReserve(item.id)}
                    disabled={isOutOfStock || loadingId === item.id}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                      isOutOfStock
                        ? 'bg-[#EEF0EC] text-[#9CA3AF] cursor-not-allowed'
                        : 'bg-[#1B2430] hover:bg-[#0F151D] text-white shadow-sm'
                    }`}
                  >
                    {isOutOfStock
                      ? 'Out of Stock'
                      : loadingId === item.id
                      ? 'Reserving…'
                      : 'Reserve Equipment'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-[#E3E6E1] shadow-sm">
      <div className="flex items-center gap-2 mb-2" style={{ color: accent }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}