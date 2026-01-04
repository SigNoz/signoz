package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

func MustNewRegistry() featuretypes.Registry {
	registry, err := featuretypes.NewRegistry()
	if err != nil {
		panic(err)
	}

	return registry
}
