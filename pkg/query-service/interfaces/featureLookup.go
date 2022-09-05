package interfaces

type FeatureLookup interface {
	CheckFeature(f string) error
}
