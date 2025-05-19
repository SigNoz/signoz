package signozio

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/ee/types/subscriptiontypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/tidwall/gjson"
)

func ValidateLicenseV3(ctx context.Context, licenseKey string, zeus zeus.Zeus) (*licensetypes.GettableLicense, error) {
	data, err := zeus.GetLicense(ctx, licenseKey)
	if err != nil {
		return nil, err
	}

	var m map[string]any
	if err = json.Unmarshal(data, &m); err != nil {
		return nil, err
	}

	license, err := licensetypes.NewGettableLicense(m)
	if err != nil {
		return nil, err
	}

	return license, nil
}

// SendUsage reports the usage of signoz to license server
func SendUsage(ctx context.Context, usage model.UsagePayload, zeus zeus.Zeus) error {
	body, err := json.Marshal(usage)
	if err != nil {
		return err
	}

	return zeus.PutMeters(ctx, usage.LicenseKey.String(), body)
}

func CheckoutSession(ctx context.Context, checkoutRequest *subscriptiontypes.CheckoutRequest, licenseKey string, zeus zeus.Zeus) (string, error) {
	body, err := json.Marshal(checkoutRequest)
	if err != nil {
		return "", err
	}

	response, err := zeus.GetCheckoutURL(ctx, licenseKey, body)
	if err != nil {
		return "", err
	}

	return gjson.GetBytes(response, "url").String(), nil
}

func PortalSession(ctx context.Context, portalRequest *subscriptiontypes.PortalRequest, licenseKey string, zeus zeus.Zeus) (string, error) {
	body, err := json.Marshal(portalRequest)
	if err != nil {
		return "", err
	}

	response, err := zeus.GetPortalURL(ctx, licenseKey, body)
	if err != nil {
		return "", err
	}

	return gjson.GetBytes(response, "url").String(), nil
}
