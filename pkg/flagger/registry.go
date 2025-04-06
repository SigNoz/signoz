package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureUseTracesNewSchema = featuretypes.MustNewName("UseTracesNewSchema")
	FeatureUseLogsNewSchema   = featuretypes.MustNewName("UseLogsNewSchema")
)

func MustNewRegistry() featuretypes.Registry {
	registry, err := featuretypes.NewRegistry(
		&featuretypes.Feature{
			Name:           FeatureUseTracesNewSchema,
			Kind:           featuretypes.KindBoolean,
			Description:    "Use new traces schema.",
			Stage:          featuretypes.StageStable,
			DefaultVariant: featuretypes.KindBooleanVariantDisabled,
			Variants:       featuretypes.NewBooleanFeatureVariants(),
		},
		&featuretypes.Feature{
			Name:           FeatureUseLogsNewSchema,
			Kind:           featuretypes.KindBoolean,
			Description:    "Use new logs schema.",
			Stage:          featuretypes.StageStable,
			DefaultVariant: featuretypes.KindBooleanVariantDisabled,
			Variants:       featuretypes.NewBooleanFeatureVariants(),
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
