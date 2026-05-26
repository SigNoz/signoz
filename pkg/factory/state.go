package factory

import "sync"

// State represents the lifecycle state of a service.
type State struct {
	s string
}

func (s State) String() string {
	return s.s
}

// MarshalText implements encoding.TextMarshaler so State can be used as a JSON map key.
func (s State) MarshalText() ([]byte, error) {
	return []byte(s.s), nil
}

var (
	StateStarting = State{"starting"}
	StateRunning  = State{"running"}
	StateFailed   = State{"failed"}
)

// serviceWithState wraps a NamedService with thread-safe state tracking.
type serviceWithState struct {
	// service is the underlying named service.
	service NamedService

	// dependsOn is the validated subset of declared dependencies that exist in the registry.
	dependsOn []Name

	// mu protects state and startErr from concurrent access.
	mu sync.RWMutex

	// state is the current lifecycle state of the service.
	state State

	// healthyC is closed when the service transitions to StateRunning.
	healthyC chan struct{}

	// startReturnedC is closed when Start() returns, whether with nil or an error.
	startReturnedC chan struct{}

	// startErr is the error returned by Start(), or nil if it returned successfully.
	startErr error
}

func newServiceWithState(service NamedService) *serviceWithState {
	return &serviceWithState{
		service:        service,
		state:          StateStarting,
		healthyC:       make(chan struct{}),
		startReturnedC: make(chan struct{}),
	}
}

func (ss *serviceWithState) setState(state State) {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	ss.state = state
	if state == StateRunning {
		select {
		case <-ss.healthyC:
		default:
			close(ss.healthyC)
		}
	}
}

func (ss *serviceWithState) getState() State {
	ss.mu.RLock()
	defer ss.mu.RUnlock()
	return ss.state
}
