package featuretypes

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	SingleSignOn = featuretypes.MustNewName("SingleSignOn")
)

func NewEnterpriseRegistry() *featuretypes.Registry {
	enterpriseRegistry := featuretypes.NewRegistry(
		&featuretypes.Feature{
			Name:        SingleSignOn,
			Kind:        featuretypes.KindBoolean,
			Description: "Enable single sign on.",
			Stage:       featuretypes.StageStable,
			Default:     false,
			Immutable:   true,
		},
	)

	return enterpriseRegistry.Merge(featuretypes.NewCommunityRegistry())
}
