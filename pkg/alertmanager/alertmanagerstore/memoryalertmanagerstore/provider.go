package memoryalertmanagerstore

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagertypes"
	"go.signoz.io/signoz/pkg/errors"
)

var _ alertmanager.Store = (*provider)(nil)

type provider struct {
	States  map[string]map[alertmanagertypes.StateName][]byte
	Configs map[string]string
	OrgIDs  []string
}

func New(orgIDs []string) alertmanager.Store {
	states := make(map[string]map[alertmanagertypes.StateName][]byte)
	for _, orgID := range orgIDs {
		states[orgID] = make(map[alertmanagertypes.StateName][]byte)
		states[orgID][alertmanagertypes.SilenceStateName] = []byte{}
		states[orgID][alertmanagertypes.NFLogStateName] = []byte{}
	}

	return &provider{
		States:  states,
		Configs: make(map[string]string),
		OrgIDs:  orgIDs,
	}
}

func (provider *provider) GetState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName) (string, error) {
	if _, ok := provider.States[orgID][stateName]; !ok {
		return "", errors.Newf(errors.TypeNotFound, alertmanager.ErrCodeAlertmanagerStateNotFound, "cannot find state %q for org %q", stateName, orgID)
	}

	return string(provider.States[orgID][stateName]), nil
}

func (provider *provider) SetState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName, state alertmanagertypes.State) (int64, error) {
	var err error
	provider.States[orgID][stateName], err = state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	return int64(len(provider.States[orgID][stateName])), nil
}

func (provider *provider) DelState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName) error {
	delete(provider.States[orgID], stateName)
	return nil
}

func (provider *provider) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	if _, ok := provider.Configs[orgID]; !ok {
		return nil, errors.Newf(errors.TypeNotFound, alertmanager.ErrCodeAlertmanagerConfigNotFound, "cannot find config for org %s", orgID)
	}

	return alertmanagertypes.NewConfigFromString(provider.Configs[orgID])
}

func (provider *provider) SetConfig(ctx context.Context, orgID string, config *alertmanagertypes.Config) error {
	provider.Configs[orgID] = string(config.Raw())
	return nil
}

func (provider *provider) DelConfig(ctx context.Context, orgID string) error {
	delete(provider.Configs, orgID)
	return nil
}

func (provider *provider) ListOrgIDs(ctx context.Context) ([]string, error) {
	return provider.OrgIDs, nil
}
