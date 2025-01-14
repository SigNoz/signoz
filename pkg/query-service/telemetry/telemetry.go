package telemetry

import (
	"context"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-co-op/gocron"
	"go.uber.org/zap"
	"gopkg.in/segmentio/analytics-go.v3"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/version"
)

const (
	TELEMETRY_EVENT_PATH                             = "API Call"
	TELEMETRY_EVENT_USER                             = "User"
	TELEMETRY_EVENT_INPRODUCT_FEEDBACK               = "InProduct Feedback Submitted"
	TELEMETRY_EVENT_NUMBER_OF_SERVICES               = "Number of Services"
	TELEMETRY_EVENT_HEART_BEAT                       = "Heart Beat"
	TELEMETRY_EVENT_ORG_SETTINGS                     = "Org Settings"
	DEFAULT_SAMPLING                                 = 0.1
	TELEMETRY_LICENSE_CHECK_FAILED                   = "License Check Failed"
	TELEMETRY_LICENSE_UPDATED                        = "License Updated"
	TELEMETRY_LICENSE_ACT_FAILED                     = "License Activation Failed"
	TELEMETRY_EVENT_ENVIRONMENT                      = "Environment"
	TELEMETRY_EVENT_LANGUAGE                         = "Language"
	TELEMETRY_EVENT_SERVICE                          = "ServiceName"
	TELEMETRY_EVENT_LOGS_FILTERS                     = "Logs Filters"
	TELEMETRY_EVENT_LARGE_TRACE_OPENED               = "Large Trace Opened"
	TELEMETRY_EVENT_TRACE_DETAIL_API                 = "Trace Detail API"
	TELEMETRY_EVENT_MAX_SPANS_ALLOWED_LIMIT_REACHED  = "Max spans in a trace limit reached"
	TELEMETRY_EVENT_DISTRIBUTED                      = "Distributed"
	TELEMETRY_EVENT_QUERY_RANGE_API                  = "Query Range API"
	TELEMETRY_EVENT_DASHBOARDS_ALERTS                = "Dashboards/Alerts Info"
	TELEMETRY_EVENT_ACTIVE_USER                      = "Active User"
	TELEMETRY_EVENT_USER_INVITATION_SENT             = "User Invitation Sent"
	TELEMETRY_EVENT_USER_INVITATION_ACCEPTED         = "User Invitation Accepted"
	TELEMETRY_EVENT_SUCCESSFUL_DASHBOARD_PANEL_QUERY = "Successful Dashboard Panel Query"
	TELEMETRY_EVENT_SUCCESSFUL_ALERT_QUERY           = "Successful Alert Query"
	DEFAULT_CLOUD_EMAIL                              = "admin@signoz.cloud"
)

var SAAS_EVENTS_LIST = map[string]struct{}{
	TELEMETRY_EVENT_NUMBER_OF_SERVICES:               {},
	TELEMETRY_EVENT_HEART_BEAT:                       {},
	TELEMETRY_EVENT_LANGUAGE:                         {},
	TELEMETRY_EVENT_SERVICE:                          {},
	TELEMETRY_EVENT_ENVIRONMENT:                      {},
	TELEMETRY_EVENT_USER_INVITATION_SENT:             {},
	TELEMETRY_EVENT_USER_INVITATION_ACCEPTED:         {},
	TELEMETRY_EVENT_DASHBOARDS_ALERTS:                {},
	TELEMETRY_EVENT_SUCCESSFUL_DASHBOARD_PANEL_QUERY: {},
	TELEMETRY_EVENT_SUCCESSFUL_ALERT_QUERY:           {},
	TELEMETRY_EVENT_QUERY_RANGE_API:                  {},
	TELEMETRY_EVENT_MAX_SPANS_ALLOWED_LIMIT_REACHED:  {},
	TELEMETRY_EVENT_LARGE_TRACE_OPENED:               {},
	TELEMETRY_EVENT_TRACE_DETAIL_API:                 {},
}

var OSS_EVENTS_LIST = map[string]struct{}{
	TELEMETRY_EVENT_NUMBER_OF_SERVICES: {},
	TELEMETRY_EVENT_HEART_BEAT:         {},
	TELEMETRY_EVENT_LANGUAGE:           {},
	TELEMETRY_EVENT_ENVIRONMENT:        {},
	TELEMETRY_EVENT_DASHBOARDS_ALERTS:  {},
	TELEMETRY_EVENT_ACTIVE_USER:        {},
	TELEMETRY_EVENT_PATH:               {},
	TELEMETRY_EVENT_ORG_SETTINGS:       {},
	TELEMETRY_LICENSE_CHECK_FAILED:     {},
	TELEMETRY_LICENSE_UPDATED:          {},
	TELEMETRY_LICENSE_ACT_FAILED:       {},
}

