package signozio

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"time"

	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/constants"
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

// FetchDynamicConfigs fetches configs from config server
func FetchDynamicConfigs() (map[string]Config, *model.ApiError) {

	client := http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(http.MethodGet, C.Prefix+"/configs", http.NoBody)
	if err != nil {
		return map[string]Config{}, nil
	}
	req.SetBasicAuth("admin", "SigNoz@adm1n")
	httpResponse, err := client.Do(req)
	if err != nil {
		return map[string]Config{}, nil
	}

	defer httpResponse.Body.Close()

	if err != nil {
		return map[string]Config{}, nil
	}

	httpBody, err := ioutil.ReadAll(httpResponse.Body)
	if err != nil {
		return map[string]Config{}, nil
	}

	// read api request result
	result := ConfigResult{}
	err = json.Unmarshal(httpBody, &result)
	if err != nil {
		return map[string]Config{}, nil
	}

	switch httpResponse.StatusCode {
	case 200, 201:
		return result.Data, nil
	case 400, 401:
		return map[string]Config{}, nil
	default:
		return map[string]Config{}, nil
	}

}
