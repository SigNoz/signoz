package telemetry

import (
	"io/ioutil"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
	"gopkg.in/segmentio/analytics-go.v3"
)

const api_key = "4Gmoa4ixJAUHx2BpJxsjwA1bEfnwEeRz"

var telemetry *Telemetry

type Telemetry struct {
	sync.RWMutex
	operator   analytics.Client
	ipAddress  string
	distinctId string
}

const (
	TELEMETRY_EVENT_PATH               = "API Call"
	TELEMETRY_EVENT_USER               = "User"
	TELEMETRY_EVENT_INPRODUCT_FEEDBACK = "InProduct Feeback Submitted"
	TELEMETRY_EVENT_NUMBER_OF_SERVICES = "Number of Services"
)

// Get preferred outbound ip of this machine
func getOutboundIP() string {

	ip := []byte("NA")
	resp, err := http.Get("https://api.ipify.org?format=text")

	defer resp.Body.Close()
	if err != nil {
		ipBody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			ip = ipBody
		}
	}

	return string(ip)
}

func (a *Telemetry) IdentifyUser(user *model.User) {
	a.operator.Enqueue(analytics.Identify{
		UserId: a.ipAddress,
		Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email).Set("ip", a.ipAddress),
	})
}

func (a *Telemetry) SendEvent(event string, data map[string]interface{}) {

	zap.S().Info(data)
	properties := analytics.NewProperties()

	for k, v := range data {
		properties.Set(k, v)
	}

	a.operator.Enqueue(analytics.Track{
		Event:      event,
		UserId:     a.ipAddress,
		Properties: properties,
	})
}

func GetInstance() *Telemetry {

	if telemetry == nil {
		telemetry.Lock()
		defer telemetry.Unlock()
		if telemetry == nil {
			zap.S().Info("Creating single instance now.")
			telemetry = &Telemetry{
				operator:   analytics.New(api_key),
				ipAddress:  getOutboundIP(),
				distinctId: uuid.New().String(),
			}
		} else {
			zap.S().Debug("Single instance already created.")
		}
	} else {
		zap.S().Debug("Single instance already created.")
	}

	return telemetry
}
