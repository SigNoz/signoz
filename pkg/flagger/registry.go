package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureEnableInterpolation = featuretypes.MustNewName("enable_interpolation")
)

func MustNewRegistry() featuretypes.Registry {
	registry, err := featuretypes.NewRegistry()
	if err != nil {
		panic(err)
	}

	return registry
}
