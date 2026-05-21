# Error Codes

Mapa de errores funcionales y técnicos del backend adapter TPA-HOM.

## Errores documentados

| Código documentado | Código real actual | HTTP | Mensaje público típico | Significado |
|---|---|---:|---|---|
| `CATALOG_ITEM_NOT_FOUND` | `TOYOTA_PLAN_CATALOG_NOT_FOUND` | 404 | `Catalog item not found` | El `slug` no existe en el catálogo. |
| `CATALOG_ITEM_DISABLED` | `TOYOTA_PLAN_CATALOG_DISABLED` | 400 | `Catalog item disabled` | El `slug` existe pero está deshabilitado. |
| `TOYOTA_PLAN_AUTH_ERROR` | `TOYOTA_PLAN_AUTH_ERROR` | 502 | `Toyota Plan integration error` | Falló la obtención del token OAuth contra Toyota Plan. |
| `TOYOTA_PLAN_LINK_ERROR` | `TOYOTA_PLAN_LINK_ERROR` | 502 | `Toyota Plan integration error` | Falló la llamada a `generatelink`. |
| `VALIDATION_ERROR` | `ZodError` sin código AppError | 400 | `Invalid request body` | El body del request no cumple el schema esperado. |
| `RATE_LIMIT_EXCEEDED` | `express-rate-limit` sin código AppError | 429 | `Too many requests. Please try again later.` | Se excedió el límite de requests para el endpoint. |
| `INTERNAL_ERROR` | error no controlado | 500 | `Internal server error` | Error inesperado no mapeado a `AppError`. |

## Códigos reales adicionales

Estos códigos existen hoy en el backend y conviene tenerlos presentes para troubleshooting:

| Código real | HTTP | Mensaje público típico | Uso |
|---|---:|---|---|
| `CORS_ORIGIN_NOT_ALLOWED` | 403 | `Not allowed by CORS` | Origin no habilitado por configuración CORS. |
| `TOYOTA_PLAN_CREDENTIALS_MISSING` | 500 | `Toyota Plan credentials are not configured` | Faltan credenciales locales o del entorno. |
| `TOYOTA_PLAN_LINK_FAILED` | 502 | `Toyota Plan integration error` | Toyota respondió sin `success/link` válido. |
| `TOYOTA_PLAN_AMOUNT_INVALID` | 500 | `Toyota Plan catalog misconfigured` | `amount` inválido en catálogo. |
| `TOYOTA_PLAN_LINK_HOST_INVALID` | 502 | `Toyota Plan integration error` | El host del link devuelto no coincide con el esperado. |
| `TOYOTA_PLAN_LINK_URL_INVALID` | 502 | `Toyota Plan integration error` | El link devuelto no pudo parsearse como URL válida. |
| `TOYOTA_PLAN_SELLER_INVALID` | 500 | `Toyota Plan catalog misconfigured` | El catálogo trae un seller distinto de `HOM`. |

## Notas

- El response público hoy expone `message`, no `code`.
- El `code` real se registra en logs operativos cuando el error es un `AppError`.
- Para frontend, conviene decidir más adelante si se desea devolver también `code` en JSON. Hoy no se hace.
