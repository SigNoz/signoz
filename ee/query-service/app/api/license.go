package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/SigNoz/signoz/ee/query-service/constants"
	"github.com/SigNoz/signoz/ee/query-service/model"
)

type DayWiseBreakdown struct {
	Type      string        `json:"type"`
	Breakdown []DayWiseData `json:"breakdown"`
}

type DayWiseData struct {
	Timestamp int64   `json:"timestamp"`
	Count     float64 `json:"count"`
	Size      float64 `json:"size"`
	UnitPrice float64 `json:"unitPrice"`
	Quantity  float64 `json:"quantity"`
	Total     float64 `json:"total"`
}

type tierBreakdown struct {
	UnitPrice float64 `json:"unitPrice"`
	Quantity  float64 `json:"quantity"`
	TierStart int64   `json:"tierStart"`
	TierEnd   int64   `json:"tierEnd"`
	TierCost  float64 `json:"tierCost"`
}

type usageResponse struct {
	Type             string           `json:"type"`
	Unit             string           `json:"unit"`
	Tiers            []tierBreakdown  `json:"tiers"`
	DayWiseBreakdown DayWiseBreakdown `json:"dayWiseBreakdown"`
}

type details struct {
	Total     float64         `json:"total"`
	Breakdown []usageResponse `json:"breakdown"`
	BaseFee   float64         `json:"baseFee"`
	BillTotal float64         `json:"billTotal"`
}

type billingDetails struct {
	Status string `json:"status"`
	Data   struct {
		BillingPeriodStart int64   `json:"billingPeriodStart"`
		BillingPeriodEnd   int64   `json:"billingPeriodEnd"`
		Details            details `json:"details"`
		Discount           float64 `json:"discount"`
		SubscriptionStatus string  `json:"subscriptionStatus"`
	} `json:"data"`
}

func (ah *APIHandler) getBilling(w http.ResponseWriter, r *http.Request) {
	licenseKey := r.URL.Query().Get("licenseKey")

	if licenseKey == "" {
		RespondError(w, model.BadRequest(fmt.Errorf("license key is required")), nil)
		return
	}

	billingURL := fmt.Sprintf("%s/usage?licenseKey=%s", constants.LicenseSignozIo, licenseKey)

	hClient := &http.Client{}
	req, err := http.NewRequest("GET", billingURL, nil)
	if err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}
	req.Header.Add("X-SigNoz-SecretKey", constants.LicenseAPIKey)
	billingResp, err := hClient.Do(req)
	if err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}

	// decode response body
	var billingResponse billingDetails
	if err := json.NewDecoder(billingResp.Body).Decode(&billingResponse); err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}

	// TODO(srikanthccv):Fetch the current day usage and add it to the response
	ah.Respond(w, billingResponse.Data)
}
