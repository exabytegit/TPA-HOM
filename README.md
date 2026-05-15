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

## Stack

- Node.js
- Express
- TypeScript
- dotenv
- axios
- zod
- helmet
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

TOYOTA_PLAN_ENV=sandbox

TOYOTA_PLAN_CLIENT_ID=
TOYOTA_PLAN_CLIENT_SECRET=
TOYOTA_PLAN_SCOPE=ext-link/write
TOYOTA_PLAN_SELLER=HOM

TOYOTA_PLAN_TOKEN_URL_SANDBOX=https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX=https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink

TOYOTA_PLAN_TOKEN_URL_PRODUCTION=https://auth.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION=https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
```

`TOYOTA_PLAN_ENV` acepta solo `sandbox` o `production`. El default del proyecto es `sandbox`.

## Comandos

```bash
npm run dev        # servidor en desarrollo
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

## Endpoint

`POST /api/toyota-plan/generate-link`

Body:

```json
{
  "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
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
3. Cambiar:

```env
TOYOTA_PLAN_ENV=production
```

4. Probar primero con un modelo controlado.
5. Revisar logs y monitoreo antes de publicar el flujo al sitio.

## Estructura principal

```txt
src/
  app.ts
  server.ts
  config/
    env.ts
    toyota-plan.catalog.json
    toyotaPlanConfig.ts
  middlewares/
    errorHandler.ts
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

## Proximos pasos recomendados

- Obtener credenciales sandbox reales.
- Probar token y `generatelink` con uno o dos modelos.
- Definir persistencia de logs para produccion.
- Definir alojamiento del backend.
- Agregar CORS restringido al dominio real del sitio HOMU cuando se integre frontend.
- Migrar catalogo a base de datos o panel administrable cuando los amounts requieran vigencia.
