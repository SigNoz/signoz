package licensingserver

import (
	"context"
	"log/slog"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type Server struct {
	logger *slog.Logger

	cfg Config

	orgID valuer.UUID

	zeus zeus.Zeus

	store licensetypes.Store

	license licensetypes.License

	mtx sync.RWMutex
}

func NewServer(logger *slog.Logger, config Config, orgID valuer.UUID, zeus zeus.Zeus, store licensetypes.Store) *Server {
	return &Server{
		logger:  logger,
		cfg:     config,
		orgID:   orgID,
		zeus:    zeus,
		store:   store,
		license: licensetypes.NewNoop(),
	}
}

func (server *Server) Fetch(ctx context.Context) error {
	license, err := server.store.GetLatest(ctx, server.orgID)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil
		}

		return err
	}

	fetchedLicense, err := server.zeus.GetLicense(ctx, license.Key())
	if err != nil {
		return err
	}

	return server.SetLicense(ctx, fetchedLicense)
}

func (server *Server) SetLicense(ctx context.Context, license licensetypes.License) error {
	server.mtx.Lock()
	defer server.mtx.Unlock()

	server.license = license
	return nil
}

func (server *Server) GetLicense(ctx context.Context) licensetypes.License {
	server.mtx.RLock()
	defer server.mtx.RUnlock()

	return server.license
}
