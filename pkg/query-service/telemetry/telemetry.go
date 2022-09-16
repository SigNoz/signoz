package telemetry

import (
	"context"
	"io/ioutil"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	ph "github.com/posthog/posthog-go"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/interfaces"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/version"
	"gopkg.in/segmentio/analytics-go.v3"
)

const (
	TELEMETRY_EVENT_PATH                  = "API Call"
	TELEMETRY_EVENT_USER                  = "User"
	TELEMETRY_EVENT_INPRODUCT_FEEDBACK    = "InProduct Feeback Submitted"
	TELEMETRY_EVENT_NUMBER_OF_SERVICES    = "Number of Services"
	TELEMETRY_EVENT_NUMBER_OF_SERVICES_PH = "Number of Services V2"
	TELEMETRY_EVENT_HEART_BEAT            = "Heart Beat"
	TELEMETRY_EVENT_ORG_SETTINGS          = "Org Settings"
	DEFAULT_SAMPLING                      = 0.1
	TELEMETRY_LICENSE_CHECK_FAILED        = "License Check Failed"
	TELEMETRY_LICENSE_UPDATED             = "License Updated"
	TELEMETRY_LICENSE_ACT_FAILED          = "License Activation Failed"
)

const api_key = "4Gmoa4ixJAUHx2BpJxsjwA1bEfnwEeRz"
const ph_api_key = "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w"

const IP_NOT_FOUND_PLACEHOLDER = "NA"

const HEART_BEAT_DURATION = 6 * time.Hour

// const HEART_BEAT_DURATION = 10 * time.Second

var telemetry *Telemetry
var once sync.Once

func (a *Telemetry) IsSampled() bool {

	random_number := a.minRandInt + rand.Intn(a.maxRandInt-a.minRandInt) + 1

	if (random_number % a.maxRandInt) == 0 {
		return true
	} else {
		return false
	}

}

type Telemetry struct {
	operator      analytics.Client
	phOperator    ph.Client
	ipAddress     string
	isEnabled     bool
	isAnonymous   bool
	distinctId    string
	reader        interfaces.Reader
	companyDomain string
	minRandInt    int
	maxRandInt    int
}

func createTelemetry() {
	telemetry = &Telemetry{
		operator:   analytics.New(api_key),
		phOperator: ph.New(ph_api_key),
		ipAddress:  getOutboundIP(),
	}
	telemetry.minRandInt = 0
	telemetry.maxRandInt = int(1 / DEFAULT_SAMPLING)

	rand.Seed(time.Now().UnixNano())

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
	// Updating a groups properties
	a.phOperator.Enqueue(ph.GroupIdentify{
		Type: "companyDomain",
		Key:  a.getCompanyDomain(),
		Properties: ph.NewProperties().
			Set("companyDomain", a.getCompanyDomain()),
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

	if event == TELEMETRY_EVENT_NUMBER_OF_SERVICES {

		a.phOperator.Enqueue(ph.Capture{
			DistinctId: userId,
			Event:      TELEMETRY_EVENT_NUMBER_OF_SERVICES_PH,
			Properties: ph.Properties(properties),
			Groups: ph.NewGroups().
				Set("companyDomain", a.getCompanyDomain()),
		})

	}
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
