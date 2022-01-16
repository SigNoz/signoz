package telemetry

import (
	"io/ioutil"
	"net/http"
	"sync"
	"time"

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
	enabled    bool
}

const (
	TELEMETRY_EVENT_PATH               = "API Call"
	TELEMETRY_EVENT_USER               = "User"
	TELEMETRY_EVENT_INPRODUCT_FEEDBACK = "InProduct Feeback Submitted"
	TELEMETRY_EVENT_NUMBER_OF_SERVICES = "Number of Services"
	TELEMETRY_EVENT_HEART_BEAT         = "Heart Beat"
)

func createTelemetry() {
	telemetry = &Telemetry{
		operator:  analytics.New(api_key),
		ipAddress: getOutboundIP(),
		enabled:   true,
	}

	data := map[string]interface{}{}

	ticker := time.NewTicker(6 * time.Hour)
	go func() {
		for {
			select {
			case <-ticker.C:
				telemetry.SendEvent(TELEMETRY_EVENT_HEART_BEAT, data)
			}
		}
	}()

}

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
	if !a.isTelemetryEnabled() {
		return
	}
	a.operator.Enqueue(analytics.Identify{
		UserId: a.ipAddress,
		Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email).Set("ip", a.ipAddress),
	})
}

func (a *Telemetry) SendEvent(event string, data map[string]interface{}) {

	if !a.isTelemetryEnabled() {
		return
	}

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

func (a *Telemetry) isTelemetryEnabled() bool {
	return a.enabled
}

func (a *Telemetry) SetTelemetryEnabled(value bool) {
	a.enabled = value
}

func GetInstance() *Telemetry {

	if telemetry == nil {
		telemetry.Lock()
		defer telemetry.Unlock()
		if telemetry == nil {
			zap.S().Info("Creating single instance now.")
			createTelemetry()
		} else {
			zap.S().Debug("Single instance already created.")
		}
	} else {
		zap.S().Debug("Single instance already created.")
	}

	return telemetry
}
