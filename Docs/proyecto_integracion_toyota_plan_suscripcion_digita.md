# Proyecto: Integración API Suscripción Digital Toyota Plan — HOMU S.A.

**Versión:** 0.4.4 observabilidad mínima
**Concesionario:** HOMU S.A.  
**Seller productivo:** `HOM`  
**Objetivo:** integrar el sitio web del concesionario con la API pública de Suscripción Digital Toyota Plan para generar links de suscripción online por modelo y plan.

---

## 1. Resumen ejecutivo

El desarrollo consiste en construir un backend intermedio para que el sitio web de HOMU S.A. pueda generar links de suscripción digital de Toyota Plan.

La integración no debe hacerse directamente desde el frontend, porque las credenciales de acceso a la API no deben exponerse al navegador. El flujo correcto es:

1. El frontend muestra modelos y planes disponibles.
2. El usuario hace clic en “Suscribite” o botón equivalente.
3. El frontend llama al backend propio de HOMU.
4. El backend identifica el modelo/plan elegido en un catálogo interno.
5. El backend obtiene o reutiliza un token OAuth2.
6. El backend llama al endpoint de Toyota Plan `generatelink`.
7. Toyota Plan devuelve un link externo.
8. El frontend redirige al usuario o abre el link generado.

---

## 2. Alcance funcional

### Incluido en esta primera etapa

- Integrar API de Suscripción Digital Toyota Plan.
- Usar OAuth2 con `client_credentials`.
- Generar links dinámicos por modelo y plan.
- Asociar cada link al seller oficial de HOMU: `HOM`.
- Usar catálogo inicial de modelos, planes y valores de cuota 1.
- Implementar backend seguro para no exponer credenciales.
- Preparar ambiente de pruebas y luego producción.
- Registrar logs mínimos de cada generación de link.

### No incluido inicialmente

- ABM completo administrativo de modelos y planes.
- Sincronización automática con una fuente oficial externa de Toyota Plan.
- Pago dentro del sitio de HOMU.
- Gestión del contrato posterior a la suscripción.
- Integración directa con SIAC en esta primera etapa.

---

## 3. API objetivo

### Nombre funcional

**Suscripción Digital Toyota Plan**

### Descripción

La aplicación permite a una persona física o jurídica contratar un plan de ahorro 100% online. El flujo del cliente incluye:

- Carga de documentación personal.
- Validación de identidad mediante biometría facial.
- Pago de la primera cuota.
- Recepción del contrato por correo electrónico.

---

## 4. Ambientes

### Ambiente de pruebas

#### Token

```txt
https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token
```

#### Generación de link

```txt
https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
```

### Ambiente de producción

#### Token

```txt
https://auth.suscripcion.toyotaplan.com.ar/oauth2/token
```

#### Generación de link

```txt
https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
```

---

## 5. Autenticación

### Método

OAuth2 `client_credentials`.

### Request para obtener token

**Method:** `POST`  
**Content-Type:** `application/x-www-form-urlencoded`

### Body

```txt
client_id=<credencial provista>
client_secret=<credencial provista>
grant_type=client_credentials
scope=ext-link/write
```

### Response esperada

```json
{
  "access_token": "JWT_TOKEN",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Regla técnica importante

El token expira en 3600 segundos. El backend debe cachearlo y reutilizarlo hasta poco antes de su vencimiento, por ejemplo hasta 5 minutos antes de expirar.

---

## 6. Generación de links

### Endpoint

```txt
POST /api/public/subscriptions/generatelink
```

### Headers

```txt
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Body requerido

```json
{
  "modelId": "114",
  "planId": "113",
  "amount": 558824.14,
  "seller": "HOM"
}
```

### Response exitosa

```json
{
  "success": true,
  "link": "https://suscripcion.toyotaplan.com.ar/?external=..."
}
```

---

## 7. Catálogo HOMU para pruebas

Estos valores quedan cargados como catálogo inicial de prueba. El campo `amount` debe enviarse como número JSON con punto decimal, sin símbolo `$`, sin separador de miles y sin coma decimal.

