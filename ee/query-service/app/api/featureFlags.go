package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/constants"
	pkgError "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
)

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, pkgError.Newf(pkgError.TypeInvalidInput, pkgError.CodeInvalidInput, "orgId is invalid"))
		return
	}

	featureSet, err := ah.Signoz.Licensing.GetFeatureFlags(r.Context(), orgID)
	if err != nil {
		ah.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	if constants.FetchFeatures == "true" {
		zap.L().Debug("fetching license")
		license, err := ah.Signoz.Licensing.GetActive(ctx, orgID)
		if err != nil {
			zap.L().Error("failed to fetch license", zap.Error(err))
		} else if license == nil {
			zap.L().Debug("no active license found")
		} else {
			licenseKey := license.Key

			zap.L().Debug("fetching zeus features")
			zeusFeatures, err := fetchZeusFeatures(constants.ZeusFeaturesURL, licenseKey)
			if err == nil {
				zap.L().Debug("fetched zeus features", zap.Any("features", zeusFeatures))
				// merge featureSet and zeusFeatures in featureSet with higher priority to zeusFeatures
				featureSet = MergeFeatureSets(zeusFeatures, featureSet)
			} else {
				zap.L().Error("failed to fetch zeus features", zap.Error(err))
			}
		}
	}

	if constants.IsPreferSpanMetrics {
		for idx, feature := range featureSet {
			if feature.Name == licensetypes.UseSpanMetrics {
				featureSet[idx].Active = true
			}
		}
	}

	if constants.IsDotMetricsEnabled {
		for idx, feature := range featureSet {
			if feature.Name == licensetypes.DotMetricsEnabled {
				featureSet[idx].Active = true
			}
		}
	}

	ah.Respond(w, featureSet)
}

// fetchZeusFeatures makes an HTTP GET request to the /zeusFeatures endpoint
// and returns the FeatureSet.
func fetchZeusFeatures(url, licenseKey string) ([]*licensetypes.Feature, error) {
	// Check if the URL is empty
	if url == "" {
		return nil, fmt.Errorf("url is empty")
	}

	// Check if the licenseKey is empty
	if licenseKey == "" {
		return nil, fmt.Errorf("licenseKey is empty")
	}

	// Creating an HTTP client with a timeout for better control
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	// Creating a new GET request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Setting the custom header
	req.Header.Set("X-Signoz-Cloud-Api-Key", licenseKey)

	// Making the GET request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make GET request: %w", err)
	}
	defer func() {
		if resp != nil {
			resp.Body.Close()
		}
	}()

	// Check for non-OK status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: %d %s", errors.New("received non-OK HTTP status code"), resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	// Reading and decoding the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var zeusResponse ZeusFeaturesResponse
	if err := json.Unmarshal(body, &zeusResponse); err != nil {
		return nil, fmt.Errorf("%w: %v", errors.New("failed to decode response body"), err)
	}

	if zeusResponse.Status != "success" {
		return nil, fmt.Errorf("%w: %s", errors.New("failed to fetch zeus features"), zeusResponse.Status)
	}

	return zeusResponse.Data, nil
}

type ZeusFeaturesResponse struct {
	Status string                  `json:"status"`
	Data   []*licensetypes.Feature `json:"data"`
}

// MergeFeatureSets merges two FeatureSet arrays with precedence to zeusFeatures.
func MergeFeatureSets(zeusFeatures, internalFeatures []*licensetypes.Feature) []*licensetypes.Feature {
	// Create a map to store the merged features
	featureMap := make(map[string]*licensetypes.Feature)

	// Add all features from the otherFeatures set to the map
	for _, feature := range internalFeatures {
		featureMap[feature.Name.StringValue()] = feature
	}

	// Add all features from the zeusFeatures set to the map
	// If a feature already exists (i.e., same name), the zeusFeature will overwrite it
	for _, feature := range zeusFeatures {
		featureMap[feature.Name.StringValue()] = feature
	}

	// Convert the map back to a FeatureSet slice
	var mergedFeatures []*licensetypes.Feature
	for _, feature := range featureMap {
		mergedFeatures = append(mergedFeatures, feature)
	}

	return mergedFeatures
}
