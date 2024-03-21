package migrators

import (
	"context"
)

// MigratorConfig stores the configuration for a migrator
// Currently all migrators use the same config
type MigratorConfig struct {
	DSN                            string
	ClusterName                    string
	IsDurationSortFeatureDisabled  bool
	IsTimestampSortFeatureDisabled bool
	VerboseLoggingEnabled          bool
}

type Migrator interface {
	Migrate(context.Context) error
	Close() error
	Name() string
}
