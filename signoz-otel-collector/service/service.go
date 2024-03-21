package service

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz-otel-collector/opamp"
	"github.com/SigNoz/signoz-otel-collector/signozcol"
	"go.uber.org/zap"
)

// Service is the interface for the OpAMP service
// which manages the OpAMP connection and collector
// lifecycle
//
// main function will create a new service and call
// service.Start(ctx) and service.Shutdown(ctx)
// on SIGINT and SIGTERM
type Service interface {
	Start(ctx context.Context) error
	Shutdown(ctx context.Context) error
	Error() <-chan error
}

type service struct {
	l      *zap.Logger
	client opamp.Client
}

func New(
	wrappedCollector *signozcol.WrappedCollector,
	logger *zap.Logger,
	managerConfigPath string,
	collectorConfigPath string,
) (*service, error) {

	var client opamp.Client
	var err error

	// Running without OpAMP connection
	if managerConfigPath == "" {
		client = opamp.NewSimpleClient(wrappedCollector, logger)
	} else {
		managerConfig, err := opamp.ParseAgentManagerConfig(managerConfigPath)
		// Invalid config file
		if err != nil {
			return nil, fmt.Errorf("failed to parse manager config: %w", err)
		}
		serverClientOpts := &opamp.NewServerClientOpts{
			Logger:             logger,
			Config:             managerConfig,
			WrappedCollector:   wrappedCollector,
			CollectorConfgPath: collectorConfigPath,
		}
		client, err = opamp.NewServerClient(serverClientOpts)
		if err != nil {
			return nil, fmt.Errorf("failed to create server client: %w", err)
		}
	}

	return &service{
		client: client,
		l:      logger,
	}, err
}

// Start starts the (OpAMP connection and) collector
func (s *service) Start(ctx context.Context) error {
	s.l.Info("Starting service")
	if err := s.client.Start(ctx); err != nil {
		return fmt.Errorf("failed to start : %w", err)
	}
	s.l.Info("Client started successfully")
	return nil
}

// Shutdown stops the (OpAMP connection and) collector
func (s *service) Shutdown(ctx context.Context) error {
	s.l.Info("Shutting down service")
	if err := s.client.Stop(ctx); err != nil {
		return fmt.Errorf("failed to stop: %w", err)
	}
	s.l.Info("Client stopped successfully")
	return nil
}

// Error returns the error channel
func (s *service) Error() <-chan error {
	return s.client.Error()
}
