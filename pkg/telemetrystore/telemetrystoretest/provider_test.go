package telemetrystoretest

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			name:    "should create new provider successfully",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, err := New()
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, provider)
				return
			}

			assert.NoError(t, err)
			assert.NotNil(t, provider)
			assert.NotNil(t, provider.Mock())
			assert.NotNil(t, provider.ClickHouseDB())
		})
	}
}
