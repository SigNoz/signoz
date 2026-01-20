package thirdpartyapi

import (
	"github.com/SigNoz/signoz/pkg/types/thirdpartyapitypes"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestFilterResponse(t *testing.T) {
	tests := []struct {
		name     string
		input    []*qbtypes.QueryRangeResponse
		expected []*qbtypes.QueryRangeResponse
	}{
		{
			name: "should filter out IP addresses from series labels",
			input: []*qbtypes.QueryRangeResponse{
				{
					Data: qbtypes.QueryData{
						Results: []any{
							&qbtypes.TimeSeriesData{
								Aggregations: []*qbtypes.AggregationBucket{
									{
										Series: []*qbtypes.TimeSeries{
											{
												Labels: []*qbtypes.Label{
													{
														Key:   telemetrytypes.TelemetryFieldKey{Name: "net.peer.name"},
														Value: "192.168.1.1",
													},
												},
											},
											{
												Labels: []*qbtypes.Label{
													{
														Key:   telemetrytypes.TelemetryFieldKey{Name: "net.peer.name"},
														Value: "example.com",
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
			expected: []*qbtypes.QueryRangeResponse{
				{
					Data: qbtypes.QueryData{
						Results: []any{
							&qbtypes.TimeSeriesData{
								Aggregations: []*qbtypes.AggregationBucket{
									{
										Series: []*qbtypes.TimeSeries{
											{
												Labels: []*qbtypes.Label{
													{
														Key:   telemetrytypes.TelemetryFieldKey{Name: "net.peer.name"},
														Value: "example.com",
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: "should filter out IP addresses from raw data",
			input: []*qbtypes.QueryRangeResponse{
				{
					Data: qbtypes.QueryData{
						Results: []any{
							&qbtypes.RawData{
								Rows: []*qbtypes.RawRow{
									{
										Data: map[string]any{
											"net.peer.name": "192.168.1.1",
										},
									},
									{
										Data: map[string]any{
											"net.peer.name": "example.com",
										},
									},
								},
							},
						},
					},
				},
			},
			expected: []*qbtypes.QueryRangeResponse{
				{
					Data: qbtypes.QueryData{
						Results: []any{
							&qbtypes.RawData{
								Rows: []*qbtypes.RawRow{
									{
										Data: map[string]any{
											"net.peer.name": "example.com",
										},
									},
								},
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

func TestList(t *testing.T) {
	tests := []struct {
		name    string
		input   *thirdpartyapitypes.ThirdPartyApiRequest
		wantErr bool
	}{
		{
			name: "basic domain list query",
			input: &thirdpartyapitypes.ThirdPartyApiRequest{
				Start: 1000,
				End:   2000,
			},
			wantErr: false,
		},
		{
			name: "with filters and group by",
			input: &thirdpartyapitypes.ThirdPartyApiRequest{
				Start: 1000,
				End:   2000,
				Filter: &qbtypes.Filter{
					Expression: "test = 'value'",
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "test",
						},
					},
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
			assert.Len(t, result.CompositeQuery.Queries, 7) // endpoints, lastseen, rps, error, total_span, p99, error_rate
			assert.Equal(t, "v5", result.SchemaVersion)
			assert.Equal(t, qbtypes.RequestTypeScalar, result.RequestType)
		})
	}
}

func TestBuildDomainInfo(t *testing.T) {
	tests := []struct {
		name    string
		input   *thirdpartyapitypes.ThirdPartyApiRequest
		wantErr bool
	}{
		{
			name: "basic domain info query",
			input: &thirdpartyapitypes.ThirdPartyApiRequest{
				Start: 1000,
				End:   2000,
			},
			wantErr: false,
		},
		{
			name: "with filters and group by",
			input: &thirdpartyapitypes.ThirdPartyApiRequest{
				Start: 1000,
				End:   2000,
				Filter: &qbtypes.Filter{
					Expression: "test = 'value'",
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "test",
						},
					},
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
			assert.Len(t, result.CompositeQuery.Queries, 4) // endpoints, p99, error_rate, lastseen
			assert.Equal(t, "v5", result.SchemaVersion)
			assert.Equal(t, qbtypes.RequestTypeScalar, result.RequestType)
		})
	}
}
