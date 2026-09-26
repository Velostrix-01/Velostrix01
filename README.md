# LOYALTY OS v2 — Sambhaji Nagar (Aurangabad)

This version replaces the old private card-link model with one customer account that can hold multiple venue memberships.

## Product flow

### Customer
1. Open `index.html`.
2. Create an account with full name, Indian mobile number and a unique username.
3. Set a password and sign in with username + password.
4. Explore only registered venues in **Sambhaji Nagar (Aurangabad)**.
5. Show the username to a venue staff member and ask them to add that venue's loyalty program.
6. Return to the same or another venue; staff searches the same username and marks verified visits.
7. Rewards appear under the matching venue membership.

### Staff
1. Create a staff Auth user in Supabase using email/password.
2. Connect the Auth user's UUID to a venue in `public.venue_staff`.
3. Open `admin-login.html`.
4. Search customers by username.
5. Add the venue to the customer account.
6. Mark verified visits and redeem active rewards.

## Supabase setup

1. Open `supabase.sql` in Supabase SQL Editor and run it.
2. In **Authentication -> Settings**, disable email confirmation for this username/password flow. Customer accounts use an internal username-based login identifier; mobile number is saved in the customer profile. Add the customer-care phone in `config.js` under `SUPPORT_PHONE` so the Forgot password panel can show a tap-to-call button.
3. Create staff users under **Authentication -> Users**.
4. Link each staff UUID to a venue with the SQL snippet at the end of `supabase.sql`.
5. Confirm `config.js` contains your Supabase project URL and anon/publishable key.
6. Host the folder on GitHub Pages, Vercel, Netlify, etc.

## Location scope

There is deliberately **no GPS / browser location system**. The platform is city-scoped to exactly:

`Sambhaji Nagar (Aurangabad)`

The `venues` table enforces that city value, and public venue queries only expose active venues in that city.

## Important implementation detail

The SQL migration intentionally leaves the old MVP tables (`hotels`, `customers`, `visits`, `rewards`, `staff_profiles`) in place so existing demo data is not automatically deleted. The v2 application uses the new `venues`, `customer_accounts`, `venue_staff`, `loyalty_memberships`, `loyalty_visits`, `loyalty_rewards`, `offers`, and `menus` tables.

## Reward configuration

For this first v2 build, the loyalty program defaults inside the RPCs are **6 visits** and **45 days** with a generic `Special reward` label. The data model is ready for a future per-venue loyalty-program configuration table.

## Menu PDFs and photos

- Add published PDF URLs to `public.menus.file_url`.
- Add public image URLs to `public.venues.photos`.
- Add offers to `public.offers`.

Storage buckets and upload UI are not created by this MVP; the pages accept public URLs.

## Security

- Frontend uses only the Supabase anon/publishable key.
- No service_role key belongs in the browser.
- Customer profile and loyalty data are protected with RLS.
- Staff mutations happen through security-definer RPCs that verify staff venue assignment.
- Customers cannot add their own visits.
