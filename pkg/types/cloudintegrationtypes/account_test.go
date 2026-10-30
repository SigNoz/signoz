package cloudintegrationtypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestNewAccountConfigFromPostable_Nil(t *testing.T) {
	tests := []struct {
		name     string
		provider CloudProviderType
	}{
		{
			name:     "AWS provider with nil config",
			provider: CloudProviderTypeAWS,
		},
		{
			name:     "Azure provider with nil config",
			provider: CloudProviderTypeAzure,
		},
		{
			name:     "GCP provider with nil config",
			provider: CloudProviderTypeGCP,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.NotPanics(t, func() {
				cfg, err := NewAccountConfigFromPostable(tt.provider, nil)
				assert.Nil(t, cfg)
				require.Error(t, err)
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
				assert.True(t, errors.Asc(err, ErrCodeInvalidInput))
				assert.Equal(t, "config cannot be nil", err.Error())
			})
		})
	}
}

func TestNewAccountConfigFromUpdatable_Nil(t *testing.T) {
	tests := []struct {
		name     string
		provider CloudProviderType
		config   *UpdatableAccount
	}{
		{
			name:     "AWS provider with nil UpdatableAccount",
			provider: CloudProviderTypeAWS,
			config:   nil,
		},
		{
			name:     "AWS provider with nil Config field",
			provider: CloudProviderTypeAWS,
			config:   &UpdatableAccount{Config: nil},
		},
		{
			name:     "Azure provider with nil UpdatableAccount",
			provider: CloudProviderTypeAzure,
			config:   nil,
		},
		{
			name:     "Azure provider with nil Config field",
			provider: CloudProviderTypeAzure,
			config:   &UpdatableAccount{Config: nil},
		},
		{
			name:     "GCP provider with nil UpdatableAccount",
			provider: CloudProviderTypeGCP,
			config:   nil,
		},
		{
			name:     "GCP provider with nil Config field",
			provider: CloudProviderTypeGCP,
			config:   &UpdatableAccount{Config: nil},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.NotPanics(t, func() {
				cfg, err := NewAccountConfigFromUpdatable(tt.provider, tt.config)
				assert.Nil(t, cfg)
				require.Error(t, err)
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
				assert.True(t, errors.Asc(err, ErrCodeInvalidInput))
				assert.Equal(t, "config cannot be nil", err.Error())
			})
		})
	}
}