| modelId | Modelo | planId | Plan | amount API | amount visual |
|---:|---|---:|---|---:|---:|
| 114 | HILUX 4X4 D/C DX 2.4 TDI 6 A/T | 113 | PLAN 100% DIF G 84M | 558824.14 | $ 558.824,14 |
| 115 | YARIS CROSS XLI 1.5 CVT FLEX | 115 | 70/30 84 M DIF H | 465393.18 | $ 465.393,18 |
| 105 | COROLLA CROSS XLI 2.0 CVT | 115 | 70/30 84 M DIF H | 582729.05 | $ 582.729,05 |
| 111 | HIACE FURGÓN L2H2 2.8 TDI 6AT 3A 5P | 113 | PLAN 100% DIF G 84M | 639161.64 | $ 639.161,64 |
| 96 | HILUX 4X2 D/C DX 2.4 TDI 6 M/T | 108 | 70/30 DIF G 84 MESES | 414400.40 | $ 414.400,40 |
| 116 | YARIS CROSS XEI HEV 1.5 ECVT FLEX | 114 | 100% 84 M DIF H | 651441.37 | $ 651.441,37 |
| 108 | YARIS XS 1.5 CVT 5P | 108 | 70/30 DIF G 84 MESES | 288034.53 | $ 288.034,53 |
| 113 | YARIS XS CVT 5P FLEX | 113 | PLAN 100% DIF G 84M | 322629.82 | $ 322.629,82 |
| 107 | COROLLA 2.0 XLI CVT | 115 | 70/30 84 M DIF H | 494777.57 | $ 494.777,57 |

---

## 8. Catálogo JSON inicial

Archivo sugerido:

```txt
src/config/toyota-plan.catalog.json
```

Contenido inicial:

```json
[
  {
    "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100",
    "modelId": "114",
    "modelDescription": "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
    "planId": "113",
    "planDescription": "PLAN 100% DIF G 84M",
    "amount": 558824.14,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "yaris-cross-xli-15-cvt-flex-70-30",
    "modelId": "115",
    "modelDescription": "YARIS CROSS XLI 1.5 CVT FLEX",
    "planId": "115",
    "planDescription": "70/30 84 M DIF H",
    "amount": 465393.18,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "corolla-cross-xli-20-cvt-70-30",
    "modelId": "105",
    "modelDescription": "COROLLA CROSS XLI 2.0 CVT",
    "planId": "115",
    "planDescription": "70/30 84 M DIF H",
    "amount": 582729.05,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "hiace-furgon-l2h2-28-tdi-at-plan-100",
    "modelId": "111",
    "modelDescription": "HIACE FURGÓN L2H2 2.8 TDI 6AT 3A 5P",
    "planId": "113",
    "planDescription": "PLAN 100% DIF G 84M",
    "amount": 639161.64,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "hilux-4x2-dc-dx-24-tdi-mt-70-30",
    "modelId": "96",
    "modelDescription": "HILUX 4X2 D/C DX 2.4 TDI 6 M/T",
    "planId": "108",
    "planDescription": "70/30 DIF G 84 MESES",
    "amount": 414400.40,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "yaris-cross-xei-hev-15-ecvt-flex-plan-100",
    "modelId": "116",
    "modelDescription": "YARIS CROSS XEI HEV 1.5 ECVT FLEX",
    "planId": "114",
    "planDescription": "100% 84 M DIF H",
    "amount": 651441.37,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "yaris-xs-15-cvt-5p-70-30",
    "modelId": "108",
    "modelDescription": "YARIS XS 1.5 CVT 5P",
    "planId": "108",
    "planDescription": "70/30 DIF G 84 MESES",
    "amount": 288034.53,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "yaris-xs-cvt-5p-flex-plan-100",
    "modelId": "113",
    "modelDescription": "YARIS XS CVT 5P FLEX",
    "planId": "113",
    "planDescription": "PLAN 100% DIF G 84M",
    "amount": 322629.82,
    "seller": "HOM",
    "enabled": true
  },
  {
    "slug": "corolla-20-xli-cvt-70-30",
    "modelId": "107",
    "modelDescription": "COROLLA 2.0 XLI CVT",
    "planId": "115",
    "planDescription": "70/30 84 M DIF H",
    "amount": 494777.57,
    "seller": "HOM",
    "enabled": true
  }
]
```

---

## 9. Arquitectura recomendada

### Componentes

```txt
Frontend sitio HOMU
  ↓
Backend propio HOMU / Adapter Toyota Plan
  ↓
OAuth Server Toyota Plan
  ↓
API Suscripción Digital Toyota Plan
```

### Responsabilidades del frontend

- Mostrar modelos y planes.
- Llamar al backend con un identificador seguro, por ejemplo `slug`.
- Recibir el link generado.
- Redirigir al usuario al link de Toyota Plan.

### Responsabilidades del backend

- Mantener credenciales seguras.
- Mantener catálogo de modelos, planes, amounts y seller.
- Obtener y cachear token OAuth2.
- Validar que el `slug` solicitado esté habilitado.
- Generar link contra API Toyota Plan.
- Registrar logs.
- Manejar errores.

---

## 10. Endpoint propio sugerido

### Generar link desde el sitio HOMU

```txt
POST /api/toyota-plan/generate-link
```

### Body frontend → backend

```json
{
  "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
}
```

### Backend resuelve internamente

```json
{
  "modelId": "114",
  "planId": "113",
  "amount": 558824.14,
  "seller": "HOM"
}
```

