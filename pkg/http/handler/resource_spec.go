// The ResourceSpec contract, the shared related-resource type, and ResolveRequest.
package handler

import "github.com/SigNoz/signoz/pkg/types/coretypes"

// ResourceSpec is the sealed interface implemented by ResourceDef and
// ResourcesDef. Only these two satisfy WithResourceDefs.
type ResourceSpec interface {
	sealResourceSpec()
	resolveRequest(ec ExtractorContext) []*ResolvedResource
}

// RelatedResource is a counterpart named purely for audit clarity. It carries no
// verb and no selector and is not authz-checked.
type RelatedResource struct {
	Resource coretypes.Resource
	ID       ResourceIDExtractor
}

// ResolveRequest resolves the request-phase ids for all specs (fan-out included)
// against ec. Called by the resource middleware pre-handler.
func ResolveRequest(defs []ResourceSpec, ec ExtractorContext) []*ResolvedResource {
	var resolved []*ResolvedResource
	for _, def := range defs {
		resolved = append(resolved, def.resolveRequest(ec)...)
	}

	return resolved
}
