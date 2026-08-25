import Script from 'next/script';

// ETAPA 15.1 (ver GROWTH.md) — cada script só carrega se a variável de
// ambiente correspondente estiver preenchida; sem nenhuma configurada
// (estado atual do projeto), este componente não renderiza nada — zero
// requisição de terceiro, zero custo, zero impacto de performance.
// `strategy="afterInteractive"` (não `beforeInteractive`): analytics/pixel
// nunca deve atrasar o primeiro paint da página.
export function AnalyticsScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const twitterPixelId = process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID;
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  // GA4 e Google Ads Conversion usam o mesmo gtag.js — um `config` por id.
  const gtagIds = [gaId, googleAdsId].filter((id): id is string => Boolean(id));

  return (
    <>
      {gtagIds.length > 0 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${gtagIds.map((id) => `gtag('config', '${id}');`).join('\n')}`}
          </Script>
        </>
      )}

      {metaPixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
      )}

      {twitterPixelId && (
        <Script id="twitter-pixel-init" strategy="afterInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},
s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${twitterPixelId}');`}
        </Script>
      )}

      {tiktokPixelId && (
        <Script id="tiktok-pixel-init" strategy="afterInteractive">
          {`!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<e.methods.length;n++)ttq.setAndDefer(e,e.methods[n]);return e},ttq.load=function(e,n){var o="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=o,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=o+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
ttq.load('${tiktokPixelId}');
ttq.page();
}(window, document, 'ttq');`}
        </Script>
      )}
    </>
  );
}
