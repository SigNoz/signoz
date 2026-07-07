package global

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/globaltypes"
)

type Global interface {
	GetConfig(context.Context) *globaltypes.Config
}

type Handler interface {
	GetConfig(http.ResponseWriter, *http.Request)
}
