-- MiccoMed Portal — schema MVP (quote-to-cash)
-- gen_random_uuid() is available in PG13+/PGlite without pgcrypto.

create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('INTERNAL_ADMIN', 'INTERNAL_STAFF', 'CLIENT_USER')),
  customer_id uuid,
  active boolean not null default true,
  locale text not null default 'es',
  created_at timestamptz not null default now()
);

create table if not exists staff_permission (
  user_id uuid not null references app_user(id),
  permission text not null,
  primary key (user_id, permission)
);

create table if not exists customer (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  legal_name text not null,
  trade_name text,
  tier text not null check (tier in ('LIST', 'TIER_A', 'TIER_B')),
  payment_terms text not null check (payment_terms in ('COD', 'NET_15', 'NET_30', 'NET_45')),
  credit_limit numeric(14,2) not null default 0,
  credit_status text not null default 'OPEN' check (credit_status in ('OPEN', 'HOLD', 'COD')),
  min_shelf_life_days int not null default 180,
  requires_customer_po boolean not null default false,
  tax_rate numeric(8,4) not null default 0,
  document_language text not null default 'es',
  internal_ar_notes text,
  is_demo boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table app_user
  drop constraint if exists app_user_customer_id_fkey;
alter table app_user
  add constraint app_user_customer_id_fkey foreign key (customer_id) references customer(id);

create table if not exists ship_to (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  name text not null,
  address_line1 text not null,
  city text not null,
  state text not null default 'FL',
  postal_code text not null,
  contact_name text,
  miami_metro boolean not null default true,
  active boolean not null default true
);

create table if not exists category (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_es text not null
);

create table if not exists sku (
  id uuid primary key default gen_random_uuid(),
  sku_code text not null unique,
  manufacturer_sku text,
  title text not null,
  short_description text not null default '',
  category_id uuid not null references category(id),
  lead_time_class text not null default 'STOCK'
    check (lead_time_class in ('STOCK', 'INBOUND', 'SPECIAL_ORDER')),
  dated boolean not null default true,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sku_uom (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references sku(id),
  uom text not null check (uom in ('EACH', 'CASE', 'PALLET')),
  factor_to_base numeric(12,4) not null default 1,
  is_default boolean not null default false,
  unique (sku_id, uom)
);

create table if not exists sku_regulatory (
  sku_id uuid primary key references sku(id),
  regulatory_status text not null
    check (regulatory_status in (
      'PACKAGING_ONLY', 'OTC', 'RX', 'DEVICE_510K_CLEARED', 'DEVICE_EXEMPT', 'UNKNOWN'
    )),
  k_number text,
  k_number_verified boolean not null default false,
  disclosable_text text
);

create table if not exists margin_policy (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references category(id),
  min_margin_pct numeric(8,4) not null,
  effective_from date not null,
  effective_to date,
  note text
);

create table if not exists ulc_record (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references sku(id),
  ulc numeric(12,4) not null,
  effective_from date not null,
  assumptions_note text,
  is_demo boolean not null default false
);

create table if not exists price_list (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('LIST', 'TIER_A', 'TIER_B')),
  name text not null,
  effective_from date not null,
  effective_to date,
  unique (tier, effective_from)
);

create table if not exists price_list_item (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references price_list(id),
  sku_id uuid not null references sku(id),
  uom text not null,
  min_qty numeric(12,4) not null default 1,
  unit_price numeric(12,4) not null
);

create index if not exists idx_price_list_item_lookup
  on price_list_item (price_list_id, sku_id, uom, min_qty);

create table if not exists customer_contract (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRED', 'DRAFT')),
  effective_from date not null,
  effective_to date,
  min_shelf_life_days int,
  file_label text
);

create table if not exists contract_line (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references customer_contract(id),
  sku_id uuid not null references sku(id),
  uom text not null,
  min_qty numeric(12,4) not null default 1,
  unit_price numeric(12,4) not null
);

create index if not exists idx_contract_line_lookup
  on contract_line (contract_id, sku_id, uom, min_qty);

create table if not exists customer_price_override (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  sku_id uuid not null references sku(id),
  uom text not null,
  unit_price numeric(12,4) not null,
  effective_from date not null,
  effective_to date,
  beats_contract boolean not null default false,
  approved_by uuid references app_user(id),
  active boolean not null default true
);

create table if not exists lot (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references sku(id),
  lot_code text not null,
  expiry_date date,
  received_at date not null default current_date,
  is_demo boolean not null default false,
  unique (sku_id, lot_code)
);

create table if not exists lot_balance (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references lot(id),
  status text not null check (status in (
    'QUARANTINE', 'AVAILABLE', 'HOLD_QUALITY', 'HOLD_CUSTOMER',
    'EXPIRED', 'DAMAGED', 'IN_TRANSIT'
  )),
  qty_on_hand numeric(14,4) not null default 0,
  qty_reserved numeric(14,4) not null default 0,
  unique (lot_id, status)
);

create index if not exists idx_lot_balance_fefo
  on lot_balance (status);

create table if not exists inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references lot(id),
  from_status text,
  to_status text,
  qty numeric(14,4) not null,
  reason text not null,
  actor_user_id uuid references app_user(id),
  created_at timestamptz not null default now()
);

