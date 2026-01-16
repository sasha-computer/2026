# [Project Name] - Product Requirements Document

[Brief description]

---

## In Progress

---

## In Review

- Add notification badge to each requestor in Tracked Requestors column showing new order count; clicking badge shows spinner while fetching, then opens requestor view with most recent order in viewing panel
- Add "Request Debugger" tab to web app that takes a Request Order ID and displays the request information from the API in a nicely formatted UI
- Add "Requestor Tracker" tab to web app - allows tracking requestor addresses with nicknames, saving specific request IDs for quick access, marking orders as problematic, and adding notes (uses localStorage for persistence)
- Requestor Tracker: Add third column showing request details (same UI as Request Debugger) when "View" button is clicked
- Requestor Tracker improvements: Remove nickname field from request order ID adder, add "Orders" heading under current requestor, remove OK button, replace "note" text with note icon
- Requestor Tracker: Make X (remove) button trigger a separate confirmation modal
- Auto-call API when request added, auto-open view panel; show orders with git-style short IDs (8-char suffix), status badge, and ISO timestamp; minimize hex chain repetition by extracting suffix from requestor address prefix
- Show "Order already added" modal when trying to add duplicate order
- Simplify timestamp format: replace +00:00 with UTC suffix
- Auto-flag orders as problematic (!) when status is "Expired"
- Remove view button, always show third column with request details
- Add explorer link for requestor address (links to https://explorer.boundless.network/requestors/{address})
- Add "Fetch Recent Orders" button to auto-populate last 3/5/10 orders from requestor address
- Fix "Fetch Recent Orders" button not working (API response parsing bug)
- Add copy button for requestor address in Requestor Tracker (two overlapping pages icon)

- Improved third column detail view: copy button for request ID, prover link to explorer, human-readable timing (created/locked/expires/fulfilled), proof latency calculation, 3 s.f. pricing, total cycles with M/B suffix, removed chain ID
- Add notification badge to "Fetch Recent Orders" button showing count of new orders not in localStorage; clicking when badge visible auto-fetches those orders without modal
- Auto-fetch 10 most recent orders when adding a new requestor
- Order row UI improvements: problematic button moved to leftmost, close button replaced with X icon, copy button added next to short ID
- Create `web/src/lib/supabase.ts` module with: Supabase client init, TrackerData/TrackedRequestor/TrackedRequest types, async loadTrackerData() (Supabase-first with localStorage fallback), async saveTrackerData() (saves to both), migrateLocalStorageToSupabase() for one-time migration
- Update App.svelte for Supabase: import from ./lib/supabase, remove inline type defs, add trackerLoading state, add $effect for async init with migration, delete old load/save functions, replace 8 saveTrackerData() calls with saveTrackerDataAsync(trackerData), add loading UI to tracker tab
- Test Supabase integration: add requestor (verify in Supabase), add orders, reload page (data persists), test offline fallback, test localStorage migration

---

## Planned

- Not a big fan of the fetch recent orders button being disabled all the time tbh. Like I can't do it, even though one requestor has the red 10 next to their name in the left most column. Also can you work on making the red badge in the tracked requestor column requestor box a bit nicer? It doesn't really fit and it'd be real nice if it was on the top right corner as originally requested.
- add a button to each request next to copy that takes you to the request ID i.e. https://explorer.boundless.network/orders/0x382bba7d7bc9ae86c5de3e16c4ca96bcc0a3478e83572afa?from=requestors/0x382bba7d7bc9ae86c5de3e16c4ca96bcc0a3478e

## Completed
