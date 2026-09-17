package sqlmigration

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClearAxesSoftBounds(t *testing.T) {
	dashboard := func(axes string) string {
		return `{"spec":{"panels":{"p1":{"kind":"Panel","spec":{"plugin":{"kind":"signoz/TimeSeries","spec":{"axes":` + axes + `}}}}}}}`
	}

	axesOf := func(t *testing.T, data string) map[string]any {
		t.Helper()
		var decoded map[string]any
		require.NoError(t, json.Unmarshal([]byte(data), &decoded))
		axes, ok := dashboardPanelAxes(decoded["spec"].(map[string]any)["panels"].(map[string]any)["p1"])
		require.True(t, ok)
		return axes
	}

	t.Run("clears the 0/0 sentinel", func(t *testing.T) {
		cleared, changed, ok := clearAxesSoftBounds(dashboard(`{"softMin":0,"softMax":0,"isLogScale":true}`))
		require.True(t, ok)
		require.True(t, changed)

		axes := axesOf(t, cleared)
		assert.Nil(t, axes["softMin"])
		assert.Nil(t, axes["softMax"])
		assert.Equal(t, true, axes["isLogScale"], "unrelated axes fields survive")
	})

	t.Run("leaves any other pair alone", func(t *testing.T) {
		for name, axes := range map[string]string{
			"lone soft min": `{"softMin":0,"softMax":null}`,
			"lone soft max": `{"softMin":null,"softMax":0}`,
			"real bounds":   `{"softMin":0,"softMax":100}`,
			"already unset": `{"softMin":null,"softMax":null}`,
			"absent":        `{"isLogScale":false}`,
			"non-numeric":   `{"softMin":"0","softMax":"0"}`,
		} {
			t.Run(name, func(t *testing.T) {
				_, changed, ok := clearAxesSoftBounds(dashboard(axes))
				require.True(t, ok)
				assert.False(t, changed)
			})
		}
	})

	t.Run("skips panel kinds and v1 rows that have no axes", func(t *testing.T) {
		for name, data := range map[string]string{
			"no axes slice": `{"spec":{"panels":{"p1":{"spec":{"plugin":{"spec":{}}}}}}}`,
			"v1 dashboard":  `{"widgets":[{"softMin":0,"softMax":0}],"layout":[]}`,
			"no panels":     `{"spec":{"layouts":[]}}`,
		} {
			t.Run(name, func(t *testing.T) {
				_, changed, ok := clearAxesSoftBounds(data)
				require.True(t, ok)
				assert.False(t, changed)
			})
		}
	})

	t.Run("reports unparseable data", func(t *testing.T) {
		_, _, ok := clearAxesSoftBounds(`not json`)
		assert.False(t, ok)
	})
}
