import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProcureNext — Enterprise Procurement Platform',
  description: 'Streamline your procurement processes with ProcureNext. Manage tenders, bids, and vendor relationships on a secure, enterprise-grade platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
