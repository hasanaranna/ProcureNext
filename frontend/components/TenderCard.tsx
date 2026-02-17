'use client';

interface TenderCardProps {
  title: string;
  subtitle: string;
  vendor: string;
}

export default function TenderCard({ title, subtitle, vendor }: TenderCardProps) {
  return (
    <div style={{ backgroundColor: '#f9fafb', borderColor: '#9ca3af', borderWidth: '3px' }} className="rounded-2xl shadow-md overflow-hidden flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-start gap-4">
          <div style={{ backgroundColor: '#d1d5db' }} className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
            📋
          </div>
          <div className="flex-1">
            <h3 style={{ color: '#111827' }} className="text-lg font-bold">{title}</h3>
            <p style={{ color: '#6b7280' }} className="text-sm mt-1">{subtitle}</p>
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: '#374151' }} className="px-6 py-3 rounded-b-lg">
        <p style={{ color: '#e5e7eb' }} className="text-sm font-semibold">
          <span style={{ color: '#9ca3af' }}>Vendor: </span>
          {vendor}
        </p>
      </div>
    </div>
  );
}
