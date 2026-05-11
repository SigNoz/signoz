package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureUseSpanMetrics  = featuretypes.MustNewName("use_span_metrics")
	FeatureKafkaSpanEval   = featuretypes.MustNewName("kafka_span_eval")
	FeatureHideRootUser    = featuretypes.MustNewName("hide_root_user")
	FeaturePutMetersInZeus = featuretypes.MustNewName("put_meters_in_zeus")
	FeatureUseJSONBody       = featuretypes.MustNewName("use_json_body")
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
			Name:           FeatureHideRootUser,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageStable,
			Description:    "Controls whether root admin user is hidden or not",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
		&featuretypes.Feature{
			Name:           FeaturePutMetersInZeus,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageExperimental,
			Description:    "Controls whether usage meters are sent to Zeus instead of the legacy subscriptions service",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
		&featuretypes.Feature{
			Name:           FeatureUseJSONBody,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageExperimental,
			Description:    "Controls whether body JSON querying is enabled",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants:       featuretypes.NewBooleanVariants(),
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
