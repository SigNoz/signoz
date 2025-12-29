package implservices

var useSpanMetrics = false

func init() {
	if getOrDefaultEnv("USE_SPAN_METRICS", "false") == "true" {
		useSpanMetrics = true
	}
}
