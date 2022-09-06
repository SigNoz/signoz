package telemetry

import (
	"context"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/interfaces"
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
	TELEMETRY_EVENT_ORG_SETTINGS       = "Org Settings"
)

const api_key = "4Gmoa4ixJAUHx2BpJxsjwA1bEfnwEeRz"
const IP_NOT_FOUND_PLACEHOLDER = "NA"

const HEART_BEAT_DURATION = 6 * time.Hour

// const HEART_BEAT_DURATION = 10 * time.Second

var telemetry *Telemetry
var once sync.Once

type Telemetry struct {
	operator      analytics.Client
	ipAddress     string
	isEnabled     bool
	isAnonymous   bool
	distinctId    string
	reader        interfaces.Reader
	companyDomain string
}

func createTelemetry() {
	telemetry = &Telemetry{
		operator:  analytics.New(api_key),
		ipAddress: getOutboundIP(),
	}

	data := map[string]interface{}{}

	telemetry.SetTelemetryEnabled(constants.IsTelemetryEnabled())
	telemetry.SendEvent(TELEMETRY_EVENT_HEART_BEAT, data)
	ticker := time.NewTicker(HEART_BEAT_DURATION)
	go func() {
		for {
			select {
			case <-ticker.C:
				totalSpans, _ := telemetry.reader.GetTotalSpans(context.Background())
				spansInLastHeartBeatInterval, _ := telemetry.reader.GetSpansInLastHeartBeatInterval(context.Background())
				getSamplesInfoInLastHeartBeatInterval, _ := telemetry.reader.GetSamplesInfoInLastHeartBeatInterval(context.Background())
				tsInfo, _ := telemetry.reader.GetTimeSeriesInfo(context.Background())

				getLogsInfoInLastHeartBeatInterval, _ := telemetry.reader.GetLogsInfoInLastHeartBeatInterval(context.Background())

				data := map[string]interface{}{
					"totalSpans":                            totalSpans,
					"spansInLastHeartBeatInterval":          spansInLastHeartBeatInterval,
					"getSamplesInfoInLastHeartBeatInterval": getSamplesInfoInLastHeartBeatInterval,
					"getLogsInfoInLastHeartBeatInterval":    getLogsInfoInLastHeartBeatInterval,
				}
				for key, value := range tsInfo {
					data[key] = value
				}
				telemetry.SendEvent(TELEMETRY_EVENT_HEART_BEAT, data)
			}
		}
	}()

}

// Get preferred outbound ip of this machine
func getOutboundIP() string {

	ip := []byte(IP_NOT_FOUND_PLACEHOLDER)
	resp, err := http.Get("https://api.ipify.org?format=text")

	if err != nil {
		return string(ip)
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
	a.setCompanyDomain(user.Email)

	a.operator.Enqueue(analytics.Identify{
		UserId: a.ipAddress,
		Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email).Set("ip", a.ipAddress),
	})

}

func (a *Telemetry) setCompanyDomain(email string) {

	email_split := strings.Split(email, "@")
	if len(email_split) != 2 {
		a.companyDomain = email
	}
	a.companyDomain = email_split[1]

}

func (a *Telemetry) getCompanyDomain() string {
	return a.companyDomain
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
	properties.Set("deploymentType", getDeploymentType())
	properties.Set("companyDomain", a.getCompanyDomain())

	for k, v := range data {
		properties.Set(k, v)
	}

	userId := a.ipAddress
	if a.isTelemetryAnonymous() || userId == IP_NOT_FOUND_PLACEHOLDER {
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

func (a *Telemetry) SetReader(reader interfaces.Reader) {
	a.reader = reader
}

func GetInstance() *Telemetry {

	once.Do(func() {
		createTelemetry()
	})

	return telemetry
}

func getDeploymentType() string {
	deploymentType := os.Getenv("DEPLOYMENT_TYPE")
	if deploymentType == "" {
		return "unknown"
	}
	return deploymentType
}
