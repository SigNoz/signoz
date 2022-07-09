package telemetry

func IgnoredPaths() map[string]struct{} {
	ignoredPaths := map[string]struct{}{
		"/api/v1/tags":                {},
		"/api/v1/version":             {},
		"/api/v1/query_range":         {},
		"/api/v2/metrics/query_range": {},
		"/api/v1/services/list":       {},
	}

	return ignoredPaths
}