type QueryInfoResult struct {
	LogsUsed              bool
	MetricsUsed           bool
	TracesUsed            bool
	FilterApplied         bool
	GroupByApplied        bool
	AggregateOperator     v3.AggregateOperator
	AggregateAttributeKey string
	QueryType             v3.QueryType
	PanelType             v3.PanelType
	NumberOfQueries       int
}

const api_key = "9kRrJ7oPCGPEJLF6QjMPLt5bljFhRQBr"

const IP_NOT_FOUND_PLACEHOLDER = "NA"
const DEFAULT_NUMBER_OF_SERVICES = 6

const SCHEDULE_START_TIME = "04:00" // 4 AM UTC

const RATE_LIMIT_CHECK_DURATION = 1 * time.Minute
const RATE_LIMIT_VALUE = 1

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

func (telemetry *Telemetry) CheckQueryInfo(postData *v3.QueryRangeParamsV3) QueryInfoResult {
	queryInfoResult := QueryInfoResult{}
	if postData != nil && postData.CompositeQuery != nil {
		queryInfoResult.PanelType = postData.CompositeQuery.PanelType
		queryInfoResult.QueryType = postData.CompositeQuery.QueryType
		if postData.CompositeQuery.QueryType == v3.QueryTypeBuilder {
			queryInfoResult.NumberOfQueries = len(postData.CompositeQuery.BuilderQueries)
			for _, query := range postData.CompositeQuery.BuilderQueries {
				if query.DataSource == v3.DataSourceLogs {
					queryInfoResult.LogsUsed = true
				} else if query.DataSource == v3.DataSourceMetrics {
					queryInfoResult.MetricsUsed = true

				} else if query.DataSource == v3.DataSourceTraces {
					queryInfoResult.TracesUsed = true
				}
				if query.Filters != nil && len(query.Filters.Items) > 0 {
					queryInfoResult.FilterApplied = true
				}
				if query.GroupBy != nil && len(query.GroupBy) > 0 {
					queryInfoResult.GroupByApplied = true
				}
				queryInfoResult.AggregateOperator = query.AggregateOperator
				if len(query.AggregateAttribute.Key) > 0 && !strings.Contains(query.AggregateAttribute.Key, "signoz_") {
					queryInfoResult.AggregateAttributeKey = query.AggregateAttribute.Key
				}
			}
		} else if postData.CompositeQuery.QueryType == v3.QueryTypePromQL {
			for _, query := range postData.CompositeQuery.PromQueries {
				if !strings.Contains(query.Query, "signoz_") && len(query.Query) > 0 {
					queryInfoResult.MetricsUsed = true
				}
			}
		} else if postData.CompositeQuery.QueryType == v3.QueryTypeClickHouseSQL {
			for _, query := range postData.CompositeQuery.ClickHouseQueries {
				if strings.Contains(query.Query, "signoz_metrics") && len(query.Query) > 0 {
					queryInfoResult.MetricsUsed = true
				}
				if strings.Contains(query.Query, "signoz_logs") && len(query.Query) > 0 {
					queryInfoResult.LogsUsed = true
				}
				if strings.Contains(query.Query, "signoz_traces") && len(query.Query) > 0 {
					queryInfoResult.TracesUsed = true
				}
			}
		}
	}
	return queryInfoResult
}

func (telemetry *Telemetry) AddActiveTracesUser() {
	telemetry.mutex.Lock()
	telemetry.activeUser["traces"] = 1
	telemetry.mutex.Unlock()
}
func (telemetry *Telemetry) AddActiveMetricsUser() {
	telemetry.mutex.Lock()
	telemetry.activeUser["metrics"] = 1
	telemetry.mutex.Unlock()
}
func (telemetry *Telemetry) AddActiveLogsUser() {
	telemetry.mutex.Lock()
	telemetry.activeUser["logs"] = 1
	telemetry.mutex.Unlock()
}

