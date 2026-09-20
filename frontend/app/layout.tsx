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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-app text-content-primary antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
