# Handler

Handlers in SigNoz are responsible for exposing module functionality over HTTP. They are thin adapters that:

- Decode incoming HTTP requests
- Call the appropriate module layer
- Return structured responses (or errors) in a consistent format
- Describe themselves for OpenAPI generation

They are **not** the place for complex business logic; that belongs in modules (for example, `pkg/modules/user`, `pkg/modules/session`, etc).

## How are handlers structured?

At a high level, a typical flow looks like this:

1. A `Handler` interface is defined in the module (for example, `user.Handler`, `session.Handler`, `organization.Handler`).
2. The `apiserver` provider wires those handlers into HTTP routes using Gorilla `mux.Router`.

Each route wraps a module handler method with the following:
- Authorization middleware (from `pkg/http/middleware`)
- A generic HTTP `handler.Handler` (from `pkg/http/handler`)
- An `OpenAPIDef` that describes the operation for OpenAPI generation

For example, in `pkg/apiserver/signozapiserver`:

```go
if err := router.Handle("/api/v1/invite", handler.New(
    provider.authZ.AdminAccess(provider.userHandler.CreateInvite),
    handler.OpenAPIDef{
        ID:                  "CreateInvite",
        Tags:                []string{"users"},
        Summary:             "Create invite",
        Description:         "This endpoint creates an invite for a user",
        Request:             new(types.PostableInvite),
        RequestContentType:  "application/json",
        Response:            new(types.Invite),
        ResponseContentType: "application/json",
        SuccessStatusCode:   http.StatusCreated,
        ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
        Deprecated:          false,
        SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
    },
)).Methods(http.MethodPost).GetError(); err != nil {
    return err
}
```

In this pattern:

- `provider.userHandler.CreateInvite` is a handler method.
- `provider.authZ.AdminAccess(...)` wraps that method with authorization checks and context setup.
- `handler.New` converts it into an HTTP handler and wires it to OpenAPI via the `OpenAPIDef`.

## How to write a new handler method?

When adding a new endpoint:

1. Add a method to the appropriate module `Handler` interface.
2. Implement that method in the module.
3. Register the method in `signozapiserver` with the correct route, HTTP method, auth, and `OpenAPIDef`.

### 1. Extend an existing `Handler` interface or create a new one

Find the module in `pkg/modules/<name>` and extend its `Handler` interface with a new method that receives an `http.ResponseWriter` and `*http.Request`. For example:

```go
type Handler interface {
    // existing methods...
    CreateThing(rw http.ResponseWriter, req *http.Request)
}
```

Keep the method focused on HTTP concerns and delegate business logic to the module.

### 2. Implement the handler method

In the module implementation, implement the new method. A typical implementation:

- Extracts authentication and organization context from `req.Context()`
- Decodes the request body into a `types.*` struct using the `binding` package
- Calls module functions
- Uses the `render` package to write responses or errors

```go
func (h *handler) CreateThing(rw http.ResponseWriter, req *http.Request) {
    // Extract authentication and organization context from req.Context()
    claims, err := authtypes.ClaimsFromContext(req.Context())
    if err != nil {
        render.Error(rw, err)
        return
    }

    // Decode the request body into a `types.*` struct using the `binding` package
    var in types.PostableThing
    if err := binding.JSON.BindBody(req.Body, &in); err != nil {
        render.Error(rw, err)
        return
    }
    
    // Call module functions
    out, err := h.module.CreateThing(req.Context(), claims.OrgID, &in)
    if err != nil {
        render.Error(rw, err)
        return
    }

    // Use the `render` package to write responses or errors
    render.Success(rw, http.StatusCreated, out)
}
```

### 3. Register the handler in `signozapiserver`

In `pkg/apiserver/signozapiserver`, add a route in the appropriate `add*Routes` function (`addUserRoutes`, `addSessionRoutes`, `addOrgRoutes`, etc.). The pattern is:

```go
if err := router.Handle("/api/v1/things", handler.New(
    provider.authZ.AdminAccess(provider.thingHandler.CreateThing),
    handler.OpenAPIDef{
        ID:                  "CreateThing",
        Tags:                []string{"things"},
        Summary:             "Create thing",
        Description:         "This endpoint creates a thing",
        Request:             new(types.PostableThing),
        RequestContentType:  "application/json",
        Response:            new(types.GettableThing),
        ResponseContentType: "application/json",
        SuccessStatusCode:   http.StatusCreated,
        ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
        Deprecated:          false,
        SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
    },
)).Methods(http.MethodPost).GetError(); err != nil {
    return err
}
```

