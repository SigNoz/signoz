package flagger

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	FeatureEnableInterpolation = featuretypes.MustNewName("enable_interpolation")
)

func MustNewRegistry() featuretypes.Registry {
	registry, err := featuretypes.NewRegistry(
		&featuretypes.Feature{
			Name:           FeatureEnableInterpolation,
			Kind:           featuretypes.KindBoolean,
			Stage:          featuretypes.StageStable,
			Description:    "Enable interpolation in statement builder",
			DefaultVariant: featuretypes.MustNewName("disabled"),
			Variants: map[featuretypes.Name]featuretypes.FeatureVariant{
				featuretypes.MustNewName("disabled"): {
					Variant: featuretypes.MustNewName("disabled"),
					Value:   false,
				},
				featuretypes.MustNewName("enabled"): {
					Variant: featuretypes.MustNewName("enabled"),
					Value:   true,
				},
			},
		},
	)
	if err != nil {
		panic(err)
	}

	return registry
}
