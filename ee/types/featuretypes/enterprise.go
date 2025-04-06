package featuretypes

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

var (
	SingleSignOn = featuretypes.MustNewName("SingleSignOn")
)

func NewEnterpriseRegistry() (featuretypes.Registry, error) {
	enterpriseRegistry, err := featuretypes.NewRegistry(
		&featuretypes.Feature{
			Name:        SingleSignOn,
			Kind:        featuretypes.KindBoolean,
			Description: "Enable single sign on.",
			Stage:       featuretypes.StageStable,
			Default:     true,
		},
	)
	if err != nil {
		return nil, err
	}

	return enterpriseRegistry.MergeOrOverride(featuretypes.MustNewCommunityRegistry()), nil
}

func MustNewEnterpriseRegistry() featuretypes.Registry {
	enterpriseRegistry, err := NewEnterpriseRegistry()
	if err != nil {
		panic(err)
	}

	return enterpriseRegistry
}
