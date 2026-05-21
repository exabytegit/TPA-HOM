# TPA-HOM

Backend adapter de HOMU S.A. para integrar el sitio web del concesionario con la API de
Suscripcion Digital Toyota Plan.

El frontend solo envia un `slug`. El backend resuelve internamente `modelId`, `planId`,
`amount` y `seller`, obtiene un token OAuth2 con `client_credentials`, llama al endpoint
`generatelink` de Toyota Plan y devuelve el link generado.

## Arquitectura

```txt
Frontend sitio HOMU
  -> POST /api/toyota-plan/generate-link
Backend adapter HOMU
  -> OAuth2 Toyota Plan
  -> API Toyota Plan generatelink
```

El adapter evita exponer credenciales, tokens, seller, amounts o IDs internos en el navegador.

## Estado actual

- v0.3.1: hardening previo a credenciales sandbox.
- v0.4: validacion sandbox inicial exitosa.
- v0.4.1: deduplicacion de refresh OAuth para requests concurrentes.
- v0.4.2: correlation ID por request para trazabilidad end-to-end.

La primera prueba sandbox exitosa se realizo con el slug:

```txt
hilux-4x4-dc-dx-24-tdi-at-plan-100
```

La prueba confirmo el flujo:

```txt
backend local -> OAuth sandbox -> generatelink sandbox -> link sandbox valido
```

No se documenta el link completo generado porque contiene un identificador externo unico.

## Stack

- Node.js
- Express
- TypeScript
- dotenv
- axios
- zod
- helmet
- cors
- express-rate-limit
- Vitest
- ESLint / Prettier

## Instalacion

```bash
npm install
cp .env.example .env
```

Completar en `.env` las credenciales provistas por Toyota Plan para sandbox:

```env
TOYOTA_PLAN_CLIENT_ID=
TOYOTA_PLAN_CLIENT_SECRET=
```

No hay credenciales reales en el repositorio.

## Variables de entorno

```env
NODE_ENV=development
PORT=3000
TRUST_PROXY=false

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

TOYOTA_PLAN_ENV=sandbox

TOYOTA_PLAN_CLIENT_ID=
TOYOTA_PLAN_CLIENT_SECRET=
TOYOTA_PLAN_SCOPE=ext-link/write
TOYOTA_PLAN_SELLER=HOM
TOYOTA_PLAN_OAUTH_TIMEOUT_MS=15000
TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS=15000

TOYOTA_PLAN_TOKEN_URL_SANDBOX=https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX=https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX=sdx.suscripcion.toyotaplan.com.ar

TOYOTA_PLAN_TOKEN_URL_PRODUCTION=https://auth.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION=https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION=suscripcion.toyotaplan.com.ar
```

`TOYOTA_PLAN_ENV` acepta solo `sandbox` o `production`. El default del proyecto es `sandbox`.
`CORS_ALLOWED_ORIGINS` es una lista separada por coma. En desarrollo se permiten requests sin
`Origin` para curl/Postman; en produccion solo deben pasar dominios autorizados.
`TRUST_PROXY=false` es el default seguro para desarrollo o despliegue directo. Usar `TRUST_PROXY=1`
solo cuando el backend este detras de un unico proxy reverso confiable que limpie o sobrescriba
`X-Forwarded-For`.

## Comandos

```bash
npm run dev        # servidor en desarrollo
npm run smoke:sandbox # validacion controlada del catalogo contra sandbox
npm run build      # compila TypeScript a dist/
npm start          # ejecuta dist/server.js
npm run lint       # ESLint
npm run typecheck  # chequeo de tipos sin emitir archivos
npm test           # tests unitarios
```

## Probar localmente

Levantar el servidor:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Respuesta:

```json
{
  "status": "ok",
  "service": "toyota-plan-adapter",
  "environment": "sandbox",
  "timestamp": "2026-05-15T00:00:00.000Z",
  "uptime": 12.34,
  "nodeEnv": "development"
}
```

Generar link:

```bash
curl -X POST "http://localhost:3000/api/toyota-plan/generate-link" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
  }'
```

