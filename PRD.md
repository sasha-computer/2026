# [Project Name] - Product Requirements Document

[Brief description]

---

## In Progress

---

## In Review

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

---

## Planned

- can you make the problematic button the furthest left one on each order. Can you make the close button a bit nicer, maybe an icon as well? can you put the copy and apste button next to the short ID for each order which would copy and paste the order ID.
- add the notification badge from "Fetch Recent Orders" to the Tracked Requestors column (left-most) on each requestor. When clicking the notification badge, it should turn into a spinning circle as orders are fetched. Once they are fetched open that requestors view in the centre and right hand columns with the top request in the list (most recent) in the Viewing column in the right.

## Completed