create table if not exists quote (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  ship_to_id uuid references ship_to(id),
  quote_number text not null,
  revision int not null default 1,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'SUBMITTED', 'PRICED', 'PENDING_APPROVAL', 'SENT',
    'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'
  )),
  freight_method text not null default 'MICCOMED_FLEET'
    check (freight_method in ('PICKUP', 'MICCOMED_FLEET', 'THIRD_PARTY')),
  freight_contingent boolean not null default false,
  valid_until date,
  currency text not null default 'USD',
  notes_customer text,
  created_by uuid references app_user(id),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references app_user(id),
  created_at timestamptz not null default now(),
  unique (quote_number, revision)
);

create index if not exists idx_quote_customer_status on quote (customer_id, status);

create table if not exists quote_line (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quote(id) on delete cascade,
  line_no int not null,
  sku_id uuid references sku(id),
  description text not null,
  uom text not null,
  qty numeric(14,4) not null,
  unit_price numeric(12,4),
  line_amount numeric(14,2),
  price_source text,
  price_list_item_id uuid,
  contract_line_id uuid,
  override_id uuid,
  line_status text not null default 'OK'
    check (line_status in ('OK', 'BELOW_FLOOR', 'NO_COST', 'NO_POLICY', 'UNPRICED', 'PROVISIONAL')),
  atp_qty numeric(14,4),
  backorder_accepted boolean not null default false,
  unique (quote_id, line_no)
);

create table if not exists quote_line_cost (
  quote_line_id uuid primary key references quote_line(id) on delete cascade,
  ulc_record_id uuid references ulc_record(id),
  ulc numeric(12,4),
  floor_price numeric(12,4),
  margin_pct numeric(8,4),
  below_floor boolean not null default false
);

create table if not exists margin_override (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quote(id),
  quote_line_id uuid references quote_line(id),
  reason text not null,
  actor_user_id uuid not null references app_user(id),
  authorized_price numeric(12,4) not null,
  floor_broken numeric(12,4),
  ulc_used numeric(12,4),
  created_at timestamptz not null default now()
);

create table if not exists sales_order (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  ship_to_id uuid not null references ship_to(id),
  quote_id uuid references quote(id),
  order_number text not null unique,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'ON_CREDIT_HOLD', 'CONFIRMED', 'PARTIALLY_ALLOCATED', 'ALLOCATED',
    'PICKING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  )),
  customer_po_number text,
  freight_method text not null default 'MICCOMED_FLEET',
  promised_date date,
  created_by uuid references app_user(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_order_customer_status on sales_order (customer_id, status);

create table if not exists sales_order_line (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_order(id) on delete cascade,
  quote_line_id uuid references quote_line(id),
  line_no int not null,
  sku_id uuid not null references sku(id),
  description text not null,
  uom text not null,
  qty_ordered numeric(14,4) not null,
  qty_reserved numeric(14,4) not null default 0,
  qty_shipped numeric(14,4) not null default 0,
  qty_backorder numeric(14,4) not null default 0,
  unit_price numeric(12,4) not null,
  price_source text not null,
  backorder_accepted boolean not null default false,
  unique (sales_order_id, line_no)
);

create table if not exists allocation (
  id uuid primary key default gen_random_uuid(),
  sales_order_line_id uuid not null references sales_order_line(id) on delete cascade,
  lot_id uuid not null references lot(id),
  qty numeric(14,4) not null
);

create table if not exists shipment (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_order(id),
  customer_id uuid not null references customer(id),
  shipment_number text not null unique,
  status text not null default 'PLANNED' check (status in (
    'PLANNED', 'PICKED', 'STAGED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'
  )),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shipment_line (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipment(id) on delete cascade,
  sales_order_line_id uuid not null references sales_order_line(id),
  sku_id uuid not null references sku(id),
  customer_id uuid not null references customer(id),
  qty numeric(14,4) not null,
  lot_code text not null,
  expiry_date date
);

create table if not exists proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references shipment(id),
  receiver_name text not null,
  received_at timestamptz not null,
  note text,
  photo_url text,
  seal_number text,
  driver_name text
);

create table if not exists invoice (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  shipment_id uuid references shipment(id),
  invoice_number text not null unique,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'
  )),
  issued_at date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  opening_balance boolean not null default false,
  is_demo boolean not null default false,
  void_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_customer_due on invoice (customer_id, due_date);

create table if not exists invoice_line (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoice(id) on delete cascade,
  shipment_line_id uuid references shipment_line(id),
  sku_id uuid references sku(id),
  description text not null,
  uom text not null,
  qty numeric(14,4) not null,
  unit_price numeric(12,4) not null,
  line_amount numeric(14,2) not null
);

create table if not exists payment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  amount numeric(14,2) not null,
  paid_at date not null default current_date,
  method text not null default 'ACH',
  reference text,
  posted_by uuid references app_user(id),
  created_at timestamptz not null default now()
);

create table if not exists payment_application (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payment(id) on delete cascade,
  invoice_id uuid not null references invoice(id),
  amount numeric(14,2) not null
);

create table if not exists audit_event (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_user(id),
  action text not null,
  object_type text not null,
  object_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists document_file (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  doc_type text not null,
  object_id uuid,
  label text not null,
  content_text text,
  created_at timestamptz not null default now()
);

create sequence if not exists quote_number_seq start 10001;
create sequence if not exists order_number_seq start 20001;
create sequence if not exists shipment_number_seq start 30001;
create sequence if not exists invoice_number_seq start 40001;
