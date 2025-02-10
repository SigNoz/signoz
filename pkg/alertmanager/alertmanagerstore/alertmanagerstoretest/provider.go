package alertmanagerstoretest

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

var _ alertmanagerstore.Store = (*Provider)(nil)

type Provider struct {
	States  map[string]map[alertmanagertypes.StateName][]byte
	Configs map[string]string
	OrgIDs  []string
}

func New(ctx context.Context, settings factory.ProviderSettings, config alertmanagerstore.Config, orgIDs []string) (*Provider, error) {
	states := make(map[string]map[alertmanagertypes.StateName][]byte)
	for _, orgID := range orgIDs {
		states[orgID] = make(map[alertmanagertypes.StateName][]byte)
		states[orgID][alertmanagertypes.SilenceStateName] = []byte{}
		states[orgID][alertmanagertypes.NFLogStateName] = []byte{}
	}

	return &Provider{
		States:  states,
		Configs: make(map[string]string),
		OrgIDs:  orgIDs,
	}, nil
}

func (provider *Provider) GetState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName) (string, error) {
	if _, ok := provider.States[orgID][stateName]; !ok {
		return "", errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerStateNotFound, "cannot find state %q for org %q", stateName, orgID)
	}

	return string(provider.States[orgID][stateName]), nil
}

func (provider *Provider) SetState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName, state alertmanagertypes.State) (int64, error) {
	var err error
	provider.States[orgID][stateName], err = state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	return int64(len(provider.States[orgID][stateName])), nil
}

func (provider *Provider) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	if _, ok := provider.Configs[orgID]; !ok {
		return nil, errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerConfigNotFound, "cannot find config for org %s", orgID)
	}

	return alertmanagertypes.NewConfigFromString(provider.Configs[orgID], orgID)
}

func (provider *Provider) SetConfig(ctx context.Context, orgID string, config *alertmanagertypes.Config) error {
	provider.Configs[orgID] = string(config.Raw())
	return nil
}

func (provider *Provider) DelConfig(ctx context.Context, orgID string) error {
	delete(provider.Configs, orgID)
	return nil
}

func (provider *Provider) ListOrgIDs(ctx context.Context) ([]string, error) {
	return provider.OrgIDs, nil
}

func (provider *Provider) ListChannels(ctx context.Context, orgID string) (alertmanagertypes.Channels, error) {
	if _, ok := provider.Configs[orgID]; !ok {
		return nil, errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerConfigNotFound, "cannot find config for org %s", orgID)
	}

	config, err := alertmanagertypes.NewConfigFromString(provider.Configs[orgID], orgID)
	if err != nil {
		return nil, err
	}

	return config.Channels(), nil
}

func (provider *Provider) GetChannel(ctx context.Context, orgID string, id uint64) (*alertmanagertypes.Channel, error) {
	return nil, nil
}
