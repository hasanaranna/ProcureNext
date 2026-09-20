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
      className={`group bg-surface border border-subtle rounded shadow-subtle-card overflow-hidden flex flex-col transition-colors ${
        vendor ? 'h-full' : ''
      } ${
        onClick
          ? 'cursor-pointer hover:border-content-muted'
          : ''
      }`}
    >
      <div className="p-3.5 flex-1">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded bg-brand-navy flex items-center justify-center text-white flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {status && (
                <span className={`badge-status ${badgeClass}`}>
                  <span className="badge-dot" />
                  {status}
                </span>
              )}
              {deadline && (
                <span className="text-content-secondary text-[11px] font-medium tabular-nums">
                  Due {new Date(deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-content-primary leading-snug">
              {title}
            </h3>
            <p className="text-xs text-content-secondary mt-0.5 line-clamp-2">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      {vendor && (
        <div className="border-t border-subtle bg-app px-3.5 py-2">
          <p className="text-[11px] font-medium text-content-secondary truncate">
            <span className="text-content-muted">Org: </span>
            <span className="text-content-primary">{vendor}</span>
          </p>
        </div>
      )}
    </div>
  );
}
