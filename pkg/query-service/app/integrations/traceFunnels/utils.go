package traceFunnels

import (
	"fmt"
	"strconv"
)

// Helper functions for building query parts
//func buildFilters(step FunnelStep) string {
//	if step.Filters == "" {
//		return ""
//	}
//	return "AND " + step.Filters
//}

// ValidateTimestampIsMilliseconds checks if a timestamp is likely in milliseconds format
func ValidateTimestampIsMilliseconds(timestamp int64) bool {
	// If timestamp is 0, it's not valid
	if timestamp == 0 {
		return false
	}

	// Convert to string to check length
	timestampStr := strconv.FormatInt(timestamp, 10)

	// Millisecond timestamps should be around 13 digits
	// Nanosecond timestamps would be around 19 digits
	return len(timestampStr) >= 12 && len(timestampStr) <= 14
}

// ValidateTimestamp checks if a timestamp is provided and in milliseconds format
// Returns an error if validation fails
func ValidateTimestamp(timestamp int64, fieldName string) error {
	if timestamp == 0 {
		return fmt.Errorf("%s is required", fieldName)
	}

	if !ValidateTimestampIsMilliseconds(timestamp) {
		return fmt.Errorf("%s must be in milliseconds format (13 digits)", fieldName)
	}

	return nil
}
