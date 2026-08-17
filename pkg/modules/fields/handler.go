package fields

import "net/http"

type Handler interface {
	// Gets the fields keys for the given field key selector
	GetFieldsKeys(http.ResponseWriter, *http.Request)

	// Gets the fields values for the given field value selector
	GetFieldsValues(http.ResponseWriter, *http.Request)
}
