package signoz

import (
	"context"
	"fmt"
)

func (c *Client) Scalar(ctx context.Context, expression string, startMs, endMs uint64) (float64, error) {
	request := map[string]any{
		"schemaVersion": "v5",
		"start":         startMs,
		"end":           endMs,
		"requestType":   "scalar",
		"noCache":       true,
		"compositeQuery": map[string]any{
			"queries": []any{
				map[string]any{
					"type": "promql",
					"spec": map[string]any{
						"name":  "__result_0",
						"query": expression,
					},
				},
			},
		},
	}
	var response queryRangeResponse
	if err := c.QueryRange(ctx, request, &response); err != nil {
		return 0, err
	}
	return response.scalar()
}

type queryRangeResponse struct {
	Data struct {
		Data struct {
			Results []struct {
				Aggregations []struct {
					Series []struct {
						Values []struct {
							Value   float64 `json:"value"`
							Partial bool    `json:"partial"`
						} `json:"values"`
					} `json:"series"`
				} `json:"aggregations"`
			} `json:"results"`
		} `json:"data"`
	} `json:"data"`
}

func (r queryRangeResponse) scalar() (float64, error) {
	if len(r.Data.Data.Results) == 0 {
		return 0, fmt.Errorf("no results in SigNoz query response")
	}
	for _, result := range r.Data.Data.Results {
		for _, aggregation := range result.Aggregations {
			for _, series := range aggregation.Series {
				for i := len(series.Values) - 1; i >= 0; i-- {
					if !series.Values[i].Partial {
						return series.Values[i].Value, nil
					}
				}
			}
		}
	}
	return 0, fmt.Errorf("only partial or empty values in SigNoz query response")
}
