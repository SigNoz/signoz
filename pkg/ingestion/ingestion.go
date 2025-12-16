package ingestion

import (
	"net/http"
)

type Handler interface {
	Get(http.ResponseWriter, *http.Request)
}

type Ingestion interface {
	GetConfig() Config
}
