package factory

// Config is an interface that defines methods for creating and validating configurations.
type Config interface {
	// Validate the configuration and returns an error if invalid.
	Validate() error
}

// NewConfigFunc is a function that creates a new config.
type NewConfigFunc func() Config

// ConfigFactory is a factory that creates a new config.
type ConfigFactory interface {
	Named
	New() Config
}

// configFactory is a factory that implements the ConfigFactory interface.
type configFactory struct {
	name          Name
	newConfigFunc NewConfigFunc
}

// Name returns the name of the factory.
func (factory *configFactory) Name() Name {
	return factory.name
}

// New creates a new config.
func (factory *configFactory) New() Config {
	return factory.newConfigFunc()
}

// Creates a new config factory.
func NewConfigFactory(name Name, f NewConfigFunc) ConfigFactory {
	return &configFactory{name: name, newConfigFunc: f}
}
