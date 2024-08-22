package confmap

// Config is an interface that defines methods for creating and validating configurations.
type Config interface {
	// New creates a new instance of the configuration with default values.
	NewWithDefaults() Config
	// Validate the configuration and returns an error if invalid.
	Validate() error
}
