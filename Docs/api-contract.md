# API Contract

Contrato HTTP del backend adapter TPA-HOM para integración con frontend y validación operativa.

## Reglas generales

- El frontend solo envía `slug`.
- El backend resuelve internamente `modelId`, `planId`, `amount` y `seller`.
- El header `x-correlation-id` puede enviarse desde el cliente.
- Si el cliente no lo envía, el backend genera uno y lo devuelve en la respuesta.
- No enviar desde frontend:
  - `seller`
  - `modelId`
  - `planId`
  - `amount`
  - credenciales OAuth

## Dev-only testing tools

Endpoints y utilidades solo para `development/sandbox` local:

- `GET /test-modelos.html`
- `GET /api/dev/catalog`

Condiciones:

- ambos existen solo cuando `NODE_ENV !== "production"`;
- en producción deben quedar fuera de servicio;
- no reemplazan el smoke test manual `npm run smoke:sandbox`.

### GET /api/dev/catalog

Descripcion:

- devuelve el catalogo actual con campos seguros para la UI interna de testing.

Campos expuestos:

- `slug`
- `modelDescription`
- `planDescription`
- `amount`
- `seller`
- `enabled`
- `modelId`
- `planId`

Campos no expuestos:

- tokens
- `client_secret`
- credenciales OAuth
- headers `Authorization`
- links generados

## GET /health

### Descripción

Healthcheck liviano del servicio. No realiza llamadas externas a Toyota Plan.

### Request

Headers opcionales:

- `x-correlation-id`

### Response 200

```json
{
  "status": "ok",
  "service": "toyota-plan-adapter",
  "environment": "sandbox",
  "timestamp": "2026-05-21T00:00:00.000Z",
  "uptime": 12.34,
  "nodeEnv": "development"
}
```

### Headers relevantes

- `content-type: application/json; charset=utf-8`
- `x-correlation-id`

### PowerShell

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/health" `
  -Headers @{
    "x-correlation-id" = "frontend-health-001"
  }
```

### curl.exe para Windows

```powershell
curl.exe -X GET "http://localhost:3000/health" ^
  -H "x-correlation-id: frontend-health-001"
```

## POST /api/toyota-plan/generate-link

### Descripción

Genera un link de Suscripción Digital Toyota Plan a partir de un `slug` interno del catálogo.

### Request body

```json
{
  "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
}
```

### Success 200

```json
{
  "success": true,
  "link": "https://sdx.suscripcion.toyotaplan.com.ar/?external=...",
  "model": "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
  "plan": "PLAN 100% DIF G 84M",
  "amount": 558824.14
}
```

Nota:

- El backend devuelve el link completo al cliente para redirección.
- La documentación no expone links reales generados.

### Errores esperados

#### 400 Invalid request body

```json
{
  "success": false,
  "message": "Invalid request body",
  "issues": [
    {
      "path": "slug",
      "message": "slug is required"
    }
  ]
}
```

#### 400 Catalog item disabled

```json
{
  "success": false,
  "message": "Catalog item disabled"
}
```

#### 403 CORS origin not allowed

```json
{
  "success": false,
  "message": "Not allowed by CORS"
}
```

#### 404 Catalog item not found

```json
{
  "success": false,
  "message": "Catalog item not found"
}
```

#### 429 Rate limit exceeded

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

#### 500 Missing credentials or internal error

```json
{
  "success": false,
  "message": "Toyota Plan credentials are not configured"
}
```

o

```json
{
  "success": false,
  "message": "Internal server error"
}
```

#### 502 Toyota Plan integration error

```json
{
  "success": false,
  "message": "Toyota Plan integration error"
}
```

### Headers relevantes

Request:

- `content-type: application/json`
- `x-correlation-id` opcional

Response:

- `content-type: application/json; charset=utf-8`
- `x-correlation-id`

### PowerShell

```powershell
$body = @{
  slug = "hilux-4x4-dc-dx-24-tdi-at-plan-100"
} | ConvertTo-Json -Compress

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/toyota-plan/generate-link" `
  -ContentType "application/json" `
  -Headers @{
    "x-correlation-id" = "frontend-generate-001"
  } `
  -Body $body
```

### curl.exe para Windows

```powershell
curl.exe -X POST "http://localhost:3000/api/toyota-plan/generate-link" ^
  -H "Content-Type: application/json" ^
  -H "x-correlation-id: frontend-generate-001" ^
  -d "{\"slug\":\"hilux-4x4-dc-dx-24-tdi-at-plan-100\"}"
```
