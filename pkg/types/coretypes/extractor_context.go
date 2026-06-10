package coretypes

import "net/http"

// ExtractorContext carries everything an extractor may read: Request + RequestBody
// are filled pre-handler, ResponseBody post-handler.
type ExtractorContext struct {
	Request      *http.Request
	RequestBody  []byte
	ResponseBody []byte
}