### Response backend → frontend

```json
{
  "success": true,
  "link": "https://suscripcion.toyotaplan.com.ar/?external=...",
  "model": "HILUX 4X4 D/C DX 2.4 TDI 6 A/T",
  "plan": "PLAN 100% DIF G 84M",
  "amount": 558824.14
}
```

---

## 11. Variables de entorno sugeridas

```env
NODE_ENV=development
PORT=3000
TRUST_PROXY=false

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

TOYOTA_PLAN_ENV=sandbox
TOYOTA_PLAN_CLIENT_ID=colocar_client_id
TOYOTA_PLAN_CLIENT_SECRET=colocar_client_secret
TOYOTA_PLAN_SCOPE=ext-link/write
TOYOTA_PLAN_SELLER=HOM
TOYOTA_PLAN_TOKEN_URL_SANDBOX=https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX=https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX=sdx.suscripcion.toyotaplan.com.ar
TOYOTA_PLAN_TOKEN_URL_PRODUCTION=https://auth.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION=https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION=suscripcion.toyotaplan.com.ar
```

---

## 12. Manejo de errores esperado

### Token inválido o credenciales incorrectas

Posible respuesta del servidor de autenticación:

```json
{
  "error": "invalid_client"
}
```

Acción recomendada:

- No reintentar indefinidamente.
- Registrar error técnico.
- Alertar a soporte.
- Revisar `client_id` y `client_secret`.

### Request mal formado

```json
{
  "error": "invalid_request"
}
```

Acción recomendada:

- Revisar `grant_type`, `scope`, headers y formato `x-www-form-urlencoded`.

### Body incorrecto en generación de link

```json
{
  "message": "Invalid request body"
}
```

Causas probables:

- `modelId` inexistente.
- `planId` incorrecto.
- `seller` incorrecto.
- `amount` con formato inválido.
- Se envió `amount` como texto con `$`, puntos de miles o coma decimal.

### Token expirado

```json
{
  "message": "The incoming token has expired"
}
```

Acción recomendada:

- Forzar renovación de token.
- Reintentar una sola vez la generación del link.

---

## 13. Modelo de datos sugerido para producción

Cuando el proyecto supere la etapa de prueba, conviene pasar el catálogo a base de datos.

```sql
CREATE TABLE toyota_plan_catalog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    slug NVARCHAR(150) NOT NULL UNIQUE,
    model_id NVARCHAR(20) NOT NULL,
    model_description NVARCHAR(255) NOT NULL,
    plan_id NVARCHAR(20) NOT NULL,
    plan_description NVARCHAR(255) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    seller NVARCHAR(10) NOT NULL DEFAULT 'HOM',
    enabled BIT NOT NULL DEFAULT 1,
    source NVARCHAR(100) NULL,
    valid_from DATETIME2 NULL,
    valid_to DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NULL
);
```

### Tabla de auditoría recomendada

```sql
CREATE TABLE toyota_plan_link_log (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    catalog_slug NVARCHAR(150) NOT NULL,
    model_id NVARCHAR(20) NOT NULL,
    plan_id NVARCHAR(20) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    seller NVARCHAR(10) NOT NULL,
    success BIT NOT NULL,
    generated_link NVARCHAR(MAX) NULL,
    error_code NVARCHAR(100) NULL,
    error_message NVARCHAR(MAX) NULL,
    request_ip NVARCHAR(100) NULL,
    user_agent NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

---

## 14. Ejemplo de prueba con curl

### 14.1 Obtener token

```bash
curl -X POST "https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=TU_CLIENT_ID" \
  -d "client_secret=TU_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "scope=ext-link/write"
```

### 14.2 Generar link

```bash
curl -X POST "https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink" \
  -H "Content-Type: application/json" \
  -H "Authorization: [REDACTED]" \
  -d '{
    "modelId": "114",
    "planId": "113",
    "amount": 558824.14,
    "seller": "HOM"
  }'
```

---

## 15. Flujo técnico interno

```txt
Usuario selecciona modelo/plan
        ↓
Frontend envía slug al backend
        ↓
Backend valida slug en catálogo
        ↓
Backend verifica token en caché
        ↓
Si no hay token válido, solicita token OAuth2
        ↓
Backend arma body con modelId, planId, amount, seller
        ↓
Backend llama a Toyota Plan generatelink
        ↓
Toyota devuelve link
        ↓
Backend registra log
        ↓
Frontend recibe link
        ↓
