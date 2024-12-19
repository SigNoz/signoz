package telemetry

func EnabledPaths() map[string]struct{} {
	enabledPaths := map[string]struct{}{
		"/api/v1/channels": {},
	}

	return enabledPaths
}

func ignoreEvents(event string, attributes map[string]interface{}) bool {

	if event == TELEMETRY_EVENT_ACTIVE_USER {
		for attr_key, attr_val := range attributes {

			if attr_key == "any" && attr_val.(int8) == 0 {
				return true
			}

		}
	}

	return false
}
