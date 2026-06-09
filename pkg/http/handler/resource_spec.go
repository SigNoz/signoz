// The sealed interface gating what may be passed to WithResourceDefs.
package handler

// ResourceSpec is the sealed interface implemented by ResourceDef and
// ResourcesDef. Only these two satisfy WithResourceDefs.
type ResourceSpec interface {
	sealResourceSpec()
	resolveRequest(ec ExtractorContext) []*ResolvedResource
}
