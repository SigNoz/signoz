package featuretypes

type Registry struct {
	features []*Feature
}

func NewRegistry(features ...*Feature) *Registry {
	return &Registry{
		features: features,
	}
}

func (registry *Registry) StorableOrgFeaturesFromLicenseFeatures(licenseFeatures []*LicenseFeature) []*StorableOrgFeature {
	return nil
}

func (registry *Registry) Merge(other *Registry) *Registry {
	return &Registry{
		features: append(registry.features, other.features...),
	}
}

// Diff calculates the difference between the features for the given orgID. It will perform the following steps:
//
//   - Get the features for the given orgID
//   - If the feature is not set, get the feature from the registry and return the default value
//   - If the feature is set, return the value
//   - If an extra feature is found, it will be ignored
func (registry *Registry) Diff(orgFeatures []*StorableOrgFeature, licenseFeatures []*LicenseFeature) ([]*StorableOrgFeature, map[Action][]*StorableOrgFeature, error) {
	resolvedFeatures := make([]*StorableOrgFeature, 0)

	diff := make(map[Action][]*StorableOrgFeature)
	diff[ActionInsert] = make([]*StorableOrgFeature, 0)
	diff[ActionUpdate] = make([]*StorableOrgFeature, 0)
	diff[ActionDelete] = make([]*StorableOrgFeature, 0)

	return resolvedFeatures, diff, nil
}
