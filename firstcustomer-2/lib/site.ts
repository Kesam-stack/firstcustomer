export const CANONICAL_HOST = "firstcustomer.xyz";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
export const CONTACT_EMAIL = "hello@firstcustomer.xyz";

export function isCanonicalHost(host: string) {
  const clean = host.split(":")[0].trim().toLowerCase();
  return clean === CANONICAL_HOST || clean === `www.${CANONICAL_HOST}`;
}

export function siteUrl(path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_ORIGIN}${p}`;
}
