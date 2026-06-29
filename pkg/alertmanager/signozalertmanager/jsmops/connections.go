// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const oauthStateTTL = 10 * time.Minute

// oauthStateEntry is the server-side state for one in-flight OAuth handshake.
type oauthStateEntry struct {
	expiry       time.Time
	openerOrigin string
	orgID        string
}

var oauthStates = &sync.Map{}

// randomToken returns a fresh, URL-safe token.
func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "failed to generate secure token: %v", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// storeOAuthState records a freshly minted OAuth state token.
func storeOAuthState(entry oauthStateEntry) (string, error) {
	state, err := randomToken()
	if err != nil {
		return "", err
	}
	oauthStates.Store(state, entry)
	return state, nil
}

// loadAndDeleteOAuthState consumes a state token exactly once.
func loadAndDeleteOAuthState(state string) (oauthStateEntry, bool) {
	value, exists := oauthStates.LoadAndDelete(state)
	if !exists {
		return oauthStateEntry{}, false
	}
	entry, ok := value.(oauthStateEntry)
	if !ok {
		return oauthStateEntry{}, false
	}
	return entry, true
}

// ResolveConnections validates that each JSM Ops config references a connection the org owns and stamps the runtime-only OrgID.
func (h *Handler) ResolveConnections(ctx context.Context, orgID string, receiver *alertmanagertypes.Receiver) error {
	connStore := h.alertmanager.JSMOpsConnectionStore()

	for _, cfg := range receiver.JsmOpsConfigs {
		if cfg.ConnectionID == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "JSM Ops channel is not connected; please select a connection before saving or testing")
		}

		id, err := valuer.NewUUID(cfg.ConnectionID)
		if err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "JSM Ops connection_id is not a valid uuid-v7")
		}

		if _, err := connStore.GetByID(ctx, orgID, id); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "JSM Ops connection has expired or is invalid; please reconnect")
		}

		cfg.OrgID = orgID
	}

	return nil
}
