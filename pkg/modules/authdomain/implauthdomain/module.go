package implauthdomain

import "github.com/SigNoz/signoz/pkg/modules/authdomain"

type module struct{}

func NewModule() authdomain.Module {
	return &module{}
}
