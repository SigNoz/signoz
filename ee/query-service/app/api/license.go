package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"
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

func (ah *APIHandler) listLicenses(w http.ResponseWriter, r *http.Request) {
	licenses, apiError := ah.LM().GetLicenses(context.Background())
	if apiError != nil {
		RespondError(w, apiError, nil)
	}
	ah.Respond(w, licenses)
}

func (ah *APIHandler) applyLicense(w http.ResponseWriter, r *http.Request) {
	var l model.License

	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	if l.Key == "" {
		RespondError(w, model.BadRequest(fmt.Errorf("license key is required")), nil)
		return
	}
	license, apiError := ah.LM().Activate(r.Context(), l.Key)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	ah.Respond(w, license)
}

func (ah *APIHandler) checkout(w http.ResponseWriter, r *http.Request) {

	type checkoutResponse struct {
		Status string `json:"status"`
		Data   struct {
			RedirectURL string `json:"redirectURL"`
		} `json:"data"`
	}

	hClient := &http.Client{}
	req, err := http.NewRequest("POST", constants.LicenseSignozIo+"/checkout", r.Body)
	if err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}
	req.Header.Add("X-SigNoz-SecretKey", constants.LicenseAPIKey)
	licenseResp, err := hClient.Do(req)
	if err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}

	// decode response body
	var resp checkoutResponse
	if err := json.NewDecoder(licenseResp.Body).Decode(&resp); err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}

	ah.Respond(w, resp.Data)
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

func (ah *APIHandler) listLicensesV2(w http.ResponseWriter, r *http.Request) {

	licenses, apiError := ah.LM().GetLicenses(context.Background())
	if apiError != nil {
		RespondError(w, apiError, nil)
	}

	resp := model.Licenses{
		TrialStart:                   -1,
		TrialEnd:                     -1,
		OnTrial:                      false,
		WorkSpaceBlock:               false,
		TrialConvertedToSubscription: false,
		GracePeriodEnd:               -1,
		Licenses:                     licenses,
	}

	var currentActiveLicenseKey string

	for _, license := range licenses {
		if license.IsCurrent {
			currentActiveLicenseKey = license.Key
		}
	}

	// For the case when no license is applied i.e community edition
	// There will be no trial details or license details
	if currentActiveLicenseKey == "" {
		ah.Respond(w, resp)
		return
	}

	// Fetch trial details
	hClient := &http.Client{}
	url := fmt.Sprintf("%s/trial?licenseKey=%s", constants.LicenseSignozIo, currentActiveLicenseKey)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		zap.L().Error("Error while creating request for trial details", zap.Error(err))
		// If there is an error in fetching trial details, we will still return the license details
		// to avoid blocking the UI
		ah.Respond(w, resp)
		return
	}
	req.Header.Add("X-SigNoz-SecretKey", constants.LicenseAPIKey)
	trialResp, err := hClient.Do(req)
	if err != nil {
		zap.L().Error("Error while fetching trial details", zap.Error(err))
		// If there is an error in fetching trial details, we will still return the license details
		// to avoid incorrectly blocking the UI
		ah.Respond(w, resp)
		return
	}
	defer trialResp.Body.Close()

	trialRespBody, err := io.ReadAll(trialResp.Body)

	if err != nil || trialResp.StatusCode != http.StatusOK {
		zap.L().Error("Error while fetching trial details", zap.Error(err))
		// If there is an error in fetching trial details, we will still return the license details
		// to avoid incorrectly blocking the UI
		ah.Respond(w, resp)
		return
	}

	// decode response body
	var trialRespData model.SubscriptionServerResp

	if err := json.Unmarshal(trialRespBody, &trialRespData); err != nil {
		zap.L().Error("Error while decoding trial details", zap.Error(err))
		// If there is an error in fetching trial details, we will still return the license details
		// to avoid incorrectly blocking the UI
		ah.Respond(w, resp)
		return
	}

	resp.TrialStart = trialRespData.Data.TrialStart
	resp.TrialEnd = trialRespData.Data.TrialEnd
	resp.OnTrial = trialRespData.Data.OnTrial
	resp.WorkSpaceBlock = trialRespData.Data.WorkSpaceBlock
	resp.TrialConvertedToSubscription = trialRespData.Data.TrialConvertedToSubscription
	resp.GracePeriodEnd = trialRespData.Data.GracePeriodEnd

	ah.Respond(w, resp)
}

func (ah *APIHandler) portalSession(w http.ResponseWriter, r *http.Request) {

	type checkoutResponse struct {
		Status string `json:"status"`
		Data   struct {
			RedirectURL string `json:"redirectURL"`
		} `json:"data"`
	}

	hClient := &http.Client{}
	req, err := http.NewRequest("POST", constants.LicenseSignozIo+"/portal", r.Body)
	if err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}
	req.Header.Add("X-SigNoz-SecretKey", constants.LicenseAPIKey)
	licenseResp, err := hClient.Do(req)
	if err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}

	// decode response body
	var resp checkoutResponse
	if err := json.NewDecoder(licenseResp.Body).Decode(&resp); err != nil {
		RespondError(w, model.InternalError(err), nil)
		return
	}

	ah.Respond(w, resp.Data)
}
