package implauthdomain

import "github.com/SigNoz/signoz/ee/modules/authdomain"

type handler struct {
	module authdomain.Module
}

func NewHandler(module authdomain.Module) authdomain.Handler {
	return &handler{
		module: module,
	}
}
