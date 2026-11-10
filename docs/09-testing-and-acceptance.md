# 09 – Testing and acceptance

## 1. Test levels

- Unit tests for calculations, validations, statuses and permission rules.
- Integration tests for database transactions, allocations, document storage and provider adapters.
- API tests for authorization, validation, errors and idempotency.
- End-to-end tests for enquiry-to-package-to-trip workflows.
- Responsive/PWA tests on desktop and mobile browsers.
- Security tests for sensitive documents, permissions and injection/access-control flaws.
- Backup restore test in a non-production environment.
- User acceptance testing with representative real-world scenarios using synthetic or properly protected data.

## 2. Critical scenarios

### Sales
- Create a customer and enquiry.
- Add multiple quotation versions.
- Send and mark quotation accepted.
- Convert accepted quotation to exactly one linked package.
- Preserve enquiry and quote history.

### Package operations
- Add multiple guests.
- Add multiple flight/hotel/tour/transfer/visa/cruise bookings.
- Assign multiple suppliers and cost shares.
- Update booking status and confirm status history.
- Attach ticket/voucher documents.

### Receivables
- Record full and partial customer receipts.
- Allocate one receipt to multiple packages.
- Keep unallocated advance visible.
- Prevent allocation greater than available receipt amount.
- Reverse/refund without deleting original receipt.
- Reconcile package amount due and balance.

### Payables
- Enter a supplier bill that covers multiple bookings/packages.
- Allocate partial amounts.
- Record partial supplier payments.
- Allocate one supplier payment across several bills.
- Prevent over-allocation.
- Reconcile outstanding supplier liability.

### Currency and tax
- Record INR and foreign-currency transactions.
- Preserve the historical conversion rate after rate changes.
- Verify decimal rounding and rate direction.
- Verify configured intra-state/inter-state invoice presentation using CA-approved test cases.
- Verify invoice sequence under simultaneous issuance.
- Verify issued invoice snapshots cannot be silently modified.

### Itinerary and documents
- Create, reorder and revise itinerary days.
- Export PDF.
- Verify secure document download permission and expiry.
- Confirm itinerary update flags after related booking change.

### Notifications
- Test WhatsApp/email/SMS provider sandbox.
- Test opt-in and opt-out.
- Verify duplicate event does not send duplicate message.
- Verify callback statuses, retries and provider failure reporting.

### Security and operations
- Verify role restrictions in UI and API.
- Verify audit records.
- Verify no secrets appear in logs.
- Verify database and document backups can be restored.
- Verify PWA navigation and key forms on mobile.

## 3. Acceptance checklist

- [ ] Customer, enquiry and follow-up workflow
- [ ] Multiple quotation versions
- [ ] Quotation-to-package conversion
- [ ] Multiple guests per package
- [ ] Multiple bookings and suppliers per package
- [ ] Booking status history
- [ ] Customer receipts and allocations
- [ ] Supplier bills, payments and allocations
- [ ] INR and foreign-currency history
- [ ] CA-reviewed GST invoice output
- [ ] Itinerary PDF and revision history
- [ ] Secure document access
- [ ] WhatsApp integration
- [ ] Email integration
- [ ] SMS integration
- [ ] Dashboard and exports
- [ ] Role and permission tests
- [ ] Audit trail
- [ ] Mobile/PWA tests
- [ ] Backup restore drill
- [ ] Handover documentation and training

Release only when all critical checklist items pass or documented exceptions are explicitly accepted by the product owner.
