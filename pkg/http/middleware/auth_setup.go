package middleware

import (
	"log/slog"

	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

// AuthSetup provides a helper to configure authentication middleware consistently
type AuthSetup struct {
	config  apiserver.Config
	jwt     *authtypes.JWT
	store   sqlstore.SQLStore
	sharder sharder.Sharder
	logger  *slog.Logger
}

// NewAuthSetup creates a new AuthSetup helper
func NewAuthSetup(config apiserver.Config, jwt *authtypes.JWT, store sqlstore.SQLStore, sharder sharder.Sharder, logger *slog.Logger) *AuthSetup {
	return &AuthSetup{
		config:  config,
		jwt:     jwt,
		store:   store,
		sharder: sharder,
		logger:  logger,
	}
}

// ApplyAuthMiddleware applies authentication middleware conditionally based on configuration
func (a *AuthSetup) ApplyAuthMiddleware(router *mux.Router) {
	// Apply authentication middleware conditionally based on configuration
	if a.config.Auth.Enabled {
		router.Use(NewAuth(a.jwt, []string{"Authorization", "Sec-WebSocket-Protocol"}, a.sharder, a.logger).Wrap)
	} else {
		router.Use(NewNoAuth().Wrap)
	}
}

// ApplyAPIKeyMiddleware applies API key middleware if authentication is enabled
func (a *AuthSetup) ApplyAPIKeyMiddleware(router *mux.Router) {
	if a.config.Auth.Enabled {
		router.Use(NewAPIKey(a.store, []string{"SIGNOZ-API-KEY"}, a.logger, a.sharder).Wrap)
	}
}
