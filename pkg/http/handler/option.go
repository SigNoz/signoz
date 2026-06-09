package handler

// Option configures optional behaviour on a handler created by New.
type Option func(*handler)

// WithResourceDefs attaches one or more resource defs (BasicResourceDef,
// AttachDetachSiblingResourceDef, AttachDetachParentChildResourceDef) to the
// handler. The resource middleware resolves them and the authz + audit
// middlewares read the result.
func WithResourceDefs(defs ...ResourceDef) Option {
	return func(h *handler) {
		h.resourceDefs = append(h.resourceDefs, defs...)
	}
}
