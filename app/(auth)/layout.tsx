import Link from 'next/link';
import { Plane } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Plane className="h-5 w-5 text-primary" />
        Radar Milhas & Viagens
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
