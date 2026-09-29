"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PendingRequestDetailModal, {
  RegistrationDetail,
} from "@/components/PendingRequestDetailModal";
import { getAdminUser, clearAdminSession } from "@/lib/auth";
import AdminAuditTrail from "@/components/AdminAuditTrail";


interface AdminUserListItem {
  user_id: number;
  full_name: string;
  email: string;
  status: string;
  organization_name: string | null;
  role_in_org: string | null;
  is_admin: boolean;
  created_at: string;
}

interface PlatformStats {
  total_tokens_sold: number;
  tokens_sold_this_month: number;
  approved_owners: number;
  approved_owners_this_month: number;
  pending_approvals: number;
  active_tenders: number;
  total_bids: number;
  bids_this_month: number;
  total_revenue_bdt: number;
}

// Formats a number using the en-IN grouping (lakh/crore) convention used
// elsewhere on this page for BDT amounts, e.g. 2416000 -> "24,16,000".
const USERS_PER_PAGE = 10;

function formatIndianGrouping(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

function buildStatCards(stats: PlatformStats | null) {
  const na = "—";
  return [
    {
      label: "Total Tokens Sold",
      value: stats ? formatIndianGrouping(stats.total_tokens_sold) : na,
      sub: stats ? `+${formatIndianGrouping(stats.tokens_sold_this_month)} this month` : "Loading…",
      icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    },
    {
      label: "Approved Owners",
      value: stats ? formatIndianGrouping(stats.approved_owners) : na,
      sub: stats ? `+${formatIndianGrouping(stats.approved_owners_this_month)} this month` : "Loading…",
      icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    },
    {
      label: "Pending Approvals",
      value: stats ? formatIndianGrouping(stats.pending_approvals) : na,
      sub: "Awaiting review",
      icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    },
    {
      label: "Active Tenders",
      value: stats ? formatIndianGrouping(stats.active_tenders) : na,
      sub: "Across all companies",
      icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>),
    },
    {
      label: "Total Bids Placed",
      value: stats ? formatIndianGrouping(stats.total_bids) : na,
      sub: stats ? `+${formatIndianGrouping(stats.bids_this_month)} this month` : "Loading…",
      icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>),
    },
    {
      label: "Revenue (BDT)",
      value: stats ? `৳ ${formatIndianGrouping(stats.total_revenue_bdt)}` : na,
      sub: "From token purchases",
      icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>),
    },
  ];
}