Response exitosa esperada:

```json
{
  "success": true,
  "link": "https://suscripcion.toyotaplan.com.ar/?external=...",
  "model": "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
  "plan": "PLAN 100% DIF G 84M",
  "amount": 558824.14
}
```

Validacion controlada del catalogo sandbox:

```bash
npm run smoke:sandbox
```

El script carga `.env`, exige `TOYOTA_PLAN_ENV=sandbox`, aborta si detecta `production`, usa el
catalogo real y genera un resumen seguro en `Docs/sandbox-catalog-validation-log.md` sin imprimir
tokens, secrets ni links completos.

## Endpoint

`POST /api/toyota-plan/generate-link`

Body:

```json
{
  "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
}
```

El endpoint tiene rate limiting especifico. Por default permite 10 requests por minuto por IP:

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

Si se excede el limite:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

El backend no acepta desde frontend:

- `seller`
- `modelId`
- `planId`
- `amount`
- credenciales OAuth

## Catalogo inicial

El catalogo esta en:

```txt
src/config/toyota-plan.catalog.json
```

Cada item contiene:

- `slug`
- `modelId`
- `modelDescription`
- `planId`
- `planDescription`
- `amount`
- `seller`
- `enabled`

El campo `amount` se envia a Toyota Plan como numero JSON con punto decimal:

```json
{
  "amount": 558824.14
}
```

No debe enviarse como string visual argentino, por ejemplo `"$ 558.824,14"`.

## Seguridad

- No hardcodear `client_id` ni `client_secret`.
- No exponer tokens al frontend.
- No loguear `client_secret` ni `access_token`.
- Usar `seller=HOM` desde backend.
- Usar `slug` como unico dato confiable recibido desde frontend.
- Mantener sandbox por defecto hasta tener validacion operativa.
- Usar HTTPS obligatorio en produccion.
- CORS esta restringido por `CORS_ALLOWED_ORIGINS`.
- Helmet aplica headers basicos de seguridad HTTP.
- El endpoint de generacion tiene rate limiting.
- El link devuelto por Toyota Plan se valida contra el host esperado por ambiente.
- El controller captura `ip` y `user-agent` para trazabilidad tecnica en logs.
- Los logs sanitizan secrets y tokens de forma recursiva antes de escribir metadata.
- `TRUST_PROXY` es configurable y no queda activo por defecto.

## Trust Proxy

Express usa `trust proxy` para decidir si debe confiar en headers como `X-Forwarded-For`.

Configuracion local o despliegue directo:

```env
TRUST_PROXY=false
```

Configuracion detras de un unico proxy reverso confiable:

```env
TRUST_PROXY=1
```

No usar `TRUST_PROXY=1` si el backend queda expuesto directamente a internet o si el proxy no limpia
headers entrantes. Una configuracion incorrecta puede afectar `req.ip`, auditoria y rate limiting.

## Logging Seguro

El logger sanitiza metadata de forma recursiva:

- `access_token`
- `accessToken`
- `token`
- `id_token`
- `refresh_token`
- `client_secret`
- `clientSecret`
- `secret`
- `password`
- `authorization`
- `api_key`
- `apiKey`
- strings tipo `Bearer eyJ...`

Las respuestas externas de OAuth/API se registran sanitizadas. No se deben loguear objetos Axios
completos ni headers sensibles sin pasar por el logger.

## Buenas practicas de frontend

El frontend debe llamar a `POST /api/toyota-plan/generate-link` solamente cuando el usuario haga
clic en "Suscribite" o una accion equivalente.

No generar links masivamente al cargar la pagina. Eso produciria llamadas innecesarias a Toyota Plan
y podria consumir rate limit o generar trazabilidad confusa.

## Token OAuth2

El servicio `toyotaPlanAuth.service.ts`:

- solicita token con `client_credentials`;
- cachea token en memoria;
- reutiliza token vigente;
- renueva 5 minutos antes del vencimiento;
- permite `refreshAccessToken()` para retry controlado.

