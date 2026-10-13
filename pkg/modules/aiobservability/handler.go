package aiobservability

import "net/http"

type Handler interface {
	// Gets the fields keys the AI observability explorer can filter on
	GetFieldsKeys(http.ResponseWriter, *http.Request)

	// Gets the values the AI observability explorer can filter a field key on
	GetFieldsValues(http.ResponseWriter, *http.Request)
}