### 4. Update the OpenAPI spec

Run the following command to update the OpenAPI spec:

```bash
go run cmd/enterprise/*.go generate openapi
```

This will update the OpenAPI spec in `docs/api/openapi.yml` to reflect the new endpoint.

## How does OpenAPI integration work?

The `handler.New` function ties the HTTP handler to OpenAPI metadata via `OpenAPIDef`. This drives the generated OpenAPI document.

- **ID**: A unique identifier for the operation (used as the `operationId`).
- **Tags**: Logical grouping for the operation (for example, `"users"`, `"sessions"`, `"orgs"`).
- **Summary / Description**: Human-friendly documentation.
- **Request / RequestContentType**:
  - `Request` is a Go type that describes the request body or form.
  - `RequestContentType` is usually `"application/json"` or `"application/x-www-form-urlencoded"` (for callbacks like SAML).
- **RequestExamples**: An array of `handler.OpenAPIExample` that provide concrete request payloads in the generated spec. See [Adding request examples](#adding-request-examples) below.
- **Response / ResponseContentType**:
  - `Response` is the Go type for the successful response payload.
  - `ResponseContentType` is usually `"application/json"`; use `""` for responses without a body.
- **SuccessStatusCode**: The HTTP status for successful responses (for example, `http.StatusOK`, `http.StatusCreated`, `http.StatusNoContent`).
- **ErrorStatusCodes**: Additional error status codes beyond the standard ones automatically added by `handler.New`.
- **SecuritySchemes**: Auth mechanisms and scopes required by the operation.

The generic handler:

- Automatically appends `401`, `403`, and `500` to `ErrorStatusCodes` when appropriate.
- Registers request and response schemas with the OpenAPI reflector so they appear in `docs/api/openapi.yml`.

See existing examples in:

- `addUserRoutes` (for typical JSON request/response)
- `addSessionRoutes` (for form-encoded and redirect flows)

## OpenAPI schema details for request/response types

The OpenAPI spec is generated from the Go types you pass as `Request` and `Response` in `OpenAPIDef`. The following struct tags and interfaces control how those types appear in the generated schema.

### Adding request examples

Use the `RequestExamples` field in `OpenAPIDef` to provide concrete request payloads. Each example is a `handler.OpenAPIExample`:

```go
type OpenAPIExample struct {
    Name        string // unique key for the example (e.g. "traces_time_series")
    Summary     string // short description shown in docs (e.g. "Time series: count spans grouped by service")
    Description string // optional longer description
    Value       any    // the example payload, typically map[string]any
}
```

For reference, see `pkg/apiserver/signozapiserver/querier.go` which defines examples inline for the `/api/v5/query_range` endpoint:

```go
if err := router.Handle("/api/v5/query_range", handler.New(provider.authZ.ViewAccess(provider.querierHandler.QueryRange), handler.OpenAPIDef{
    ID:                 "QueryRangeV5",
    Tags:               []string{"querier"},
    Summary:            "Query range",
    Description:        "Execute a composite query over a time range.",
    Request:            new(qbtypes.QueryRangeRequest),
    RequestContentType: "application/json",
    RequestExamples: []handler.OpenAPIExample{
        {
            Name:    "traces_time_series",
            Summary: "Time series: count spans grouped by service",
            Value: map[string]any{
                "schemaVersion": "v1",
                "start":         1640995200000,
                "end":           1640998800000,
                "requestType":   "time_series",
                "compositeQuery": map[string]any{
                    "queries": []any{
                        map[string]any{
                            "type": "builder_query",
                            "spec": map[string]any{
                                "name":   "A",
                                "signal": "traces",
                                // ...
                            },
                        },
                    },
                },
            },
        },
        // ... more examples
    },
    // ...
})).Methods(http.MethodPost).GetError(); err != nil {
    return err
}
```

### `required` tag

Use `required:"true"` on struct fields where the property is expected to be **present** in the JSON payload. This is different from the zero value, a field can have its zero value (e.g. `0`, `""`, `false`) and still be required. The `required` tag means the key itself must exist in the JSON object.

```go
type ListItem struct {
    ...
}

type ListResponse struct {
	List  []ListItem `json:"list" required:"true" nullable:"true"`
	Total uint64     `json:"total" required:"true"`
}
```

In this example, a response like `{"list": null, "total": 0}` is valid. Both keys are present (satisfying `required`), `total` has its zero value, and `list` is null (allowed by `nullable`). But `{"total": 0}` would violate the schema because the `list` key is missing.

### `nullable` tag

Use `nullable:"true"` on struct fields that can be `null` in the JSON payload. This is especially important for **slice and map fields** because in Go, the zero value for these types is `nil`, which serializes to `null` in JSON (not `[]` or `{}`).

Be explicit about the distinction:

- **Nullable list** (`nullable:"true"`): the field can be `null`. Use this when the Go code may return `nil` for the slice.
- **Non-nullable list** (no `nullable` tag): the field is always an array, never `null`. Ensure the Go code initializes it to an empty slice (e.g. `make([]T, 0)`) before serializing.

```go
// Non-nullable: Go code must ensure this is always an initialized slice.
type NonNullableExample struct {
    Items []Item `json:"items" required:"true"`
}
```

When defining your types, ask yourself: "Can this field be `null` in the JSON response, or is it always an array/object?" If the Go code ever returns a `nil` slice or map, mark it `nullable:"true"`.

### `Enum()` method

For types that have a fixed set of acceptable values, implement the `Enum() []any` method. This generates an `enum` constraint in the JSON schema so the OpenAPI spec accurately restricts the values.

```go
type Signal struct {
    valuer.String
}

var (
    SignalTraces  = Signal{valuer.NewString("traces")}
    SignalLogs    = Signal{valuer.NewString("logs")}
    SignalMetrics = Signal{valuer.NewString("metrics")}
)

func (Signal) Enum() []any {
    return []any{
        SignalTraces,
        SignalLogs,
        SignalMetrics,
    }
}
```

This produces the following in the generated OpenAPI spec:

```yaml
Signal:
  enum:
  - traces
  - logs
  - metrics
  type: string
```

Every type with a known set of values **must** implement `Enum()`. Without it, the JSON schema will only show the base type (e.g. `string`) with no value constraints.

### `JSONSchema()` method (custom schema)

For types that need a completely custom JSON schema (for example, a field that accepts either a string or a number), implement the `jsonschema.Exposer` interface:

```go
var _ jsonschema.Exposer = Step{}

func (Step) JSONSchema() (jsonschema.Schema, error) {
    s := jsonschema.Schema{}
    s.WithDescription("Step interval. Accepts a duration string or seconds.")

    strSchema := jsonschema.Schema{}
    strSchema.WithType(jsonschema.String.Type())
    strSchema.WithExamples("60s", "5m", "1h")

    numSchema := jsonschema.Schema{}
    numSchema.WithType(jsonschema.Number.Type())
    numSchema.WithExamples(60, 300, 3600)

    s.OneOf = []jsonschema.SchemaOrBool{
        strSchema.ToSchemaOrBool(),
        numSchema.ToSchemaOrBool(),
    }
    return s, nil
}
```


## What should I remember?

- **Keep handlers thin**: focus on HTTP concerns and delegate logic to modules/services.
- **Always register routes through `signozapiserver`** using `handler.New` and a complete `OpenAPIDef`.
- **Choose accurate request/response types** from the `types` packages so OpenAPI schemas are correct.
- **Add `required:"true"`** on fields where the key must be present in the JSON (this is about key presence, not about the zero value).
- **Add `nullable:"true"`** on fields that can be `null`. Pay special attention to slices and maps -- in Go these default to `nil` which serializes to `null`. If the field should always be an array, initialize it and do not mark it nullable.
- **Implement `Enum()`** on every type that has a fixed set of acceptable values so the JSON schema generates proper `enum` constraints.
- **Add request examples** via `RequestExamples` in `OpenAPIDef` for any non-trivial endpoint. See `pkg/apiserver/signozapiserver/querier.go` for reference.
