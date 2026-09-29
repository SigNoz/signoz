package handler

import "github.com/SigNoz/signoz/pkg/http/binding"

type Option func(*handler)

func WithResourceDefs(defs ...ResourceDef) Option {
	return func(h *handler) {
		h.resourceDefs = append(h.resourceDefs, defs...)
	}
}

func WithBindBodyOptions(opts ...binding.BindBodyOption) Option {
	return func(h *handler) {
		h.bindBodyOptions = append(h.bindBodyOptions, opts...)
	}
}
