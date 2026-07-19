import type { Metadata } from 'next';
import './globals.css';

import { cookies } from 'next/headers';
import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'ProcureNext',
  description: 'A procurement management application',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const tokenExists = !!cookieStore.get('access_token');

  return (
    <html lang="en">
      <body>
        <AuthGuard tokenExists={tokenExists}>{children}</AuthGuard>
      </body>
    </html>
  );
}