Si Toyota Plan responde que el token expiro durante `generatelink`, el backend fuerza refresh y
reintenta una sola vez.

## Errores frecuentes

Slug inexistente:

```json
{
  "success": false,
  "message": "Catalog item not found"
}
```

Item deshabilitado:

```json
{
  "success": false,
  "message": "Catalog item disabled"
}
```

Falla de integracion Toyota Plan:

```json
{
  "success": false,
  "message": "Toyota Plan integration error"
}
```

Credenciales no configuradas:

```json
{
  "success": false,
  "message": "Toyota Plan credentials are not configured"
}
```

## Cambiar a produccion

1. Configurar credenciales productivas.
2. Confirmar con Toyota Plan que `HOM` esta habilitado en produccion.
3. Configurar dominios reales:

```env
CORS_ALLOWED_ORIGINS=https://www.homu.com.ar,https://homu.com.ar
```

4. Cambiar:

```env
TOYOTA_PLAN_ENV=production
```

5. Confirmar `TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION=suscripcion.toyotaplan.com.ar`.
6. Probar primero con un modelo controlado.
7. Revisar logs y monitoreo antes de publicar el flujo al sitio.

## Estructura principal

```txt
src/
  app.ts
  server.ts
  config/
    corsConfig.ts
    env.ts
    toyota-plan.catalog.json
    toyotaPlanConfig.ts
  middlewares/
    errorHandler.ts
    rateLimit.ts
    requestLogger.ts
  modules/
    toyotaPlan/
      toyotaPlan.routes.ts
      toyotaPlan.controller.ts
      toyotaPlan.service.ts
      toyotaPlanAuth.service.ts
      toyotaPlanCatalog.service.ts
      toyotaPlan.schemas.ts
      toyotaPlan.types.ts
  utils/
    appError.ts
    httpClient.ts
    logger.ts
tests/
```

## Mejoras v0.3 - Seguridad, trazabilidad y preparacion productiva

- CORS restringido por ambiente usando `CORS_ALLOWED_ORIGINS`.
- Rate limiting especifico en `POST /api/toyota-plan/generate-link`.
- Captura de IP y User-Agent desde el controller.
- Propagacion de metadata al service y logs.
- Helmet aplicado antes de las rutas.
- Healthcheck liviano en `GET /health`, sin llamadas externas.
- Graceful shutdown ante `SIGINT` y `SIGTERM`.
- Validacion del dominio del link devuelto por Toyota Plan.
- Documentacion de la regla frontend: generar link solo por accion del usuario.
- Roadmap documentado para migrar catalogo JSON a base de datos.

## Mejoras v0.3.1 - Hardening previo a credenciales sandbox

- `TRUST_PROXY` configurable por variable de entorno.
- Default seguro `TRUST_PROXY=false`.
- Validacion estricta de `CORS_ALLOWED_ORIGINS` con origins `http`/`https`.
- En produccion, `CORS_ALLOWED_ORIGINS` no puede quedar vacio ni usar wildcard.
- Redaccion recursiva de logs para secretos, tokens, arrays y objetos anidados.
- Sanitizacion de respuestas externas antes de loguearlas.
- Tests adicionales para CORS productivo sin `Origin`, healthcheck fuera de rate limit, host esperado por ambiente y redaccion de logs.
- Recomendacion reforzada: cargar credenciales solo en `.env` local o secret manager.
- Recordatorio: `.env` no debe commitearse.

## Mejoras v0.4 - Validacion sandbox inicial exitosa

- Backend local validado en `PORT=3000`.
- `GET /health` respondio correctamente en ambiente `sandbox`.
- OAuth sandbox validado correctamente.
- `POST /api/toyota-plan/generate-link` genero link sandbox valido.
- Slug validado: `hilux-4x4-dc-dx-24-tdi-at-plan-100`.
- Host devuelto validado: `sdx.suscripcion.toyotaplan.com.ar`.
- Seller usado por backend: `HOM`.
- `amount` enviado como numero decimal: `558824.14`.
- No se documentan credenciales, tokens ni link completo generado.

