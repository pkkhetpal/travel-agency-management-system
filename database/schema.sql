-- Travel Agency Management System
-- PostgreSQL logical starter schema.
-- Review, complete and migrate before production. See database/README.md.
-- Money uses NUMERIC, not FLOAT/REAL. INR is the reporting base currency.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(20),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY,
  currency_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places SMALLINT NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 4),
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO currencies(code,currency_name,symbol,decimal_places) VALUES
('INR','Indian Rupee','₹',2),
('USD','US Dollar','$',2),
('EUR','Euro','€',2),
('GBP','Pound Sterling','£',2),
('AED','UAE Dirham','د.إ',2),
('SGD','Singapore Dollar','S$',2),
('THB','Thai Baht','฿',2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  to_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  effective_date DATE NOT NULL,
  source VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency,to_currency,effective_date)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  gstin VARCHAR(20),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_customers_name ON customers (lower(full_name));
CREATE INDEX idx_customers_mobile ON customers (mobile);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(30) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  category VARCHAR(50) NOT NULL,
  mobile VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  gstin VARCHAR(20),
  bank_details JSONB,
  payment_terms TEXT,
  credit_days INTEGER CHECK (credit_days IS NULL OR credit_days >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  destination TEXT,
  category VARCHAR(50),
  departure_date DATE,
  return_date DATE,
  adults INTEGER NOT NULL DEFAULT 0 CHECK (adults >= 0),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  infants INTEGER NOT NULL DEFAULT 0 CHECK (infants >= 0),
  rooms INTEGER NOT NULL DEFAULT 0 CHECK (rooms >= 0),
  budget NUMERIC(14,2) CHECK (budget IS NULL OR budget >= 0),
  budget_currency CHAR(3) REFERENCES currencies(code),
  source VARCHAR(50),
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(40) NOT NULL DEFAULT 'New',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (return_date IS NULL OR departure_date IS NULL OR return_date >= departure_date)
);

CREATE TABLE enquiry_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id),
  followup_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_followup_date TIMESTAMPTZ,
  remarks TEXT,
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enquiries_status_date ON enquiries(status,enquiry_date);
CREATE INDEX idx_followups_next_date ON enquiry_followups(next_followup_date);

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(40) NOT NULL UNIQUE,
  enquiry_id UUID NOT NULL REFERENCES enquiries(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  terms TEXT,
  pdf_document_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enquiry_id,version_number),
  CHECK (subtotal >= 0 AND discount >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id),
  description TEXT NOT NULL,
  category VARCHAR(50),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  enquiry_id UUID REFERENCES enquiries(id),
  quotation_id UUID REFERENCES quotations(id),
  package_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  adults INTEGER NOT NULL DEFAULT 0 CHECK (adults >= 0),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  infants INTEGER NOT NULL DEFAULT 0 CHECK (infants >= 0),
  room_count INTEGER NOT NULL DEFAULT 0 CHECK (room_count >= 0),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  selling_subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  final_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0,
  package_status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  assigned_manager UUID REFERENCES users(id),
  confirmation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (selling_subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND final_amount >= 0)
);

CREATE INDEX idx_packages_customer ON packages(customer_id);
CREATE INDEX idx_packages_dates ON packages(start_date,end_date);
CREATE INDEX idx_packages_status ON packages(package_status);

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_number VARCHAR(40) NOT NULL UNIQUE,
  package_id UUID NOT NULL REFERENCES packages(id),
  full_name VARCHAR(150) NOT NULL,
  gender VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  guest_type VARCHAR(20) NOT NULL CHECK (guest_type IN ('Adult','Child','Infant')),
  passport_number_encrypted TEXT,
  passport_expiry DATE,
  passport_issue_date DATE,
  mobile VARCHAR(20),
  email VARCHAR(255),
  emergency_contact VARCHAR(100),
  dietary_preferences TEXT,
  special_requirements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_package ON guests(package_id);

CREATE TABLE guest_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id),
  room_number VARCHAR(30),
  room_category VARCHAR(50),
  room_description TEXT
);

CREATE TABLE guest_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_room_id UUID NOT NULL REFERENCES guest_rooms(id),
  guest_id UUID NOT NULL REFERENCES guests(id),
  UNIQUE(guest_room_id,guest_id)
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(40) NOT NULL UNIQUE,
  package_id UUID NOT NULL REFERENCES packages(id),
  booking_type VARCHAR(40) NOT NULL CHECK (booking_type IN ('Flight','Hotel','Tour','Transfer','Visa','Cruise','Other')),
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_name VARCHAR(200) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  confirmation_reference VARCHAR(150),
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  purchase_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  selling_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  exchange_rate NUMERIC(18,8) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  purchase_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0,
  selling_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0,
  booking_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  payment_status VARCHAR(40) NOT NULL DEFAULT 'Unpaid',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (purchase_amount >= 0 AND selling_amount >= 0)
);

CREATE INDEX idx_bookings_package ON bookings(package_id);
CREATE INDEX idx_bookings_supplier ON bookings(supplier_id);
CREATE INDEX idx_bookings_type_status ON bookings(booking_type,booking_status);

