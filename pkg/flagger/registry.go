package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureUseSpanMetrics       = featuretypes.MustNewName("use_span_metrics")
	FeatureInterpolationEnabled = featuretypes.MustNewName("interpolation_enabled")
	FeatureKafkaSpanEval        = featuretypes.MustNewName("kafka_span_eval")
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
		&featuretypes.Feature{
			Name:           FeatureInterpolationEnabled,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageExperimental,
			Description:    "Controls whether to enable interpolation",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
		&featuretypes.Feature{
			Name:           FeatureKafkaSpanEval,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageExperimental,
			Description:    "Controls whether to enable kafka span eval",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