Usuario continúa en Suscripción Digital Toyota Plan
```

---

## 16. Riesgos y controles

| Riesgo | Impacto | Control recomendado |
|---|---|---|
| Exponer credenciales en frontend | Alto | Usar siempre backend propio |
| Amount desactualizado | Alto | Catálogo con vigencia y fuente |
| Seller incorrecto | Alto | Fijar `HOM` en backend/env |
| Token expirado | Medio | Caché con renovación automática |
| ModelId/PlanId incorrecto | Alto | Catálogo validado y no editable desde frontend |
| Errores sin trazabilidad | Medio | Log de generación de links |
| Ambiente incorrecto | Alto | Variable `TOYOTA_PLAN_ENV` y revisión previa al deploy |
| Reintentos excesivos | Medio | Reintento único ante token expirado |

---

## 17. Reglas de seguridad

1. Nunca guardar `client_secret` en frontend.
2. Nunca enviar `seller`, `modelId`, `planId` o `amount` desde el frontend como fuente confiable.
3. El frontend solo debe enviar un `slug` o identificador interno.
4. El backend debe validar que el ítem esté habilitado.
5. Los secrets deben estar en variables de entorno o secret manager.
6. Los logs no deben guardar `client_secret` ni token completo.
7. En producción, usar HTTPS obligatorio.
8. Separar credenciales de sandbox y producción.

---

## 18. Roadmap recomendado

### Fase 1 — Prueba técnica aislada

- Obtener credenciales sandbox.
- Probar token con curl o Postman.
- Probar generación de link con uno o dos modelos.
- Validar que el link abre correctamente.

### Fase 2 — Backend mínimo

- Crear proyecto Node.js/Express.
- Crear archivo de catálogo JSON.
- Crear servicio OAuth.
- Crear servicio `generateLink`.
- Crear endpoint propio `/api/toyota-plan/generate-link`.
- Registrar logs básicos.

### Fase 3 — Integración web

- Agregar botones en el sitio.
- Asociar cada botón al `slug` correspondiente.
- Manejar loading, error y redirección.
- Probar UX completa.

### Fase 4 — Producción controlada

- Cambiar URLs a producción.
- Configurar credenciales productivas.
- Validar seller `HOM`.
- Probar con un modelo controlado.
- Activar monitoreo.

### Fase 5 — Administración futura

- Pasar catálogo a base de datos.
- Crear panel interno para actualizar amounts.
- Agregar vigencia de precios.
- Agregar historial de cambios.
- Agregar exportación de logs.

---

## 19. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Integración | Backend propio obligatorio/recomendado |
| Seller | `HOM` |
| Catálogo inicial | Cargado manualmente para pruebas |
| Amount | Usar valores provistos para pruebas |
| Formato amount | Número JSON con punto decimal |
| Frontend | Envía solo `slug` |
| Seguridad | Credenciales solo en backend |
| Token | Cachear hasta antes del vencimiento |
| Producción | Requiere credenciales productivas y validación final |

---

## 20. Pendientes

1. Conseguir `client_id` y `client_secret` de ambiente sandbox.
2. Confirmar si los amounts provistos tienen vigencia determinada.
3. Confirmar si el catálogo de modelId/planId será estático o tendrá actualizaciones periódicas.
4. Definir dónde se alojará el backend.
5. Definir stack inicial: Node.js/Express recomendado.
6. Definir si se guardarán logs en archivo, base de datos o sistema externo.
7. Confirmar flujo visual del botón en el sitio web.
8. Validar con Toyota Plan que `HOM` sea el seller habilitado en producción.

---

## 21. Conclusión técnica

El proyecto ya cuenta con información suficiente para iniciar el desarrollo de una primera versión funcional. La pieza principal es un backend adapter que proteja credenciales, resuelva internamente el catálogo HOMU y genere links de Suscripción Digital Toyota Plan mediante OAuth2 y el endpoint `generatelink`.

La primera versión debe enfocarse en estabilidad, seguridad y trazabilidad. El catálogo puede comenzar en JSON para acelerar la prueba, pero en producción conviene migrarlo a base de datos o a una fuente administrable con control de vigencia, especialmente por el campo `amount`.

---

## 22. Mejoras v0.3 — Seguridad, trazabilidad y preparación productiva

Esta mejora mantiene la arquitectura central del backend adapter y agrega controles necesarios para una primera operación más segura.

### 22.1 CORS restringido por ambiente

Se agrega configuración CORS mediante la variable:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

En producción debe configurarse con dominios reales del sitio HOMU, por ejemplo:

```env
CORS_ALLOWED_ORIGINS=https://www.homu.com.ar,https://homu.com.ar
```

En desarrollo se permiten requests sin `Origin` para herramientas como curl o Postman. En producción solo deben permitirse origins autorizados.

### 22.2 Rate limiting

El endpoint:

```txt
POST /api/toyota-plan/generate-link
```

queda protegido por rate limiting configurable:

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

Si se supera el límite, el backend responde:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

### 22.3 Captura de metadata de auditoría

El controller captura:

- IP del request.
- User-Agent.

Esta metadata se propaga al service y queda disponible en logs técnicos de solicitud, éxito y error. No se guardan todavía en base de datos, pero el diseño queda preparado para una futura tabla de auditoría.

### 22.4 Helmet

El backend aplica `helmet()` antes de las rutas para agregar headers básicos de seguridad HTTP.

### 22.5 Healthcheck

Se agrega endpoint liviano:

```txt
GET /health
```

Ejemplo de prueba:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

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

Este endpoint no llama a Toyota Plan y no expone credenciales.

### 22.6 Graceful shutdown

`server.ts` maneja `SIGINT` y `SIGTERM` para cerrar el servidor HTTP de forma ordenada. Si el cierre no finaliza, existe un timeout de seguridad para forzar salida.

### 22.7 Validación del dominio del link devuelto

El backend valida el host del link devuelto por Toyota Plan antes de responder al frontend.

Hosts esperados:

```env
TOYOTA_PLAN_EXPECTED_LINK_HOST_SANDBOX=sdx.suscripcion.toyotaplan.com.ar
TOYOTA_PLAN_EXPECTED_LINK_HOST_PRODUCTION=suscripcion.toyotaplan.com.ar
```

Si Toyota Plan devuelve un link con host inesperado, el backend responde error de integración:

```json
{
  "success": false,
  "message": "Toyota Plan integration error"
}
```

### 22.8 Buenas prácticas de frontend

El frontend debe llamar a:

```txt
POST /api/toyota-plan/generate-link
```

solamente cuando el usuario haga clic en "Suscribite" o acción equivalente.

No se deben generar links automáticamente ni masivamente al cargar la página, porque eso produce llamadas innecesarias a la API externa y puede consumir rate limit.

Ejemplo:

```bash
curl -X POST "http://localhost:3000/api/toyota-plan/generate-link" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
  }'
