'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plane } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { createClient } from '@/lib/supabase/client';
import type { FeatureFlagKey } from '@/lib/types';

export function AppShell({
  isLoggedIn,
  isAdmin,
  flags = {},
  children,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  flags?: Partial<Record<FeatureFlagKey, boolean>>;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Plane className="h-5 w-5 text-primary" />
            Radar Milhas & Viagens
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">
              Criar conta grátis
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={isAdmin} flags={flags} onSignOut={handleSignOut} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