type Telemetry struct {
	ossOperator   analytics.Client
	saasOperator  analytics.Client
	ipAddress     string
	userEmail     string
	isEnabled     bool
	isAnonymous   bool
	distinctId    string
	reader        interfaces.Reader
	companyDomain string
	minRandInt    int
	maxRandInt    int
	rateLimits    map[string]int8
	activeUser    map[string]int8
	patTokenUser  bool
	mutex         sync.RWMutex

	alertsInfoCallback     func(ctx context.Context) (*model.AlertsInfo, error)
	userCountCallback      func(ctx context.Context) (int, error)
	userRoleCallback       func(ctx context.Context, groupId string) (string, error)
	getUsersCallback       func(ctx context.Context) ([]model.UserPayload, *model.ApiError)
	dashboardsInfoCallback func(ctx context.Context) (*model.DashboardsInfo, error)
	savedViewsInfoCallback func(ctx context.Context) (*model.SavedViewsInfo, error)
}

func (a *Telemetry) SetAlertsInfoCallback(callback func(ctx context.Context) (*model.AlertsInfo, error)) {
	a.alertsInfoCallback = callback
}

func (a *Telemetry) SetUserCountCallback(callback func(ctx context.Context) (int, error)) {
	a.userCountCallback = callback
}

func (a *Telemetry) SetUserRoleCallback(callback func(ctx context.Context, groupId string) (string, error)) {
	a.userRoleCallback = callback
}

func (a *Telemetry) SetGetUsersCallback(callback func(ctx context.Context) ([]model.UserPayload, *model.ApiError)) {
	a.getUsersCallback = callback
}

func (a *Telemetry) SetSavedViewsInfoCallback(callback func(ctx context.Context) (*model.SavedViewsInfo, error)) {
	a.savedViewsInfoCallback = callback
}

func (a *Telemetry) SetDashboardsInfoCallback(callback func(ctx context.Context) (*model.DashboardsInfo, error)) {
	a.dashboardsInfoCallback = callback
}

