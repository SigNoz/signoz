package api

import (
	"testing"

	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/assert"
)

func TestMergeFeatureSets(t *testing.T) {
	tests := []struct {
		name             string
		zeusFeatures     basemodel.FeatureSet
		internalFeatures basemodel.FeatureSet
		expected         basemodel.FeatureSet
	}{
		{
			name:             "empty zeusFeatures and internalFeatures",
			zeusFeatures:     basemodel.FeatureSet{},
			internalFeatures: basemodel.FeatureSet{},
			expected:         basemodel.FeatureSet{},
		},
		{
			name: "non-empty zeusFeatures and empty internalFeatures",
			zeusFeatures: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
			internalFeatures: basemodel.FeatureSet{},
			expected: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
		},
		{
			name:         "empty zeusFeatures and non-empty internalFeatures",
			zeusFeatures: basemodel.FeatureSet{},
			internalFeatures: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
			expected: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
		},
		{
			name: "non-empty zeusFeatures and non-empty internalFeatures with no conflicts",
			zeusFeatures: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature3", Active: false},
			},
			internalFeatures: basemodel.FeatureSet{
				{Name: "Feature2", Active: true},
				{Name: "Feature4", Active: false},
			},
			expected: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: true},
				{Name: "Feature3", Active: false},
				{Name: "Feature4", Active: false},
			},
		},
		{
			name: "non-empty zeusFeatures and non-empty internalFeatures with conflicts",
			zeusFeatures: basemodel.FeatureSet{
				{Name: "Feature1", Active: true},
				{Name: "Feature2", Active: false},
			},
			internalFeatures: basemodel.FeatureSet{
				{Name: "Feature1", Active: false},
				{Name: "Feature3", Active: true},
			},
			expected: basemodel.FeatureSet{
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
