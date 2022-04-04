package telemetry

func IgnoredPaths() map[string]struct{} {
	ignoredPaths := map[string]struct{}{
		"/api/v1/tags":    struct{}{},
		"/api/v1/version": struct{}{},
	}

	return ignoredPaths
}
