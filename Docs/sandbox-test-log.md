# Sandbox Test Log

## v0.5 - Validacion integral post-observabilidad minima

### Fecha

2026-05-21

### Resultado

Se ejecuto una validacion integral posterior a `v0.5` sobre el backend adapter en ambiente
`sandbox`, manteniendo el catalogo actual, sin usar produccion y sin exponer secretos.

### Verificaciones operativas

- `npm run typecheck`: OK
- `npm run lint`: OK
- `npm test`: OK
- `npm run build`: OK
- `npm audit`: OK, sin vulnerabilidades reportadas
- `git diff --check`: OK
- `.env` sigue ignorado por git
- `GET /health`: OK en `http://localhost:3000/health`
- `/metrics`: apagado por default en la instancia validada (`404`)
- `npm run smoke:sandbox`: OK con ejecucion completa sobre el catalogo habilitado

### Resumen del smoke test

- `total_items`: `9`
- `success_count`: `6`
- `failed_count`: `3`
- `link_host` exitoso en todos los casos favorables: `sdx.suscripcion.toyotaplan.com.ar`

Slugs exitosos:

- `hilux-4x4-dc-dx-24-tdi-at-plan-100`
- `yaris-cross-xli-15-cvt-flex-70-30`
- `corolla-cross-xli-20-cvt-70-30`
- `hilux-4x2-dc-dx-24-tdi-mt-70-30`
- `yaris-xs-15-cvt-5p-70-30`
- `corolla-20-xli-cvt-70-30`

Slugs fallidos:

- `hiace-furgon-l2h2-28-tdi-at-plan-100`
- `yaris-cross-xei-hev-15-ecvt-flex-plan-100`
- `yaris-xs-cvt-5p-flex-plan-100`

Causa probable sanitizada de fallidos:

- rechazo funcional de Toyota Plan sandbox para la combinacion `modelId + planId + amount`,
  con mensaje equivalente a que el valor declarado de cuota 1 supera el valor de lista TPA.

### Seguridad y trazabilidad

- no se imprimieron `client_id`, `client_secret`, `access_token`, `Authorization`
  ni `Bearer token`;
- no se imprimieron links completos, solo `linkHost`;
- la respuesta HTTP de `/health` devolvio `x-correlation-id`;
- observacion: el smoke script usa el service real de forma directa y no entra por el
  middleware HTTP, por eso su salida de consola no es una prueba operativa suficiente
  para exigir `correlationId` en cada linea; esa parte queda cubierta por la capa HTTP
  y por la suite automatizada existente.

---

## v0.4.1 - Deduplicacion de refresh OAuth

### Fecha

2026-05-21

### Resultado

Se agrego una mejora tecnica de concurrencia en `ToyotaPlanAuthService` para deduplicar refreshes OAuth cuando no hay token vigente y llegan multiples requests al mismo tiempo.

La validacion sandbox v0.4 sigue vigente. Esta mejora no cambia credenciales, catalogo, endpoints ni ambiente.

### Confirmaciones

- No se documentan credenciales.
- No se documentan tokens.
- No se documentan headers de autorizacion.
- No se documenta link completo.
- El frontend/cliente sigue enviando solo `slug`.
- El seller sigue siendo `HOM`.
- El ambiente por defecto sigue siendo `sandbox`.

### Tests

Se agregaron pruebas automatizadas para:

- deduplicar llamadas concurrentes a `getAccessToken()`;
- confirmar que el HTTP client OAuth se llama una sola vez;
- confirmar que todas las llamadas reciben el mismo token;
- confirmar que, si falla un refresh, el intento posterior puede volver a pedir token.

---

## v0.4.2 - Correlation ID y trazabilidad

### Fecha

2026-05-21

### Resultado

Se agrega correlation ID por request para trazabilidad completa del backend.

Cada request ahora puede:

- aceptar `x-correlation-id` entrante;
- generar uno nuevo si no existe;
- devolver `x-correlation-id` en la respuesta;
- propagarlo automáticamente a todos los logs del request.

### Confirmaciones

- la mejora no cambia endpoints funcionales;
- la mejora no cambia body de requests;
- la mejora no cambia seller, catálogo ni ambiente;
- la sanitización de secretos y tokens se mantiene;
- requests concurrentes conservan correlation IDs separados.

---

## v0.4.3 - Politica conservadora de retries

### Fecha

2026-05-21

### Resultado

Se agrega una politica de resiliencia HTTP conservadora para reducir el riesgo de duplicar links externos.

### Confirmaciones

- OAuth usa timeout configurable independiente.
- `generateLink` usa timeout configurable independiente.
- OAuth puede reintentar una vez ante errores transitorios o `502/503/504`.
- OAuth no reintenta errores `4xx` funcionales como `invalid_client`.
- `generateLink` no reintenta timeouts automaticamente.
- `generateLink` mantiene solo el retry actual por token expirado.
- No se documentan ni exponen tokens, secretos ni headers de autorizacion.

---

## Herramienta operativa de validacion de catalogo sandbox

### Fecha

2026-05-21

### Resultado

