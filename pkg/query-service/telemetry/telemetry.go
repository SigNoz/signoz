package telemetry

import (
	"io/ioutil"
	"net/http"
	"sync"
	"time"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/version"
	"gopkg.in/segmentio/analytics-go.v3"
)

const (
	TELEMETRY_EVENT_PATH               = "API Call"
	TELEMETRY_EVENT_USER               = "User"
	TELEMETRY_EVENT_INPRODUCT_FEEDBACK = "InProduct Feeback Submitted"
	TELEMETRY_EVENT_NUMBER_OF_SERVICES = "Number of Services"
	TELEMETRY_EVENT_HEART_BEAT         = "Heart Beat"
)

const api_key = "4Gmoa4ixJAUHx2BpJxsjwA1bEfnwEeRz"

var telemetry *Telemetry
var once sync.Once

type Telemetry struct {
	operator    analytics.Client
	ipAddress   string
	isEnabled   bool
	isAnonymous bool
	distinctId  string
}

func createTelemetry() {
	telemetry = &Telemetry{
		operator:  analytics.New(api_key),
		ipAddress: getOutboundIP(),
	}

	data := map[string]interface{}{}

	telemetry.SetTelemetryEnabled(constants.IsTelemetryEnabled())
	telemetry.SendEvent(TELEMETRY_EVENT_HEART_BEAT, data)
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

	if err != nil {
		return ""
	}

	defer resp.Body.Close()
	if err == nil {
		ipBody, err := ioutil.ReadAll(resp.Body)
		if err == nil {
			ip = ipBody
		}
	}

	return string(ip)
}

func (a *Telemetry) IdentifyUser(user *model.User) {
	if !a.isTelemetryEnabled() || a.isTelemetryAnonymous() {
		return
	}

	a.operator.Enqueue(analytics.Identify{
		UserId: a.ipAddress,
		Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email).Set("ip", a.ipAddress),
	})

}
func (a *Telemetry) checkEvents(event string) bool {
	sendEvent := true
	if event == TELEMETRY_EVENT_USER && a.isTelemetryAnonymous() {
		sendEvent = false
	}
	return sendEvent
}

func (a *Telemetry) SendEvent(event string, data map[string]interface{}) {

	if !a.isTelemetryEnabled() {
		return
	}

	ok := a.checkEvents(event)
	if !ok {
		return
	}

	// zap.S().Info(data)
	properties := analytics.NewProperties()
	properties.Set("version", version.GetVersion())

	for k, v := range data {
		properties.Set(k, v)
	}

	userId := a.ipAddress
	if a.isTelemetryAnonymous() {
		userId = a.GetDistinctId()
	}

	a.operator.Enqueue(analytics.Track{
		Event:      event,
		UserId:     userId,
		Properties: properties,
	})
}

func (a *Telemetry) GetDistinctId() string {
	return a.distinctId
}
func (a *Telemetry) SetDistinctId(distinctId string) {
	a.distinctId = distinctId
}

func (a *Telemetry) isTelemetryAnonymous() bool {
	return a.isAnonymous
}

func (a *Telemetry) SetTelemetryAnonymous(value bool) {
	a.isAnonymous = value
}

func (a *Telemetry) isTelemetryEnabled() bool {
	return a.isEnabled
}

func (a *Telemetry) SetTelemetryEnabled(value bool) {
	a.isEnabled = value
}

func GetInstance() *Telemetry {

	once.Do(func() {
		createTelemetry()
	})

	return telemetry
}
