package ingestion

import (
	"net/http"
)

type Ingestion interface {
	GetConfig() Config
}

type Handler interface {
	Get(http.ResponseWriter, *http.Request)
}
