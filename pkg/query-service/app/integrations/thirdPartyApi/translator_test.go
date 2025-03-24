package thirdPartyApi

import (
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/stretchr/testify/assert"
)

func TestFilterResponse(t *testing.T) {
	tests := []struct {
		name     string
		input    []*v3.Result
		expected []*v3.Result
	}{
		{
			name: "should filter out IP addresses from net.peer.name",
			input: []*v3.Result{
				{
					Table: &v3.Table{
						Rows: []*v3.TableRow{
							{
								Data: map[string]interface{}{
									"net.peer.name": "192.168.1.1",
								},
							},
							{
								Data: map[string]interface{}{
									"net.peer.name": "example.com",
								},
							},
						},
					},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Rows: []*v3.TableRow{
							{
								Data: map[string]interface{}{
									"net.peer.name": "example.com",
								},
							},
						},
					},
				},
			},
		},
		{
			name: "should handle nil data",
			input: []*v3.Result{
				{
					Table: &v3.Table{
						Rows: []*v3.TableRow{
							{
								Data: nil,
							},
						},
					},
				},
			},
			expected: []*v3.Result{
				{
					Table: &v3.Table{
						Rows: []*v3.TableRow{
							{
								Data: nil,
							},
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FilterResponse(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetFilterSet(t *testing.T) {
	tests := []struct {
		name            string
		existingFilters []v3.FilterItem
		apiFilters      v3.FilterSet
		expected        []v3.FilterItem
	}{
		{
			name: "should append new filters",
			existingFilters: []v3.FilterItem{
				{
					Key: v3.AttributeKey{Key: "existing"},
				},
			},
			apiFilters: v3.FilterSet{
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{Key: "new"},
					},
				},
			},
			expected: []v3.FilterItem{
				{
					Key: v3.AttributeKey{Key: "existing"},
				},
				{
					Key: v3.AttributeKey{Key: "new"},
				},
			},
		},
		{
			name:            "should handle empty api filters",
			existingFilters: []v3.FilterItem{{Key: v3.AttributeKey{Key: "existing"}}},
			apiFilters:      v3.FilterSet{},
			expected:        []v3.FilterItem{{Key: v3.AttributeKey{Key: "existing"}}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getFilterSet(tt.existingFilters, tt.apiFilters)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetGroupBy(t *testing.T) {
	tests := []struct {
		name          string
		existingGroup []v3.AttributeKey
		apiGroup      []v3.AttributeKey
		expected      []v3.AttributeKey
	}{
		{
			name: "should append new group by attributes",
			existingGroup: []v3.AttributeKey{
				{Key: "existing"},
			},
			apiGroup: []v3.AttributeKey{
				{Key: "new"},
			},
			expected: []v3.AttributeKey{
				{Key: "existing"},
				{Key: "new"},
			},
		},
		{
			name:          "should handle empty api group",
			existingGroup: []v3.AttributeKey{{Key: "existing"}},
			apiGroup:      []v3.AttributeKey{},
			expected:      []v3.AttributeKey{{Key: "existing"}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getGroupBy(tt.existingGroup, tt.apiGroup)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildDomainList(t *testing.T) {
	tests := []struct {
		name    string
		input   *ThirdPartyApis
		wantErr bool
	}{
		{
			name: "basic domain list query",
			input: &ThirdPartyApis{
				Start: 1000,
				End:   2000,
			},
			wantErr: false,
		},
		{
			name: "with filters and group by",
			input: &ThirdPartyApis{
				Start: 1000,
				End:   2000,
				Filters: v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{Key: "test"},
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{Key: "test"},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := BuildDomainList(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.input.Start, result.Start)
			assert.Equal(t, tt.input.End, result.End)
			assert.NotNil(t, result.CompositeQuery)
			assert.NotNil(t, result.CompositeQuery.BuilderQueries)
		})
	}
}

func TestBuildDomainInfo(t *testing.T) {
	tests := []struct {
		name    string
		input   *ThirdPartyApis
		wantErr bool
	}{
		{
			name: "basic domain info query",
			input: &ThirdPartyApis{
				Start: 1000,
				End:   2000,
			},
			wantErr: false,
		},
		{
			name: "with filters and group by",
			input: &ThirdPartyApis{
				Start: 1000,
				End:   2000,
				Filters: v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{Key: "test"},
						},
					},
				},
				GroupBy: []v3.AttributeKey{
					{Key: "test"},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := BuildDomainInfo(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.input.Start, result.Start)
			assert.Equal(t, tt.input.End, result.End)
			assert.NotNil(t, result.CompositeQuery)
			assert.NotNil(t, result.CompositeQuery.BuilderQueries)
		})
	}
}
