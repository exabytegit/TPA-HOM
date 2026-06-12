# Deployment Checklist

Checklist de despliegue y preproduccion para TPA-HOM.

## Variables obligatorias

- `NODE_ENV`
- `PORT`
- `TRUST_PROXY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `CORS_ALLOWED_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `TOYOTA_PLAN_ENV`
- `TOYOTA_PLAN_CLIENT_ID`
- `TOYOTA_PLAN_CLIENT_SECRET`
- `TOYOTA_PLAN_SCOPE`
- `TOYOTA_PLAN_SELLER`
- `TOYOTA_PLAN_OAUTH_TIMEOUT_MS`
- `TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS`
- `TOYOTA_PLAN_TOKEN_URL_SANDBOX`
- `TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX`
- `TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX`
- `TOYOTA_PLAN_TOKEN_URL_PRODUCTION`
- `TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION`
- `TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION`

## Secrets y versionado

- `.env` no debe versionarse.
- No commitear credenciales ni tokens.
- Cargar secrets solo en `.env` local o secret manager del entorno.

## TRUST_PROXY

- `TRUST_PROXY=false` para desarrollo local o despliegue directo.
- `TRUST_PROXY=1` solo si el backend queda detras de un unico proxy reverso confiable.
- Confirmar topologia real antes de habilitarlo.

## CORS de produccion

- Definir `CORS_ALLOWED_ORIGINS` con dominios reales del frontend.
- No usar `*`.
- No dejar vacio en produccion.

Ejemplo:

```env
CORS_ALLOWED_ORIGINS=https://www.homu.com.ar,https://homu.com.ar
```

## TOYOTA_PLAN_ENV

- Mantener `TOYOTA_PLAN_ENV=sandbox` hasta autorizacion formal.
- Cambiar a `production` solo despues de validacion operativa y checklist firmado.

## Dev-only testing tools

Herramientas internas disponibles solo fuera de produccion:

- `GET /test-modelos.html`
- `GET /test-planes.html`
- `GET /TPA.html`
- `GET /admin.html`
- `GET /api/dev/catalog`
- `GET /api/dev/catalog-sheet`
- `POST /api/dev/admin/login`

Reglas:

- todas dependen de `NODE_ENV !== "production"`;
- en produccion `NODE_ENV=production` es obligatorio;
- no reemplazan el smoke test:

```bash
npm run smoke:sandbox
```

Seguridad:

- `/api/dev/catalog` expone solo campos seguros del catalogo;
- `/api/dev/admin/login` solo valida credenciales de desarrollo y devuelve 401 generico ante error;
- no expone tokens, `client_secret`, headers `Authorization` ni links completos;
- `test-modelos.html` es solo una ayuda manual de testing local;
- `admin.html` es la nueva vista interna con login simple para development/sandbox;
- `admin.html` no debe exponerse en produccion como mecanismo de seguridad real.

## Validacion minima antes de publicar

1. `GET /health` responde `200`.
2. `POST /api/toyota-plan/generate-link` funciona con un `slug` controlado.
3. El link devuelto usa el host esperado del ambiente.
4. Los logs muestran `correlationId`.
5. No aparecen tokens, secrets ni `Authorization` en logs.
6. `GET /test-modelos.html` no responde en produccion.
7. `GET /admin.html` no responde en produccion.
8. `GET /api/dev/catalog` no responde en produccion.
9. `POST /api/dev/admin/login` no responde en produccion.

## Smoke sandbox

Ejecutar manualmente:

```bash
npm run smoke:sandbox
```

Revisar:

- cantidad total de items;
- cantidad exitosa;
- cantidad fallida;
- archivo `Docs/sandbox-catalog-validation-log.md`.

## Rollback basico

1. Restaurar la version previa del backend.
2. Verificar `GET /health`.
3. Confirmar que el frontend deje de llamar a una version defectuosa.
4. Revisar logs con `correlationId` de requests fallidos.

## Logging seguro

- Confirmar sanitizacion recursiva activa.
- Confirmar que no se imprimen:
  - `client_secret`
  - tokens OAuth
  - headers `Authorization`
  - links completos con identificadores externos sensibles

## Observabilidad

- Verificar que el response incluya `x-correlation-id`.
- Confirmar que cada request deja logs con el mismo `correlationId`.
