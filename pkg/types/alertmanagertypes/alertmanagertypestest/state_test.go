package alertmanagertypestest

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/require"
)

func TestStateStoreComponentSnapshots(t *testing.T) {
	for _, first := range []alertmanagertypes.StateName{alertmanagertypes.SilenceStateName, alertmanagertypes.NFLogStateName} {
		t.Run(first.String(), func(t *testing.T) {
			ctx := context.Background()
			store := NewStateStore()
			input := alertmanagertypes.NewStoreableState("org")
			input.Silences, input.NFLog = "silences", "nflog"
			expected := *input
			second := alertmanagertypes.SilenceStateName
			if first == alertmanagertypes.SilenceStateName {
				expected.NFLog = ""
				second = alertmanagertypes.NFLogStateName
			} else {
				expected.Silences = ""
			}
			require.NoError(t, store.Set(ctx, input, first))
			*input = *alertmanagertypes.NewStoreableState("mutated")
			stored, err := store.Get(ctx, "org")
			require.NoError(t, err)
			require.Equal(t, expected, *stored)
			fresh, err := store.Get(ctx, "org")
			require.NoError(t, err)
			require.NotSame(t, stored, fresh)
			*stored = *input
			require.Equal(t, expected, *fresh)
			stored, err = store.Get(ctx, "org")
			require.NoError(t, err)
			require.Equal(t, expected, *stored)
			update := alertmanagertypes.NewStoreableState("org")
			update.Silences, update.NFLog = "updated-silences", "updated-nflog"
			require.NoError(t, store.Set(ctx, update, second))
			if second == alertmanagertypes.SilenceStateName {
				expected.Silences = update.Silences
			} else {
				expected.NFLog = update.NFLog
			}
			expected.UpdatedAt = update.UpdatedAt
			*update = *input
			stored, err = store.Get(ctx, "org")
			require.NoError(t, err)
			require.Equal(t, expected, *stored)

			clear := alertmanagertypes.NewStoreableState("org")
			require.NoError(t, store.Set(ctx, clear, first))
			if first == alertmanagertypes.SilenceStateName {
				expected.Silences = ""
			} else {
				expected.NFLog = ""
			}
			expected.UpdatedAt = clear.UpdatedAt
			stored, err = store.Get(ctx, "org")
			require.NoError(t, err)
			require.Equal(t, expected, *stored)

			invalid := alertmanagertypes.NewStoreableState("org")
			invalid.Silences, invalid.NFLog = "invalid", "invalid"
			require.Error(t, store.Set(ctx, invalid, alertmanagertypes.StateName{}))
			stored, err = store.Get(ctx, "org")
			require.NoError(t, err)
			require.Equal(t, expected, *stored)
			invalid.OrgID = "missing"
			require.Error(t, store.Set(ctx, invalid, alertmanagertypes.StateName{}))
			stored, err = store.Get(ctx, "missing")
			require.Error(t, err)
			require.Nil(t, stored)
		})
	}
}
