package featuretypes

type LicenseFeature struct {
	Name  string
	Value any
}

type DeprecatedLicenseFeature struct {
	Name       string
	Active     bool
	Usage      int64
	UsageLimit int64
	Route      string
}

func NewLicenseFeaturesFromDeprecatedLicenseFeatures(deprecatedLicenseFeatures []*DeprecatedLicenseFeature) []*LicenseFeature {
	return nil
}
