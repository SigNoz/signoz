// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
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
	sweepExpiredOAuthStates()
	oauthStates.Store(state, entry)
	return state, nil
}

// sweepExpiredOAuthStates removes state entries whose TTL has elapsed.
func sweepExpiredOAuthStates() {
	now := time.Now()
	oauthStates.Range(func(key, value any) bool {
		if entry, ok := value.(oauthStateEntry); ok && now.After(entry.expiry) {
			oauthStates.Delete(key)
		}
		return true
	})
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