func createTelemetry() {
	// Do not do anything in CI (not even resolving the outbound IP address)
	if testing.Testing() {
		telemetry = &Telemetry{
			isEnabled: false,
		}
		return
	}

	if constants.IsOSSTelemetryEnabled() {
		telemetry = &Telemetry{
			ossOperator: analytics.New(api_key),
			ipAddress:   getOutboundIP(),
			rateLimits:  make(map[string]int8),
			activeUser:  make(map[string]int8),
		}
	} else {
		telemetry = &Telemetry{
			ipAddress:  getOutboundIP(),
			rateLimits: make(map[string]int8),
			activeUser: make(map[string]int8),
		}
	}
	telemetry.minRandInt = 0
	telemetry.maxRandInt = int(1 / DEFAULT_SAMPLING)

	telemetry.SetTelemetryEnabled(constants.IsTelemetryEnabled())

	// Create a new scheduler
	s := gocron.NewScheduler(time.UTC)

	HEART_BEAT_DURATION := time.Duration(constants.TELEMETRY_HEART_BEAT_DURATION_MINUTES) * time.Minute
	ACTIVE_USER_DURATION := time.Duration(constants.TELEMETRY_ACTIVE_USER_DURATION_MINUTES) * time.Minute

	rateLimitTicker := time.NewTicker(RATE_LIMIT_CHECK_DURATION)

	go func() {
		//lint:ignore S1000 false positive
		for {
			select {
			case <-rateLimitTicker.C:
				telemetry.rateLimits = make(map[string]int8)
			}
		}
	}()
	ctx := context.Background()
	// Define heartbeat function
	heartbeatFunc := func() {
		tagsInfo, err := telemetry.reader.GetTagsInfoInLastHeartBeatInterval(ctx, HEART_BEAT_DURATION)
		if err != nil {
			zap.L().Error("heartbeatFunc: failed to get tags info", zap.Error(err))
			return
		}

		if len(tagsInfo.Env) != 0 {
			telemetry.SendEvent(TELEMETRY_EVENT_ENVIRONMENT, map[string]interface{}{"value": tagsInfo.Env}, "", true, false)
		}

		languages := []string{}
		for language := range tagsInfo.Languages {
			languages = append(languages, language)
		}
		if len(languages) > 0 {
			telemetry.SendEvent(TELEMETRY_EVENT_LANGUAGE, map[string]interface{}{"language": languages}, "", true, false)
		}
		services := []string{}
		for service := range tagsInfo.Services {
			services = append(services, service)
		}
		if len(services) > 0 {
			telemetry.SendEvent(TELEMETRY_EVENT_SERVICE, map[string]interface{}{"serviceName": services}, "", true, false)
		}
		totalSpans, _ := telemetry.reader.GetTotalSpans(ctx)
		totalLogs, _ := telemetry.reader.GetTotalLogs(ctx)
		spansInLastHeartBeatInterval, _ := telemetry.reader.GetSpansInLastHeartBeatInterval(ctx, HEART_BEAT_DURATION)
		getSamplesInfoInLastHeartBeatInterval, _ := telemetry.reader.GetSamplesInfoInLastHeartBeatInterval(ctx, HEART_BEAT_DURATION)
		totalSamples, _ := telemetry.reader.GetTotalSamples(ctx)
		tsInfo, _ := telemetry.reader.GetTimeSeriesInfo(ctx)

		getLogsInfoInLastHeartBeatInterval, _ := telemetry.reader.GetLogsInfoInLastHeartBeatInterval(ctx, HEART_BEAT_DURATION)

		traceTTL, _ := telemetry.reader.GetTTL(ctx, &model.GetTTLParams{Type: constants.TraceTTL})
		metricsTTL, _ := telemetry.reader.GetTTL(ctx, &model.GetTTLParams{Type: constants.MetricsTTL})
		logsTTL, _ := telemetry.reader.GetTTL(ctx, &model.GetTTLParams{Type: constants.LogsTTL})

		userCount, _ := telemetry.userCountCallback(ctx)

		data := map[string]interface{}{
			"totalSpans":                            totalSpans,
			"spansInLastHeartBeatInterval":          spansInLastHeartBeatInterval,
			"totalSamples":                          totalSamples,
			"getSamplesInfoInLastHeartBeatInterval": getSamplesInfoInLastHeartBeatInterval,
			"totalLogs":                             totalLogs,
			"getLogsInfoInLastHeartBeatInterval":    getLogsInfoInLastHeartBeatInterval,
			"countUsers":                            userCount,
			"metricsTTLStatus":                      metricsTTL.Status,
			"metricsTTLValue":                       metricsTTL.MetricsMoveTime,
			"tracesTTLStatus":                       traceTTL.Status,
			"traceTTLValue":                         traceTTL.TracesTime,
			"logsTTLStatus":                         logsTTL.Status,
			"logsTTLValue":                          logsTTL.LogsTime,
			"patUser":                               telemetry.patTokenUser,
		}
		telemetry.patTokenUser = false
		for key, value := range tsInfo {
			data[key] = value
		}

		users, apiErr := telemetry.getUsersCallback(ctx)
		if apiErr == nil {
			for _, user := range users {
				if user.Email == DEFAULT_CLOUD_EMAIL {
					continue
				}
				telemetry.SendEvent(TELEMETRY_EVENT_HEART_BEAT, data, user.Email, false, false)
			}
		}

		alertsInfo, err := telemetry.alertsInfoCallback(ctx)
		if err == nil {
			dashboardsInfo, err := telemetry.dashboardsInfoCallback(ctx)
			if err == nil {
				savedViewsInfo, err := telemetry.savedViewsInfoCallback(ctx)
				if err == nil {
					dashboardsAlertsData := map[string]interface{}{
						"totalDashboards":                 dashboardsInfo.TotalDashboards,
						"totalDashboardsWithPanelAndName": dashboardsInfo.TotalDashboardsWithPanelAndName,
						"dashboardNames":                  dashboardsInfo.DashboardNames,
						"alertNames":                      alertsInfo.AlertNames,
						"logsBasedPanels":                 dashboardsInfo.LogsBasedPanels,
						"logsPanelsWithAttrContains":      dashboardsInfo.LogsPanelsWithAttrContainsOp,
						"metricBasedPanels":               dashboardsInfo.MetricBasedPanels,
						"tracesBasedPanels":               dashboardsInfo.TracesBasedPanels,
						"dashboardsWithTSV2":              dashboardsInfo.QueriesWithTSV2,
						"dashboardsWithTagAttrs":          dashboardsInfo.QueriesWithTagAttrs,
						"dashboardWithLogsChQuery":        dashboardsInfo.DashboardsWithLogsChQuery,
						"dashboardWithTraceChQuery":       dashboardsInfo.DashboardsWithTraceChQuery,
						"dashboardNamesWithTraceChQuery":  dashboardsInfo.DashboardNamesWithTraceChQuery,
						"totalAlerts":                     alertsInfo.TotalAlerts,
						"totalActiveAlerts":               alertsInfo.TotalActiveAlerts,
						"alertsWithTSV2":                  alertsInfo.AlertsWithTSV2,
						"logsBasedAlerts":                 alertsInfo.LogsBasedAlerts,
						"metricBasedAlerts":               alertsInfo.MetricBasedAlerts,
						"anomalyBasedAlerts":              alertsInfo.AnomalyBasedAlerts,
						"tracesBasedAlerts":               alertsInfo.TracesBasedAlerts,
						"totalChannels":                   alertsInfo.TotalChannels,
						"totalSavedViews":                 savedViewsInfo.TotalSavedViews,
						"logsSavedViews":                  savedViewsInfo.LogsSavedViews,
						"tracesSavedViews":                savedViewsInfo.TracesSavedViews,
						"logSavedViewsWithContainsOp":     savedViewsInfo.LogsSavedViewWithContainsOp,
						"slackChannels":                   alertsInfo.SlackChannels,
						"webHookChannels":                 alertsInfo.WebHookChannels,
						"pagerDutyChannels":               alertsInfo.PagerDutyChannels,
						"opsGenieChannels":                alertsInfo.OpsGenieChannels,
						"emailChannels":                   alertsInfo.EmailChannels,
						"msteamsChannels":                 alertsInfo.MSTeamsChannels,
						"metricsBuilderQueries":           alertsInfo.MetricsBuilderQueries,
						"metricsClickHouseQueries":        alertsInfo.MetricsClickHouseQueries,
						"metricsPrometheusQueries":        alertsInfo.MetricsPrometheusQueries,
						"spanMetricsPrometheusQueries":    alertsInfo.SpanMetricsPrometheusQueries,
						"alertsWithLogsChQuery":           alertsInfo.AlertsWithLogsChQuery,
						"alertsWithLogsContainsOp":        alertsInfo.AlertsWithLogsContainsOp,
						"alertsWithTraceChQuery":          alertsInfo.AlertsWithTraceChQuery,
					}
					// send event only if there are dashboards or alerts or channels
					if (dashboardsInfo.TotalDashboards > 0 || alertsInfo.TotalAlerts > 0 || alertsInfo.TotalChannels > 0 || savedViewsInfo.TotalSavedViews > 0) && apiErr == nil {
						for _, user := range users {
							if user.Email == DEFAULT_CLOUD_EMAIL {
								continue
							}
							telemetry.SendEvent(TELEMETRY_EVENT_DASHBOARDS_ALERTS, dashboardsAlertsData, user.Email, false, false)
						}
					}
					telemetry.SendIdentityEvent(map[string]interface{}{
						"total_logs":                  totalLogs,
						"total_traces":                totalSpans,
						"total_metrics":               totalSamples,
						"total_users":                 userCount,
						"total_channels":              alertsInfo.TotalChannels,
						"total_dashboards_with_panel": dashboardsInfo.TotalDashboardsWithPanelAndName,
						"total_saved_views":           savedViewsInfo.TotalSavedViews,
						"total_active_alerts":         alertsInfo.TotalActiveAlerts,
						"total_traces_based_alerts":   alertsInfo.TracesBasedAlerts,
						"total_logs_based_alerts":     alertsInfo.LogsBasedAlerts,
						"total_metric_based_alerts":   alertsInfo.MetricBasedAlerts,
						"total_anomaly_based_alerts":  alertsInfo.AnomalyBasedAlerts,
						"total_metrics_based_panels":  dashboardsInfo.MetricBasedPanels,
						"total_logs_based_panels":     dashboardsInfo.LogsBasedPanels,
						"total_traces_based_panels":   dashboardsInfo.TracesBasedPanels,
					})
				}
			}
		}
		if err != nil || apiErr != nil {
			telemetry.SendEvent(TELEMETRY_EVENT_DASHBOARDS_ALERTS, map[string]interface{}{"error": err.Error()}, "", true, false)
		}

		if totalLogs > 0 {
			telemetry.SendIdentityEvent(map[string]interface{}{"sent_logs": true})
		}
		if totalSpans > 0 {
			telemetry.SendIdentityEvent(map[string]interface{}{"sent_traces": true})
		}
		if totalSamples > 0 {
			telemetry.SendIdentityEvent(map[string]interface{}{"sent_metrics": true})
		}

		getDistributedInfoInLastHeartBeatInterval, _ := telemetry.reader.GetDistributedInfoInLastHeartBeatInterval(ctx)
		telemetry.SendEvent(TELEMETRY_EVENT_DISTRIBUTED, getDistributedInfoInLastHeartBeatInterval, "", true, false)
	}

	// Define active user function
	activeUserFunc := func() {
		if telemetry.activeUser["logs"] != 0 {
			getLogsInfoInLastHeartBeatInterval, err := telemetry.reader.GetLogsInfoInLastHeartBeatInterval(ctx, ACTIVE_USER_DURATION)
			if err != nil && getLogsInfoInLastHeartBeatInterval == 0 {
				telemetry.activeUser["logs"] = 0
			}
		}
		if telemetry.activeUser["metrics"] != 0 {
			getSamplesInfoInLastHeartBeatInterval, err := telemetry.reader.GetSamplesInfoInLastHeartBeatInterval(ctx, ACTIVE_USER_DURATION)
			if err != nil && getSamplesInfoInLastHeartBeatInterval == 0 {
				telemetry.activeUser["metrics"] = 0
			}
		}
		if (telemetry.activeUser["traces"] != 0) || (telemetry.activeUser["metrics"] != 0) || (telemetry.activeUser["logs"] != 0) {
			telemetry.activeUser["any"] = 1
		}
		telemetry.SendEvent(TELEMETRY_EVENT_ACTIVE_USER, map[string]interface{}{
			"traces":  telemetry.activeUser["traces"],
			"metrics": telemetry.activeUser["metrics"],
			"logs":    telemetry.activeUser["logs"],
			"any":     telemetry.activeUser["any"]},
			"", true, false)
		telemetry.activeUser = map[string]int8{"traces": 0, "metrics": 0, "logs": 0, "any": 0}
	}

	// Calculate next run time based on duration and start time
	calculateNextRun := func(duration time.Duration, startTimeStr string) time.Time {
		now := time.Now().UTC()
		startTime, _ := time.Parse("15:04", startTimeStr)
		todayStartTime := time.Date(now.Year(), now.Month(), now.Day(), startTime.Hour(), startTime.Minute(), 0, 0, time.UTC)

		if now.Before(todayStartTime) {
			todayStartTime = todayStartTime.Add(-24 * time.Hour)
		}

		diff := now.Sub(todayStartTime)
		intervalsPassed := int(diff / duration)
		nextRun := todayStartTime.Add(time.Duration(intervalsPassed+1) * duration)

		return nextRun
	}

	// Schedule next runs
	scheduleNextRuns := func() {
		nextHeartbeat := calculateNextRun(HEART_BEAT_DURATION, SCHEDULE_START_TIME)
		nextActiveUser := calculateNextRun(ACTIVE_USER_DURATION, SCHEDULE_START_TIME)

		s.Every(HEART_BEAT_DURATION).StartAt(nextHeartbeat).Do(heartbeatFunc)
		s.Every(ACTIVE_USER_DURATION).StartAt(nextActiveUser).Do(activeUserFunc)
	}

	// Schedule immediate execution and subsequent runs
	scheduleNextRuns()

	// Start the scheduler in a separate goroutine
	go s.StartBlocking()
}

