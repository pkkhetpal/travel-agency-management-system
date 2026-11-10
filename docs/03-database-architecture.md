# 03 – Database architecture

## 1. Database choice

PostgreSQL is recommended. Use UUID primary keys, foreign keys, NUMERIC for money, TIMESTAMPTZ for event timestamps, explicit status fields and migrations.

The schema starter is in [../database/schema.sql](../database/schema.sql). It is deliberately a logical starter, not a complete production migration.

## 2. Main entities

### Identity and masters
- users, roles, user_roles/permissions
- customers
- suppliers
- currencies
- exchange_rates
- company_settings
- document_sequences

### Sales
- enquiries
- enquiry_followups
- quotations
- quotation_items

### Package and travel operations
- packages
- guests
- guest_rooms
- guest_room_assignments
- bookings
- booking_guests
- booking_suppliers
- booking_status_history
- itinerary_days

### Finance
- customer_receipts
- customer_receipt_allocations
- supplier_bills
- supplier_bill_allocations
- supplier_payments
- supplier_payment_allocations
- package_expenses

### Tax, documents and communications
- tax_rates
- tax_invoices
- invoice_items
- documents
- notification_templates
- notifications
- activity_logs

## 3. Key relationships

- Customer 1-to-many Enquiries.
- Enquiry 1-to-many Quotations.
- Accepted quotation 0/1-to-1 Package (retain quotation history).
- Customer 1-to-many Packages.
- Package 1-to-many Guests, Bookings, Itinerary Days and Expenses.
- Booking many-to-many Guests through booking_guests.
- Booking many-to-many Suppliers through booking_suppliers, with cost allocations.
- Package 1-to-many customer receipt allocations.
- Supplier Bill many-to-many Packages/Bookings through supplier_bill_allocations.
- Supplier Payment many-to-many Supplier Bills through supplier_payment_allocations.
- Package has many Documents and Notifications.

## 4. Critical modelling decisions

### Package totals
Store agreed package commercial amounts as a versioned/traceable commercial snapshot. Do not calculate historical package price by summing current booking selling prices unless this is the explicitly chosen sales model.

### Cost reconciliation
A booking may have one or multiple supplier cost allocations. Supplier invoices are separate liabilities. A bill can cover several bookings or packages. To avoid double-counting:
- Use supplier bills as the authoritative payable liability.
- Use booking supplier allocations as operational cost attribution.
- Reconcile bill allocations to booking cost allocations.
- Do not add both the booking estimate and supplier bill as two independent costs in profit reports.

### Receipt handling
A receipt belongs to a customer; allocations connect it to packages. Keep unallocated advance amounts visible. Refunds should be separate linked transactions or documented reversal entries.

### Supplier payment handling
A payment belongs to a supplier; allocations connect it to bills. Keep supplier advances unallocated until applied to a bill.

### Multi-currency
For each financial record preserve:
- transaction currency code,
- original amount,
- exchange rate and direction,
- rate date/source,
- converted INR amount,
- rounding precision.
Never recompute posted historical INR equivalents from a live rate.

### Invoice snapshots
Issued invoices should preserve copies of seller, buyer, GSTIN, address, place of supply, service descriptions, SAC/HSN, tax rates and tax amounts as issued. Changes to master data must not alter prior invoices.

## 5. Required database constraints and indexes

Implement before production:
- Unique customer/supplier/package/booking/enquiry/quotation/receipt/bill/invoice numbers within the correct company/financial-year scope.
- Foreign-key constraints and deliberate ON DELETE rules.
- CHECK constraints for non-negative counts and valid amount/rate ranges.
- Unique booking_guests(booking_id, guest_id).
- Unique guest_room_assignments(guest_room_id, guest_id) as business rules require.
- Unique/validated document sequence keys.
- Index package_id, customer_id, supplier_id, status, travel dates, due dates and document numbers.
- Index notification delivery status and scheduled time.
- Transaction-safe allocation logic with row locking or equivalent.
- Audit triggers or application-level immutable audit writes for critical events.
- Soft delete/archive for master records; prohibit hard deletion of posted financial records.

## 6. Security and privacy

- Encrypt passport numbers at application or field level; use a keyed hash/token for exact-match lookup where required.
- Store document objects in a private bucket/container.
- Avoid logging passport numbers, bank data, tokens or full payment details.
- Apply tenant/company scoping to all records even if only one company is initially deployed; confirm whether multi-company is explicitly out of scope.
- Restrict bank details, passport and financial screens by permissions.
- Define retention, export and deletion procedures with business/legal advice.

## 7. Production schema work remaining

The SQL starter requires a developer to:
1. Convert it into ordered migration files.
2. Add all omitted junction/configuration tables.
3. Normalize category-specific booking fields where they need validation/search/reporting.
4. Add constraints, indexes and referential deletion policies.
5. Add row-level/company scoping if required.
6. Implement receipt/bill allocation transactions.
7. Add invoice sequence locking.
8. Add audit and soft-delete policies.
9. Test upgrade, rollback and restore workflows.
