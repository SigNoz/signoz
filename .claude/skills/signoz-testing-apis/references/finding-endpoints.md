# Finding SigNoz endpoints and their payload schemas

## Fastest: the checked-in OpenAPI spec

`docs/api/openapi.yml` in the repo root documents the newer APIs, including request body schemas and examples. Search it for the path you need:

```bash
grep -n "/api/v5/query_range" docs/api/openapi.yml
```

Regenerate it after route changes:

```bash
go run ./cmd/community generate openapi   # writes docs/api/openapi.yml
```

## In code

- **Newer APIs** (v5 and recent additions): `pkg/apiserver/signozapiserver/*.go`. Each route is registered with `router.Handle(...)` and an `handler.OpenAPIDef` that names the request type (e.g. `qbtypes.QueryRangeRequest`) and often includes `RequestExamples`.
- **Legacy APIs** (v1–v4): `pkg/query-service/app/http_handler.go`. Routes are registered with `router.Handle("/api/...", ...)`. Trace the handler function to find the request struct it decodes.

## Notes

- Request/response types for the v5 query APIs live in `pkg/types/querybuildertypes/querybuildertypesv5`.
- All authenticated API calls need the `SIGNOZ-API-KEY` header; see the skill's `SKILL.md`.
