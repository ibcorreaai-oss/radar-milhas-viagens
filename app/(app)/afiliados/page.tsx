import { redirect } from 'next/navigation';
import { Gift, Users } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CopyReferralLink } from './copy-referral-link';

// ETAPA 15.1 (ver GROWTH.md §"Programa de indicação") — cada usuário já
// nasce com um `referral_code` (trigger handle_new_user,
// supabase/migrations/0013). Sem payout/comissão automática aqui — isso
// exigiria uma camada financeira própria (quem aprova, como paga, como
// evita fraude), decisão de negócio do Igor documentada como pendente em
// GROWTH.md, não implementada nesta etapa.
export default async function AfiliadosPage() {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();
  // RPC, não select direto: RLS de profiles só libera ver a própria linha
  // (ou admin) — abrir uma policy pra "linhas que eu indiquei" exporia o
  // perfil inteiro de quem foi indicado, não só uma contagem. Ver
  // supabase/migrations/0014_referral_count_rpc.sql.
  const { data: referredCount } = await supabase.rpc('count_my_referrals');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const referralLink = `${appUrl}/cadastro?ref=${ctx.profile?.referral_code ?? ''}`;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Indique e ganhe</h1>
        <p className="mt-1 text-muted-foreground">
          Compartilhe seu link e acompanhe quem entrou no clube pela sua indicação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Seu código: {ctx.profile?.referral_code}
          </CardTitle>
          <CardDescription>Qualquer pessoa que se cadastrar por este link fica ligada à sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <CopyReferralLink link={referralLink} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {referredCount ?? 0} pessoa(s) indicada(s)
          </CardTitle>
          <CardDescription>
            Cadastros feitos com o seu link, desde sempre.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
