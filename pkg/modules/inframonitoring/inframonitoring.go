package inframonitoring

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	ListHosts(http.ResponseWriter, *http.Request)
	ListPods(http.ResponseWriter, *http.Request)
}

type Module interface {
	ListHosts(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostableHosts) (*inframonitoringtypes.Hosts, error)
	ListPods(ctx context.Context, orgID valuer.UUID, req *inframonitoringtypes.PostablePods) (*inframonitoringtypes.Pods, error)
}
