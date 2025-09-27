package api

import (
	"net/http"
)

// receiveSAML completes a SAML request and gets user logged in
func (ah *APIHandler) receiveSAML(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
}
