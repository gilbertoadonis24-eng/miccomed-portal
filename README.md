# MiccoMed Portal Clientes (MVP DEMO)

Portal B2B quote-to-cash: catálogo con precio de cuenta, RFQ → cotización congelada → OV + ATP FEFO → despacho/POD → factura → CxC.

## Local (PGlite)

```bash
cd miccomed-portal
npm install
env -u DATABASE_URL npm run dev
# http://127.0.0.1:3000
```

Visor simulado: `cursor/identity.dev.ts` → `admin@miccomed.demo` (INTERNAL_ADMIN).

## Tests

```bash
env -u DATABASE_URL npm test
```

## Publish

`cursor-app.json` declara Postgres. Identity helper en `cursor/identity.ts`. Confirmar publish como **private** y elegir visibilidad en el diálogo.
