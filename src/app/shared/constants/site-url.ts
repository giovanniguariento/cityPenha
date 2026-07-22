import { environment } from '../../../environments/environment';

/** Public site origin without trailing slash. */
export const SITE_URL = (environment.siteUrl || 'https://citypenhadigital.com.br').replace(
  /\/$/,
  ''
);
