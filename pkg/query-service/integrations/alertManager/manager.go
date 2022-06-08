package alertManager

// Wrapper to connect and process alert manager functions
import (
	"bytes"
	"encoding/json"
	"fmt"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
	"net/http"
	neturl "net/url"
)

const contentType = "application/json"

type Manager interface {
	URL() *neturl.URL
	URLPath(path string) *neturl.URL
	AddRoute(receiver *Receiver) *model.ApiError
	EditRoute(receiver *Receiver) *model.ApiError
	DeleteRoute(name string) *model.ApiError
}

func New(url string) (Manager, error) {

	if url == "" {
		url = constants.GetAlertManagerApiPrefix()
	}

	urlParsed, err := neturl.Parse(url)
	if err != nil {
		return nil, err
	}

	return &manager{
		url:       url,
		parsedURL: urlParsed,
	}, nil
}

type manager struct {
	url       string
	parsedURL *neturl.URL
}

func prepareAmChannelApiURL() string {
	basePath := constants.GetAlertManagerApiPrefix()
	AmChannelApiPath := constants.AmChannelApiPath

	if len(AmChannelApiPath) > 0 && rune(AmChannelApiPath[0]) == rune('/') {
		AmChannelApiPath = AmChannelApiPath[1:]
	}

	return fmt.Sprintf("%s%s", basePath, AmChannelApiPath)
}

func (m *manager) URL() *neturl.URL {
	return m.parsedURL
}

func (m *manager) URLPath(path string) *neturl.URL {
	upath, err := neturl.Parse(path)
	if err != nil {
		return nil
	}

	return m.parsedURL.ResolveReference(upath)
}

func (m *manager) AddRoute(receiver *Receiver) *model.ApiError {

	receiverString, _ := json.Marshal(receiver)

	amURL := prepareAmChannelApiURL()
	response, err := http.Post(amURL, contentType, bytes.NewBuffer(receiverString))

	if err != nil {
		zap.S().Errorf(fmt.Sprintf("Error in getting response of API call to alertmanager(POST %s)\n", amURL), err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if response.StatusCode > 299 {
		err := fmt.Errorf(fmt.Sprintf("Error in getting 2xx response in API call to alertmanager(POST %s)\n", amURL), response.Status)
		zap.S().Error(err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (m *manager) EditRoute(receiver *Receiver) *model.ApiError {
	receiverString, _ := json.Marshal(receiver)

	amURL := prepareAmChannelApiURL()
	req, err := http.NewRequest(http.MethodPut, amURL, bytes.NewBuffer(receiverString))

	if err != nil {
		zap.S().Errorf(fmt.Sprintf("Error creating new update request for API call to alertmanager(PUT %s)\n", amURL), err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	req.Header.Add("Content-Type", contentType)

	client := &http.Client{}
	response, err := client.Do(req)

	if err != nil {
		zap.S().Errorf(fmt.Sprintf("Error in getting response of API call to alertmanager(PUT %s)\n", amURL), err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if response.StatusCode > 299 {
		err := fmt.Errorf(fmt.Sprintf("Error in getting 2xx response in PUT API call to alertmanager(PUT %s)\n", amURL), response.Status)
		zap.S().Error(err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (m *manager) DeleteRoute(name string) *model.ApiError {
	values := map[string]string{"name": name}
	requestData, _ := json.Marshal(values)

	amURL := prepareAmChannelApiURL()
	req, err := http.NewRequest(http.MethodDelete, amURL, bytes.NewBuffer(requestData))

	if err != nil {
		zap.S().Errorf("Error in creating new delete request to alertmanager/v1/receivers\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	req.Header.Add("Content-Type", contentType)

	client := &http.Client{}
	response, err := client.Do(req)

	if err != nil {
		zap.S().Errorf(fmt.Sprintf("Error in getting response of API call to alertmanager(DELETE %s)\n", amURL), err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if response.StatusCode > 299 {
		err := fmt.Errorf(fmt.Sprintf("Error in getting 2xx response in PUT API call to alertmanager(DELETE %s)\n", amURL), response.Status)
		zap.S().Error(err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}
