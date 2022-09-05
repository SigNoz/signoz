package signozio

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/ee/model"
	"io/ioutil"
	"net/http"
)

var C *Client

type Client struct {
	Prefix string
}

func New() *Client {
	return &Client{
		Prefix: "https://license.signoz.io/api/v1",
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
	response, err := http.Post(C.Prefix+"/activate", "application/json", bytes.NewBuffer(reqString))

	if err != nil {
		return nil, model.NewBadRequestError(errors.Wrap(err, "unable to connect with license.signoz.io, please check your network connection"))
	}

	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, model.NewBadRequestError(errors.Wrap(err, "failed to read activation response from license.signoz.io"))
	}

	defer response.Body.Close()

	switch response.StatusCode {
	case 200, 201:
		a := ActivationResponse{}
		err = json.Unmarshal(body, &a)
		if err != nil {
			return nil, model.NewBadRequestError(errors.Wrap(err, "failed to marshal license activation response"))
		}
		return &a, nil
	case 400, 401:
		return nil, model.NewBadRequestError(errors.Wrap(fmt.Errorf(string(body)),
			"bad request error received from license.signoz.io"))
	default:
		return nil, model.NewInternalError(errors.Wrap(fmt.Errorf(string(body)),
			"internal error received from license.signoz.io"))
	}

}

// ValidateLicense validates the license key
func ValidateLicense(activationId string) (*ActivationResponse, *model.ApiError) {
	validReq := map[string]string{
		activationId: activationId,
	}

	reqString, _ := json.Marshal(validReq)
	response, err := http.Post(C.Prefix+"/validate", "application/json", bytes.NewBuffer(reqString))

	if err != nil {
		return nil, model.NewBadRequestError(errors.Wrap(err, "unable to connect with license.signoz.io, please check your network connection"))
	}

	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, model.NewBadRequestError(errors.Wrap(err, "failed to read validation response from license.signoz.io"))
	}

	defer response.Body.Close()

	switch response.StatusCode {
	case 200, 201:
		a := ActivationResponse{}
		err = json.Unmarshal(body, &a)
		if err != nil {
			return nil, model.NewBadRequestError(errors.Wrap(err, "failed to marshal license validation response"))
		}
		return &a, nil
	case 400, 401:
		return nil, model.NewBadRequestError(errors.Wrap(fmt.Errorf(string(body)),
			"bad request error received from license.signoz.io"))
	default:
		return nil, model.NewInternalError(errors.Wrap(fmt.Errorf(string(body)),
			"internal error received from license.signoz.io"))
	}

}
