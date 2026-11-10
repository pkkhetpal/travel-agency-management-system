# 07 – GST and financial rules

This application provides package-level operational finance, not a full accounting ledger.

## 1. Keep four measures separate

For each package, show:
1. Customer contract/amount due.
2. Customer receipts allocated.
3. Supplier bills/approved liabilities and payments.
4. Estimated or actual allocated service costs.

Do not label collections as earned revenue automatically.

## 2. Customer receivables

Package customer balance:
`package amount due - credits/refunds applied - allocated receipts`.

Receipt lifecycle:
- Create receipt.
- Validate customer, currency and amount.
- Store original currency, rate and INR amount.
- Allocate to one/more packages, or leave clearly marked as unallocated advance.
- Generate receipt document.
- Reverse through a linked reversal/refund record; do not erase posted receipt.

Do not allow total allocations to exceed the receipt's available amount.

## 3. Supplier payables

Supplier bill lifecycle:
- Record supplier invoice and attachment.
- Validate supplier and invoice details.
- Allocate bill to one/more bookings/packages.
- Approve bill according to configured workflow.
- Record payments separately.
- Allocate payment to one/more bills.
- Retain unallocated supplier advance.
- Apply credit notes or reversals explicitly.

Outstanding supplier liability:
`approved bill total - allocated payments - approved credits`.

Do not count both estimated booking cost and supplier bill as separate costs in profitability.

## 4. Package profitability

A basic operational estimate:
`net package revenue excluding applicable taxes - recognized/allocated supplier costs - other allocated expenses`.

The report must identify whether it uses:
- estimated booking cost,
- approved supplier bill cost,
- paid cost,
- or an agreed combination.

Never silently mix these bases. Show the basis and label estimates clearly.

A supplier bill allocated to multiple bookings/packages must be distributed exactly once. Allocation totals must reconcile to the source bill.

## 5. Multi-currency

INR is the base reporting currency. Store the transaction currency and source amount as entered.

For each conversion store:
- currency code (ISO 4217),
- original amount,
- INR-per-unit or explicitly documented rate direction,
- rate date,
- rate source/manual override,
- converted INR value,
- precision/rounding method.

Example only: USD 1,000 at ₹85 per USD = ₹85,000. This is an illustration, not a current rate.

A later exchange-rate change must not rewrite historical transaction conversion. Any realized/unrealized FX reporting is outside initial scope unless separately approved.

## 6. GST invoice functionality

Capture:
- Seller legal/trade name, address, GSTIN and state.
- Customer billing name/address, optional GSTIN and state.
- Place of supply.
- Service description and applicable SAC/HSN where advised.
- Taxable value, discount and tax components.
- Configured CGST/SGST/IGST fields.
- Invoice date, serial number, financial-year series and totals.
- Amount received and balance where shown.

Support tax-inclusive and tax-exclusive configuration and configurable rates/effective dates. Store a snapshot of the settings and tax data used when issuing the invoice.

Invoice lifecycle:
- Draft.
- Reviewed/approved.
- Issued.
- Cancelled/credited through permitted document workflow.

Issued invoice data and number must be immutable. Never silently overwrite an issued invoice; use legally appropriate credit/debit note or cancellation workflow, after professional guidance.

## 7. Professional review

GST applicability, rate, place-of-supply treatment, SAC/HSN, invoice content, credit notes, export/foreign-travel treatment and record retention must be validated by the business's Chartered Accountant/tax professional. The application is not a statutory GST return filing or full accounting system.
