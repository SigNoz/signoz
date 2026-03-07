package apdex

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/apdextypes"
)

type Module interface {
	Get(context.Context, string, []string) ([]*apdextypes.Settings, error)

	Set(context.Context, string, *apdextypes.Settings) error
}

type Handler interface {
	Get(http.ResponseWriter, *http.Request)

	Set(http.ResponseWriter, *http.Request)
}
