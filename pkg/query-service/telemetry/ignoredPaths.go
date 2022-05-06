package telemetry

func IgnoredPaths() map[string]struct{} {
	ignoredPaths := map[string]struct{}{
		"/api/v1/tags":    {},
		"/api/v1/version": {},
	}

	return ignoredPaths
}
