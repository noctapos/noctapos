/* /detail?slug=...  -> halaman artikel + meta SEO yang diisi dari D1 di sisi server */
import { servePost } from './_lib/seo.js';
export const onRequest = (ctx) => servePost(ctx, 'artikel');