```

### 22.9 Roadmap futuro: catálogo en base de datos

No se implementa base de datos en esta etapa.

El catálogo actual vive en:

```txt
src/config/toyota-plan.catalog.json
```

En producción futura conviene migrarlo a una tabla:

```txt
toyota_plan_catalog
```

Motivo principal: los valores de `amount` pueden cambiar frecuentemente y requieren vigencia, fuente e historial.

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

También se recomienda una futura tabla de auditoría:

```txt
toyota_plan_link_log
```

Campos sugeridos:

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

---

## 23. Mejoras v0.3.1 — Hardening previo a credenciales sandbox

Esta mejora se aplica antes de cargar credenciales sandbox reales y mantiene sin cambios el flujo principal: el frontend sigue enviando solo `slug`, el backend resuelve internamente `modelId`, `planId`, `amount` y `seller`, y el seller sigue siendo `HOM`.

### 23.1 TRUST_PROXY configurable

`trust proxy` ya no queda activo por defecto. Se controla con:

```env
TRUST_PROXY=false
```

Valores aceptados:

- `false`
- `0`
- `true`
- número positivo como string, por ejemplo `1`

Uso recomendado:

```env
TRUST_PROXY=false
```

para desarrollo local o despliegue directo.

```env
TRUST_PROXY=1
```

solo cuando el backend esté detrás de un único proxy reverso confiable que limpie o sobrescriba `X-Forwarded-For`.

Una configuración incorrecta puede afectar:

- `req.ip`
- auditoría
- rate limiting

### 23.2 Validación estricta de CORS_ALLOWED_ORIGINS

`CORS_ALLOWED_ORIGINS` se parsea como lista separada por coma, se limpian espacios y se valida cada origin con `URL` nativo.

Reglas:

- Solo `http` o `https`.
- No se permite wildcard `*`.
- En producción debe existir al menos un origin válido.
- En desarrollo puede quedar vacío para facilitar pruebas sin `Origin` con curl/Postman.

Ejemplos válidos:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_ALLOWED_ORIGINS=https://www.homu.com.ar,https://homu.com.ar
```

Ejemplos inválidos en producción:

```env
CORS_ALLOWED_ORIGINS=
CORS_ALLOWED_ORIGINS=*
CORS_ALLOWED_ORIGINS=homu.com.ar
CORS_ALLOWED_ORIGINS=ftp://homu.com.ar
```

### 23.3 Redacción recursiva de logs

El logger sanitiza metadata de forma recursiva:

- objetos anidados
- arrays
- errores
- strings con formato `Bearer ...`
- ciclos de referencia

Claves sensibles redactadas:

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
- `Authorization`
- `api_key`
- `apiKey`
- `bearer`

Valor usado:

```txt
[REDACTED]
```

Las respuestas externas de OAuth/API se registran sanitizadas. No se deben loguear objetos Axios completos ni headers sensibles sin pasar por el logger.

