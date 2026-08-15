package fields

import "net/http"

type Handler interface {
	// Gets the fields keys for the given field key selector
	GetFieldsKeys(http.ResponseWriter, *http.Request)

	// Gets the fields values for the given field value selector
	GetFieldsValues(http.ResponseWriter, *http.Request)

	// Gets the fields keys the AI observability explorer can filter on
	GetAIObservabilityFieldsKeys(http.ResponseWriter, *http.Request)

	// Gets the values the AI observability explorer can filter a field key on
	GetAIObservabilityFieldsValues(http.ResponseWriter, *http.Request)
}
