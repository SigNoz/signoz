package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/http/render"
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

type ApplyLicenseRequest struct {
	LicenseKey string `json:"key"`
}

func (ah *APIHandler) listLicensesV3(w http.ResponseWriter, r *http.Request) {
	ah.listLicensesV2(w, r)
}

func (ah *APIHandler) getActiveLicenseV3(w http.ResponseWriter, r *http.Request) {
	activeLicense, err := ah.LM().GetRepo().GetActiveLicenseV3(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
		return
	}

	// return 404 not found if there is no active license
	if activeLicense == nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no active license found")}, nil)
		return
	}

	// TODO deprecate this when we move away from key for stripe
	activeLicense.Data["key"] = activeLicense.Key
	render.Success(w, http.StatusOK, activeLicense.Data)
}

// this function is called by zeus when inserting licenses in the query-service
func (ah *APIHandler) applyLicenseV3(w http.ResponseWriter, r *http.Request) {
	var licenseKey ApplyLicenseRequest

	if err := json.NewDecoder(r.Body).Decode(&licenseKey); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	if licenseKey.LicenseKey == "" {
		RespondError(w, model.BadRequest(fmt.Errorf("license key is required")), nil)
		return
	}

	_, apiError := ah.LM().ActivateV3(r.Context(), licenseKey.LicenseKey)
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	render.Success(w, http.StatusAccepted, nil)
}

func (ah *APIHandler) refreshLicensesV3(w http.ResponseWriter, r *http.Request) {

	apiError := ah.LM().RefreshLicense(r.Context())
	if apiError != nil {
		RespondError(w, apiError, nil)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
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

func convertLicenseV3ToLicenseV2(licenses []*model.LicenseV3) []model.License {
	licensesV2 := []model.License{}
	for _, l := range licenses {
		planKeyFromPlanName, ok := model.MapOldPlanKeyToNewPlanName[l.PlanName]
		if !ok {
			planKeyFromPlanName = model.Basic
		}
		licenseV2 := model.License{
			Key:               l.Key,
			ActivationId:      "",
			PlanDetails:       "",
			FeatureSet:        l.Features,
			ValidationMessage: "",
			IsCurrent:         l.IsCurrent,
			LicensePlan: model.LicensePlan{
				PlanKey:    planKeyFromPlanName,
				ValidFrom:  l.ValidFrom,
				ValidUntil: l.ValidUntil,
				Status:     l.Status},
		}
		licensesV2 = append(licensesV2, licenseV2)
	}
	return licensesV2
}

func (ah *APIHandler) listLicensesV2(w http.ResponseWriter, r *http.Request) {
	licensesV3, apierr := ah.LM().GetLicensesV3(r.Context())
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	licenses := convertLicenseV3ToLicenseV2(licensesV3)

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
