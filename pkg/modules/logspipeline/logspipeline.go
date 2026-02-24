package logspipeline

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	ListPipelines(ctx context.Context, orgID valuer.UUID) ([]pipelinetypes.GettablePipeline, error)
	ListPipelinesByVersion(ctx context.Context, orgID valuer.UUID, version int) ([]pipelinetypes.GettablePipeline, error)
	GetPipeline(ctx context.Context, orgID valuer.UUID, id string) (*pipelinetypes.GettablePipeline, error)
	CreatePipeline(ctx context.Context, orgID valuer.UUID, pipeline *pipelinetypes.PostablePipeline) (*pipelinetypes.GettablePipeline, error)
	UpdatePipeline(ctx context.Context, orgID valuer.UUID, id string, pipeline *pipelinetypes.PostablePipeline) (*pipelinetypes.GettablePipeline, error)
	DeletePipeline(ctx context.Context, orgID valuer.UUID, id string) error
}

type Handler interface {
	ListPipelines(w http.ResponseWriter, r *http.Request)
	GetPipeline(w http.ResponseWriter, r *http.Request)
	CreatePipeline(w http.ResponseWriter, r *http.Request)
	UpdatePipeline(w http.ResponseWriter, r *http.Request)
	DeletePipeline(w http.ResponseWriter, r *http.Request)
}
