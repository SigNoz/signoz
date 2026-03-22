package factory

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeInvalidRegistry  = errors.MustNewCode("invalid_registry")
	ErrCodeDependencyFailed = errors.MustNewCode("dependency_failed")
	ErrCodeServiceFailed    = errors.MustNewCode("service_failed")
)

type Registry struct {
	services       []*serviceWithState
	servicesByName map[Name]*serviceWithState
	logger         *slog.Logger
	startC         chan error
	stopC          chan error
}

// New creates a new registry of services. It needs at least one service in the input.
func NewRegistry(ctx context.Context, logger *slog.Logger, services ...NamedService) (*Registry, error) {
	if logger == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidRegistry, "cannot build registry, logger is required")
	}

	if len(services) == 0 {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidRegistry, "cannot build registry, at least one service is required")
	}

	servicesWithState := make([]*serviceWithState, len(services))
	servicesByName := make(map[Name]*serviceWithState, len(services))
	for i, s := range services {
		if _, ok := servicesByName[s.Name()]; ok {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidRegistry, "cannot build registry, duplicate service name %q", s.Name())
		}
		ss := newServiceWithState(s)
		servicesWithState[i] = ss
		servicesByName[s.Name()] = ss
	}

	registryLogger := logger.With(slog.String("pkg", "github.com/SigNoz/signoz/pkg/factory"))

	// Validate dependsOn references — drop unknown deps with a log error.
	for _, ss := range servicesWithState {
		for _, dep := range ss.service.DependsOn() {
			if dep == ss.service.Name() {
				registryLogger.ErrorContext(ctx, "ignoring self-dependency", slog.Any("service", ss.service.Name()))
				continue
			}
			if _, ok := servicesByName[dep]; !ok {
				registryLogger.ErrorContext(ctx, "ignoring unknown dependency", slog.Any("service", ss.service.Name()), slog.Any("dependency", dep))
				continue
			}
			ss.dependsOn = append(ss.dependsOn, dep)
		}
	}

	// Detect dependency cycles via DFS — drop edges that would form a cycle.
	adjacency := make(map[Name][]Name, len(servicesWithState))
	for _, ss := range servicesWithState {
		adjacency[ss.service.Name()] = ss.dependsOn
	}
	acyclic := detectAndDropCycles(adjacency)
	for _, ss := range servicesWithState {
		ss.dependsOn = acyclic[ss.service.Name()]
	}

	return &Registry{
		logger:         registryLogger,
		services:       servicesWithState,
		servicesByName: servicesByName,
		startC:         make(chan error, 1),
		stopC:          make(chan error, len(services)),
	}, nil
}

func (registry *Registry) Start(ctx context.Context) {
	for _, ss := range registry.services {
		go func(ss *serviceWithState) {
			// Wait for all dependencies to be healthy before starting.
			for _, dep := range ss.dependsOn {
				depState := registry.servicesByName[dep]
				registry.logger.InfoContext(ctx, "service waiting for dependency", slog.Any("service", ss.service.Name()), slog.Any("dependency", dep))
				select {
				case <-ctx.Done():
					ss.mu.Lock()
					ss.state = StateFailed
					ss.startErr = ctx.Err()
					ss.mu.Unlock()
					close(ss.startReturnedC)
					registry.startC <- ctx.Err()
					return
				case <-depState.healthyC:
					// Dependency is healthy, continue.
				case <-depState.startReturnedC:
					// Dependency failed before becoming healthy.
					err := errors.Newf(errors.TypeInternal, ErrCodeDependencyFailed, "dependency %q of service %q failed", dep, ss.service.Name())
					ss.mu.Lock()
					ss.state = StateFailed
					ss.startErr = err
					ss.mu.Unlock()
					close(ss.startReturnedC)
					registry.startC <- err
					return
				}
			}

			registry.logger.InfoContext(ctx, "starting service", slog.Any("service", ss.service.Name()))

			if h, ok := unwrapService(ss.service).(Healthy); ok {
				go func() {
					select {
					case <-h.Healthy():
						ss.setState(StateRunning)
					case <-ss.startReturnedC:
					}
				}()
			} else {
				ss.setState(StateRunning)
			}

			err := ss.service.Start(ctx)
			if err != nil {
				ss.mu.Lock()
				ss.state = StateFailed
				ss.startErr = err
				ss.mu.Unlock()
			}
			close(ss.startReturnedC)
			registry.startC <- err
		}(ss)
	}
}

func (registry *Registry) Wait(ctx context.Context) error {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-ctx.Done():
		registry.logger.InfoContext(ctx, "caught context error, exiting", errors.Attr(ctx.Err()))
	case s := <-interrupt:
		registry.logger.InfoContext(ctx, "caught interrupt signal, exiting", slog.Any("signal", s))
	case err := <-registry.startC:
		registry.logger.ErrorContext(ctx, "caught service error, exiting", errors.Attr(err))
		return err
	}

	return nil
}

func (registry *Registry) Stop(ctx context.Context) error {
	for _, ss := range registry.services {
		go func(ss *serviceWithState) {
			registry.logger.InfoContext(ctx, "stopping service", slog.Any("service", ss.service.Name()))
			err := ss.service.Stop(ctx)
			registry.stopC <- err
		}(ss)
	}

	errs := make([]error, len(registry.services))
	for i := 0; i < len(registry.services); i++ {
		err := <-registry.stopC
		if err != nil {
			errs = append(errs, err)
		}
	}

	return errors.Join(errs...)
}

// AwaitHealthy blocks until all services reach the RUNNING state or any service fails.
func (registry *Registry) AwaitHealthy(ctx context.Context) error {
	for _, ss := range registry.services {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ss.healthyC:
		case <-ss.startReturnedC:
			ss.mu.RLock()
			err := ss.startErr
			ss.mu.RUnlock()
			if err != nil {
				return errors.Wrapf(err, errors.TypeInternal, ErrCodeServiceFailed, "service %q failed before becoming healthy", ss.service.Name())
			}
			return errors.Newf(errors.TypeInternal, ErrCodeServiceFailed, "service %q terminated before becoming healthy", ss.service.Name())
		}
	}
	return nil
}

// ServicesByState returns a snapshot of the current state of all services.
func (registry *Registry) ServicesByState() map[State][]Name {
	result := make(map[State][]Name)
	for _, ss := range registry.services {
		state := ss.getState()
		result[state] = append(result[state], ss.service.Name())
	}
	return result
}

// IsHealthy returns true if all services are in the RUNNING state.
func (registry *Registry) IsHealthy() bool {
	for _, ss := range registry.services {
		if ss.getState() != StateRunning {
			return false
		}
	}
	return true
}

// detectAndDropCycles returns a copy of the adjacency map with back-edges removed
// so the dependency graph is a DAG. Uses DFS with three-color marking.
func detectAndDropCycles(adjacency map[Name][]Name) map[Name][]Name {
	const (
		white = 0 // unvisited
		gray  = 1 // in current DFS path
		black = 2 // fully processed
	)

	color := make(map[Name]int, len(adjacency))
	result := make(map[Name][]Name, len(adjacency))

	var visit func(node Name)
	visit = func(node Name) {
		color[node] = gray
		for _, dep := range adjacency[node] {
			switch color[dep] {
			case white:
				result[node] = append(result[node], dep)
				visit(dep)
			case gray:
				// Back-edge: dep is an ancestor in the current path — drop to break cycle.
			case black:
				result[node] = append(result[node], dep)
			}
		}
		color[node] = black
	}

	for node := range adjacency {
		if color[node] == white {
			visit(node)
		}
	}

	return result
}
