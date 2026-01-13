package gateway

import "net/http"

type Handler interface {
	GetIngestionKeys(http.ResponseWriter, *http.Request)
}
