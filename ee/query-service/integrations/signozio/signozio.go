package signozio

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/pkg/errors"
	"go.uber.org/zap"

	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
)

var C *Client

const (
	POST             = "POST"
	APPLICATION_JSON = "application/json"
)

type Client struct {
	Prefix     string
	GatewayUrl string
}

func New() *Client {
	return &Client{
		Prefix:     constants.LicenseSignozIo,
		GatewayUrl: constants.ZeusURL,
	}
}

func init() {
	C = New()
}

// ActivateLicense sends key to license.signoz.io and gets activation data
func ActivateLicense(key, siteId string) (*ActivationResponse, *model.ApiError) {
	licenseReq := map[string]string{
		"key":    key,
		"siteId": siteId,
	}

	reqString, _ := json.Marshal(licenseReq)
	httpResponse, err := http.Post(C.Prefix+"/licenses/activate", APPLICATION_JSON, bytes.NewBuffer(reqString))

	if err != nil {
		zap.L().Error("failed to connect to license.signoz.io", zap.Error(err))
		return nil, model.BadRequest(fmt.Errorf("unable to connect with license.signoz.io, please check your network connection"))
	}

	httpBody, err := io.ReadAll(httpResponse.Body)
	if err != nil {
		zap.L().Error("failed to read activation response from license.signoz.io", zap.Error(err))
		return nil, model.BadRequest(fmt.Errorf("failed to read activation response from license.signoz.io"))
	}

	defer httpResponse.Body.Close()

	// read api request result
	result := ActivationResult{}
	err = json.Unmarshal(httpBody, &result)
	if err != nil {
		zap.L().Error("failed to marshal activation response from license.signoz.io", zap.Error(err))
		return nil, model.InternalError(errors.Wrap(err, "failed to marshal license activation response"))
	}

	switch httpResponse.StatusCode {
	case 200, 201:
		return result.Data, nil
	case 400, 401:
		return nil, model.BadRequest(fmt.Errorf(fmt.Sprintf("failed to activate: %s", result.Error)))
	default:
		return nil, model.InternalError(fmt.Errorf(fmt.Sprintf("failed to activate: %s", result.Error)))
	}

}

// ValidateLicense validates the license key
func ValidateLicense(activationId string) (*ActivationResponse, *model.ApiError) {
	validReq := map[string]string{
		"activationId": activationId,
	}

	reqString, _ := json.Marshal(validReq)
	response, err := http.Post(C.Prefix+"/licenses/validate", APPLICATION_JSON, bytes.NewBuffer(reqString))

	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "unable to connect with license.signoz.io, please check your network connection"))
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "failed to read validation response from license.signoz.io"))
	}

	defer response.Body.Close()

	switch response.StatusCode {
	case 200, 201:
		a := ActivationResult{}
		err = json.Unmarshal(body, &a)
		if err != nil {
			return nil, model.BadRequest(errors.Wrap(err, "failed to marshal license validation response"))
		}
		return a.Data, nil
	case 400, 401:
		return nil, model.BadRequest(errors.Wrap(fmt.Errorf(string(body)),
			"bad request error received from license.signoz.io"))
	default:
		return nil, model.InternalError(errors.Wrap(fmt.Errorf(string(body)),
			"internal error received from license.signoz.io"))
	}

}

func ValidateLicenseV3(licenseKey string) (*model.LicenseV3, *model.ApiError) {

	// Creating an HTTP client with a timeout for better control
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", C.GatewayUrl+"/v2/licenses/me", nil)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, fmt.Sprintf("failed to create request: %w", err)))
	}

	// Setting the custom header
	req.Header.Set("X-Signoz-Cloud-Api-Key", licenseKey)

	response, err := client.Do(req)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, fmt.Sprintf("failed to make post request: %w", err)))
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, fmt.Sprintf("failed to read validation response from %v", C.GatewayUrl)))
	}

	defer response.Body.Close()

	switch response.StatusCode {
	case 200:
		a := ValidateLicenseResponse{}
		err = json.Unmarshal(body, &a)
		if err != nil {
			return nil, model.BadRequest(errors.Wrap(err, "failed to marshal license validation response"))
		}

		license, err := model.NewLicenseV3(a.Data)
		if err != nil {
			return nil, model.BadRequest(errors.Wrap(err, "failed to generate new license v3"))
		}

		return license, nil
	case 400:
		return nil, model.BadRequest(errors.Wrap(fmt.Errorf(string(body)),
			fmt.Sprintf("bad request error received from %v", C.GatewayUrl)))
	case 401:
		return nil, model.Unauthorized(errors.Wrap(fmt.Errorf(string(body)),
			fmt.Sprintf("unauthorized request error received from %v", C.GatewayUrl)))
	default:
		return nil, model.InternalError(errors.Wrap(fmt.Errorf(string(body)),
			fmt.Sprintf("internal request error received from %v", C.GatewayUrl)))
	}

}

func NewPostRequestWithCtx(ctx context.Context, url string, contentType string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, POST, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", contentType)
	return req, err

}

// SendUsage reports the usage of signoz to license server
func SendUsage(ctx context.Context, usage model.UsagePayload) *model.ApiError {
	reqString, _ := json.Marshal(usage)
	req, err := NewPostRequestWithCtx(ctx, C.Prefix+"/usage", APPLICATION_JSON, bytes.NewBuffer(reqString))
	if err != nil {
		return model.BadRequest(errors.Wrap(err, "unable to create http request"))
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return model.BadRequest(errors.Wrap(err, "unable to connect with license.signoz.io, please check your network connection"))
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return model.BadRequest(errors.Wrap(err, "failed to read usage response from license.signoz.io"))
	}

	defer res.Body.Close()

	switch res.StatusCode {
	case 200, 201:
		return nil
	case 400, 401:
		return model.BadRequest(errors.Wrap(fmt.Errorf(string(body)),
			"bad request error received from license.signoz.io"))
	default:
		return model.InternalError(errors.Wrap(fmt.Errorf(string(body)),
			"internal error received from license.signoz.io"))
	}
}
