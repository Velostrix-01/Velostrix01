# Hotel Loyalty MVP

A static frontend + Supabase backend MVP for hotel/restaurant loyalty cards.

## Files

- `index.html` — customer-facing hotel microsite / loyalty card
- `admin-login.html` — staff login
- `admin.html` — staff dashboard
- `config.js` — Supabase project URL + anon key
- `app.js` — customer card logic
- `admin.js` — staff dashboard logic
- `style.css` — responsive visual system
- `supabase.sql` — database tables, RLS, RPC functions, demo hotel

## Setup

1. Open `supabase.sql` in Supabase → SQL Editor and run it.
2. In Supabase → Authentication → Users, create a staff user with email/password.
3. Copy that user's UUID.
4. In SQL Editor, connect that UUID to the demo hotel:
   ```sql
   insert into public.staff_profiles(id, hotel_id)
   select 'YOUR-AUTH-USER-UUID', id
   from public.hotels
   where slug = 'royal-bites';
   ```
5. Open `config.js` and add the Supabase project URL and anon key from Project Settings → API.
6. Host the folder on Vercel / Netlify / any static host.

## Customer card flow

Staff opens `admin.html`, signs in, creates a member, then copies the generated card link and sends it to the guest (for example through WhatsApp).

Customer opens:
`index.html?hotel=royal-bites&card=<PRIVATE_CARD_TOKEN>`

Only staff-authenticated RPC calls can add visits or redeem rewards.

## Production next steps

- Add hotel onboarding / super-admin.
- Add custom domains or subdomains per hotel.
- Add WhatsApp deep-link generation.
- Add QR code for each loyalty card.
- Add duplicate-visit protection / visit cooldown rules.
- Add reward configuration in admin.
- Add audit log and role-based staff permissions.
