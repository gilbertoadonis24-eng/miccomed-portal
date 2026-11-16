-- DEMO seed — claramente marcado is_demo=true. Datos ficticios para demos y tests de no-fuga.
-- No son precios ni clientes reales de MiccoMed.

insert into category (id, slug, name_es) values
  ('11111111-1111-1111-1111-111111111001', 'devices', 'Dispositivos'),
  ('11111111-1111-1111-1111-111111111002', 'packaging-bottles', 'Empaque — frascos'),
  ('11111111-1111-1111-1111-111111111003', 'packaging-closures', 'Empaque — tapas'),
  ('11111111-1111-1111-1111-111111111004', 'packaging-cartons', 'Empaque — cajas'),
  ('11111111-1111-1111-1111-111111111005', 'office-medical', 'Consultorio')
on conflict (slug) do nothing;

insert into customer (
  id, code, legal_name, trade_name, tier, payment_terms, credit_limit,
  credit_status, min_shelf_life_days, requires_customer_po, tax_rate,
  document_language, internal_ar_notes, is_demo
) values
  (
    '22222222-2222-2222-2222-222222222001',
    'DEMO-NORTE',
    'Farmacia Norte Demo LLC',
    'Farmacia Norte DEMO',
    'TIER_A',
    'NET_30',
    5000.00,
    'OPEN',
    180,
    false,
    0.07,
    'es',
    'DEMO: notas internas de cobranza — el cliente NO debe ver esto',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222002',
    'DEMO-SUR',
    'Clinica Sur Demo Inc',
    'Clinica Sur DEMO',
    'TIER_B',
    'NET_15',
    2000.00,
    'OPEN',
    180,
    true,
    0.07,
    'es',
    'DEMO: segunda cuenta para pruebas IDOR',
    true
  )
on conflict (code) do nothing;

insert into ship_to (id, customer_id, name, address_line1, city, state, postal_code, contact_name, miami_metro)
values
  (
    '33333333-3333-3333-3333-333333333001',
    '22222222-2222-2222-2222-222222222001',
    'Almacén Norte DEMO',
    '100 NW Demo St',
    'Miami',
    'FL',
    '33127',
    'Ana Compradora',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333002',
    '22222222-2222-2222-2222-222222222002',
    'Recepción Sur DEMO',
    '200 SW Sample Ave',
    'Miami',
    'FL',
    '33130',
    'Luis AP',
    true
  );

insert into app_user (id, email, display_name, role, customer_id, active) values
  (
    '44444444-4444-4444-4444-444444444001',
    'admin@miccomed.demo',
    'Admin MiccoMed DEMO',
    'INTERNAL_ADMIN',
    null,
    true
  ),
  (
    '44444444-4444-4444-4444-444444444002',
    'staff@miccomed.demo',
    'Staff MiccoMed DEMO',
    'INTERNAL_STAFF',
    null,
    true
  ),
  (
    '44444444-4444-4444-4444-444444444003',
    'comprador@farmacia-norte.demo',
    'Comprador Norte DEMO',
    'CLIENT_USER',
    '22222222-2222-2222-2222-222222222001',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444004',
    'ap@clinica-sur.demo',
    'AP Sur DEMO',
    'CLIENT_USER',
    '22222222-2222-2222-2222-222222222002',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444005',
    'dev@example.com',
    'Dev Viewer (local)',
    'INTERNAL_ADMIN',
    null,
    true
  )
on conflict (email) do nothing;

insert into staff_permission (user_id, permission)
select '44444444-4444-4444-4444-444444444002', p from unnest(array[
  'view_cost', 'override_margin', 'send_quote', 'confirm_order',
  'ship', 'issue_invoice', 'post_payment'
]) as p;