// Get preferred outbound ip of this machine
func getOutboundIP() string {

	ip := []byte(IP_NOT_FOUND_PLACEHOLDER)
	resp, err := http.Get("https://api.ipify.org?format=text")

	if err != nil {
		return string(ip)
	}

	defer resp.Body.Close()
	ipBody, err := io.ReadAll(resp.Body)
	if err == nil {
		ip = ipBody
	}

	return string(ip)
}

func (a *Telemetry) IdentifyUser(user *model.User) {
	if user.Email == DEFAULT_CLOUD_EMAIL {
		return
	}
	a.SetCompanyDomain(user.Email)
	a.SetUserEmail(user.Email)
	if !a.isTelemetryEnabled() || a.isTelemetryAnonymous() {
		return
	}
	// extract user group from user.groupId
	role, _ := a.userRoleCallback(context.Background(), user.GroupId)

	if a.saasOperator != nil {
		if role != "" {
			a.saasOperator.Enqueue(analytics.Identify{
				UserId: a.userEmail,
				Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email).Set("role", role),
			})
		} else {
			a.saasOperator.Enqueue(analytics.Identify{
				UserId: a.userEmail,
				Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email),
			})
		}

		a.saasOperator.Enqueue(analytics.Group{
			UserId:  a.userEmail,
			GroupId: a.getCompanyDomain(),
			Traits:  analytics.NewTraits().Set("company_domain", a.getCompanyDomain()),
		})
	}

	if a.ossOperator != nil {
		a.ossOperator.Enqueue(analytics.Identify{
			UserId: a.ipAddress,
			Traits: analytics.NewTraits().SetName(user.Name).SetEmail(user.Email).Set("ip", a.ipAddress),
		})
		// Updating a groups properties
		a.ossOperator.Enqueue(analytics.Group{
			UserId:  a.ipAddress,
			GroupId: a.getCompanyDomain(),
			Traits:  analytics.NewTraits().Set("company_domain", a.getCompanyDomain()),
		})
	}
}

