package api

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestMergeFeatureSets(t *testing.T) {
	tests := []struct {
		name             string
		zeusFeatures     []*licensetypes.Feature
		internalFeatures []*licensetypes.Feature
		expected         []*licensetypes.Feature
	}{
		{
			name:             "empty zeusFeatures and internalFeatures",
			zeusFeatures:     []*licensetypes.Feature{},
			internalFeatures: []*licensetypes.Feature{},
			expected:         []*licensetypes.Feature{},
		},
		{
			name: "non-empty zeusFeatures and empty internalFeatures",
			zeusFeatures: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: false},
			},
			internalFeatures: []*licensetypes.Feature{},
			expected: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: false},
			},
		},
		{
			name:         "empty zeusFeatures and non-empty internalFeatures",
			zeusFeatures: []*licensetypes.Feature{},
			internalFeatures: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: false},
			},
			expected: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: false},
			},
		},
		{
			name: "non-empty zeusFeatures and non-empty internalFeatures with no conflicts",
			zeusFeatures: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature3"), Active: false},
			},
			internalFeatures: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature2"), Active: true},
				{Name: valuer.NewString("Feature4"), Active: false},
			},
			expected: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: true},
				{Name: valuer.NewString("Feature3"), Active: false},
				{Name: valuer.NewString("Feature4"), Active: false},
			},
		},
		{
			name: "non-empty zeusFeatures and non-empty internalFeatures with conflicts",
			zeusFeatures: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: false},
			},
			internalFeatures: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: false},
				{Name: valuer.NewString("Feature3"), Active: true},
			},
			expected: []*licensetypes.Feature{
				{Name: valuer.NewString("Feature1"), Active: true},
				{Name: valuer.NewString("Feature2"), Active: false},
				{Name: valuer.NewString("Feature3"), Active: true},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			actual := MergeFeatureSets(test.zeusFeatures, test.internalFeatures)
			assert.ElementsMatch(t, test.expected, actual)
		})
	}
}
