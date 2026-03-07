package global

import "net/http"

type Global interface {
	GetConfig() Config
}

type Handler interface {
	GetConfig(http.ResponseWriter, *http.Request)
}
