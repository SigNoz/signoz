package model

import (
	"reflect"
	"testing"

	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

func TestDropRuleToExpr(t *testing.T) {
	r1 := IngestionRule{
		Id:          "1",
		Source:      IngestionSourceMetrics,
		RuleType:    IngestionRuleTypeDrop,
		RuleSubType: IngestionRuleSubTypeAO,
		Config: &IngestionRuleConfig{
			DropConfig: DropConfig{
				FilterSet: basemodel.FilterSet{
					Operator: "AND",
					Items: []basemodel.FilterItem{
						{
							Key:      "name",
							KeyType:  "metric_name",
							Operator: "==",
							Value:    "signoz_calls_total",
						},
						{
							Key:      "http_status_code",
							KeyType:  "label",
							Operator: "==",
							Value:    "301",
						},
						{
							Key:      "service.name",
							KeyType:  "resource_attribute",
							Operator: "==",
							Value:    "my_service_name",
						},
					},
				},
			},
		},
	}

	r2 := IngestionRule{
		Id:          "2",
		Source:      IngestionSourceMetrics,
		RuleType:    IngestionRuleTypeDrop,
		RuleSubType: IngestionRuleSubTypeAO,
		Config: &IngestionRuleConfig{
			DropConfig: DropConfig{
				FilterSet: basemodel.FilterSet{
					Operator: "AND",
					Items: []basemodel.FilterItem{
						{
							Key:      "name",
							KeyType:  "metric_name",
							Operator: "==",
							Value:    "signoz_calls_total",
						},
						{
							Key:      "http_status_code",
							KeyType:  "label",
							Operator: "==",
							Value:    "401",
						}},
				},
			},
		},
	}
	expr, err := PrepareDropExpressions([]IngestionRule{r1, r2})
	if err != nil {
		t.Fail()
	}

	expectedExpr := []string{
		"name == \"signoz_calls_total\" AND attributes[\"http_status_code\"] == \"301\" AND resource.attributes[\"service.name\"] == \"my_service_name\"",
		"name == \"signoz_calls_total\" AND attributes[\"http_status_code\"] == \"401\"",
	}
	if !reflect.DeepEqual(expr, expectedExpr) {
		t.Fail()
	}

}
