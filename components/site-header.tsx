import Link from 'next/link';
import { Plane } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { SiteMobileNav } from '@/components/site-mobile-nav';
import { cn } from '@/lib/utils';

// Header público — usado na landing page e nas páginas legais (termos, privacidade, etc).
// Não tem relação com components/app-shell.tsx, que é o shell das páginas logadas.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-4 w-4" />
          </span>
          <span className="text-base">
            Radar Milhas <span className="text-muted-foreground font-normal">&amp; Viagens</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/#como-funciona" className="transition-colors hover:text-foreground">
            Como funciona
          </Link>
          <Link href="/#precos" className="transition-colors hover:text-foreground">
            Preços
          </Link>
          <Link href="/termos" className="transition-colors hover:text-foreground">
            Termos
          </Link>
          <Link href="/contato" className="transition-colors hover:text-foreground">
            Contato
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden md:inline-flex" />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden md:inline-flex')}
          >
            Entrar
          </Link>
          <Link href="/cadastro" className={cn(buttonVariants({ size: 'sm' }))}>
            Criar conta grátis
          </Link>
          <SiteMobileNav />
        </div>
      </div>
    </header>
  );
}
