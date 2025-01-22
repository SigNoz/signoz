package apiserver

import (
	"time"
)

// APIServer is the interface that wraps the methods of the apiserver package.
type APIServer interface {
	GetContextTimeout() time.Duration
	GetContextTimeoutMaxAllowed() time.Duration
	GetTimeoutExcludedRoutes() map[string]struct{}
}
