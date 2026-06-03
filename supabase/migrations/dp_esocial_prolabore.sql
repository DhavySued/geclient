-- Marca envioFolha = true para todos os clientes com proLabore = true ou folha = true
UPDATE clients
SET dp_services = dp_services || '{"envioFolha": true}'::jsonb
WHERE (dp_services->>'proLabore')::boolean = true
   OR (dp_services->>'folha')::boolean = true;
