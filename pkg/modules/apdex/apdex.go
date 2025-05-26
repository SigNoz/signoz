package apdex

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
)

type Module interface {
	Get(context.Context, string, []string) ([]*types.ApdexSettings, error)

	Set(context.Context, string, *types.ApdexSettings) error
}

type Handler interface {
	Get(http.ResponseWriter, *http.Request)

	Set(http.ResponseWriter, *http.Request)
}
