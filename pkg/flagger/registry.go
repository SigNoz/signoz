package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureUseTracesNewSchema = featuretypes.MustNewName("use_traces_new_schema")
	FeatureUseLogsNewSchema   = featuretypes.MustNewName("use_logs_new_schema")
)

func MustNewRegistry() featuretypes.Registry {
	registry, err := featuretypes.NewRegistry(
		&featuretypes.Feature{
			Name:           FeatureUseTracesNewSchema,
			Kind:           featuretypes.KindBoolean,
			Description:    "Use new traces schema",
			Stage:          featuretypes.StageStable,
			DefaultVariant: featuretypes.KindBooleanVariantDisabled,
			Variants:       featuretypes.NewKindBooleanFeatureVariants(),
		},
		&featuretypes.Feature{
			Name:           FeatureUseLogsNewSchema,
			Kind:           featuretypes.KindBoolean,
			Description:    "Use new logs schema",
			Stage:          featuretypes.StageStable,
			DefaultVariant: featuretypes.KindBooleanVariantDisabled,
			Variants:       featuretypes.NewKindBooleanFeatureVariants(),
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
