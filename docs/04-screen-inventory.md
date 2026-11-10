# 04 – Screen inventory and navigation

## Main navigation

1. Dashboard
2. Customers
3. Enquiries
4. Quotations
5. Packages
6. Bookings
7. Guests
8. Suppliers
9. Customer Receivables
10. Supplier Payables
11. Itineraries
12. Documents
13. Travel Calendar
14. Reports
15. Settings

Navigation can be grouped into Sales, Operations, Accounts and Administration so that the interface remains short.

## Screen inventory

| Screen | Main actions | Priority |
|---|---|---|
| Login/reset | Sign in, reset password | P1 |
| Dashboard | KPIs, quick actions, upcoming trips and alerts | P1 |
| Customer list/profile | Search, add/edit, full customer history | P1 |
| Enquiry list/form | Create, assign, status and notes | P1 |
| Follow-up panel | History, next date, reminder | P1 |
| Quotation list/editor | Versions, line items, PDF, send, accept/reject | P1 |
| Package list | Search/filter/status | P1 |
| Package workspace | Overview and all package tabs | P1 |
| Guest editor/list | Add guests, identity data, rooms, documents | P1 |
| Booking list/editor | Service-specific booking forms and status | P1 |
| Supplier list/profile | Contacts, bookings, bills and balance | P1 |
| Receipt entry/list | Record, allocate and issue receipt | P1 |
| Customer outstanding | Ageing and reminders | P1 |
| Supplier bill entry/list | Create bill and allocate to packages/bookings | P1 |
| Supplier payment entry | Record and allocate payment | P1 |
| Supplier outstanding | Ageing and supplier history | P1 |
| Currency settings | Currencies, rate history and manual override | P1 |
| GST/company settings | Company profile, tax configuration, invoice series | P1 |
| Invoice generator | Proforma/tax invoice, credit-note workflow | P1 |
| Itinerary editor | Add/reorder day, preview, PDF and revisions | P1 |
| Document centre | Upload, categorize, preview and download | P1 |
| Notification centre | Templates, schedule, logs and failures | P1 |
| Reports | Filter, view and export | P1 |
| User management | Users, roles and permissions | P1 |
| Travel calendar | Upcoming departures and operations | P2 |

P1 = Version 1. P2 = optional after core release.

## Package workspace

The package workspace is the primary screen. Header:
- Package ID and status.
- Customer and destination.
- Travel dates and guest totals.
- Package value, collection and balance.
- Assigned manager.

Tabs:
1. Overview
2. Guests
3. Bookings
4. Suppliers
5. Receivables
6. Payables
7. Itinerary
8. Documents
9. Notifications
10. Activity

Quick actions:
- Add Guest
- Add Flight / Hotel / Tour / Transfer / Visa / Cruise
- Add Supplier
- Record Customer Receipt
- Add Supplier Bill
- Record Supplier Payment
- Create Itinerary
- Upload Document
- Generate Invoice
- Send Message

Quick actions must automatically link the current Package ID and relevant customer/supplier context.

## Form usability guidelines

- Prefer short forms with progressive sections.
- Show required fields clearly.
- Use searchable dropdowns for customer, supplier, guest and currency.
- Default dates sensibly but never silently change user data.
- Calculate guest totals and financial summaries automatically.
- Save drafts and warn about unsaved changes.
- Support keyboard navigation and small screens.
- Show clear status labels and inline validation.
- Use a confirmation step for cancellation, invoice issue and financial reversal.
