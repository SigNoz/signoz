package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.signoz.io/signoz/ee/query-service/constants"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func (ah *APIHandler) getFeatureFlags(w http.ResponseWriter, r *http.Request) {
	featureSet, err := ah.FF().GetFeatureFlags()
	if err != nil {
		ah.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	if constants.FetchFeatures == "true" {
		zeusFeatures, err := fetchZeusFeatures(constants.ZeusFeaturesURL)
		if err == nil {
			// merge featureSet and zeusFeatures in featureSet with higher priority to zeusFeatures
			featureSet = MergeFeatureSets(zeusFeatures, featureSet)
		} else {
			zap.L().Error("failed to fetch zeus features", zap.Error(err))
		}
	}
	if ah.opts.PreferSpanMetrics {
		for idx := range featureSet {
			feature := &featureSet[idx]
			if feature.Name == basemodel.UseSpanMetrics {
				featureSet[idx].Active = true
			}
		}
	}
	ah.Respond(w, featureSet)
}

// fetchZeusFeatures makes an HTTP GET request to the /zeusFeatures endpoint
// and returns the FeatureSet.
func fetchZeusFeatures(url string) (basemodel.FeatureSet, error) {
	// Creating an HTTP client with a timeout for better control
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Making the GET request
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make GET request: %w", err)
	}
	defer resp.Body.Close()

	// Check for non-OK status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: %d %s", errors.New("received non-OK HTTP status code"), resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	// Reading and decoding the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var features basemodel.FeatureSet
	if err := json.Unmarshal(body, &features); err != nil {
		return nil, fmt.Errorf("%w: %v", errors.New("failed to decode response body"), err)
	}

	return features, nil
}

// MergeFeatureSets merges two FeatureSet arrays with precedence to zeusFeatures.
func MergeFeatureSets(zeusFeatures, internalFeatures basemodel.FeatureSet) basemodel.FeatureSet {
	// Create a map to store the merged features
	featureMap := make(map[string]basemodel.Feature)

	// Add all features from the otherFeatures set to the map
	for _, feature := range internalFeatures {
		featureMap[feature.Name] = feature
	}

	// Add all features from the zeusFeatures set to the map
	// If a feature already exists (i.e., same name), the zeusFeature will overwrite it
	for _, feature := range zeusFeatures {
		featureMap[feature.Name] = feature
	}

	// Convert the map back to a FeatureSet slice
	var mergedFeatures basemodel.FeatureSet
	for _, feature := range featureMap {
		mergedFeatures = append(mergedFeatures, feature)
	}

	return mergedFeatures
}
