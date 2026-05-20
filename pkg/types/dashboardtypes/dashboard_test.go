package dashboardtypes

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func makeTestWidgets(ids ...string) []interface{} {
	widgets := []interface{}{}
	for _, id := range ids {
		widgets = append(widgets, map[string]interface{}{
			"id":    id,
			"query": map[string]interface{}{},
		})
	}
	return widgets
}

func TestSourceEnum(t *testing.T) {
	t.Run("valid sources round-trip through Value/Scan", func(t *testing.T) {
		for _, src := range []Source{SourceUser, SourceSystem, SourceIntegration} {
			val, err := src.Value()
			require.NoError(t, err)

			var got Source
			require.NoError(t, got.Scan(val))
			assert.Equal(t, src, got)
		}
	})

	t.Run("invalid source is rejected by Value", func(t *testing.T) {
		bogus := Source{valuer.NewString("hacker")}
		_, err := bogus.Value()
		assert.Error(t, err)
	})

	t.Run("Scan tolerates unknown strings, Value still rejects them", func(t *testing.T) {
		var got Source
		require.NoError(t, got.Scan("future_source"))
		assert.Equal(t, "future_source", got.StringValue())
		assert.False(t, got.IsValid())

		_, err := got.Value()
		assert.Error(t, err)
	})

	t.Run("NewSource validates input", func(t *testing.T) {
		s, err := NewSource("USER")
		require.NoError(t, err)
		assert.Equal(t, SourceUser, s)

		_, err = NewSource("nope")
		assert.Error(t, err)
	})
}

func TestErrIfNotMutable_BySource(t *testing.T) {
	cases := []struct {
		source       Source
		mutable      bool
		deletable    bool
		lockable     bool
		publishable  bool
	}{
		{SourceUser, true, true, true, true},
		{SourceSystem, true, false, false, false},
		{SourceIntegration, false, false, false, false},
	}

	for _, tc := range cases {
		t.Run(tc.source.StringValue(), func(t *testing.T) {
			d := &Dashboard{Source: tc.source}
			assert.Equal(t, tc.mutable, d.ErrIfNotMutable() == nil)
			assert.Equal(t, tc.deletable, d.ErrIfNotDeletable() == nil)
			assert.Equal(t, tc.lockable, d.ErrIfNotLockable() == nil)
			assert.Equal(t, tc.publishable, d.ErrIfNotPublishable() == nil)
		})
	}
}

func TestCanUpdate_MultipleDeletions_ByDiff(t *testing.T) {
	testCases := []struct {
		name    string
		diff    int
		updated []string
		wantErr bool
	}{
		{
			name:    "diff-0-allows-multi-delete",
			diff:    0,
			updated: []string{"a"}, // deleting 2 widgets (b, c)
			wantErr: false,
		},
		{
			name:    "diff-1-blocks-multi-delete",
			diff:    1,
			updated: []string{"a"}, // deleting 2 widgets (b, c) > diff(1)
			wantErr: true,
		},
		{
			name:    "diff-1-allows-single-delete",
			diff:    1,
			updated: []string{"a", "b"}, // deleting 1 widget (c) = diff(1)
			wantErr: false,
		},
		{
			name:    "diff-2-allows-two-deletions",
			diff:    2,
			updated: []string{"a"}, // deleting 2 widgets (b, c) = diff(2)
			wantErr: false,
		},
		{
			name:    "diff-1-blocks-three-deletions",
			diff:    1,
			updated: []string{}, // deleting all 3 widgets > diff(1)
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()

			orgID := valuer.GenerateUUID()
			initial := StorableDashboardData{
				"widgets": makeTestWidgets("a", "b", "c"),
			}
			d, err := NewDashboard(orgID, "tester", SourceUser, initial)
			assert.NoError(t, err)

			updated := StorableDashboardData{
				"widgets": makeTestWidgets(tc.updated...),
			}
			err = d.CanUpdate(ctx, updated, tc.diff)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