func (a *Telemetry) SendIdentityEvent(data map[string]interface{}) {

	if !a.isTelemetryEnabled() || a.isTelemetryAnonymous() {
		return
	}
	traits := analytics.NewTraits()

	for k, v := range data {
		traits.Set(k, v)
	}
	if a.saasOperator != nil {

		a.saasOperator.Enqueue(analytics.Identify{
			UserId: a.GetUserEmail(),
			Traits: traits,
		})
		a.saasOperator.Enqueue(analytics.Group{
			UserId:  a.userEmail,
			GroupId: a.getCompanyDomain(),
			Traits:  traits,
		})
	}
	if a.ossOperator != nil {
		a.ossOperator.Enqueue(analytics.Identify{
			UserId: a.ipAddress,
			Traits: traits,
		})
		// Updating a groups properties
		a.ossOperator.Enqueue(analytics.Group{
			UserId:  a.ipAddress,
			GroupId: a.getCompanyDomain(),
			Traits:  traits,
		})
	}
}

func (a *Telemetry) SetUserEmail(email string) {
	a.userEmail = email
}

func (a *Telemetry) SetPatTokenUser() {
	a.patTokenUser = true
}

func (a *Telemetry) GetUserEmail() string {
	return a.userEmail
}

func (a *Telemetry) SetSaasOperator(saasOperatorKey string) {
	if saasOperatorKey == "" {
		return
	}
	a.saasOperator = analytics.New(saasOperatorKey)
}

