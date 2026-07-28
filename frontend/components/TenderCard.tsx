'use client';

interface TenderCardProps {
  title: string;
  subtitle: string;
  vendor?: string;
  onClick?: () => void;
}

export default function TenderCard({ title, subtitle, vendor, onClick }: TenderCardProps) {
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
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-lg flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300">
            📋
          </div>
          <div className="flex-1 min-w-0">
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