### 23.4 Tests adicionales productivos

Se agregan pruebas para:

- producción sin `Origin` rechazada por CORS;
- `/health` fuera del rate limit del endpoint principal;
- host esperado según `sandbox` o `production`;
- validación de `CORS_ALLOWED_ORIGINS`;
- parsing seguro de `TRUST_PROXY`;
- redacción recursiva de secrets y tokens.

### 23.5 Recomendación para credenciales sandbox

Las credenciales sandbox deben cargarse únicamente en:

- `.env` local no versionado; o
- secret manager del entorno de despliegue.

Nunca commitear `.env`, `client_secret`, tokens OAuth ni headers `Authorization`.

---

## 24. Mejoras v0.4 — Validación sandbox inicial exitosa

Se completó una validación sandbox exitosa de punta a punta para confirmar que el backend adapter puede operar contra la API de Suscripción Digital Toyota Plan en ambiente de pruebas.

### 24.1 Qué se probó

Ambiente local:

- `NODE_ENV=development`
- `TOYOTA_PLAN_ENV=sandbox`
- `PORT=3000`
- `seller=HOM`

Healthcheck:

```txt
GET http://localhost:3000/health
```

Endpoint propio:

```txt
POST http://localhost:3000/api/toyota-plan/generate-link
```

Body enviado:

```json
{
  "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
}
```

### 24.2 Resultado obtenido

La validación fue exitosa.

El backend local pudo:

1. Levantar correctamente en puerto `3000`.
2. Responder `GET /health`.
3. Cargar credenciales sandbox desde `.env` local.
4. Obtener token OAuth2 desde el authorization server sandbox de Toyota Plan.
5. Resolver internamente el catálogo a partir del `slug`.
6. Llamar al endpoint sandbox `generatelink`.
7. Recibir un link sandbox válido.
8. Validar que el host del link devuelto corresponde al ambiente sandbox.

Resultado resumido:

- `healthcheck_ok`: `true`
- `oauth_ok`: `true`
- `generate_link_ok`: `true`
- `link_generated`: `true`
- `link_host`: `sdx.suscripcion.toyotaplan.com.ar`
- `seller`: `HOM`
- `modelId`: `114`
- `planId`: `113`
- `amount`: `558824.14`

### 24.3 Datos funcionales confirmados

- `slug`: `hilux-4x4-dc-dx-24-tdi-at-plan-100`
- `model`: `HILUX 4X4 D/C DX 2.4 TDI 6 A/T`
- `plan`: `PLAN 100% DIF G 84M`
- `modelId`: `114`
- `planId`: `113`
- `seller`: `HOM`
- `amount`: `558824.14`
- `link_host`: `sdx.suscripcion.toyotaplan.com.ar`

El link completo no se documenta porque contiene un identificador externo único.

### 24.4 Qué queda validado técnicamente

- El frontend/cliente local envía únicamente `slug`.
- El backend resuelve internamente `modelId`, `planId`, `amount` y `seller`.
- El seller utilizado es `HOM`.
- El `amount` se envía como número decimal con punto.
- PowerShell puede mostrar el amount con coma decimal por configuración regional, pero la API recibió el número correctamente.
- OAuth sandbox funciona.
- Toyota Plan sandbox genera link correctamente.
- La validación de host del backend permite el link sandbox correcto.
- `.env` está ignorado por git.
- No se imprimió el valor completo del token OAuth.
- No se imprimió el secreto cliente.
- No se imprimieron credenciales de autorización HTTP.

### 24.5 Qué no se debe documentar por seguridad

No documentar ni commitear:

- ID cliente real.
- Secreto cliente real.
- Valor del token OAuth.
- Valor de headers de autorización HTTP.
- Link completo generado.
- Contenido completo de `.env`.

Si alguno de esos datos aparece en documentación, reemplazarlo por:

```txt
[REDACTED]
```

### 24.6 Próximos pasos

1. Probar el resto de los slugs del catálogo.
2. Registrar qué `modelId`/`planId` funcionan en sandbox.
3. Verificar si todos los planes están habilitados para seller `HOM`.
4. Preparar checklist de preproducción.
5. Definir estrategia de despliegue.
6. Confirmar topología real antes de usar `TRUST_PROXY=1`.
7. Mantener `TOYOTA_PLAN_ENV=sandbox` hasta autorización formal de pase a producción.

---

## 25. Mejoras v0.4.1 — Deduplicación de refresh OAuth

Se agrega deduplicación del refresh OAuth en memoria para evitar una race condition cuando el token cacheado vence y llegan múltiples requests concurrentes.

### 25.1 Problema resuelto

Sin deduplicación, varias solicitudes simultáneas podían detectar token vencido y disparar varias llamadas paralelas al authorization server de Toyota Plan.

