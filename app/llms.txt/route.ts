import { NextResponse } from 'next/server';

// GEO (Generative Engine Optimization): /llms.txt segue o formato proposto
// em llmstxt.org — H1, resumo em blockquote, seções H2 com links markdown
// + uma frase cada. Ajuda ChatGPT/Gemini/Perplexity/Claude a entender e
// citar o produto corretamente, sem custo (é um arquivo de texto, não um
// serviço). Route Handler em vez de arquivo estático em public/ porque a
// URL do site depende de NEXT_PUBLIC_APP_URL (domínio ainda não definido
// em produção — ver README.md checklist) e não pode ficar hardcoded
// errado até lá. Ver SEO_GEO.md.
export const dynamic = 'force-static';

function buildLlmsTxt(siteUrl: string): string {
  return `# Radar Milhas & Viagens

> Clube de assinatura brasileiro que compara o preço de passagens aéreas e hotéis pago em
> dinheiro contra o custo real de usar pontos/milhas de programas de fidelidade (Livelo,
> Esfera, Smiles, LATAM Pass, Azul Fidelidade e outros), calcula o valor do milheiro e
> recomenda a melhor forma de pagar. Envia alertas por e-mail ou WhatsApp quando o preço cai
> ou aparece uma boa oportunidade de resgate. Não é uma agência de viagens: não vende
> passagens, não faz reserva, não emite bilhete — cada usuário compra direto no site oficial
> do fornecedor.

## Produto

- [Home](${siteUrl}/): proposta de valor, busca de hospedagem/voo e exemplo de comparação
  dinheiro vs pontos.
- [Calculadora de pontos](${siteUrl}/calculadora): ferramenta gratuita e sem cadastro pra
  calcular se vale mais pagar em dinheiro, usar pontos, comprar pontos ou transferir com
  bônus.
- [Promoções](${siteUrl}/promocoes): vitrine pública de transferências bonificadas, compra
  de pontos e cupons ativos, curados manualmente.
- [Programas de pontos monitorados](${siteUrl}/programas): catálogo de programas de
  fidelidade com o valor médio do milheiro de cada um.

## Planos

- [Preços e planos](${siteUrl}/#precos): Free (buscas limitadas, 1 alerta), Premium (buscas
  ilimitadas, 10 alertas, e-mail), Pro (WhatsApp, IA consultora, 50 alertas), Consultor/
  Agência (múltiplos clientes).

## Legal

- [Termos de uso](${siteUrl}/termos)
- [Política de privacidade](${siteUrl}/privacidade)
- [Aviso de não garantia de preço](${siteUrl}/aviso-precos): preços e disponibilidade mudam
  a qualquer momento; o produto é informativo, não uma agência de viagens.

## Optional

- [Política de afiliados](${siteUrl}/politica-afiliados)
`;
}

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new NextResponse(buildLlmsTxt(siteUrl), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
