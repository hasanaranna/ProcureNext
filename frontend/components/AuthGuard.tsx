'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const publicRoutes = ['/login', '/signup-master', '/signup-user', '/admin-login'];

export default function AuthGuard({
  children,
  tokenExists,
}: {
  children: React.ReactNode;
  tokenExists: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // We only guard client-side to prevent hydration mismatch
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!tokenExists && !isPublicRoute) {
      router.replace('/login');
    } else if (tokenExists && (isPublicRoute || pathname === '/')) {
      router.replace('/home');
    } else {
      setAuthorized(true);
    }
  }, [pathname, tokenExists, router]);

  // Optionally show a loading spinner while checking auth, but since we know tokenExists immediately,
  // we can render if authorized, otherwise null to prevent flash of content.
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
