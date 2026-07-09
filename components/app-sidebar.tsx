'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plane,
  Hotel,
  Calculator,
  Bell,
  Tag,
  Award,
  Sparkles,
  User,
  CreditCard,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/voos', label: 'Voos', icon: Plane },
  { href: '/hoteis', label: 'Hotéis', icon: Hotel },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/promocoes', label: 'Promoções', icon: Tag },
  { href: '/programas', label: 'Programas', icon: Award },
  { href: '/consultor-ia', label: 'Consultor IA', icon: Sparkles },
];

const ACCOUNT_ITEMS = [
  { href: '/perfil', label: 'Perfil', icon: User },
  { href: '/assinatura', label: 'Assinatura', icon: CreditCard },
];

export function AppSidebar({ isAdmin, onSignOut }: { isAdmin: boolean; onSignOut: () => void }) {
  const pathname = usePathname();

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card p-4">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <Plane className="h-5 w-5 text-primary" />
        <span className="font-semibold">Radar Milhas</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">{NAV_ITEMS.map(renderItem)}</nav>

      <div className="my-3 h-px bg-border" />

      <nav className="flex flex-col gap-1">
        {ACCOUNT_ITEMS.map(renderItem)}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
        <button
          onClick={onSignOut}
          className="mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </nav>
    </aside>
  );
}
