# Proyecto: Integración API Suscripción Digital Toyota Plan — HOMU S.A.

**Versión:** 0.2 consolidada  
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
TOYOTA_PLAN_ENV=sandbox
TOYOTA_PLAN_CLIENT_ID=colocar_client_id
TOYOTA_PLAN_CLIENT_SECRET=colocar_client_secret
TOYOTA_PLAN_SCOPE=ext-link/write
TOYOTA_PLAN_SELLER=HOM
TOYOTA_PLAN_TOKEN_URL_SANDBOX=https://auth.sdx.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX=https://sdx.suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
TOYOTA_PLAN_TOKEN_URL_PRODUCTION=https://auth.suscripcion.toyotaplan.com.ar/oauth2/token
TOYOTA_PLAN_GENERATE_LINK_URL_PRODUCTION=https://suscripcion.toyotaplan.com.ar/api/public/subscriptions/generatelink
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
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
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