## Mejoras v0.4.1 - Deduplicacion de refresh OAuth

- `ToyotaPlanAuthService` deduplica refreshes OAuth concurrentes.
- Si el token cacheado no es valido y ya hay un refresh en curso, las requests esperan la misma promesa.
- Si no hay refresh en curso, se crea un unico refresh y se limpia la referencia en `finally`.
- La ventana de renovacion anticipada de token se mantiene.
- El retry unico por token expirado en `ToyotaPlanService` se mantiene.
- No se loguean tokens, secretos ni headers de autorizacion.
- Tests cubren llamadas concurrentes y limpieza de promesa tras fallo de refresh.

## Mejoras v0.4.2 - Correlation ID y trazabilidad

- Se agrega middleware de correlation ID por request.
- Si entra `x-correlation-id`, se respeta; si no, se genera con `randomUUID()`.
- La respuesta siempre devuelve `x-correlation-id`.
- El correlation ID se propaga con `AsyncLocalStorage`, sin pasarlo manualmente por services.
- El logger agrega `correlationId` automaticamente a cada log.
- La sanitizacion recursiva de secrets y tokens se mantiene intacta.
- Tests cubren generacion, propagacion, aislamiento entre requests concurrentes y respuesta con header.

## Mejoras v0.4.3 - Politica conservadora de retries

- Se separan timeouts para OAuth y `generateLink`.
- Variables nuevas:
  `TOYOTA_PLAN_OAUTH_TIMEOUT_MS`
  `TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS`
- OAuth permite hasta 2 intentos en total, con backoff corto.
- OAuth solo reintenta errores transitorios de red o `502/503/504`.
- OAuth no reintenta `invalid_client`, `invalid_request` ni otros `4xx`.
- `generateLink` no reintenta timeouts ni errores transitorios por defecto, porque es una operacion `POST` no idempotente.
- `generateLink` mantiene solo el retry actual cuando Toyota responde token expirado.
- Mientras Toyota no confirme idempotency key o garantia equivalente, no conviene activar retry automatico sobre `generateLink`.

## Herramienta Operativa De Catalogo Sandbox

Se agrega el script:

```txt
scripts/smokeSandboxCatalog.ts
```

Y el comando:

```bash
npm run smoke:sandbox
```

Esta herramienta usa el catalogo real y el service real para validar manualmente los slugs
`enabled` contra Toyota Plan sandbox. No corre dentro de `npm test`, no se ejecuta si faltan
credenciales sandbox y no imprime tokens ni links completos.

## Roadmap base de datos

No hay base de datos implementada todavia. El catalogo actual vive en:

```txt
src/config/toyota-plan.catalog.json
```

En una etapa productiva futura conviene migrarlo a una tabla `toyota_plan_catalog`, porque los
valores de `amount` pueden cambiar con frecuencia.

Campos sugeridos:

- `id`
- `slug`
- `model_id`
- `model_description`
- `plan_id`
- `plan_description`
- `amount`
- `seller`
- `enabled`
- `source`
- `valid_from`
- `valid_to`
- `created_at`
- `updated_at`

Tambien queda prevista una tabla de auditoria `toyota_plan_link_log`:

- `id`
- `catalog_slug`
- `model_id`
- `plan_id`
- `amount`
- `seller`
- `success`
- `generated_link`
- `error_code`
- `error_message`
- `request_ip`
- `user_agent`
- `created_at`

## Proximos pasos recomendados

- Probar el resto de los slugs del catalogo.
- Registrar que `modelId`/`planId` funcionan en sandbox.
- Verificar si todos los planes estan habilitados para seller `HOM`.
- Preparar checklist de preproduccion.
- Definir persistencia de logs para produccion.
- Definir alojamiento del backend.
- Confirmar topologia real antes de usar `TRUST_PROXY=1`.
- Mantener `TOYOTA_PLAN_ENV=sandbox` hasta autorizacion formal de pase a produccion.
- Migrar catalogo a base de datos o panel administrable cuando los amounts requieran vigencia.
