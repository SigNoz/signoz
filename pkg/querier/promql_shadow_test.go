package querier

import (
	"math"
	"testing"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/stretchr/testify/assert"
)

func TestNormalizeShadowMatrix(t *testing.T) {
	matrix := promql.Matrix{
		{
			Metric: labels.FromStrings("__name__", "up", "fingerprint", "42", "empty", "", "job", "api"),
			Floats: []promql.FPoint{{T: 1000, F: 1}},
		},
		{
			Metric: labels.FromStrings("a", "1"),
			Floats: []promql.FPoint{{T: 1000, F: 2}},
		},
	}
	norm := normalizeShadowMatrix(matrix)
	// sorted by labels; fingerprint and empty-valued labels stripped
	assert.Equal(t, labels.FromStrings("__name__", "up", "job", "api"), norm[0].Metric)
	assert.Equal(t, labels.FromStrings("a", "1"), norm[1].Metric)
}

func TestDiffShadowMatrices(t *testing.T) {
	series := func(v float64) promql.Matrix {
		return promql.Matrix{{Metric: labels.FromStrings("a", "1"), Floats: []promql.FPoint{{T: 1000, F: v}}}}
	}

	assert.Empty(t, diffShadowMatrices(series(1.5), series(1.5)))
	// last-ULP differences from storage-order float accumulation are expected
	assert.Empty(t, diffShadowMatrices(series(0.08888888888888889), series(0.08888888888888888)))
	assert.Empty(t, diffShadowMatrices(series(math.NaN()), series(math.NaN())))

	assert.Contains(t, diffShadowMatrices(series(1.5), series(1.6)), "value")
	assert.Contains(t, diffShadowMatrices(series(1.5), promql.Matrix{}), "series count")
	assert.Contains(t, diffShadowMatrices(
		series(1.5),
		promql.Matrix{{Metric: labels.FromStrings("a", "2"), Floats: []promql.FPoint{{T: 1000, F: 1.5}}}},
	), "labels")
	assert.Contains(t, diffShadowMatrices(
		series(1.5),
		promql.Matrix{{Metric: labels.FromStrings("a", "1"), Floats: []promql.FPoint{{T: 2000, F: 1.5}}}},
	), "ts")
}

// One-sided NaN makes every float comparison false, and Inf-Inf arithmetic
// yields Inf > Inf == false; without explicit handling both divergences log
// as matched — a shadow comparator that cannot see them would green-light a
// broken rollout.
func TestDiffShadowMatrices_SpecialFloats(t *testing.T) {
	point := func(v float64) promql.Matrix {
		return promql.Matrix{{Metric: labels.FromStrings("a", "1"), Floats: []promql.FPoint{{T: 1000, F: v}}}}
	}

	assert.NotEmpty(t, diffShadowMatrices(point(math.NaN()), point(1.5)), "one-sided NaN must diff")
	assert.NotEmpty(t, diffShadowMatrices(point(1.5), point(math.NaN())), "one-sided NaN must diff either way")
	assert.NotEmpty(t, diffShadowMatrices(point(math.Inf(1)), point(1.5)), "Inf vs finite must diff")
	assert.NotEmpty(t, diffShadowMatrices(point(math.Inf(1)), point(math.Inf(-1))), "opposite infinities must diff")
	assert.Empty(t, diffShadowMatrices(point(math.Inf(1)), point(math.Inf(1))), "equal infinities match")
	assert.Empty(t, diffShadowMatrices(point(math.NaN()), point(math.NaN())), "both NaN match")
}