Se agrega el script manual:

```txt
scripts/smokeSandboxCatalog.ts
```

Y el comando:

```bash
npm run smoke:sandbox
```

### Confirmaciones

- usa el catalogo real;
- valida solo ambiente sandbox;
- aborta si detecta production;
- no corre automaticamente con `npm test`;
- no imprime tokens;
- no imprime secrets;
- no imprime links completos;
- genera resumen documental en `Docs/sandbox-catalog-validation-log.md`.

---

## Observabilidad minima

### Fecha

2026-05-21

### Resultado

Se agregan logs de negocio consistentes para OAuth y generación de links, con `correlationId`
automático y métricas opcionales detrás de `ENABLE_METRICS=false`.

### Confirmaciones

- los logs conservan sanitización de secretos;
- cada request mantiene `correlationId`;
- `/metrics` permanece apagado por default;
- si se habilita, expone counters básicos en memoria.

---

## v0.4 - Validacion sandbox inicial exitosa

### Fecha/hora

2026-05-20 17:17:54 -03:00

### Resultado general

La validacion sandbox inicial fue exitosa. El backend local pudo obtener token OAuth2 desde el authorization server sandbox de Toyota Plan y luego generar un link de suscripcion digital mediante el endpoint `generatelink`.

No se documentan credenciales, tokens ni link completo generado. Solo se deja constancia del host devuelto y de que el link fue generado correctamente.

### Ambiente

- `NODE_ENV`: `development`
- `TOYOTA_PLAN_ENV`: `sandbox`
- `PORT`: `3000`
- `seller`: `HOM`

### Endpoints probados

Healthcheck:

```txt
GET http://localhost:3000/health
```

Generacion de link:

```txt
POST http://localhost:3000/api/toyota-plan/generate-link
```

Body enviado:

```json
{
  "slug": "hilux-4x4-dc-dx-24-tdi-at-plan-100"
}
```

### Resultado del healthcheck

Resultado: OK.

- `status`: `ok`
- `service`: `toyota-plan-adapter`
- `environment`: `sandbox`
- `nodeEnv`: `development`

### Resultado OAuth

Resultado: OK.

El backend obtuvo correctamente un token OAuth2 desde el ambiente sandbox de Toyota Plan.

No se documento ni se imprimio el valor del token OAuth.

### Resultado generatelink

Resultado: OK.

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

### Datos funcionales confirmados

- `slug`: `hilux-4x4-dc-dx-24-tdi-at-plan-100`
- `model`: `HILUX 4X4 D/C DX 2.4 TDI 6 A/T`
- `plan`: `PLAN 100% DIF G 84M`
- `modelId`: `114`
- `planId`: `113`
- `seller`: `HOM`
- `amount`: `558824.14`
- `link_host`: `sdx.suscripcion.toyotaplan.com.ar`
- link completo: no documentado por seguridad

### Validaciones confirmadas

1. El backend local levanta correctamente en puerto `3000`.
2. `GET /health` responde correctamente.
3. El ambiente activo es `sandbox`.
4. Las credenciales sandbox cargan desde `.env` local.
5. `.env` esta ignorado por git.
6. OAuth token sandbox funciona correctamente.
7. No se imprimio el valor completo del token OAuth.
8. No se imprimio el secreto cliente.
9. No se imprimieron credenciales de autorizacion HTTP.
10. `POST /api/toyota-plan/generate-link` funciona.
11. El frontend/cliente solo envia `slug`.
12. El backend resuelve internamente `modelId`.
13. El backend resuelve internamente `planId`.
14. El backend resuelve internamente `amount`.
15. El backend usa seller `HOM`.
16. Toyota Plan sandbox genera link correctamente.
17. El link devuelto pertenece al host esperado `sdx.suscripcion.toyotaplan.com.ar`.
18. La validacion de host del backend permite el link sandbox correcto.
19. El amount se envia como numero decimal.
20. PowerShell puede mostrar el amount con coma decimal por configuracion regional, pero la API recibio el numero correctamente.

### Seguridad de logs

En la revision de logs no se observaron:

- valor completo del token OAuth
- secreto cliente
- credenciales de autorizacion HTTP
- link completo generado

### Observaciones

- No se uso produccion.
- No se modifico el catalogo.
- No se documentaron credenciales.
- No se documento el link completo porque contiene un identificador externo unico.

### Proximos pasos

1. Probar el resto de los slugs del catalogo.
2. Registrar que `modelId`/`planId` funcionan en sandbox.
3. Verificar si todos los planes estan habilitados para seller `HOM`.
4. Preparar checklist de preproduccion.
5. Definir estrategia de despliegue.
6. Confirmar topologia real antes de usar `TRUST_PROXY=1`.
7. Mantener `TOYOTA_PLAN_ENV=sandbox` hasta autorizacion formal de pase a produccion.

---

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

- valor del token OAuth
- secreto cliente
- credenciales de autorizacion HTTP

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
TOYOTA_PLAN_CLIENT_ID=[REDACTED]
TOYOTA_PLAN_CLIENT_SECRET=[REDACTED]
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
