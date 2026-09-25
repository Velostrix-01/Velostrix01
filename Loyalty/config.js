/*
  1) Replace SUPABASE_URL and SUPABASE_ANON_KEY with the values from:
     Supabase Dashboard → Project Settings → API.
  2) Keep the anon key here; NEVER put the service_role key in frontend code.
*/

window.APP_CONFIG = {
  SUPABASE_URL: "https://nfzhrckgubuxyrodftxg.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_XUobTJ-ynbXQDHWg12A5kw_Z0-ioxmq",
  DEFAULT_HOTEL_SLUG: "royal-bites",
  APP_BASE_URL: window.location.origin
};
