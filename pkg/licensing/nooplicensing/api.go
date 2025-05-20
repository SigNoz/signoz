package nooplicensing

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
)

type noopLicenseAPI struct{}

func NewLicenseAPI() licensing.API {
	return &noopLicenseAPI{}
}

func (n *noopLicenseAPI) Activate(rw http.ResponseWriter, r *http.Request) {
	render.Error(rw, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not implemented"))
}

func (n *noopLicenseAPI) GetActive(rw http.ResponseWriter, r *http.Request) {
	render.Error(rw, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not implemented"))
}

func (n *noopLicenseAPI) Refresh(rw http.ResponseWriter, r *http.Request) {
	render.Error(rw, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not implemented"))
}
