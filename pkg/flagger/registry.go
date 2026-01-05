package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureUseSpanMetrics = featuretypes.MustNewName("use_span_metrics")
)

func MustNewRegistry() featuretypes.Registry {
	registry, err := featuretypes.NewRegistry(
		&featuretypes.Feature{
			Name:           FeatureUseSpanMetrics,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageStable,
			Description:    "Controls whether to use span metrics",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
