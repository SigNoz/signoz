package signozio

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/pkg/errors"
	"go.signoz.io/query-service/ee/constants"
	"go.signoz.io/query-service/ee/model"
	"go.uber.org/zap"
)

var C *Client

type Client struct {
	Prefix string
}

func New() *Client {
	return &Client{
		Prefix: constants.LicenseSignozIo, //todo(amol): replace this before prod "https://license.signoz.io/api/v1",
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
	httpResponse, err := http.Post(C.Prefix+"/licenses/activate", "application/json", bytes.NewBuffer(reqString))

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
	response, err := http.Post(C.Prefix+"/licenses/validate", "application/json", bytes.NewBuffer(reqString))

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
		a := ActivationResponse{}
		err = json.Unmarshal(body, &a)
		if err != nil {
			return nil, model.BadRequest(errors.Wrap(err, "failed to marshal license validation response"))
		}
		return &a, nil
	case 400, 401:
		return nil, model.BadRequest(errors.Wrap(fmt.Errorf(string(body)),
			"bad request error received from license.signoz.io"))
	default:
		return nil, model.InternalError(errors.Wrap(fmt.Errorf(string(body)),
			"internal error received from license.signoz.io"))
	}

}
