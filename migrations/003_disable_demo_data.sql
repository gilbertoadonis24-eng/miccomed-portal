-- Disable DEMO rows that may have been applied by a prior seed migration in production.
-- Idempotent. Only touches is_demo=true or known DEMO emails — never real MiccoMed data.

update app_user
set active = false
where active = true
  and (
    lower(email) like '%.demo'
    or lower(email) = 'dev@example.com'
  );

update customer
set active = false
where is_demo = true
  and active = true;

update sku
set active = false
where is_demo = true
  and active = true;