CREATE TABLE booking_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  guest_id UUID NOT NULL REFERENCES guests(id),
  passenger_reference VARCHAR(100),
  UNIQUE(booking_id,guest_id)
);

CREATE TABLE booking_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  service_description TEXT,
  supplier_confirmation_reference VARCHAR(150),
  allocated_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  allocated_cost_inr NUMERIC(14,2) NOT NULL DEFAULT 0,
  CHECK (allocated_cost >= 0)
);

CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  previous_status VARCHAR(40),
  new_status VARCHAR(40) NOT NULL,
  remarks TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  payment_date DATE NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  amount_inr NUMERIC(14,2) NOT NULL CHECK (amount_inr > 0),
  payment_mode VARCHAR(30) NOT NULL,
  transaction_reference VARCHAR(150),
  bank_account VARCHAR(100),
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES customer_receipts(id),
  package_id UUID NOT NULL REFERENCES packages(id),
  allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  allocated_amount_inr NUMERIC(14,2) NOT NULL CHECK (allocated_amount_inr > 0)
);

CREATE INDEX idx_receipt_allocations_package ON customer_receipt_allocations(package_id);

CREATE TABLE supplier_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(40) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  supplier_invoice_number VARCHAR(100),
  invoice_date DATE NOT NULL,
  due_date DATE,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  total_amount_inr NUMERIC(14,2) NOT NULL CHECK (total_amount_inr >= 0),
  bill_status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  attachment_id UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_bill_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_bill_id UUID NOT NULL REFERENCES supplier_bills(id),
  package_id UUID NOT NULL REFERENCES packages(id),
  booking_id UUID REFERENCES bookings(id),
  allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  allocated_amount_inr NUMERIC(14,2) NOT NULL CHECK (allocated_amount_inr > 0)
);

CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(40) NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  payment_date DATE NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  amount_inr NUMERIC(14,2) NOT NULL CHECK (amount_inr > 0),
  payment_mode VARCHAR(30) NOT NULL,
  transaction_reference VARCHAR(150),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_payment_id UUID NOT NULL REFERENCES supplier_payments(id),
  supplier_bill_id UUID NOT NULL REFERENCES supplier_bills(id),
  allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  allocated_amount_inr NUMERIC(14,2) NOT NULL CHECK (allocated_amount_inr > 0)
);

CREATE TABLE package_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id),
  expense_category VARCHAR(100) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  amount_inr NUMERIC(14,2) NOT NULL CHECK (amount_inr >= 0),
  supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_name VARCHAR(100) NOT NULL,
  tax_type VARCHAR(30) NOT NULL,
  rate NUMERIC(7,4) NOT NULL CHECK (rate >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  package_id UUID NOT NULL REFERENCES packages(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_date DATE NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  taxable_amount NUMERIC(14,2) NOT NULL,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL,
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) NOT NULL,
  place_of_supply VARCHAR(100),
  company_gstin_snapshot VARCHAR(20),
  customer_gstin_snapshot VARCHAR(20),
  seller_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  buyer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  invoice_status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  pdf_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tax_invoices(id),
  description TEXT NOT NULL,
  sac_code VARCHAR(20),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  taxable_value NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL
);

CREATE TABLE itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id),
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  travel_date DATE,
  destination VARCHAR(150),
  title VARCHAR(200),
  description TEXT,
  sightseeing TEXT,
  meal_details TEXT,
  pickup_details TEXT,
  hotel_details TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(package_id,day_number)
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id),
  booking_id UUID REFERENCES bookings(id),
  guest_id UUID REFERENCES guests(id),
  supplier_id UUID REFERENCES suppliers(id),
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(package_id,booking_id,guest_id,supplier_id) >= 1)
);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('WhatsApp','Email','SMS')),
  subject VARCHAR(255),
  message_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  package_id UUID REFERENCES packages(id),
  recipient VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('WhatsApp','Email','SMS')),
  template_id UUID REFERENCES notification_templates(id),
  message_body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'Queued',
  provider_reference VARCHAR(150),
  idempotency_key VARCHAR(150) UNIQUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_schedule ON notifications(delivery_status,scheduled_at);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_entity ON activity_logs(entity_type,entity_id,created_at);

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  gstin VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  state_code VARCHAR(10),
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  logo_document_id UUID,
  base_currency CHAR(3) NOT NULL DEFAULT 'INR' REFERENCES currencies(code),
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(50) NOT NULL,
  financial_year VARCHAR(20) NOT NULL,
  prefix VARCHAR(30) NOT NULL,
  last_number BIGINT NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_type,financial_year)
);

-- Production implementation must add:
-- * allocation balance constraints enforced transactionally (not simple CHECKs),
-- * receipt/refund and supplier credit-note records,
-- * detailed booking subtype tables where needed,
-- * itinerary version table,
-- * communication consent/preferences and provider webhook event tables,
-- * migration-managed triggers / updated_at logic,
-- * soft deletion / archive strategy,
-- * strict invoice issue workflow and locked snapshots,
-- * required indexes, RLS/company scope if applicable,
-- * role/permission seeding and comprehensive tests.
