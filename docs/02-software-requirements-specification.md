# 02 – Software Requirements Specification (SRS)

**Version:** 1.0  
**Status:** Scope approved for estimation and implementation planning  
**Product:** Travel Agency Management System

## 1. Purpose

Develop a simple cloud-based travel operations application for a B2C tour operator/agency with 1–10 employees. It manages enquiries, quotations, packages, guests, bookings, suppliers, collections, supplier bills, itinerary, documents, messages and operational reports.

## 2. User roles

| Role | Typical permissions |
|---|---|
| Administrator/Owner | All modules, company settings, users, approvals and reports |
| Sales | Customers, enquiries, follow-ups, quotations and assigned packages |
| Operations | Packages, guests, bookings, suppliers, itinerary and documents |
| Accounts | Customer receipts, supplier bills/payments, invoices and financial reports |

The system must support one employee having more than one role/permission set. Permissions should be granular and enforced server-side, not merely hidden in the UI.

## 3. Functional requirements

### FR-01 Authentication and users
- Individual user accounts; no shared employee login.
- Secure sign-in, sign-out, password reset and session expiry.
- Activate/deactivate users.
- Role- and permission-based access.
- Record user and timestamp for sensitive actions.

### FR-02 Customer CRM
Fields: generated customer code, full name, mobile, WhatsApp number, email, billing/contact address, city, state, country, optional GSTIN and notes.
- Search by name, mobile or email.
- Detect likely duplicates.
- Customer profile shows enquiries, quotations, packages, receipts and communication history.
- Preserve customer identity across repeat bookings.

### FR-03 Enquiries and follow-ups
Fields: enquiry number/date, customer, destination, travel category, dates, adults/children/infants, rooms, budget and currency, travel preferences, enquiry source, owner, status and notes.
- Statuses: New, In Progress, Quotation Prepared, Quotation Sent, Follow-up, Confirmed, Lost, Cancelled.
- Follow-up notes and next-follow-up reminder.
- Multiple quotations/version history per enquiry.
- Convert an accepted quotation to a package without duplicating customer data.
- Keep original enquiry and quotation history.

### FR-04 Quotations
- Generate unique quotation number and version.
- Include customer, destination, dates, guests, service summary, itinerary summary, inclusions, exclusions, terms, validity, currency, lines, discounts, taxes and total.
- Create branded PDF and send using configured channels.
- Track Draft, Sent, Accepted, Rejected and Expired.
- Acceptance does not itself create supplier bookings or supplier bills.
- Store immutable quotation version snapshots.

### FR-05 Packages
- Generated unique Package ID.
- Link customer, source enquiry and accepted quotation.
- Fields: name, category, destination, travel dates, guest counts, room count, sales currency, price components, discounts, tax, final customer amount, INR reporting equivalent, manager, confirmation date, status and notes.
- Statuses: Draft, Quotation, Pending Confirmation, Confirmed, In Progress, Completed, Cancelled.
- Package workspace tabs: Overview, Guests, Bookings, Suppliers, Receivables, Payables, Itinerary, Documents, Notifications and Activity.
- A package can contain multiple bookings and multiple suppliers.
- Quick actions inherit the current Package ID.

### FR-06 Guests
Fields: guest ID, package, full name, gender, date of birth, nationality, adult/child/infant type, passport details, expiry/issue dates, mobile/email, emergency contact, dietary/special needs and documents.
- Multiple guests per package.
- Automatically calculate guest totals.
- Link guests to flight/passenger bookings and hotel room assignments.
- Restrict passport document visibility by permission.

### FR-07 Bookings
Each service has a generated Booking ID, Package ID, booking type, booking date, service details, status, reference, costs, customer selling value, currency, FX rate, INR equivalents, supplier allocations, notes and attachments.

Types and category details:
- Flight: airline, PNR, ticket numbers, flight numbers, sectors, passenger list, departure/arrival times, baggage.
- Hotel: property, destination, check-in/out, rooms, room types, meal plan, guests and confirmation number.
- Tour/activity: name, date/time, location, participants, pickup details and voucher reference.
- Transfer: pickup/drop, date/time, vehicle, passengers and driver contact.
- Visa: country, applicant, visa type, application reference/dates/status, fees and validity.
- Cruise: operator, vessel, ports, sailing dates, cabin and passengers.

Statuses: Pending, Requested, Confirmed, Ticketed/Voucher Issued, Cancelled, Refunded.
- Status history must record old/new status, user, timestamp and notes.
- A booking may have multiple supplier cost allocations.
- Operational booking values are not a substitute for approved supplier bills.

### FR-08 Suppliers
Fields: supplier code, business name, contact person, category, mobile, WhatsApp, email, address, city/country, optional GSTIN, optional bank details, payment terms, credit days and notes.
- Supplier categories include airlines/ticketing agents, hotels, DMCs, tour operators, transport, visa agents, cruise companies and other.
- Supplier profile shows bookings, bills, payments and outstanding balance.
- Bank details are restricted and encrypted where appropriate.

### FR-09 Customer receivables
- Record receipts against a customer.
- Allocate each receipt to one or more packages.
- Fields: receipt number, payment date, amount/currency, exchange rate, INR amount, mode, transaction reference, bank/account, notes and creator.
- Support cash, UPI, bank transfer, card and other modes.
- Partial receipts, advance receipts, unallocated amounts and refunds/adjustments must be represented explicitly.
- Generate receipt PDF.
- Package balance = customer amount due less allocated receipts/credits.
- Show due dates and overdue balances.

