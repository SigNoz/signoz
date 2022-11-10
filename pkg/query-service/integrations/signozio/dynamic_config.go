package signozio

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/constants"
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
		Prefix: constants.ConfigSignozIo,
	}
}

func init() {
	C = New()
}

// FetchDynamicConfigs fetches configs from config.signoz.io
func FetchDynamicConfigs() (map[string]Config, *model.ApiError) {

	httpResponse, err := http.Get(C.Prefix + "/configs")

	if err != nil {
		zap.S().Errorf("failed to connect to config.signoz.io", err)
		return nil, model.BadRequest(fmt.Errorf("unable to connect with config.signoz.io, please check your network connection"))
	}

	httpBody, err := ioutil.ReadAll(httpResponse.Body)
	if err != nil {
		zap.S().Errorf("failed to read response from config.signoz.io", err)
		return nil, model.BadRequest(fmt.Errorf("failed to read response from config.signoz.io"))
	}

	defer httpResponse.Body.Close()

	// read api request result
	result := ConfigResult{}
	err = json.Unmarshal(httpBody, &result)
	if err != nil {
		zap.S().Errorf("failed to marshal response from config.signoz.io", err)
		return nil, model.InternalError(errors.Wrap(err, "failed to marshal config response"))
	}

	switch httpResponse.StatusCode {
	case 200, 201:
		return result.Data, nil
	case 400, 401:
		return nil, model.BadRequest(fmt.Errorf(fmt.Sprintf("failed to fetch: %s", result.Error)))
	default:
		return nil, model.InternalError(fmt.Errorf(fmt.Sprintf("failed to fetch: %s", result.Error)))
	}

}
