package handler

type Option func(*handler)

func WithResourceDefs(defs ...ResourceDef) Option {
	return func(h *handler) {
		h.resourceDefs = append(h.resourceDefs, defs...)
	}
}
