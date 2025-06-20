package telemetry

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
