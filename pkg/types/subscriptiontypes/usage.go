package subscriptiontypes

import "encoding/json"

type GettableSubscriptionUsage struct {
	BillingPeriodStart int64                    `json:"billingPeriodStart"`
	BillingPeriodEnd   int64                    `json:"billingPeriodEnd"`
	Details            SubscriptionUsageDetails `json:"details"`
	Discount           float64                  `json:"discount"`
	SubscriptionStatus string                   `json:"subscriptionStatus"`
}

type SubscriptionUsageDetails struct {
	Total     float64                      `json:"total"`
	Breakdown []SubscriptionUsageBreakdown `json:"breakdown"`
	BaseFee   float64                      `json:"baseFee"`
	BillTotal float64                      `json:"billTotal"`
}

type SubscriptionUsageBreakdown struct {
	Type             string                            `json:"type"`
	Unit             string                            `json:"unit"`
	Tiers            []SubscriptionUsageTier           `json:"tiers"`
	DayWiseBreakdown SubscriptionUsageDayWiseBreakdown `json:"dayWiseBreakdown"`
}

type SubscriptionUsageTier struct {
	UnitPrice float64 `json:"unitPrice"`
	Quantity  float64 `json:"quantity"`
	TierStart int64   `json:"tierStart"`
	TierEnd   int64   `json:"tierEnd"`
	TierCost  float64 `json:"tierCost"`
}

type SubscriptionUsageDayWiseBreakdown struct {
	Type      string                         `json:"type"`
	Breakdown []SubscriptionUsageDayWiseData `json:"breakdown"`
}

type SubscriptionUsageDayWiseData struct {
	Timestamp int64   `json:"timestamp"`
	Count     float64 `json:"count"`
	Size      float64 `json:"size"`
	UnitPrice float64 `json:"unitPrice"`
	Quantity  float64 `json:"quantity"`
	Total     float64 `json:"total"`
}

func NewGettableSubscriptionUsage(data []byte) (*GettableSubscriptionUsage, error) {
	usage := new(GettableSubscriptionUsage)
	if err := json.Unmarshal(data, usage); err != nil {
		return nil, err
	}

	return usage, nil
}