### FR-10 Supplier payables
- Record supplier bills independently from bookings.
- A bill can be allocated across one or more bookings/packages.
- Fields: supplier invoice number/date, due date, currency/rate, taxable amount, tax, total, attachment and status.
- Record supplier payments separately and allocate one payment across multiple bills.
- Support partial payments, credit notes/adjustments and unallocated supplier advances.
- Outstanding = approved bill liability less allocated payments/credits.
- Prevent duplicate allocation or over-allocation.

### FR-11 Currency
- INR is the base/reporting currency.
- Support configured ISO 4217 currencies, initially INR, USD, EUR, GBP, AED, SGD and THB.
- Store source currency, source amount, rate, rate direction, rate date/source and INR equivalent on each transaction.
- Preserve historical rates; rate updates must not rewrite posted transactions.
- Manual exchange rate override is allowed for permitted users, with audit trail.
- Define rounding per currency and use decimal arithmetic.
- Package reports show original currency and INR equivalent.

### FR-12 GST and invoices
- Company GST settings: legal/trade name, GSTIN, registered address, state/state code, invoice series and configured tax settings.
- Customer billing name/address, optional GSTIN, state and place of supply.
- Invoice line fields: description, applicable SAC/HSN, taxable value, discount, tax rate, tax components and total.
- Support configurable CGST/SGST/IGST display, tax-inclusive/exclusive prices, proforma invoice, tax invoice, receipts, credit notes and adjustments.
- Snapshot company/customer/tax data onto issued documents.
- Invoice numbering is sequential and concurrency-safe according to the configured financial-year series.
- Issued invoices are immutable; corrections use cancellation/credit/debit note workflows as approved by the CA.
- Tax rules and applicability must be configurable, not hard-coded.
- Obtain CA/tax-professional validation before production use. GST return filing and a full statutory ledger are out of scope.

### FR-13 Itinerary
- Day-wise records with day number, date, destination, heading, description, sightseeing, activities, meals, hotel, pickup/drop, notes and optional images.
- Add/reorder/copy days.
- Version itinerary revisions.
- Generate branded PDF and send to customer.
- An operational booking change should flag the itinerary for review; do not silently rewrite it.

### FR-14 Documents
- Store document metadata and private object-storage key.
- Associate documents with package, booking, guest, supplier or invoice.
- Support PDF, JPG, JPEG and PNG, subject to configured size/type limits.
- Access through authorized, short-lived signed links.
- Record upload user/time and document type.
- Never store files in public web directories or commit customer documents to Git.

### FR-15 Notifications
Channels: approved WhatsApp Business provider, email service and Indian SMS gateway.
Events: enquiry assignment, quotation sent, package confirmation, payment receipt/due, supplier payment due, booking confirmation, visa status, upcoming departure, itinerary shared, document issued, trip completion and feedback.
- Templates with safe variable substitution.
- Customer consent/opt-out recording.
- Scheduling, duplicate prevention, provider callback/webhook status, retry policy and error log.
- Do not expose passport or financial secrets in notifications.
- Provider/API charges are separate operating costs.

### FR-16 Dashboard and reports
Dashboard: enquiries, pending quotations, confirmed/ongoing/completed packages, upcoming departures, customer receivables, supplier payables, collection/payment totals and estimated gross margin.
Reports: enquiry conversion, package list, upcoming departures, customer receipt/outstanding ageing, supplier bills/payment/outstanding ageing, booking status, monthly sales, cancellation and package profitability.
- Date, destination, package, customer and supplier filters as relevant.
- Export PDF/Excel.
- Report formulas must use the financial rules in the financial specification.

### FR-17 Company settings
Company identity/logo/address/GSTIN, financial year, numbering series, base currency, timezone, tax configurations, notification providers/templates, employee accounts and permissions.

## 4. Non-functional requirements

- Cloud-hosted and available through modern desktop/mobile browsers.
- Installable PWA; online-first Version 1.
- Support at least 10 simultaneous users initially.
- Responsive and accessible forms.
- Common screens should have a practical target of <2 seconds under normal expected load, subject to hosting/network.
- HTTPS in transit; encryption at rest for database, backups and object storage.
- Secure password hashing; least-privilege roles; server-side authorization.
- Private document storage, signed download links and access logs.
- Daily automated backups, off-site copy and tested restore procedure.
- Audit history for financial and permission-sensitive actions.
- Monitoring, error logging and documented recovery procedure.
- No secrets or personal data in source control.

## 5. Core business rules

1. Package ID is the central operational reference.
2. Booking and supplier bill are distinct records.
3. Booking supplier allocations must reconcile to the booking cost model.
4. Supplier bills and payments are separately recorded and allocated.
5. Receipt and supplier payment allocation totals cannot exceed the available transaction balance.
6. Do not delete posted financial transactions; use reversals/credits.
7. Store original currency and historical exchange rate.
8. Use decimal/numeric financial types, not floating point.
9. Customer advance collections are not automatically recognized as earned revenue.
10. Dashboard estimated profit must not double-count booking costs and supplier bills.
11. Issued invoice snapshots and numbering must be immutable/auditable.
12. All important actions record user and timestamp.

## 6. Acceptance criteria

Release candidate must demonstrate:
- Enquiry, follow-up and multi-version quotation workflow.
- Package conversion with unique Package ID.
- Multiple guests, bookings and suppliers per package.
- Booking status history and document attachment.
- Customer receipt allocations and correct balances.
- Supplier bills, partial payments and correct outstanding balances.
- Foreign-currency transactions with preserved historical INR conversion.
- CA-approved GST configuration and invoice output.
- Itinerary editing, revision and PDF export.
- Secure document access.
- WhatsApp/email/SMS integration test and delivery logging.
- Dashboard/report reconciliation.
- Role restrictions, audit logs, mobile usability and backup restoration.

**End of SRS.**
