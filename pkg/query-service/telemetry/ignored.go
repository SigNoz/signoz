package telemetry

func IgnoredPaths() map[string]struct{} {
	ignoredPaths := map[string]struct{}{
		"/api/v1/tags":                {},
		"/api/v1/version":             {},
		"/api/v1/query_range":         {},
		"/api/v2/metrics/query_range": {},
		"/api/v1/health":              {},
	}

	return ignoredPaths
}

func ignoreEvents(event string, attributes map[string]interface{}) bool {

	if event == TELEMETRY_EVENT_ACTIVE_USER || event == TELEMETRY_EVENT_ACTIVE_USER_PH {
		for attr_key, attr_val := range attributes {

			if attr_key == "any" && attr_val.(int8) == 0 {
				return true
			}

		}
	}

	return false
}
