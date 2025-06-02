package api

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/stretchr/testify/assert"
)

func TestMergeFeatureSets(t *testing.T) {
	tests := []struct {
		name             string
		zeusFeatures     []*featuretypes.GettableFeature
		internalFeatures []*featuretypes.GettableFeature
		expected         []*featuretypes.GettableFeature
	}{
		{
			name:             "empty zeusFeatures and internalFeatures",
			zeusFeatures:     []*featuretypes.GettableFeature{},
			internalFeatures: []*featuretypes.GettableFeature{},
			expected:         []*featuretypes.GettableFeature{},
		},
		{
			name: "non-empty zeusFeatures and empty internalFeatures",
			zeusFeatures: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
			internalFeatures: []*featuretypes.GettableFeature{},
			expected: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
		},
		{
			name:         "empty zeusFeatures and non-empty internalFeatures",
			zeusFeatures: []*featuretypes.GettableFeature{},
			internalFeatures: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
			expected: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
		},
		{
			name: "non-empty zeusFeatures and non-empty internalFeatures with no conflicts",
			zeusFeatures: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature3", Active: false},
			},
			internalFeatures: []*featuretypes.GettableFeature{
				{Name: "Feature2", Active: true},
				{Name: "Feature4", Active: false},
			},
			expected: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: true},
				{Name: "Feature3", Active: false},
				{Name: "Feature4", Active: false},
			},
		},
		{
			name: "non-empty zeusFeatures and non-empty internalFeatures with conflicts",
			zeusFeatures: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
			internalFeatures: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: false},
				{Name: "Feature3", Active: true},
			},
			expected: []*featuretypes.GettableFeature{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
				{Name: "Feature3", Active: true},
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
