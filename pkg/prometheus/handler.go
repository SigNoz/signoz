package prometheus

import "net/http"

type Handler interface {
	Query(http.ResponseWriter, *http.Request)

	QueryRange(http.ResponseWriter, *http.Request)
}
