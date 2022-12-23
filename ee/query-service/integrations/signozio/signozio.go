package signozio

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"
)

var C *Client

const (
	POST             = "POST"
	APPLICATION_JSON = "application/json"
)

type Client struct {
	Prefix string
}

func New() *Client {
	return &Client{
		Prefix: constants.LicenseSignozIo,
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
		zap.S().Errorf("failed to connect to license.signoz.io", err)
		return nil, model.BadRequest(fmt.Errorf("unable to connect with license.signoz.io, please check your network connection"))
	}

	httpBody, err := ioutil.ReadAll(httpResponse.Body)
	if err != nil {
		zap.S().Errorf("failed to read activation response from license.signoz.io", err)
		return nil, model.BadRequest(fmt.Errorf("failed to read activation response from license.signoz.io"))
	}

	defer httpResponse.Body.Close()

	// read api request result
	result := ActivationResult{}
	err = json.Unmarshal(httpBody, &result)
	if err != nil {
		zap.S().Errorf("failed to marshal activation response from license.signoz.io", err)
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

	body, err := ioutil.ReadAll(response.Body)
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
