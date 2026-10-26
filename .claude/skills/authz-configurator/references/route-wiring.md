# Route Wiring Reference

All examples below are real code from `pkg/apiserver/signozapiserver/serviceaccount.go`. Match this style exactly.

## Basic route: create (wildcard selector, response-phase ID)

```go
if err := router.Handle("/api/v1/service_accounts", handler.New(
    provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.Create, authtypes.SigNozAdminRoleName),
    handler.OpenAPIDef{
        ID:                  "CreateServiceAccount",
        Tags:                []string{"serviceaccount"},
        Summary:             "Create service account",
        Description:         "This endpoint creates a service account",
        Request:             new(serviceaccounttypes.PostableServiceAccount),
        Response:            new(types.Identifiable),
        ResponseContentType: "application/json",
        SuccessStatusCode:   http.StatusCreated,
        ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
        SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbCreate)}),
    },
    handler.WithResourceDefs(handler.BasicResourceDef{
        Resource: coretypes.ResourceServiceAccount,
        Verb:     coretypes.VerbCreate,
        Category: coretypes.ActionCategoryAccessControl,
        ID:       coretypes.ResponseJSONPath("data.id"),
        Selector: coretypes.WildcardSelector,
    }),
)).Methods(http.MethodPost).GetError(); err != nil {
    return err
}
```

Create checks the wildcard (can the caller create *any* instance?) but still records the new instance's ID for audit via `ResponseJSONPath` — the ID only exists after the handler runs.

Instance routes (read/update/delete) differ only in verb, `ID: coretypes.PathParam("id")`, and `Selector: coretypes.IDSelector`. List routes use `WildcardSelector` and omit `ID` entirely.

Pick the `Category` matching the resource's domain — grep `ActionCategory` in `pkg/types/coretypes/` for the registered values (`ActionCategoryAccessControl` is for access-control resources; observability resources use their own categories).

## ID extractors (`pkg/types/coretypes/extractor.go`)

| Extractor | Phase | Use for |
|---|---|---|
| `PathParam("id")` | request | ID in the URL path |
| `BodyJSONPath("data.id")` | request | ID in the request body (gjson path) |
| `BodyJSONArray("ids")` | request | multiple IDs in a body array |
| `ResponseJSONPath("data.id")` | response | ID known only after the handler (create) |
| `NewResourceIDExtractor(phase, fn)` | either | ID needs a lookup (see below) |
| `OneID(extractor)` | — | lifts a single-ID extractor where a multi-ID one is required (`SourceIDs`/`TargetIDs`/`ChildIDs`) |

Custom extractor example — the route path carries a service-account-role ID but the check needs the underlying role ID, so the extractor resolves it through the module:

```go
func (provider *provider) roleIDExtractor() coretypes.ResourceIDExtractor {
    return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
        if ec.Request == nil {
            return "", nil
        }

        claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
        if err != nil {
            return "", err
        }

        serviceAccountRoleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
        if err != nil {
            return "", err
        }

        serviceAccountRole, err := provider.serviceAccountGetter.GetServiceAccountRole(ec.Request.Context(), valuer.MustNewUUID(claims.OrgID), serviceAccountRoleID)
        if err != nil {
            return "", err
        }

        return serviceAccountRole.RoleID.String(), nil
    })
}
```

## Custom SelectorFunc

Use one when the extracted ID is not what FGA objects use. Roles are the canonical case: routes receive a role UUID, but FGA role objects are keyed by role *name*. Always include the wildcard alongside the specific selector — authorization on `*` implies authorization on every instance:

```go
func (provider *provider) roleSelector(ctx context.Context, resource coretypes.Resource, id string, orgID valuer.UUID) ([]coretypes.Selector, error) {
    roleID, err := valuer.NewUUID(id)
    if err != nil {
        return nil, err
    }

    role, err := provider.authzService.Get(ctx, orgID, roleID)
    if err != nil {
        return nil, err
    }

    return []coretypes.Selector{
        resource.Type().MustSelector(role.Name),
        resource.Type().MustSelector(coretypes.WildCardSelectorString),
    }, nil
}
```

## Linking routes: siblings (peer-to-peer)

Attaching a role to a service account requires `attach` on **both** resources — the same verb checked on each side. Advertise both scopes:

```go
SecuritySchemes: newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbAttach), coretypes.ResourceRole.Scope(coretypes.VerbAttach)}),
// ...
handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
    Verb:           coretypes.VerbAttach,
    Category:       coretypes.ActionCategoryAccessControl,
    SourceResource: coretypes.ResourceServiceAccount,
    SourceIDs:      coretypes.OneID(coretypes.PathParam("id")),
    SourceSelector: coretypes.IDSelector,
    TargetResource: coretypes.ResourceRole,
    TargetIDs:      coretypes.OneID(coretypes.BodyJSONPath("id")),
    TargetSelector: provider.roleSelector,
}),
```

The detach route is identical with `VerbDetach` and the target ID coming from the path.

## Linking routes: parent-child

Creating an API key *under* a service account checks two different things: `create` on the child resource, and `attach` on the parent. Declare both defs in the same `WithResourceDefs`:

```go
handler.WithResourceDefs(
    handler.BasicResourceDef{
        Resource: coretypes.ResourceMetaResourceFactorAPIKey,
        Verb:     coretypes.VerbCreate,
        Category: coretypes.ActionCategoryAccessControl,
        ID:       coretypes.ResponseJSONPath("data.id"),
        Selector: coretypes.WildcardSelector,
    },
    handler.AttachDetachParentChildResourceDef{
        Verb:           coretypes.VerbAttach,
        Category:       coretypes.ActionCategoryAccessControl,
        ParentResource: coretypes.ResourceServiceAccount,
        ParentID:       coretypes.PathParam("id"),
        ParentSelector: coretypes.IDSelector,
        ChildResource:  coretypes.ResourceMetaResourceFactorAPIKey,
        ChildIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
    },
),
```

Within the parent-child def, the child is only recorded for audit — the authz check on the child comes from its own `BasicResourceDef`. Deletion mirrors this with `VerbDelete` on the child and `VerbDetach` on the parent (see the `/api/v1/service_accounts/{id}/keys/{fid}` DELETE route).

## Legacy gates — do not use for new routes

`ViewAccess`/`EditAccess`/`AdminAccess` only check "does the caller hold one of these roles". They give up per-resource granularity, produce no audit resources, and don't advertise scopes. They exist for old routes; new routes use `CheckResources` + `ResourceDef`. `OpenAccess` performs no authorization at all (authentication still applies — used for `/me`-style routes); `CheckWithoutClaims` is for anonymous routes such as public dashboards.

Full def types live in `pkg/http/handler/resourcedef.go`; middleware behavior in `pkg/http/middleware/authz.go` and `pkg/http/middleware/resource.go`.
