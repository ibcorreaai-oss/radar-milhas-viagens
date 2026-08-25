'use client';

import { useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Plane } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppMobileNav } from '@/components/app-mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { readStoredSidebarCollapsed, writeStoredSidebarCollapsed } from '@/lib/sidebar';
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // useLayoutEffect (não useEffect) pra ler a preferência salva ANTES do
  // navegador pintar o primeiro frame — minimiza o salto visual de
  // "abre expandida, encolhe de repente" que useEffect (assíncrono, roda
  // depois do paint) causaria. Ver ETAPA 12 — Collapsible Sidebar.
  useLayoutEffect(() => {
    setCollapsed(readStoredSidebarCollapsed());
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      writeStoredSidebarCollapsed(next);
      return next;
    });
  }

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
            <ThemeToggle />
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
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        isAdmin={isAdmin}
        flags={flags}
        onSignOut={handleSignOut}
        className="hidden md:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra mobile: sidebar de app-sidebar.tsx é `hidden md:flex`, então
            abaixo de md não existe navegação nenhuma sem isto — achado real
            na auditoria de arquitetura da ETAPA 12 (Collapsible Sidebar). */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Plane className="h-5 w-5 text-primary" />
            Radar Milhas
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>

      <AppMobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isAdmin={isAdmin}
        flags={flags}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
