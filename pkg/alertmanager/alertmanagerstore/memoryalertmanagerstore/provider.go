package memoryalertmanagerstore

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagertypes"
	"go.signoz.io/signoz/pkg/errors"
)

var _ alertmanager.Store = (*provider)(nil)

type provider struct {
	Silences []byte
	NFLog    []byte
	Config   string
}

func New() alertmanager.Store {
	return &provider{}
}

func (provider *provider) CreateSilences(ctx context.Context, state alertmanagertypes.State) (int64, error) {
	var err error
	provider.Silences, err = state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	return int64(len(provider.Silences)), nil
}

func (provider *provider) GetSilences(ctx context.Context) (string, error) {
	return string(provider.Silences), nil
}

func (provider *provider) CreateNFLog(ctx context.Context, state alertmanagertypes.State) (int64, error) {
	var err error
	provider.NFLog, err = state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	return int64(len(provider.NFLog)), nil
}

func (provider *provider) GetNFLog(ctx context.Context) (string, error) {
	return string(provider.NFLog), nil
}

func (provider *provider) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	if provider.Config == "" {
		return nil, errors.Newf(errors.TypeNotFound, alertmanager.ErrCodeAlertmanagerConfigNotFound, "cannot find config for org %s", orgID)
	}

	return alertmanagertypes.NewConfigFromString(provider.Config)
}
