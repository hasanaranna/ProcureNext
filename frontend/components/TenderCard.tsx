'use client';

interface TenderCardProps {
  title: string;
  subtitle: string;
  vendor?: string;
  status?: string;
  deadline?: string | null;
  onClick?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-amber-50 text-amber-800 border-amber-200',
  Awarded: 'bg-violet-50 text-violet-700 border-violet-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function TenderCard({ title, subtitle, vendor, status, deadline, onClick }: TenderCardProps) {
  const statusClass = status ? STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200' : '';

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
        vendor ? 'h-full' : ''
      } ${
        onClick
          ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] hover:border-accent-300'
          : ''
      }`}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy-800 flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:bg-accent-600 transition-colors duration-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {status && (
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusClass}`}>
                  {status}
                </span>
              )}
              {deadline && (
                <span className="text-[10px] font-semibold text-slate-500">
                  Due {new Date(deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-navy-900 leading-snug group-hover:text-accent-700 transition-colors duration-300">
              {title}
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      {vendor && (
        <div className="bg-navy-900 px-5 py-3">
          <p className="text-sm font-medium text-slate-300">
            <span className="text-slate-500">Vendor: </span>
            <span className="text-white">{vendor}</span>
          </p>
        </div>
      )}
    </div>
  );
}
