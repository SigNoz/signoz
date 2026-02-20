package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureUseSpanMetrics       = featuretypes.MustNewName("use_span_metrics")
	FeatureKafkaSpanEval        = featuretypes.MustNewName("kafka_span_eval")
	FeatureListUsersIncludeRoot = featuretypes.MustNewName("list_users_include_root")
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
			Name:           FeatureKafkaSpanEval,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageExperimental,
			Description:    "Controls whether to enable kafka span eval",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
		&featuretypes.Feature{
			Name:           FeatureListUsersIncludeRoot,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageStable,
			Description:    "Controls whether root admin users are shown in the list users API",
			DefaultVariant: featuretypes.MustNewName("enabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
