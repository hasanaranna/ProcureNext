'use client';

interface TenderCardProps {
  title: string;
  subtitle: string;
  vendor?: string;
  status?: string;
  deadline?: string | null;
  onClick?: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  Draft: 'badge-draft',
  Published: 'badge-approved',
  Closed: 'badge-pending',
  Awarded: 'badge-approved',
  Cancelled: 'badge-rejected',
  Approved: 'badge-approved',
  Pending: 'badge-pending',
  Rejected: 'badge-rejected',
};

export default function TenderCard({ title, subtitle, vendor, status, deadline, onClick }: TenderCardProps) {
  const badgeClass = status ? STATUS_BADGE[status] || 'badge-draft' : '';

  return (
    <div
      onClick={onClick}
      className={`group bg-surface border border-subtle overflow-hidden flex flex-col transition-colors ${
        vendor ? 'h-full' : ''
      } ${
        onClick
          ? 'cursor-pointer hover:border-content-muted'
          : ''
      }`}
    >
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded bg-brand-navy flex items-center justify-center text-white flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {status && (
                <span className={`badge-status ${badgeClass}`}>
                  <span className="badge-dot" />
                  {status}
                </span>
              )}
              {deadline && (
                <span className="text-content-secondary text-xs font-medium">
                  Due {new Date(deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-content-primary leading-snug">
              {title}
            </h3>
            <p className="text-xs text-content-secondary mt-1 line-clamp-2">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      {vendor && (
        <div className="border-t border-subtle bg-app px-4 py-2.5">
          <p className="text-xs font-medium text-content-secondary">
            <span className="text-content-muted">Vendor: </span>
            <span className="text-content-primary">{vendor}</span>
          </p>
        </div>
      )}
    </div>
  );
}