insert into sku (id, sku_code, manufacturer_sku, title, short_description, category_id, lead_time_class, dated, active, is_demo)
values
  (
    '55555555-5555-5555-5555-555555555001',
    'BOT-PET-AMB-MR-8-24',
    'MFR-BOT-8AMB',
    'Frasco PET ámbar 8 oz Modern Round 24 mm',
    'Empaque vacío PET ámbar. DEMO.',
    '11111111-1111-1111-1111-111111111002',
    'STOCK',
    false,
    true,
    true
  ),
  (
    '55555555-5555-5555-5555-555555555002',
    'CAP-PP-CRC-WHT-24-FOAM-HIC',
    'MFR-CAP-CRC24',
    'Tapa CRC PP blanca 24 mm foam + HIC',
    'Cierre CRC con liner foam e indicador. DEMO.',
    '11111111-1111-1111-1111-111111111003',
    'STOCK',
    false,
    true,
    true
  ),
  (
    '55555555-5555-5555-5555-555555555003',
    'DEV-PULSEOX-DEMO-01',
    'MFR-PX-100',
    'Pulsioxímetro dedo DEMO',
    'Dispositivo de demostración con 510(k) verificado ficticio.',
    '11111111-1111-1111-1111-111111111001',
    'STOCK',
    true,
    true,
    true
  ),
  (
    '55555555-5555-5555-5555-555555555004',
    'OFF-GLOVE-NIT-M-DEMO',
    'MFR-GLV-M',
    'Guantes nitrilo M DEMO',
    'Suministro de consultorio. Sin precio de tier (RFQ).',
    '11111111-1111-1111-1111-111111111005',
    'SPECIAL_ORDER',
    true,
    true,
    true
  )
on conflict (sku_code) do nothing;

insert into sku_uom (id, sku_id, uom, factor_to_base, is_default) values
  ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', 'EACH', 1, true),
  ('66666666-6666-6666-6666-666666666002', '55555555-5555-5555-5555-555555555001', 'CASE', 100, false),
  ('66666666-6666-6666-6666-666666666003', '55555555-5555-5555-5555-555555555002', 'EACH', 1, true),
  ('66666666-6666-6666-6666-666666666004', '55555555-5555-5555-5555-555555555002', 'CASE', 200, false),
  ('66666666-6666-6666-6666-666666666005', '55555555-5555-5555-5555-555555555003', 'EACH', 1, true),
  ('66666666-6666-6666-6666-666666666006', '55555555-5555-5555-5555-555555555004', 'CASE', 1000, true);

insert into sku_regulatory (sku_id, regulatory_status, k_number, k_number_verified, disclosable_text) values
  ('55555555-5555-5555-5555-555555555001', 'PACKAGING_ONLY', null, false, 'Empaque. Sin lenguaje de dispositivo.'),
  ('55555555-5555-5555-5555-555555555002', 'PACKAGING_ONLY', null, false, 'Empaque. Sin lenguaje de dispositivo.'),
  ('55555555-5555-5555-5555-555555555003', 'DEVICE_510K_CLEARED', 'K99DEMO1', true, 'FDA 510(k) cleared K99DEMO1 (dato DEMO).'),
  ('55555555-5555-5555-5555-555555555004', 'UNKNOWN', null, false, null);

insert into margin_policy (id, category_id, min_margin_pct, effective_from, note) values
  (
    '77777777-7777-7777-7777-777777777001',
    null,
    0.2500,
    '2020-01-01',
    'DEMO: margen mínimo global 25% sobre venta'
  );

insert into ulc_record (id, sku_id, ulc, effective_from, assumptions_note, is_demo) values
  ('88888888-8888-8888-8888-888888888001', '55555555-5555-5555-5555-555555555001', 1.0000, '2020-01-01', 'DEMO ULC frasco', true),
  ('88888888-8888-8888-8888-888888888002', '55555555-5555-5555-5555-555555555002', 0.4000, '2020-01-01', 'DEMO ULC tapa', true),
  ('88888888-8888-8888-8888-888888888003', '55555555-5555-5555-5555-555555555003', 12.0000, '2020-01-01', 'DEMO ULC device', true);

insert into price_list (id, tier, name, effective_from) values
  ('99999999-9999-9999-9999-999999999001', 'LIST', 'Lista DEMO', '2020-01-01'),
  ('99999999-9999-9999-9999-999999999002', 'TIER_A', 'Tier A DEMO', '2020-01-01'),
  ('99999999-9999-9999-9999-999999999003', 'TIER_B', 'Tier B DEMO', '2020-01-01');

