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

---

## Planned
- I think we should get rid of the view button and just alwyays have the third column open.
- can we have a button at the top under the nickname and their requestor ID, that can auto-populate the last X number of orders from that address, give an option of 3, 5 or 10 to add for now.
- add an explorer link for their requestor ID thats under the nickname i.e. https://explorer.boundless.network/requestors/0x382bba7d7bc9ae86c5de3e16c4ca96bcc0a3478e?from=requestors on hte part that shows the requestor address rn

## Completed