### 25.2 Comportamiento implementado

`ToyotaPlanAuthService` mantiene una promesa privada de refresh en curso:

```txt
tokenRefreshPromise
```

Reglas:

1. Si existe token cacheado vigente, se reutiliza.
2. Si no existe token vigente y ya hay refresh en curso, se espera la misma promesa.
3. Si no existe token vigente y no hay refresh en curso, se crea un único refresh.
4. La promesa se limpia en `finally`, tanto si el refresh termina OK como si falla.
5. La ventana de expiración anticipada se mantiene.
6. El reintento único por token expirado en generación de link se mantiene.

### 25.3 Seguridad

La mejora no cambia el manejo de credenciales.

No se loguean:

- tokens OAuth;
- secreto cliente;
- headers de autorización HTTP.

### 25.4 Tests agregados

Se agregan pruebas para:

- múltiples llamadas simultáneas a `getAccessToken()` con token no disponible;
- verificación de una sola llamada al HTTP client OAuth;
- verificación de que todas las llamadas reciben el mismo token;
- limpieza de la promesa tras fallo de refresh;
- posibilidad de retry posterior luego de un fallo.

### 25.5 Alcance

No se modifica:

- catálogo JSON;
- endpoint público propio;
- flujo frontend, que sigue enviando solo `slug`;
- ambiente por defecto, que sigue siendo `sandbox`;
- configuración de producción.

---

## 26. Mejoras v0.4.2 — Correlation ID y trazabilidad

Se agrega trazabilidad transversal por request mediante correlation ID, sin modificar el contrato funcional del backend y sin requerir pasar el identificador manualmente por controllers o services.

### 26.1 Qué se agrega

- middleware `correlationId`;
- `AsyncLocalStorage` de Node.js;
- lectura de `x-correlation-id` entrante;
- generación automática con `randomUUID()` cuando no existe header;
- devolución de `x-correlation-id` en la respuesta;
- helper `getCorrelationId()`.

### 26.2 Comportamiento

1. Si el cliente envía `x-correlation-id`, se reutiliza.
2. Si no lo envía, el backend genera uno nuevo.
3. El correlation ID queda disponible durante todo el ciclo del request.
4. El logger lo adjunta automáticamente a cada log.
5. La sanitización de secretos y tokens no cambia.

### 26.3 Alcance

La mejora no cambia:

- endpoints públicos;
- body de requests;
- seller `HOM`;
- catálogo JSON;
- ambiente por defecto `sandbox`;
- credenciales.

La única diferencia visible hacia el cliente es el header de respuesta:

```txt
x-correlation-id
```

### 26.4 Tests agregados

Se agregan pruebas para validar:

- generación automática de correlation ID;
- respeto del correlation ID entrante;
- devolución del header en la respuesta;
- inclusión automática en logs;
- mantenimiento de sanitización de secrets;
- aislamiento correcto entre requests concurrentes.

---

## 27. Mejoras v0.4.3 — Política conservadora de retries

Se agrega resiliencia HTTP conservadora para evitar riesgo de generar links duplicados en Toyota Plan.

### 27.1 Principio de diseño

El endpoint `generatelink` es un `POST` que puede crear o materializar un link externo. Por esa razón no se implementan retries ciegos por timeout o error transitorio sobre `generateLink`.

### 27.2 Timeouts separados

Se agregan timeouts independientes:

```env
TOYOTA_PLAN_OAUTH_TIMEOUT_MS=15000
TOYOTA_PLAN_GENERATE_LINK_TIMEOUT_MS=15000
```

Esto permite ajustar el comportamiento de OAuth y de `generateLink` por separado.

### 27.3 Retry permitido para OAuth

OAuth sí admite retry conservador porque obtener token no crea links externos.

Reglas:

- máximo `2` intentos en total;
- backoff corto;
- solo ante errores de red transitorios o `502`, `503`, `504`;
- no reintentar `invalid_client`, `invalid_request` ni otros `4xx`.

Además, quedan registrados logs sanitizados con:

- número de intento OAuth;
- error transitorio;
- retry agotado.

### 27.4 Política para generateLink

`generateLink` mantiene esta política:

- sí reintentar una sola vez cuando Toyota responde token expirado;
- no reintentar automáticamente timeouts;
- no reintentar automáticamente errores transitorios de red;
- no activar retries automáticos mientras Toyota no confirme idempotency key o garantía equivalente.

### 27.5 Tests agregados

Se agregan pruebas para validar:

- retry OAuth en `503` seguido de éxito;
- no retry OAuth en `400 invalid_client`;
- no retry de `generateLink` ante timeout;
- mantenimiento del retry actual por token expirado.

---

## 28. Herramienta operativa de validación del catálogo sandbox