func (a *Telemetry) SetCompanyDomain(email string) {

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

func (a *Telemetry) SendEvent(event string, data map[string]interface{}, userEmail string, rateLimitFlag bool, viaEventsAPI bool) {

	// ignore telemetry for default user
	if userEmail == DEFAULT_CLOUD_EMAIL || a.GetUserEmail() == DEFAULT_CLOUD_EMAIL {
		return
	}

	if userEmail != "" {
		a.SetUserEmail(userEmail)
		a.SetCompanyDomain(userEmail)
	}

	if !a.isTelemetryEnabled() {
		return
	}

	ok := a.checkEvents(event)
	if !ok {
		return
	}

	// drop events with properties matching
	if ignoreEvents(event, data) {
		return
	}

	if rateLimitFlag {
		telemetry.mutex.Lock()
		limit := a.rateLimits[event]
		if limit < RATE_LIMIT_VALUE {
			a.rateLimits[event] += 1
			telemetry.mutex.Unlock()
		} else {
			telemetry.mutex.Unlock()
			return
		}
	}

	// zap.L().Info(data)
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

	// check if event is part of SAAS_EVENTS_LIST
	_, isSaaSEvent := SAAS_EVENTS_LIST[event]

	if a.saasOperator != nil && a.GetUserEmail() != "" && (isSaaSEvent || viaEventsAPI) {
		a.saasOperator.Enqueue(analytics.Track{
			Event:      event,
			UserId:     a.GetUserEmail(),
			Properties: properties,
			Context: &analytics.Context{
				Extra: map[string]interface{}{
					"groupId": a.getCompanyDomain(),
				},
			},
		})
	}

	_, isOSSEvent := OSS_EVENTS_LIST[event]

	if a.ossOperator != nil && isOSSEvent {
		a.ossOperator.Enqueue(analytics.Track{
			Event:      event,
			UserId:     userId,
			Properties: properties,
			Context: &analytics.Context{
				Extra: map[string]interface{}{
					"groupId": a.getCompanyDomain(),
				},
			},
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
