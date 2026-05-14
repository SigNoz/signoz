package inframonitoringtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestPostableOnboarding_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     *PostableOnboarding
		wantErr bool
	}{
		{
			name:    "nil request",
			req:     nil,
			wantErr: true,
		},
		{
			name:    "empty type",
			req:     &PostableOnboarding{},
			wantErr: true,
		},
		{
			name:    "unknown type",
			req:     &PostableOnboarding{Type: OnboardingType{valuer.NewString("foo")}},
			wantErr: true,
		},
		{
			name:    "hosts",
			req:     &PostableOnboarding{Type: OnboardingTypeHosts},
			wantErr: false,
		},
		{
			name:    "processes",
			req:     &PostableOnboarding{Type: OnboardingTypeProcesses},
			wantErr: false,
		},
		{
			name:    "pods",
			req:     &PostableOnboarding{Type: OnboardingTypePods},
			wantErr: false,
		},
		{
			name:    "nodes",
			req:     &PostableOnboarding{Type: OnboardingTypeNodes},
			wantErr: false,
		},
		{
			name:    "deployments",
			req:     &PostableOnboarding{Type: OnboardingTypeDeployments},
			wantErr: false,
		},
		{
			name:    "daemonsets",
			req:     &PostableOnboarding{Type: OnboardingTypeDaemonsets},
			wantErr: false,
		},
		{
			name:    "statefulsets",
			req:     &PostableOnboarding{Type: OnboardingTypeStatefulsets},
			wantErr: false,
		},
		{
			name:    "jobs",
			req:     &PostableOnboarding{Type: OnboardingTypeJobs},
			wantErr: false,
		},
		{
			name:    "namespaces",
			req:     &PostableOnboarding{Type: OnboardingTypeNamespaces},
			wantErr: false,
		},
		{
			name:    "clusters",
			req:     &PostableOnboarding{Type: OnboardingTypeClusters},
			wantErr: false,
		},
		{
			name:    "volumes",
			req:     &PostableOnboarding{Type: OnboardingTypeVolumes},
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

// TestValidOnboardingTypes_MatchesEnum ensures the ValidOnboardingTypes slice
// stays in sync with the Enum() list — both must cover every OnboardingType value.
func TestValidOnboardingTypes_MatchesEnum(t *testing.T) {
	enum := OnboardingType{}.Enum()
	require.Equal(t, len(enum), len(ValidOnboardingTypes))
	for i, v := range enum {
		require.Equal(t, v, ValidOnboardingTypes[i])
	}
}
