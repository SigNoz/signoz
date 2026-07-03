package model

import (
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

func TestQueryRuleStateHistory_Validate(t *testing.T) {
	tests := []struct {
		name    string
		req     QueryRuleStateHistory
		wantErr bool
	}{
		{
			name: "Valid request with normal values",
			req: QueryRuleStateHistory{
				Start: 123456789,
				End:   987654321,
				Order: "asc",
			},
			wantErr: false,
		},
		{
			name: "Missing start/end",
			req: QueryRuleStateHistory{
				Order: "asc",
			},
			wantErr: true,
		},
		{
			name: "Invalid order",
			req: QueryRuleStateHistory{
				Start: 123456789,
				End:   987654321,
				Order: "invalid",
			},
			wantErr: true,
		},
		{
			name: "Valid state",
			req: QueryRuleStateHistory{
				Start: 123456789,
				End:   987654321,
				Order: "desc",
				State: "firing",
			},
			wantErr: false,
		},
		{
			name: "Invalid/malicious state",
			req: QueryRuleStateHistory{
				Start: 123456789,
				End:   987654321,
				Order: "desc",
				State: "firing' OR '1'='1",
			},
			wantErr: true,
		},
		{
			name: "Valid filter key",
			req: QueryRuleStateHistory{
				Start: 123456789,
				End:   987654321,
				Order: "desc",
				Filters: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key: "service_name",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "Invalid/malicious filter key",
			req: QueryRuleStateHistory{
				Start: 123456789,
				End:   987654321,
				Order: "desc",
				Filters: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key: "service_name') OR 1=1 --",
							},
						},
					},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("QueryRuleStateHistory.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
