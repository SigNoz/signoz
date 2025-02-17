package alertmanager

import (
	"context"
	"sync"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

var (
	ErrCodeAlertmanagerNotFound = errors.MustNewCode("alertmanager_not_found")
)

var _ factory.Service = (*Servers)(nil)
var _ Client = (*Servers)(nil)

type Servers struct {
	config Config
	// Store is the store for the alertmanager
	store alertmanagerstore.Store
	// Map of organization id to server
	servers map[string]*Server
	// Mutex to protect the servers map
	serversMtx sync.RWMutex
}

func New(ctx context.Context, settings factory.Settings, config Config, store alertmanagerstore.Store) (*Servers, error) {
	servers := &Servers{
		config:     config,
		store:      store,
		servers:    map[string]*Server{},
		serversMtx: sync.RWMutex{},
	}

	orgIDs, err := store.ListOrgIDs(ctx)
	if err != nil {
		return nil, err
	}

	for _, orgID := range orgIDs {
		server, err := NewForOrg(ctx, settings, config, orgID, store)
		if err != nil {
			return nil, err
		}

		servers.servers[orgID] = server
	}

	return servers, nil
}

func (ss *Servers) Start(ctx context.Context) error {
	for _, server := range ss.servers {
		err := server.Start(ctx)
		if err != nil {
			return err
		}
	}

	ticker := time.NewTicker(ss.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			for _, server := range ss.servers {
				config, err := ss.store.GetConfig(ctx, server.orgID)
				if err != nil && !errors.Ast(err, errors.TypeNotFound) {
					server.settings.Logger().ErrorContext(ctx, "failed to get config", "error", err, "orgID", server.orgID)
					continue
				}
				if config == nil {
					config = alertmanagertypes.NewDefaultConfig(
						server.srvConfig.ResolveTimeout,
						server.srvConfig.SMTP.Hello,
						server.srvConfig.SMTP.From,
						server.srvConfig.SMTP.Host,
						server.srvConfig.SMTP.Port,
						server.srvConfig.SMTP.AuthUsername,
						server.srvConfig.SMTP.AuthPassword,
						server.srvConfig.SMTP.AuthSecret,
						server.srvConfig.SMTP.AuthIdentity,
						server.srvConfig.SMTP.RequireTLS,
						server.srvConfig.Route.GroupBy,
						server.srvConfig.Route.GroupInterval,
						server.srvConfig.Route.GroupWait,
						server.srvConfig.Route.RepeatInterval,
						server.orgID,
					)
				}

				if err := server.SetConfig(ctx, config); err != nil {
					server.settings.Logger().ErrorContext(ctx, "failed to set config in alertmanager", "error", err, "orgID", server.orgID)
				}
			}
		}
	}
}

func (ss *Servers) Stop(ctx context.Context) error {
	for _, server := range ss.servers {
		server.Stop(ctx)
	}

	return nil
}

func (ss *Servers) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error) {
	server, ok := ss.servers[orgID]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerNotFound, "alertmanager not found for orgID %q", orgID)
	}

	return server.GetAlerts(ctx, params)
}

func (ss *Servers) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	server, ok := ss.servers[orgID]
	if !ok {
		return errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerNotFound, "alertmanager not found for orgID %q", orgID)
	}

	return server.PutAlerts(ctx, alerts)
}

func (ss *Servers) SetConfig(ctx context.Context, orgID string, postableConfig alertmanagertypes.PostableConfig) error {
	cfg, err := ss.store.GetConfig(ctx, orgID)
	if err != nil {
		return err
	}

	err = cfg.MergeWithPostableConfig(postableConfig)
	if err != nil {
		return err
	}

	if err := ss.store.SetConfig(ctx, orgID, cfg); err != nil {
		return err
	}

	return nil
}

func (ss *Servers) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	server, ok := ss.servers[orgID]
	if !ok {
		return errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerNotFound, "alertmanager not found for orgID %q", orgID)
	}

	return server.TestReceiver(ctx, receiver)
}

func (ss *Servers) CreateChannel(ctx context.Context, orgID string, channel *alertmanagertypes.Channel) error {
	receiver, err := alertmanagertypes.NewReceiverFromChannel(channel)
	if err != nil {
		return err
	}

	return ss.SetConfig(ctx, orgID, alertmanagertypes.PostableConfig{
		Action:   alertmanagertypes.PostableConfigActionCreate,
		Receiver: receiver,
	})
}

func (ss *Servers) GetChannel(ctx context.Context, orgID string, id uint64) (*alertmanagertypes.Channel, error) {
	return ss.store.GetChannel(ctx, orgID, id)
}

func (ss *Servers) DelChannel(ctx context.Context, orgID string, id uint64) error {
	channel, err := ss.store.GetChannel(ctx, orgID, id)
	if err != nil {
		return err
	}

	receiver, err := alertmanagertypes.NewReceiverFromChannel(channel)
	if err != nil {
		return err
	}

	return ss.SetConfig(ctx, orgID, alertmanagertypes.PostableConfig{
		Action:   alertmanagertypes.PostableConfigActionDelete,
		Receiver: receiver,
	})
}

func (ss *Servers) ListChannels(ctx context.Context, orgID string) (alertmanagertypes.Channels, error) {
	return ss.store.ListChannels(ctx, orgID)
}

func (ss *Servers) UpdateChannel(ctx context.Context, orgID string, id uint64, data string) error {
	existingChannel, err := ss.store.GetChannel(ctx, orgID, id)
	if err != nil {
		return err
	}

	existingChannel.Data = data
	existingChannel.UpdatedAt = time.Now()

	receiver, err := alertmanagertypes.NewReceiverFromChannel(existingChannel)
	if err != nil {
		return err
	}

	return ss.SetConfig(ctx, orgID, alertmanagertypes.PostableConfig{
		Action:   alertmanagertypes.PostableConfigActionUpdate,
		Receiver: receiver,
	})
}
