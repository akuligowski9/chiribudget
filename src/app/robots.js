export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/discussion', '/unsorted', '/settings'],
    },
    sitemap: 'https://chiribudget.vercel.app/sitemap.xml',
  };
}
