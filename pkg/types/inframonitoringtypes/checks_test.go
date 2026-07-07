package inframonitoringtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestPostableChecks_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     *PostableChecks
		wantErr bool
	}{
		{
			name:    "nil request",
			req:     nil,
			wantErr: true,
		},
		{
			name:    "empty type",
			req:     &PostableChecks{},
			wantErr: true,
		},
		{
			name:    "unknown type",
			req:     &PostableChecks{Type: CheckType{valuer.NewString("foo")}},
			wantErr: true,
		},
		{
			name:    "hosts",
			req:     &PostableChecks{Type: CheckTypeHosts},
			wantErr: false,
		},
		{
			name:    "processes",
			req:     &PostableChecks{Type: CheckTypeProcesses},
			wantErr: false,
		},
		{
			name:    "pods",
			req:     &PostableChecks{Type: CheckTypePods},
			wantErr: false,
		},
		{
			name:    "nodes",
			req:     &PostableChecks{Type: CheckTypeNodes},
			wantErr: false,
		},
		{
			name:    "deployments",
			req:     &PostableChecks{Type: CheckTypeDeployments},
			wantErr: false,
		},
		{
			name:    "daemonsets",
			req:     &PostableChecks{Type: CheckTypeDaemonsets},
			wantErr: false,
		},
		{
			name:    "statefulsets",
			req:     &PostableChecks{Type: CheckTypeStatefulsets},
			wantErr: false,
		},
		{
			name:    "jobs",
			req:     &PostableChecks{Type: CheckTypeJobs},
			wantErr: false,
		},
		{
			name:    "namespaces",
			req:     &PostableChecks{Type: CheckTypeNamespaces},
			wantErr: false,
		},
		{
			name:    "clusters",
			req:     &PostableChecks{Type: CheckTypeClusters},
			wantErr: false,
		},
		{
			name:    "volumes",
			req:     &PostableChecks{Type: CheckTypeVolumes},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				require.Error(t, err)
				require.True(t, errors.Ast(err, errors.TypeInvalidInput), "expected error to be of type InvalidInput")
			} else {
				require.NoError(t, err)
			}
		})
	}
}

// TestValidCheckTypes_MatchesEnum ensures the ValidCheckTypes slice
// stays in sync with the Enum() list — both must cover every CheckType value.
func TestValidCheckTypes_MatchesEnum(t *testing.T) {
	enum := CheckType{}.Enum()
	require.Equal(t, len(enum), len(ValidCheckTypes))
	for i, v := range enum {
		require.Equal(t, v, ValidCheckTypes[i])
	}
}
