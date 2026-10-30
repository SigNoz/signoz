package querier

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/configtest"
	"github.com/SigNoz/signoz/pkg/factory"
)

func TestSchemaMetadataStoreCacheTTLFromEnv(t *testing.T) {
	testCases := []struct {
		name string
		env  map[string]string
		want time.Duration
	}{
		{
			name: "Unset_CachesForProcessLifetime",
			want: 0,
		},
		{
			name: "Nanosecond_ExpiresImmediately",
			env:  map[string]string{"SIGNOZ_QUERIER_SCHEMA__METADATA__STORE__CACHE__TTL": "1ns"},
			want: time.Nanosecond,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			for key, value := range testCase.env {
				t.Setenv(key, value)
			}
			conf, err := config.New(context.Background(), configtest.NewResolverConfig(), []factory.ConfigFactory{NewConfigFactory()})
			require.NoError(t, err)

			actual := Config{}
			require.NoError(t, conf.Unmarshal("querier", &actual))
			assert.Equal(t, testCase.want, actual.SchemaMetadataStoreCacheTTL)
		})
	}
}
