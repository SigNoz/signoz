package config

import (
	"fmt"
)

// ValidateQsConfig validates query service config
func ValidateQs(q *QsConfig) error {
	if q == nil {
		return fmt.Errorf("failed to initialize Query service config")
	}

	if q.DB == nil {
		return fmt.Errorf("failed to find config for QS Database")
	}
	return nil
}
