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

## What should I remember?

- **Keep handlers thin**: focus on HTTP concerns and delegate logic to modules/services.
- **Always register routes through `signozapiserver`** using `handler.New` and a complete `OpenAPIDef`.
- **Choose accurate request/response types** from the `types` packages so OpenAPI schemas are correct.
