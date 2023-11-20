package signozio

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
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
		return DefaultConfig, nil
	}
	req.SetBasicAuth("admin", "SigNoz@adm1n")
	httpResponse, err := client.Do(req)
	if err != nil {
		return DefaultConfig, nil
	}

	defer httpResponse.Body.Close()

	if err != nil {
		return DefaultConfig, nil
	}

	httpBody, err := io.ReadAll(httpResponse.Body)
	if err != nil {
		return DefaultConfig, nil
	}

	// read api request result
	result := ConfigResult{}
	err = json.Unmarshal(httpBody, &result)
	if err != nil {
		return DefaultConfig, nil
	}

	switch httpResponse.StatusCode {
	case 200, 201:
		return result.Data, nil
	case 400, 401:
		return DefaultConfig, nil
	default:
		return DefaultConfig, nil
	}

}
