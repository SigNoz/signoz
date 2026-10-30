package statementbuilder

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

// SkipResourceFingerprint configures when the resource fingerprint subquery is skipped in favor of main-table filtering.
type SkipResourceFingerprint struct {
	Enabled bool `yaml:"enabled" mapstructure:"enabled"`
	// If count of fingerprint is above threshold, skip the fingerprint subquery and filter on main table instead.
	Threshold uint64 `yaml:"threshold" mapstructure:"threshold"`
}

// Config represents the configuration for the statement builders.
type Config struct {
	// SkipResourceFingerprint configures when the resource fingerprint subquery is skipped in favor of main-table filtering.
	SkipResourceFingerprint SkipResourceFingerprint `yaml:"skip_resource_fingerprint" mapstructure:"skip_resource_fingerprint"`
	// SearchMaxScanRows caps per-shard rows a search() may scan, enforced by the querier
	// via EXPLAIN ESTIMATE (0 disables).
	SearchMaxScanRows int64 `yaml:"search_max_scan_rows" mapstructure:"search_max_scan_rows"`
	// SearchMaxScanRowsJSONBody is the same budget for body_v2, where each row costs far
	// more: toString() rebuilds every document and no skip index prunes (0 disables).
	SearchMaxScanRowsJSONBody int64 `yaml:"search_max_scan_rows_json_body" mapstructure:"search_max_scan_rows_json_body"`
	// SchemaMetadataStoreCacheTTL is how long the schema metadata store caches what it
	// found; 0 caches it for the life of the process.
	SchemaMetadataStoreCacheTTL time.Duration `yaml:"schema_metadata_store_cache_ttl" mapstructure:"schema_metadata_store_cache_ttl"`
}

func NewConfig() Config {
	return Config{
		SkipResourceFingerprint: SkipResourceFingerprint{
			Enabled:   false,
			Threshold: 100000,
		},
		SearchMaxScanRows:         60_000_000,
		SearchMaxScanRowsJSONBody: 6_000_000,
	}
}

// Validate validates the configuration.
func (c Config) Validate() error {
	if c.SkipResourceFingerprint.Enabled && c.SkipResourceFingerprint.Threshold == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "skip_resource_fingerprint.threshold must be > 0 when enabled")
	}
	if c.SearchMaxScanRows < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "search_max_scan_rows must not be negative, got %v", c.SearchMaxScanRows)
	}
	if c.SearchMaxScanRowsJSONBody < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "search_max_scan_rows_json_body must not be negative, got %v", c.SearchMaxScanRowsJSONBody)
	}
	if c.SchemaMetadataStoreCacheTTL < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "schema_metadata_store_cache_ttl must not be negative, got %v", c.SchemaMetadataStoreCacheTTL)
	}
	return nil
}
