// Public business facts. Secrets belong only in server environment variables.
export const site = {
  url: process.env.SITE_URL || 'https://reacstudio.com',
  name: 'Reac Studio',
  alternateNames: ['ReacStudio', 'REAC Studio', 'reacstudio.com'],
  title: 'Reac Studio | Desarrollo Web, Marketing y Automatización',
  description: 'Reac Studio: desarrollo web, landing pages, marketing digital y automatización para empresas, PyMEs y profesionales. Desde Córdoba para Argentina y Latinoamérica.',
  // Keep the verified Gmail fallback until a corporate mailbox exists. Override
  // PUBLIC_CONTACT_EMAIL at build time only after the new address can receive mail.
  email: process.env.PUBLIC_CONTACT_EMAIL || 'ledesma.rme@gmail.com',
  whatsapp: '5493544657866',
  analyticsId: 'G-8VJDB377CE',
  logo: '/uploads/reac-symbol.svg',
  indexNowKey: "45483afbcd991fa6735a61e3a0996204", // Public ownership proof, not a secret.
  socialProfiles: [
    'https://www.instagram.com/reacstudio/',
    'https://www.tiktok.com/@reac.studio',
    'https://www.facebook.com/profile.php?id=61594342015629'
  ],
  legal: { responsible: '', address: '', effectiveDate: '' },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
    bing: process.env.BING_SITE_VERIFICATION || ''
  },
  // Search crawlers and training permissions are independent. Preserve existing
  // general permission until the owner explicitly changes the training policy.
  allowTraining: true
};
const parsed = new URL(site.url);
if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
  throw new Error('SITE_URL must be an HTTPS origin without path, credentials, query or hash.');
}
site.url = parsed.origin;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email)) throw new Error('PUBLIC_CONTACT_EMAIL must be a valid email address.');