Se agrega un script manual para validar todos los `slug` habilitados del catálogo contra Toyota Plan sandbox:

```txt
scripts/smokeSandboxCatalog.ts
```

Comando:

```bash
npm run smoke:sandbox
```

### 28.1 Objetivo

Permitir una validación controlada del catálogo real sin convertir este flujo en un test unitario automático.

### 28.2 Reglas de ejecución

- carga `.env`;
- exige `TOYOTA_PLAN_ENV=sandbox`;
- rechaza ejecución si detecta `TOYOTA_PLAN_ENV=production`;
- exige credenciales sandbox locales;
- no corre dentro de `npm test`;
- no modifica catálogo;
- no imprime token OAuth;
- no imprime secrets;
- no imprime links completos.

### 28.3 Resultado esperado

Para cada item `enabled`, registra:

- `slug`
- `modelId`
- `planId`
- `seller`
- `amount`
- `success`
- `status`
- `link_host`

Además genera un resumen con:

- total de items;
- cantidad exitosa;
- cantidad fallida;
- listado de fallidos con error sanitizado.

### 28.4 Salida documental

El script guarda un resumen en:

```txt
Docs/sandbox-catalog-validation-log.md
```

Sin incluir:

- credenciales;
- tokens;
- links completos;
- contenido de `.env`.

---

## 29. Observabilidad mínima

Se implementa observabilidad mínima orientada a operación y troubleshooting, evitando sobredimensionar la solución.

### 29.1 Correlation ID

Cada request puede transportar:

```txt
x-correlation-id
```

Si el cliente no lo envía, el backend genera uno. El mismo identificador se devuelve en la respuesta y se adjunta automáticamente a los logs.

### 29.2 Logs de negocio

Eventos actuales:

- `toyota_plan.link_generation.started`
- `toyota_plan.link_generation.success`
- `toyota_plan.link_generation.failed`
- `toyota_plan.oauth.refresh.started`
- `toyota_plan.oauth.refresh.success`
- `toyota_plan.oauth.refresh.failed`

Cada evento incluye, según aplique:

- `correlationId`
- `slug`
- `modelId`
- `planId`
- `seller`
- `durationMs`
- `statusCode`
- `errorCode`

### 29.3 Datos sensibles no logueados

No se loguean:

- tokens OAuth;
- secreto cliente;
- headers `Authorization`;
- links completos generados.

### 29.4 Métricas mínimas

Se agrega endpoint opcional:

```txt
GET /metrics
```

Detrás de:

```env
ENABLE_METRICS=false
```

Si se activa, expone counters en memoria para eventos de negocio Toyota Plan. La implementacion es deliberadamente simple y sirve como paso inicial antes de una integracion mas completa con Prometheus.

---

## 30. Mejoras v0.5.1 - TypeScript toolchain modernization

Se resolvio la deprecacion de `moduleResolution=node10` en el proyecto sin recurrir a
`ignoreDeprecations`.

Decision aplicada:

- `module: "Node16"`
- `moduleResolution: "node16"`

Motivo:

- alinea la configuracion con Node.js moderno;
- evita depender de una opcion deprecada del compilador;
- mantiene el comportamiento funcional actual del adapter.

Validaciones ejecutadas:

- `npm run typecheck`: OK
- `npm run lint`: OK
- `npm test`: OK, 43 tests
- `npm run build`: OK
- `npm audit`: OK, 0 vulnerabilidades
- `git diff --check`: OK funcionalmente, con warnings CRLF normales en Windows

Confirmaciones:

- no hubo cambios funcionales en el adapter;
- no se modifico la logica de negocio;
- no se modifico `.env`;
- no se tocaron credenciales;
- no se modifico el catalogo JSON;
- no se utilizo produccion.

Si se activa, expone counters en memoria para eventos de negocio Toyota Plan. La implementación es deliberadamente simple y sirve como paso inicial antes de una integración más completa con Prometheus.

---

## 31. Mejoras v0.5.2 - Resolucion de inconsistencias de catalogo TPA

Se agrega documentacion funcional para tratar las diferencias detectadas entre el catalogo
local y la validacion de negocio observada en Toyota Plan sandbox.

Estado de referencia:

- smoke test del catalogo: `6/9` exitosos;
- `3/9` fallidos por rechazo funcional del lado TPA;
- adapter tecnico validado;
- OAuth validado;
- seller `HOM` validado;
- host sandbox validado.

Decision operativa:

- no modificar todavia `src/config/toyota-plan.catalog.json`;
- no ajustar amounts sin confirmacion oficial;
- escalar a Toyota Plan/TPA con detalle de `slug`, `modelId`, `planId` y `amount`.

Documento de referencia:

- `Docs/toyota-plan-catalog-issues.md`
