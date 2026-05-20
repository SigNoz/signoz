package dashboardtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
		bogus := Source{s: valuer.NewString("hacker")}
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
		source      Source
		mutable     bool
		deletable   bool
		lockable    bool
		publishable bool
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
