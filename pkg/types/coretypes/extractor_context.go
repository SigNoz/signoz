package coretypes

import "net/http"

// ExtractorContext carries everything an id extractor may read. The resource
// middleware fills Request + RequestBody pre-handler; the audit middleware adds
// ResponseBody post-handler. Each extractor is run exactly once, in the phase
// whose data it needs.
type ExtractorContext struct {
	Request      *http.Request
	RequestBody  []byte
	ResponseBody []byte
}
