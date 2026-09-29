'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface OrgDocumentItem {
  document_id: number;
  document_type: string;
  file_path: string;
  file_url: string | null;
  review_status: string;
  uploaded_at: string | null;
}

interface OrgPublishedTenderItem {
  tender_id: number;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  submission_deadline: string | null;
  status: string;
  created_at: string | null;
}

interface OrgPerformanceSummary {
  average_rating: number;
  total_reviews: number;
  recent_feedback: Array<{
    rating: number;
    feedback: string;
    completion_status: string | null;
    recorded_at: string | null;
  }>;
}

interface OrgProfile {
  organization_id: number;
  organization_name: string;
  organization_type: 'Buyer' | 'Vendor';
  address: string | null;
  website: string | null;
  description: string | null;
  verification_status: 'Verified' | 'Pending' | 'Rejected';
  tin_number: string | null;
  bin_number: string | null;
  created_at: string | null;
  member_count: number;
  is_enlisted: boolean;
  documents: OrgDocumentItem[];
  published_tenders: OrgPublishedTenderItem[];
  performance: OrgPerformanceSummary | null;
}

export default function OrganizationProfilePage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enlisting, setEnlisting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'activity'>('overview');

  useEffect(() => {
    if (!orgId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/org/profile/${orgId}`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to load organization profile');
        }
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [orgId, router]);

  const handleToggleEnlist = async () => {
    if (!profile) return;
    setEnlisting(true);
    const isCurrentlyEnlisted = profile.is_enlisted;

    try {
      const endpoint = `/api/org/enlist/${profile.organization_id}`;
      const method = isCurrentlyEnlisted ? 'DELETE' : 'POST';
      const res = await fetch(endpoint, { method });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update enlistment');
      }

      setProfile({
        ...profile,
        is_enlisted: !isCurrentlyEnlisted,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update enlistment');
    } finally {
      setEnlisting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-app">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-content-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-content-muted text-lg font-medium">Loading organization profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex flex-col items-center justify-center gap-4 bg-app">
        <div className="w-16 h-16 rounded-full bg-status-rejected-bg flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-status-rejected-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-status-rejected-text text-lg font-medium">{error || 'Organization not found'}</p>
        <button
          onClick={() => router.push('/organizations')}
          className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
        >
          Back to Directory
        </button>
      </main>
    );
  }

  const isBuyer = profile.organization_type === 'Buyer';
  const isVerified = profile.verification_status === 'Verified';

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-app">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Navigation */}
        <button
          onClick={() => router.push('/organizations')}
          className="mb-6 flex items-center gap-2 text-content-muted hover:text-content-primary transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Organization Directory</span>
        </button>

        {/* Hero Organization Header Card */}
        <div className="bg-surface rounded border border-subtle overflow-hidden mb-8">
          <div className="bg-brand-navy p-8 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div
                  className="w-20 h-20 rounded flex items-center justify-center text-3xl font-bold text-white flex-shrink-0 bg-brand-navy border border-white/20"
                >
                  {profile.organization_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <span className="badge-status badge-draft">
                      <span className="badge-dot" />{profile.organization_type} Organization
                    </span>
                    <span className={`badge-status ${isVerified ? 'badge-approved' : 'badge-pending'}`}>
                      <span className="badge-dot" />
                      {isVerified ? 'Verified Partner' : 'Verification Pending'}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{profile.organization_name}</h1>
                  <p className="text-slate-400 text-xs mt-1">
                    Member since {formatDate(profile.created_at)} • {profile.member_count} Organization Team Member(s)
                  </p>
                </div>
              </div>

              {/* Enlist / Delist Action Button */}
              <button
                onClick={handleToggleEnlist}
                disabled={enlisting}
                className={`text-sm font-medium h-9 px-3.5 rounded transition flex items-center gap-2 whitespace-nowrap self-stretch sm:self-auto justify-center ${
                  profile.is_enlisted
                    ? 'bg-status-approved-text hover:bg-red-600 text-white'
                    : 'bg-white text-brand-navy hover:bg-slate-100'
                }`}
              >
                {enlisting ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : profile.is_enlisted ? (
                  <>
                    <span>✓ In Your Enlisted Sellers</span>
                  </>
                ) : (
                  <>
                    <span>+ Enlist as Seller</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-t border-subtle bg-app px-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'overview'
                  ? 'border-brand-navy text-content-primary'
                  : 'border-transparent text-content-muted hover:text-content-primary'
              }`}
            >
              Overview & Credentials
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'documents'
                  ? 'border-brand-navy text-content-primary'
                  : 'border-transparent text-content-muted hover:text-content-primary'
              }`}
            >
              Verified Documents ({profile.documents.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'activity'
                  ? 'border-brand-navy text-content-primary'
                  : 'border-transparent text-content-muted hover:text-content-primary'
              }`}
            >
              {isBuyer
                ? `Published Tenders (${profile.published_tenders.length})`
                : `Performance & Reviews (${profile.performance?.total_reviews || 0})`}
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Credentials */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Left: About */}
            <div className="md:col-span-2 bg-surface rounded p-8 border border-subtle">
              <h3 className="text-lg font-bold text-content-primary mb-4">About Organization</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-6">
                {profile.description || 'No detailed overview has been provided by this organization.'}
              </p>

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Official Identifiers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-app rounded p-4 border border-subtle">
                  <p className="text-xs text-slate-400 font-semibold mb-1">TIN Number</p>
                  <p className="text-sm font-medium text-content-primary">{profile.tin_number || 'Registered on file'}</p>
                </div>
                <div className="bg-app rounded p-4 border border-subtle">
                  <p className="text-xs text-slate-400 font-semibold mb-1">BIN Number</p>
                  <p className="text-sm font-medium text-content-primary">{profile.bin_number || 'Registered on file'}</p>
                </div>
              </div>
            </div>

            {/* Right: Contact & Details */}
            <div className="bg-surface rounded p-8 border border-subtle space-y-6">
              <h3 className="text-lg font-bold text-content-primary mb-4">Contact Details</h3>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Address / Headquarters</p>
                <p className="text-sm font-semibold text-slate-700 flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{profile.address || 'Address not provided'}</span>
                </p>
              </div>

              {profile.website && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Official Website</p>
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-brand-blue hover:text-brand-blue/80 underline flex items-center gap-1.5"
                  >
                    <span>{profile.website}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Verification Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge-status ${isVerified ? 'badge-approved' : 'badge-pending'}`}>
                    <span className="badge-dot" />{profile.verification_status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Verified Documents */}
        {activeTab === 'documents' && (
          <div className="bg-surface rounded p-8 border border-subtle mb-8">
            <h3 className="text-lg font-bold text-content-primary mb-2">Organizational Credentials & Documents</h3>
            <p className="text-slate-500 text-xs mb-6">
              Verified legal documents securely hosted on Supabase Storage.
            </p>

            {profile.documents.length === 0 ? (
              <div className="bg-app rounded p-10 text-center border border-subtle">
                <svg className="w-10 h-10 text-content-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-content-muted font-medium text-sm">No public documents uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between p-4 bg-app hover:bg-slate-100 rounded border border-subtle transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded bg-app text-brand-blue flex items-center justify-center font-bold text-sm">
                        📄
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content-primary truncate">{doc.document_type}</p>
                        <span className={`badge-status mt-0.5 ${
                          doc.review_status === 'Approved' || doc.review_status === 'Verified' ? 'badge-approved' :
                          doc.review_status === 'Rejected' ? 'badge-rejected' :
                          'badge-pending'
                        }`}>
                          <span className="badge-dot" />{doc.review_status}
                        </span>
                      </div>
                    </div>

                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-surface hover:bg-app text-brand-blue text-xs font-medium rounded border border-subtle transition shadow-sm"
                      >
                        View File ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">On File</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Activity / Tenders / Reviews */}
        {activeTab === 'activity' && (
          <div className="bg-surface rounded p-8 border border-subtle mb-8">
            {isBuyer ? (
              <>
                <h3 className="text-lg font-bold text-content-primary mb-2">Published Tenders</h3>
                <p className="text-slate-500 text-xs mb-6">Open procurement opportunities issued by this buyer.</p>

                {profile.published_tenders.length === 0 ? (
                  <div className="bg-app rounded p-10 text-center border border-subtle">
                    <p className="text-content-muted font-medium text-sm">No active published tenders at this moment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.published_tenders.map((tender) => (
                      <div
                        key={tender.tender_id}
                        onClick={() => router.push(`/bid-for-tender?id=${tender.tender_id}`)}
                        className="p-5 bg-app hover:bg-slate-100 rounded border border-subtle transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div>
                          <span className={`badge-status ${
                            tender.status === 'Published' || tender.status === 'Open' || tender.status === 'Awarded' || tender.status === 'Active' ? 'badge-approved' :
                            tender.status === 'Draft' ? 'badge-draft' :
                            tender.status === 'Rejected' || tender.status === 'Cancelled' ? 'badge-rejected' :
                            'badge-pending'
                          }`}>
                            <span className="badge-dot" />{tender.status || `Tender #${tender.tender_id}`}
                          </span>
                          <h4 className="text-base font-medium text-content-primary mt-1">{tender.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tender.description}</p>
                        </div>
                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <span className="text-xs text-slate-500">
                            Deadline: <strong>{formatDate(tender.submission_deadline)}</strong>
                          </span>
                          <button className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition">
                            View Tender →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-content-primary">Vendor Performance & Ratings</h3>
                    <p className="text-slate-500 text-xs">Evaluations recorded from completed contracts.</p>
                  </div>
                  {profile.performance && profile.performance.total_reviews > 0 && (
                    <div className="flex items-center gap-2 bg-status-pending-bg border border-amber-200 px-4 py-2 rounded">
                      <span className="text-amber-500 text-xl font-bold">★</span>
                      <span className="text-lg font-bold text-content-primary">{profile.performance.average_rating.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({profile.performance.total_reviews} reviews)</span>
                    </div>
                  )}
                </div>

                {!profile.performance || profile.performance.total_reviews === 0 ? (
                  <div className="bg-app rounded p-10 text-center border border-subtle">
                    <p className="text-content-muted font-medium text-sm">No performance reviews recorded yet for this vendor.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.performance.recent_feedback.map((fb, idx) => (
                      <div key={idx} className="p-4 bg-app rounded border border-subtle">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1 text-amber-500 text-sm">
                            {'★'.repeat(Math.round(fb.rating))}
                            <span className="text-xs font-medium text-content-primary ml-1">({fb.rating.toFixed(1)})</span>
                          </div>
                          <span className="text-xs text-slate-400">{formatDate(fb.recorded_at)}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">&ldquo;{fb.feedback}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