insert into price_list_item (id, price_list_id, sku_id, uom, min_qty, unit_price) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '99999999-9999-9999-9999-999999999001', '55555555-5555-5555-5555-555555555001', 'EACH', 1, 2.1000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '99999999-9999-9999-9999-999999999002', '55555555-5555-5555-5555-555555555001', 'EACH', 1, 1.8000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', '99999999-9999-9999-9999-999999999003', '55555555-5555-5555-5555-555555555001', 'EACH', 1, 1.5500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', '99999999-9999-9999-9999-999999999001', '55555555-5555-5555-5555-555555555002', 'EACH', 1, 0.9000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', '99999999-9999-9999-9999-999999999002', '55555555-5555-5555-5555-555555555002', 'EACH', 1, 0.7500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', '99999999-9999-9999-9999-999999999003', '55555555-5555-5555-5555-555555555002', 'EACH', 1, 0.6500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', '99999999-9999-9999-9999-999999999001', '55555555-5555-5555-5555-555555555003', 'EACH', 1, 28.0000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', '99999999-9999-9999-9999-999999999002', '55555555-5555-5555-5555-555555555003', 'EACH', 1, 24.0000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa009', '99999999-9999-9999-9999-999999999003', '55555555-5555-5555-5555-555555555003', 'EACH', 1, 22.0000);

-- Contrato vigente Norte DEMO sobre frasco (1.40 > piso 1.3333)
insert into customer_contract (id, customer_id, status, effective_from, min_shelf_life_days, file_label)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
  '22222222-2222-2222-2222-222222222001',
  'ACTIVE',
  '2020-01-01',
  180,
  'Contrato DEMO Norte'
);

insert into contract_line (id, contract_id, sku_id, uom, min_qty, unit_price)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccc001',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
  '55555555-5555-5555-5555-555555555001',
  'EACH',
  1,
  1.4000
);

-- Lotes DEMO alineados al ejemplo del plan §3.6 (vida útil 180d → ATP device = 5)
insert into lot (id, sku_id, lot_code, expiry_date, received_at, is_demo) values
  ('dddddddd-dddd-dddd-dddd-ddddddddd001', '55555555-5555-5555-5555-555555555003', 'L1-SHORT', current_date + 90, current_date - 30, true),
  ('dddddddd-dddd-dddd-dddd-ddddddddd002', '55555555-5555-5555-5555-555555555003', 'L2-OK', current_date + 400, current_date - 10, true),
  ('dddddddd-dddd-dddd-dddd-ddddddddd003', '55555555-5555-5555-5555-555555555003', 'L3-QUAR', current_date + 500, current_date - 5, true),
  ('dddddddd-dddd-dddd-dddd-ddddddddd004', '55555555-5555-5555-5555-555555555001', 'BOT-LOT-A', null, current_date - 20, true),
  ('dddddddd-dddd-dddd-dddd-ddddddddd005', '55555555-5555-5555-5555-555555555002', 'CAP-LOT-A', null, current_date - 15, true);

insert into lot_balance (id, lot_id, status, qty_on_hand, qty_reserved) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', 'dddddddd-dddd-dddd-dddd-ddddddddd001', 'AVAILABLE', 10, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee002', 'dddddddd-dddd-dddd-dddd-ddddddddd002', 'AVAILABLE', 5, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee003', 'dddddddd-dddd-dddd-dddd-ddddddddd003', 'QUARANTINE', 100, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee004', 'dddddddd-dddd-dddd-dddd-ddddddddd004', 'AVAILABLE', 500, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee005', 'dddddddd-dddd-dddd-dddd-ddddddddd005', 'AVAILABLE', 800, 0);

-- Factura vencida DEMO (>15d mora) para hold de crédito en Norte
insert into invoice (
  id, customer_id, shipment_id, invoice_number, status, issued_at, due_date,
  subtotal, tax_amount, total, amount_paid, opening_balance, is_demo
) values (
  'ffffffff-ffff-ffff-ffff-ffffffffff01',
  '22222222-2222-2222-2222-222222222001',
  null,
  'INV-DEMO-OPEN-001',
  'ISSUED',
  current_date - 45,
  current_date - 20,
  1200.00,
  84.00,
  1284.00,
  0,
  true,
  true
);

insert into invoice_line (id, invoice_id, sku_id, description, uom, qty, unit_price, line_amount)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffff11',
  'ffffffff-ffff-ffff-ffff-ffffffffff01',
  '55555555-5555-5555-5555-555555555001',
  'Saldo apertura DEMO',
  'EACH',
  1,
  1200.00,
  1200.00
);