export default function AdminHomePage() {
  const router = useRouter();
  const [pending, setPending] = useState<RegistrationDetail[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [pendingError, setPendingError] = useState("");
  const [approvedIds, setApprovedIds] = useState<number[]>([]);
  const [rejectedIds, setRejectedIds] = useState<number[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<RegistrationDetail | null>(null);
  const [adminName, setAdminName] = useState<string>("System Administrator");
  const [currentAdminUserId, setCurrentAdminUserId] = useState<number | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userActionBusyId, setUserActionBusyId] = useState<number | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const adminUser = getAdminUser();
    if (adminUser?.full_name) {
      setAdminName(adminUser.full_name);
    }
    if (adminUser?.user_id) {
      setCurrentAdminUserId(adminUser.user_id);
    }
  }, []);

  // Fetch pending master accounts from the API
  useEffect(() => {
    const fetchPending = async () => {
      setLoadingPending(true);
      setPendingError("");
      try {
        const res = await fetch("/api/auth/admin/pending-accounts", {
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch pending accounts.");
        }
        const data = await res.json();

        // Map API response to RegistrationDetail[]
        const mapped: RegistrationDetail[] = (data.accounts || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc: any) => ({
            id: acc.user_id,
            orgId: acc.organization_id,
            name: acc.full_name,
            company: acc.organization_name,
            email: acc.email,
            phone: acc.phone || "",
            submittedAt: acc.submitted_at
              ? acc.submitted_at.split("T")[0]
              : "",
            documents: {
              nidFront: acc.documents?.nid_front || null,
              nidBack: acc.documents?.nid_back || null,
              tradeLicense: acc.documents?.trade_license || null,
              tinCertificate: acc.documents?.tin_certificate || null,
              vatCertificate: acc.documents?.vat_certificate || null,
              additionalDocs: acc.documents?.additional_docs || [],
            },
          }),
        );
        setPending(mapped);
      } catch (err) {
        setPendingError(
          err instanceof Error ? err.message : "Unknown error.",
        );
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPending();

    const fetchPricing = async () => {
      try {
        const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
        const res = await fetch('/api/auth/admin/pricing', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setTokenPricing({
            pricePerToken: data.price_per_token?.toString() || "1.00",
            tenderSubmitRate: data.tender_publish_cost?.toString() || "50",
            bidRate: data.bid_cost?.toString() || "20",
          });
        }
      } catch (err) {
        console.error("Failed to load admin pricing:", err);
      }
    };
    fetchPricing();

    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
        const res = await fetch('/api/auth/admin/packages', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
        }
      } catch (err) {
        console.error("Failed to load admin packages:", err);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
        const res = await fetch('/api/auth/admin/stats', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPlatformStats(data);
        }
      } catch (err) {
        console.error("Failed to load platform stats:", err);
      }
    };
    fetchStats();
  }, []);

  const stats = buildStatCards(platformStats);

  // Debounce the search box; a new search always starts from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserPage(1);
      setUserSearch(userSearchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  useEffect(() => {
    let ignore = false;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
        const params = new URLSearchParams({ page: String(userPage), limit: String(USERS_PER_PAGE) });
        if (userSearch) params.set("search", userSearch);
        const res = await fetch(`/api/auth/admin/users?${params}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          setUsers(data.users || []);
          setUserTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        if (!ignore) setLoadingUsers(false);
      }
    };
    fetchUsers();
    return () => {
      ignore = true;
    };
  }, [userPage, userSearch]);

  const userPageCount = Math.max(1, Math.ceil(userTotal / USERS_PER_PAGE));

  const handleUserStatusChange = async (user: AdminUserListItem, newStatus: "Active" | "Suspended" | "Banned") => {
    const verb = newStatus === "Active" ? "reactivate" : newStatus.toLowerCase();
    if (!confirm(`Are you sure you want to ${verb} ${user.full_name}?`)) return;

    const reason = newStatus === "Active" ? undefined : (prompt(`Reason for ${verb === "ban" ? "banning" : "suspending"} ${user.full_name} (optional):`) || undefined);

    setUserActionBusyId(user.user_id);
    try {
      const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
      const res = await fetch('/api/auth/admin/modify-user-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: user.user_id, new_status: newStatus, reason }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, status: newStatus } : u)));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || `Failed to ${verb} user.`);
      }
    } catch (err) {
      alert(`Network error while trying to ${verb} user.`);
    } finally {
      setUserActionBusyId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    clearAdminSession();
    window.location.href = '/admin-login';
  };

  const handleViewDetails = (reg: RegistrationDetail) => {
    setSelectedRegistration(reg);
    setDetailModalOpen(true);
  };

  const [tokenPricing, setTokenPricing] = useState({
    pricePerToken: "1.00",
    tenderSubmitRate: "50",
    bidRate: "20",
  });
  const [pricingSaved, setPricingSaved] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Token Packages State
  interface TokenPackageAdmin {
    package_id: number;
    package_name: string;
    token_amount: number;
    price_bdt: number;
    badge: string | null;
    is_active: boolean;
    original_price_bdt: number;
    savings_percentage: number;
    savings_bdt: number;
  }

  const [packages, setPackages] = useState<TokenPackageAdmin[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TokenPackageAdmin | null>(null);

  const [pkgForm, setPkgForm] = useState({
    package_name: '',
    token_amount: '500',
    price_bdt: '400',
    badge: '',
    is_active: true,
  });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [pkgSuccess, setPkgSuccess] = useState<string | null>(null);

  const reloadPackages = async () => {
    setLoadingPackages(true);
    try {
      const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
      const res = await fetch('/api/auth/admin/packages', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPkgForm({
      package_name: '',
      token_amount: '500',
      price_bdt: '400',
      badge: '',
      is_active: true,
    });
    setPkgError(null);
    setPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: TokenPackageAdmin) => {
    setEditingPackage(pkg);
    setPkgForm({
      package_name: pkg.package_name,
      token_amount: pkg.token_amount.toString(),
      price_bdt: pkg.price_bdt.toString(),
      badge: pkg.badge || '',
      is_active: pkg.is_active,
    });
    setPkgError(null);
    setPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPkgSaving(true);
    setPkgError(null);

    const payload = {
      package_name: pkgForm.package_name.trim(),
      token_amount: parseInt(pkgForm.token_amount, 10),
      price_bdt: parseFloat(pkgForm.price_bdt),
      badge: pkgForm.badge.trim() || null,
      is_active: pkgForm.is_active,
    };

    if (!payload.package_name || isNaN(payload.token_amount) || payload.token_amount <= 0 || isNaN(payload.price_bdt) || payload.price_bdt <= 0) {
      setPkgError('Please enter a valid package name, token amount (> 0), and price in BDT (> 0).');
      setPkgSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
      const url = editingPackage
        ? `/api/auth/admin/packages/${editingPackage.package_id}`
        : '/api/auth/admin/packages';
      const method = editingPackage ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPackageModalOpen(false);
        setPkgSuccess(editingPackage ? 'Package updated successfully!' : 'New package created successfully!');
        setTimeout(() => setPkgSuccess(null), 4000);
        reloadPackages();
      } else {
        const errData = await res.json().catch(() => ({}));
        setPkgError(errData.detail || 'Failed to save package.');
      }
    } catch (err) {
      setPkgError('Network error while saving package.');
    } finally {
      setPkgSaving(false);
    }
  };

  const handleDeletePackage = async (packageId: number, packageName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${packageName}"?`)) return;

    try {
      const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
      const res = await fetch(`/api/auth/admin/packages/${packageId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setPkgSuccess(`Package "${packageName}" deleted successfully.`);
        setTimeout(() => setPkgSuccess(null), 4000);
        reloadPackages();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Failed to delete package.');
      }
    } catch (err) {
      alert('Error deleting package.');
    }
  };

  const handleTogglePackageStatus = async (pkg: TokenPackageAdmin) => {
    try {
      const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
      const res = await fetch(`/api/auth/admin/packages/${pkg.package_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !pkg.is_active }),
      });

      if (res.ok) {
        reloadPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (reg: RegistrationDetail) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/auth/admin/verify/${reg.orgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          verification_status: "Verified",
          review_notes: "Approved by admin",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to verify organization");
      }
      setApprovedIds((prev) => [...prev, reg.id]);
      setDetailModalOpen(false);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleReject = async (reg: RegistrationDetail) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/auth/admin/verify/${reg.orgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          verification_status: "Rejected",
          review_notes: "Rejected by admin",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to verify organization");
      }
      setRejectedIds((prev) => [...prev, reg.id]);
      setDetailModalOpen(false);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTokenPricing((prev) => ({ ...prev, [name]: value }));
    setPricingSaved(false);
    setPricingError(null);
  };

  const handlePricingSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPricingSaving(true);
    setPricingError(null);
    try {
      const token = localStorage.getItem("admin_access_token") || localStorage.getItem("access_token");
      const res = await fetch('/api/auth/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          price_per_token: parseFloat(tokenPricing.pricePerToken) || 1.0,
          tender_publish_cost: parseInt(tokenPricing.tenderSubmitRate) || 50,
          bid_cost: parseInt(tokenPricing.bidRate) || 20,
        }),
      });

      if (res.ok) {
        setPricingSaved(true);
        setTimeout(() => setPricingSaved(false), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setPricingError(errData.detail || "Failed to update pricing");
      }
    } catch (err) {
      console.error("Error saving pricing:", err);
      setPricingError("Network error while saving pricing");
    } finally {
      setPricingSaving(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 border border-subtle rounded bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition text-sm";

  return (
    <main className="min-h-screen bg-app">
      {/* Top Bar */}
      <header className="bg-brand-navy text-white px-6 md:px-8 py-3 flex items-center justify-between border-b border-subtle sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-brand-blue flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight">ProcureNext</span>
          <span className="px-2 py-0.5 bg-white/10 text-white/80 text-[10px] rounded font-semibold border border-white/15">
            ADMIN
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{adminName}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/10 transition cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-in">
        {/* Page Title */}
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Dashboard Overview</h1>
          <p className="text-content-secondary mt-0.5 text-sm">Monitor platform activity and manage registrations.</p>
        </div>

        {/* Stats Grid */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div key={i}
                className="bg-surface rounded border border-subtle flex items-center gap-4 px-4 py-4">
                <div className="bg-app text-content-secondary rounded p-2.5 flex-shrink-0 border border-subtle">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-semibold text-content-primary tabular-nums mt-0.5">{stat.value}</p>
                  <p className="text-content-muted text-xs mt-0.5">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Approvals */}
        <section className="bg-surface rounded border border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-content-primary">Pending Master Account Approvals</h2>
              <p className="text-xs text-content-secondary mt-0.5">Review and approve or reject company owner registrations.</p>
            </div>
            <span className="badge-status badge-pending">
              <span className="badge-dot" />
              {pending.filter((r) => !approvedIds.includes(r.id) && !rejectedIds.includes(r.id)).length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            {loadingPending ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-content-muted mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-content-muted">Loading pending accounts…</p>
              </div>
            ) : pendingError ? (
              <div className="py-10 text-center">
                <p className="text-sm text-status-rejected-text">{pendingError}</p>
              </div>
            ) : pending.length === 0 ? (
              <div className="py-10 text-center">
                <svg className="w-8 h-8 text-content-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-content-muted">No pending accounts to review.</p>
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-app text-content-secondary uppercase text-xs tracking-wider">
                  <th className="px-5 py-2.5 text-left font-medium">#</th>
                  <th className="px-5 py-2.5 text-left font-medium">Full Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Company Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Email Address</th>
                  <th className="px-5 py-2.5 text-left font-medium">Submitted</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {pending.map((reg, idx) => {
                  const isApproved = approvedIds.includes(reg.id);
                  const isRejected = rejectedIds.includes(reg.id);
                  const isActioned = isApproved || isRejected;

                  return (
                    <tr key={reg.id} className={`transition ${isActioned ? "opacity-40" : "hover:bg-app"}`}>
                      <td className="px-5 py-3 text-content-muted font-medium tabular-nums">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-content-primary">{reg.name}</td>
                      <td className="px-5 py-3 text-content-secondary">{reg.company}</td>
                      <td className="px-5 py-3 text-content-secondary">{reg.email}</td>
                      <td className="px-5 py-3 text-content-muted">{reg.submittedAt}</td>
                      <td className="px-5 py-3">
                        {isApproved ? (
                          <span className="badge-status badge-approved"><span className="badge-dot" />Approved</span>
                        ) : isRejected ? (
                          <span className="badge-status badge-rejected"><span className="badge-dot" />Rejected</span>
                        ) : (
                          <span className="badge-status badge-pending"><span className="badge-dot" />Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleViewDetails(reg)}
                          className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded cursor-pointer">
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </section>

        {/* Pending Request Detail Modal */}
        <PendingRequestDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          onAccept={handleApprove}
          onDecline={handleReject}
          registration={selectedRegistration}
        />

        {/* Manage Users */}
        <section className="bg-surface rounded border border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-content-primary">Manage Users</h2>
              <p className="text-xs text-content-secondary mt-0.5">Suspend or ban an account that violates platform policy, or reactivate one.</p>
            </div>
            <input
              type="search"
              value={userSearchInput}
              onChange={(e) => setUserSearchInput(e.target.value)}
              placeholder="Search name, email or organization"
              aria-label="Search users"
              className="h-9 px-3 border border-subtle rounded bg-surface text-sm text-content-primary sm:w-72 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>

          <div className="overflow-x-auto">
            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-content-muted mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-content-muted">Loading users…</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-content-muted">{userSearch ? `No users match "${userSearch}".` : "No users found."}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-app text-content-secondary uppercase text-xs tracking-wider">
                    <th className="px-5 py-2.5 text-left font-medium">Name</th>
                    <th className="px-5 py-2.5 text-left font-medium">Email</th>
                    <th className="px-5 py-2.5 text-left font-medium">Organization</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                    <th className="px-5 py-2.5 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {users.map((u) => {
                    const isSelf = u.user_id === currentAdminUserId;
                    const busy = userActionBusyId === u.user_id;
                    const badgeClass =
                      u.status === "Active" ? "badge-approved" :
                      u.status === "Pending" ? "badge-pending" :
                      u.status === "Banned" ? "badge-rejected" :
                      "badge-draft";
                    return (
                      <tr key={u.user_id} className="hover:bg-app transition">
                        <td className="px-5 py-3 font-medium text-content-primary">
                          {u.full_name}{u.is_admin && <span className="ml-1.5 text-[10px] text-content-muted">(Admin)</span>}
                        </td>
                        <td className="px-5 py-3 text-content-secondary">{u.email}</td>
                        <td className="px-5 py-3 text-content-secondary">{u.organization_name || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`badge-status ${badgeClass}`}><span className="badge-dot" />{u.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          {u.is_admin ? (
                            <span className="text-xs text-content-muted">Not applicable</span>
                          ) : isSelf ? (
                            <span className="text-xs text-content-muted">This is you</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {u.status !== "Active" && (
                                <button
                                  disabled={busy}
                                  onClick={() => handleUserStatusChange(u, "Active")}
                                  className="px-3 py-1.5 rounded text-xs font-medium text-status-approved-text bg-status-approved-bg hover:opacity-80 transition disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                              {u.status !== "Suspended" && (
                                <button
                                  disabled={busy}
                                  onClick={() => handleUserStatusChange(u, "Suspended")}
                                  className="px-3 py-1.5 rounded text-xs font-medium text-content-secondary bg-app hover:bg-subtle border border-subtle transition disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}
                              {u.status !== "Banned" && (
                                <button
                                  disabled={busy}
                                  onClick={() => handleUserStatusChange(u, "Banned")}
                                  className="px-3 py-1.5 rounded text-xs font-medium text-status-rejected-text bg-status-rejected-bg hover:opacity-80 transition disabled:opacity-50"
                                >
                                  Ban
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-5 py-3 border-t border-subtle flex items-center justify-between text-xs text-content-secondary">
            <span className="tabular-nums">
              {userTotal === 0
                ? "0 users"
                : `Showing ${(userPage - 1) * USERS_PER_PAGE + 1}–${Math.min(userPage * USERS_PER_PAGE, userTotal)} of ${userTotal.toLocaleString()} users`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage <= 1 || loadingUsers}
                className="px-3 py-1.5 rounded border border-subtle bg-app hover:bg-subtle disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="tabular-nums">Page {userPage} of {userPageCount}</span>
              <button
                onClick={() => setUserPage((p) => Math.min(userPageCount, p + 1))}
                disabled={userPage >= userPageCount || loadingUsers}
                className="px-3 py-1.5 rounded border border-subtle bg-app hover:bg-subtle disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Audit Trail */}
        <AdminAuditTrail />

        {/* Token & Rate Settings */}
        <section className="bg-surface rounded border border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-subtle">
            <h2 className="text-sm font-semibold text-content-primary">Token & Rate Configuration</h2>
            <p className="text-xs text-content-secondary mt-0.5">Set platform-wide token pricing and activity rates (in BDT tokens).</p>
          </div>

          <form onSubmit={handlePricingSave} className="px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Token Price (BDT per token)</label>
                <p className="text-content-secondary text-xs font-medium mb-2">How much a user pays in BDT to purchase one token.</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">৳</span>
                  <input type="number" name="pricePerToken" min="0.01" step="any" value={tokenPricing.pricePerToken}
                    onChange={handlePricingChange} className={inputClass} placeholder="e.g. 1.50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Tender Submission Rate (tokens)</label>
                <p className="text-content-secondary text-xs font-medium mb-2">Tokens deducted when a company submits a new tender.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <input type="number" name="tenderSubmitRate" min="0" value={tokenPricing.tenderSubmitRate}
                    onChange={handlePricingChange} className={inputClass} placeholder="e.g. 10" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Bid Submission Rate (tokens)</label>
                <p className="text-content-secondary text-xs font-medium mb-2">Tokens deducted each time a user places a bid on a tender.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <input type="number" name="bidRate" min="0" value={tokenPricing.bidRate}
                    onChange={handlePricingChange} className={inputClass} placeholder="e.g. 5" />
                </div>
              </div>
            </div>

            {/* Summary preview */}
            <div className="mt-5 p-4 bg-app border border-subtle rounded">
              <p className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-3">Current Rate Summary</p>
              <div className="flex flex-wrap gap-3">
                {[{ label: "1 Token", val: `৳ ${tokenPricing.pricePerToken}` }].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface border border-subtle rounded px-3 py-2 text-sm">
                    <span className="text-content-secondary">{item.label}:</span>
                    <span className="font-semibold text-content-primary tabular-nums">{item.val}</span>
                  </div>
                ))}
                {[
                  { label: "Submit Tender", val: tokenPricing.tenderSubmitRate },
                  { label: "Place Bid", val: tokenPricing.bidRate },
                ].map((item, i) => (
                  <div key={`tkn-${i}`} className="flex items-center gap-2 bg-surface border border-subtle rounded px-3 py-2 text-sm">
                    <span className="text-content-secondary">{item.label}:</span>
                    <span className="font-semibold text-content-primary tabular-nums">{item.val}</span>
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={pricingSaving}
                className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded disabled:opacity-50 cursor-pointer">
                {pricingSaving ? "Saving Rates..." : "Save Changes"}
              </button>
              {pricingSaved && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold animate-fade-in">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Changes saved successfully!
                </span>
              )}
              {pricingError && (
                <span className="text-rose-600 text-sm font-semibold animate-fade-in">
                  ⚠️ {pricingError}
                </span>
              )}
            </div>
          </form>
        </section>

        {/* ============================================================ */}
        {/* Token Packages Management Section */}
        {/* ============================================================ */}
        <section className="bg-surface rounded border border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-content-primary">Token Bundles & Discount Packages</h2>
              <p className="text-xs text-content-secondary mt-0.5">
                Create custom bundles (e.g. 500 tokens for ৳400). Sellers and buyers will see these with live savings % badges.
              </p>
            </div>

            <button
              onClick={handleOpenCreatePackage}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Package
            </button>
          </div>

          {pkgSuccess && (
            <div className="mx-5 mt-4 p-3 bg-status-approved-bg border border-subtle rounded text-status-approved-text text-sm font-medium flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {pkgSuccess}
            </div>
          )}

          <div className="p-5">
            {loadingPackages ? (
              <div className="py-10 text-center text-content-muted">
                <svg className="animate-spin h-6 w-6 text-content-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading token packages...
              </div>
            ) : packages.length === 0 ? (
              <div className="py-10 text-center text-content-muted bg-app rounded border border-subtle">
                <p className="text-sm font-medium">No token packages created yet.</p>
                <p className="text-xs text-content-muted mt-1">Click "+ Create New Package" above to add your first package bundle.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.package_id}
                    className={`relative rounded border p-4 transition-all flex flex-col justify-between ${
                      pkg.is_active
                        ? 'border-subtle bg-surface hover:border-brand-blue'
                        : 'border-subtle bg-app opacity-75'
                    }`}
                  >
                    {/* Header with status + optional marketing badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <h4 className="font-semibold text-content-primary text-sm">{pkg.package_name}</h4>
                        <span
                          onClick={() => handleTogglePackageStatus(pkg)}
                          className={`cursor-pointer badge-status ${
                            pkg.is_active ? 'badge-approved' : 'badge-draft'
                          }`}
                          title="Click to toggle active status"
                        >
                          <span className="badge-dot" />
                          {pkg.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      {pkg.badge && !/^save\s*\d/i.test(pkg.badge.trim()) && (
                        <span className="badge-status badge-pending flex-shrink-0">
                          <span className="badge-dot" />
                          {pkg.badge}
                        </span>
                      )}
                    </div>

                    {/* Token Size & Pricing */}
                    <div className="space-y-2 py-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-content-primary tabular-nums">{pkg.token_amount.toLocaleString()}</span>
                        <span className="text-xs font-medium text-content-secondary flex items-center gap-1">
                          Tokens
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1 border-t border-subtle">
                        <div>
                          <p className="text-[11px] text-content-muted">Package Price</p>
                          <p className="text-base font-semibold text-content-primary tabular-nums">৳ {pkg.price_bdt.toLocaleString()}</p>
                        </div>
                        {pkg.savings_percentage > 0 && (
                          <div className="text-right">
                            <p className="text-[11px] text-content-muted line-through tabular-nums">৳ {pkg.original_price_bdt.toLocaleString()}</p>
                            <span className="badge-status badge-approved">
                              Save {pkg.savings_percentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-subtle flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="px-3 py-1.5 rounded text-xs font-medium text-content-secondary bg-app hover:bg-subtle border border-subtle transition flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.package_id, pkg.package_name)}
                        className="px-3 py-1.5 rounded text-xs font-medium text-status-rejected-text bg-status-rejected-bg hover:opacity-80 transition flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* Create / Edit Package Modal */}
      {/* ============================================================ */}
      {packageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-surface rounded border border-subtle shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-brand-navy text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {editingPackage ? `Edit Package: ${editingPackage.package_name}` : 'Create New Token Package'}
                </h3>
                <p className="text-xs text-white/60 mt-0.5">Set token size, price in BDT, and discount badge</p>
              </div>
              <button
                onClick={() => setPackageModalOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePackage} className="p-5 space-y-4">
              {pkgError && (
                <div className="p-3 bg-status-rejected-bg border border-subtle rounded text-status-rejected-text text-xs font-medium">
                  ⚠️ {pkgError}
                </div>
              )}

              <div>
                <label className="block text-content-secondary text-xs font-medium uppercase mb-1.5">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pro Business, Summer Special, Starter Pack"
                  value={pkgForm.package_name}
                  onChange={(e) => setPkgForm({ ...pkgForm, package_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded border border-subtle text-sm font-medium text-content-primary focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-content-secondary text-xs font-medium uppercase mb-1.5">
                    Token Size (Amount) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={pkgForm.token_amount}
                    onChange={(e) => setPkgForm({ ...pkgForm, token_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded border border-subtle text-sm font-medium text-content-primary focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-content-secondary text-xs font-medium uppercase mb-1.5">
                    Price in BDT (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="e.g. 400.00"
                    value={pkgForm.price_bdt}
                    onChange={(e) => setPkgForm({ ...pkgForm, price_bdt: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded border border-subtle text-sm font-medium text-content-primary focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-content-secondary text-xs font-medium uppercase mb-1.5">
                  Marketing Badge (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Popular, Best Value, Limited Offer"
                  value={pkgForm.badge}
                  onChange={(e) => setPkgForm({ ...pkgForm, badge: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded border border-subtle text-sm font-medium text-content-primary focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
                <p className="mt-1 text-[11px] text-content-muted">
                  Savings % is calculated automatically below — use this for labels like “Popular”, not “Save 20%”.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkg-active-toggle"
                  checked={pkgForm.is_active}
                  onChange={(e) => setPkgForm({ ...pkgForm, is_active: e.target.checked })}
                  className="rounded border-subtle text-brand-blue focus:ring-brand-blue"
                />
                <label htmlFor="pkg-active-toggle" className="text-sm font-medium text-content-primary cursor-pointer">
                  Enable package immediately (Visible to users)
                </label>
              </div>

              {/* Live Savings Calculation Preview */}
              {(() => {
                const tokens = parseInt(pkgForm.token_amount, 10) || 0;
                const price = parseFloat(pkgForm.price_bdt) || 0;
                const basePrice = parseFloat(tokenPricing.pricePerToken) || 1.0;
                const original = tokens * basePrice;
                const savings = Math.max(0, original - price);
                const savingsPct = original > 0 ? Math.round((savings / original) * 100) : 0;

                return (
                  <div className="bg-app border border-subtle rounded p-4 space-y-2">
                    <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Live Savings Preview</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-content-secondary">Standard Rate ({tokens} × ৳{basePrice.toFixed(2)}):</span>
                      <span className="font-medium text-content-primary tabular-nums">৳ {original.toLocaleString()} BDT</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-content-secondary">Package Price:</span>
                      <span className="font-semibold text-content-primary tabular-nums">৳ {price.toLocaleString()} BDT</span>
                    </div>
                    <div className="pt-2 border-t border-subtle flex items-center justify-between">
                      <span className="text-xs font-medium text-content-primary">User Savings:</span>
                      <span className="badge-status badge-approved tabular-nums">
                        {savings > 0 ? `Save ${savingsPct}% (৳${savings.toLocaleString()} BDT)` : 'No Discount (0%)'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPackageModalOpen(false)}
                  className="px-3.5 h-9 bg-app hover:bg-subtle text-content-secondary font-medium rounded text-sm transition border border-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pkgSaving}
                  className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded disabled:opacity-50"
                >
                  {pkgSaving ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
