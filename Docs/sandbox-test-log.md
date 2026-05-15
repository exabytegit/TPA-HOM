# Sandbox Test Log

## 2026-05-15 - Validacion operativa v0.3.1

### Resultado general

Validacion parcial. El backend levanta correctamente en ambiente sandbox y el healthcheck responde OK, pero la prueba real contra Toyota Plan no pudo completarse porque no existe archivo `.env` local con credenciales sandbox.

No se usaron credenciales reales. No se llamo a produccion. No se modifico el catalogo.

### 1. Verificacion de `.env`

Resultado: bloqueante.

- `.env` local: no encontrado.
- `.gitignore` ignora `.env` y `.env.*`.
- No hay credenciales sandbox cargadas en el workspace.

### 2. Levantar `npm run dev`

Resultado: OK.

El servidor levanto con defaults de desarrollo y ambiente Toyota Plan `sandbox`.

### 3. Probar `GET /health`

Resultado: OK.

Response observada:

```json
{
  "status": "ok",
  "service": "toyota-plan-adapter",
  "environment": "sandbox",
  "timestamp": "2026-05-15T05:19:48.976Z",
  "uptime": 4.5219727,
  "nodeEnv": "development"
}
```

### 4. Probar `POST /api/toyota-plan/generate-link`

Slug probado:

```txt
hilux-4x4-dc-dx-24-tdi-at-plan-100
```

Resultado: bloqueado por credenciales faltantes.

El backend resolvio correctamente el item del catalogo antes de intentar OAuth:

- `modelId`: `114`
- `planId`: `113`
- `amount`: `558824.14`
- `seller`: `HOM`

Response HTTP observada:

```txt
500 Internal Server Error
```

Motivo tecnico en logs:

```txt
Toyota Plan credentials are not configured
```

### 5. Revision de logs sensibles

Resultado: OK para esta prueba parcial.

En los logs observados no se imprimieron:

- `access_token`
- `client_secret`
- `Authorization`
- tokens Bearer

Nota: como no habia credenciales, no se llego a obtener token OAuth ni a llamar al endpoint externo `generatelink`.

### 6. Dominio del link devuelto

Resultado: no validable en esta ejecucion.

No hubo link devuelto por Toyota Plan porque falto configurar credenciales sandbox. Cuando se carguen, el backend debe aceptar solamente links con host:

```txt
sdx.suscripcion.toyotaplan.com.ar
```

### 7. Seller

Resultado: OK.

El log de resolucion de catalogo mostro:

```txt
seller=HOM
```

### 8. Amount

Resultado: OK.

El log de resolucion de catalogo mostro:

```txt
amount=558824.14
```

El valor se resolvio como numero decimal con punto.

### Proximo paso

Crear `.env` local no versionado a partir de `.env.example` y cargar credenciales sandbox reales:

```env
TOYOTA_PLAN_ENV=sandbox
TOYOTA_PLAN_CLIENT_ID=...
TOYOTA_PLAN_CLIENT_SECRET=...
```

Luego repetir:

```bash
npm run dev
curl http://localhost:3000/health
curl -X POST "http://localhost:3000/api/toyota-plan/generate-link" \
  -H "Content-Type: application/json" \
  -d '{"slug":"hilux-4x4-dc-dx-24-tdi-at-plan-100"}'
```

No commitear `.env`.
