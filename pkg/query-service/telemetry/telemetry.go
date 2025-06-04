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
	analytics "github.com/segmentio/analytics-go/v3"
	"go.uber.org/zap"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/version"
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

type Telemetry struct {
	ossOperator   analytics.Client
	saasOperator  analytics.Client
	ipAddress     string
	userEmail     string
	isEnabled     bool
	isAnonymous   bool
	reader        interfaces.Reader
	sqlStore      sqlstore.SQLStore
	companyDomain string
	minRandInt    int
	maxRandInt    int
	rateLimits    map[string]int8
	activeUser    map[string]int8
	patTokenUser  bool
	mutex         sync.RWMutex

	alertsInfoCallback     func(ctx context.Context, store sqlstore.SQLStore) (*model.AlertsInfo, error)
	userCountCallback      func(ctx context.Context, store sqlstore.SQLStore) (int, error)
	getUsersCallback       func(ctx context.Context, store sqlstore.SQLStore) ([]TelemetryUser, error)
	dashboardsInfoCallback func(ctx context.Context, store sqlstore.SQLStore) (*model.DashboardsInfo, error)
	savedViewsInfoCallback func(ctx context.Context, store sqlstore.SQLStore) (*model.SavedViewsInfo, error)
}

var telemetry *Telemetry
var once sync.Once

func (t *Telemetry) IsSampled() bool {

	random_number := t.minRandInt + rand.Intn(t.maxRandInt-t.minRandInt) + 1

	if (random_number % t.maxRandInt) == 0 {
		return true
	} else {
		return false
	}

}

func (t *Telemetry) CheckQueryInfo(postData *v3.QueryRangeParamsV3) QueryInfoResult {
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

func (t *Telemetry) AddActiveTracesUser() {
	t.mutex.Lock()
	t.activeUser["traces"] = 1
	t.mutex.Unlock()
}
func (t *Telemetry) AddActiveMetricsUser() {
	t.mutex.Lock()
	t.activeUser["metrics"] = 1
	t.mutex.Unlock()
}
func (t *Telemetry) AddActiveLogsUser() {
	t.mutex.Lock()
	t.activeUser["logs"] = 1
	t.mutex.Unlock()
}

func (t *Telemetry) SetAlertsInfoCallback(callback func(ctx context.Context, store sqlstore.SQLStore) (*model.AlertsInfo, error)) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.alertsInfoCallback = callback
}

func (t *Telemetry) SetUserCountCallback(callback func(ctx context.Context, store sqlstore.SQLStore) (int, error)) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.userCountCallback = callback
}

func (t *Telemetry) SetGetUsersCallback(callback func(ctx context.Context, store sqlstore.SQLStore) ([]TelemetryUser, error)) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.getUsersCallback = callback
}

func (t *Telemetry) SetSavedViewsInfoCallback(callback func(ctx context.Context, store sqlstore.SQLStore) (*model.SavedViewsInfo, error)) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.savedViewsInfoCallback = callback
}

func (t *Telemetry) SetDashboardsInfoCallback(callback func(ctx context.Context, store sqlstore.SQLStore) (*model.DashboardsInfo, error)) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.dashboardsInfoCallback = callback
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

		// TODO update this post bootstrap decision
		traceTTL, _ := telemetry.reader.GetTTL(ctx, "", &model.GetTTLParams{Type: constants.TraceTTL})
		metricsTTL, _ := telemetry.reader.GetTTL(ctx, "", &model.GetTTLParams{Type: constants.MetricsTTL})
		logsTTL, _ := telemetry.reader.GetTTL(ctx, "", &model.GetTTLParams{Type: constants.LogsTTL})

		userCount, _ := telemetry.userCountCallback(ctx, telemetry.sqlStore)

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

		users, apiErr := telemetry.getUsersCallback(ctx, telemetry.sqlStore)
		if apiErr == nil {
			for _, user := range users {
				if user.Email == DEFAULT_CLOUD_EMAIL {
					continue
				}
				telemetry.SendEvent(TELEMETRY_EVENT_HEART_BEAT, data, user.Email, false, false)
			}
		}

		alertsInfo, err := telemetry.alertsInfoCallback(ctx, telemetry.sqlStore)
		if err != nil {
			telemetry.SendEvent(TELEMETRY_EVENT_DASHBOARDS_ALERTS, map[string]interface{}{"error": err.Error()}, "", true, false)
		}
		if err == nil {
			dashboardsInfo, err := telemetry.dashboardsInfoCallback(ctx, telemetry.sqlStore)
			if err == nil {
				savedViewsInfo, err := telemetry.savedViewsInfoCallback(ctx, telemetry.sqlStore)
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
					telemetry.SendIdentifyEvent(map[string]interface{}{
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
					}, "")
					telemetry.SendGroupEvent(map[string]interface{}{
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
					}, "")
				}
			}
		}

		if totalLogs > 0 {
			telemetry.SendIdentifyEvent(map[string]interface{}{"sent_logs": true}, "")
			telemetry.SendGroupEvent(map[string]interface{}{"sent_logs": true}, "")
		}
		if totalSpans > 0 {
			telemetry.SendIdentifyEvent(map[string]interface{}{"sent_traces": true}, "")
			telemetry.SendGroupEvent(map[string]interface{}{"sent_traces": true}, "")
		}
		if totalSamples > 0 {
			telemetry.SendIdentifyEvent(map[string]interface{}{"sent_metrics": true}, "")
			telemetry.SendGroupEvent(map[string]interface{}{"sent_metrics": true}, "")
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

		_, _ = s.Every(HEART_BEAT_DURATION).StartAt(nextHeartbeat).Do(heartbeatFunc)
		_, _ = s.Every(ACTIVE_USER_DURATION).StartAt(nextActiveUser).Do(activeUserFunc)
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

func (t *Telemetry) IdentifyUser(user *types.User) {
	if user.Email == DEFAULT_CLOUD_EMAIL {
		return
	}
	t.SetCompanyDomain(user.Email)
	t.SetUserEmail(user.Email)
	if !t.isTelemetryEnabled() || t.isTelemetryAnonymous() {
		return
	}

	if t.saasOperator != nil {
		_ = t.saasOperator.Enqueue(analytics.Identify{
			UserId: t.userEmail,
			Traits: analytics.NewTraits().SetName(user.DisplayName).SetEmail(user.Email).Set("role", user.Role),
		})

		_ = t.saasOperator.Enqueue(analytics.Group{
			UserId:  t.userEmail,
			GroupId: t.getCompanyDomain(),
			Traits:  analytics.NewTraits().Set("company_domain", t.getCompanyDomain()),
		})
	}

	if t.ossOperator != nil {
		_ = t.ossOperator.Enqueue(analytics.Identify{
			UserId: t.ipAddress,
			Traits: analytics.NewTraits().SetName(user.DisplayName).SetEmail(user.Email).Set("ip", t.ipAddress),
		})
		// Updating a groups properties
		_ = t.ossOperator.Enqueue(analytics.Group{
			UserId:  t.ipAddress,
			GroupId: t.getCompanyDomain(),
			Traits:  analytics.NewTraits().Set("company_domain", t.getCompanyDomain()),
		})
	}
}

func (t *Telemetry) SendIdentifyEvent(data map[string]interface{}, userEmail string) {
	if !t.isTelemetryEnabled() || t.isTelemetryAnonymous() {
		return
	}
	// ignore telemetry for default user
	if userEmail == DEFAULT_CLOUD_EMAIL || t.GetUserEmail() == DEFAULT_CLOUD_EMAIL {
		return
	}

	if userEmail != "" {
		t.SetUserEmail(userEmail)
		t.SetCompanyDomain(userEmail)
	}
	traits := analytics.NewTraits()

	for k, v := range data {
		traits.Set(k, v)
	}
	if t.saasOperator != nil {
		_ = t.saasOperator.Enqueue(analytics.Identify{
			UserId: t.GetUserEmail(),
			Traits: traits,
		})
	}
	if t.ossOperator != nil {
		_ = t.ossOperator.Enqueue(analytics.Identify{
			UserId: t.ipAddress,
			Traits: traits,
		})
	}
}

func (t *Telemetry) SendGroupEvent(data map[string]interface{}, userEmail string) {
	if !t.isTelemetryEnabled() || t.isTelemetryAnonymous() {
		return
	}
	// ignore telemetry for default user
	if userEmail == DEFAULT_CLOUD_EMAIL || t.GetUserEmail() == DEFAULT_CLOUD_EMAIL {
		return
	}

	if userEmail != "" {
		t.SetUserEmail(userEmail)
		t.SetCompanyDomain(userEmail)
	}
	traits := analytics.NewTraits()

	for k, v := range data {
		traits.Set(k, v)
	}
	if t.saasOperator != nil {
		_ = t.saasOperator.Enqueue(analytics.Group{
			UserId:  t.GetUserEmail(),
			GroupId: t.getCompanyDomain(),
			Traits:  traits,
		})
	}
	if t.ossOperator != nil {
		_ = t.ossOperator.Enqueue(analytics.Group{
			UserId:  t.ipAddress,
			GroupId: t.getCompanyDomain(),
			Traits:  traits,
		})
	}
}

func (t *Telemetry) SetUserEmail(email string) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.userEmail = email
}

func (t *Telemetry) SetPatTokenUser() {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.patTokenUser = true
}

func (t *Telemetry) GetUserEmail() string {
	t.mutex.RLock()
	defer t.mutex.RUnlock()
	return t.userEmail
}

func (t *Telemetry) SetSaasOperator(saasOperatorKey string) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	if saasOperatorKey == "" {
		return
	}
	t.saasOperator = analytics.New(saasOperatorKey)
}

func (t *Telemetry) SetCompanyDomain(email string) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	email_split := strings.Split(email, "@")
	if len(email_split) != 2 {
		t.companyDomain = email
	}
	t.companyDomain = email_split[1]

}

func (t *Telemetry) getCompanyDomain() string {
	t.mutex.RLock()
	defer t.mutex.RUnlock()
	return t.companyDomain
}

func (t *Telemetry) checkEvents(event string) bool {
	sendEvent := true
	if event == TELEMETRY_EVENT_USER && t.isTelemetryAnonymous() {
		sendEvent = false
	}
	return sendEvent
}

func (t *Telemetry) SendEvent(event string, data map[string]interface{}, userEmail string, rateLimitFlag bool, viaEventsAPI bool) {

	// ignore telemetry for default user
	if userEmail == DEFAULT_CLOUD_EMAIL || t.GetUserEmail() == DEFAULT_CLOUD_EMAIL {
		return
	}

	if userEmail != "" {
		t.SetUserEmail(userEmail)
		t.SetCompanyDomain(userEmail)
	}

	if !t.isTelemetryEnabled() {
		return
	}

	ok := t.checkEvents(event)
	if !ok {
		return
	}

	// drop events with properties matching
	if ignoreEvents(event, data) {
		return
	}

	if rateLimitFlag {
		telemetry.mutex.Lock()
		limit := t.rateLimits[event]
		if limit < RATE_LIMIT_VALUE {
			t.rateLimits[event] += 1
			telemetry.mutex.Unlock()
		} else {
			telemetry.mutex.Unlock()
			return
		}
	}

	// zap.L().Info(data)
	properties := analytics.NewProperties()
	properties.Set("version", version.Info.Version())
	properties.Set("deploymentType", getDeploymentType())
	properties.Set("companyDomain", t.getCompanyDomain())

	for k, v := range data {
		properties.Set(k, v)
	}

	userId := t.ipAddress
	if t.isTelemetryAnonymous() || userId == IP_NOT_FOUND_PLACEHOLDER {
		userId = "anonymous"
	}

	// check if event is part of SAAS_EVENTS_LIST
	_, isSaaSEvent := SAAS_EVENTS_LIST[event]

	if t.saasOperator != nil && t.GetUserEmail() != "" && (isSaaSEvent || viaEventsAPI) {
		_ = t.saasOperator.Enqueue(analytics.Track{
			Event:      event,
			UserId:     t.GetUserEmail(),
			Properties: properties,
			Context: &analytics.Context{
				Extra: map[string]interface{}{
					"groupId": t.getCompanyDomain(),
				},
			},
		})
	}

	_, isOSSEvent := OSS_EVENTS_LIST[event]

	if t.ossOperator != nil && isOSSEvent {
		_ = t.ossOperator.Enqueue(analytics.Track{
			Event:      event,
			UserId:     userId,
			Properties: properties,
			Context: &analytics.Context{
				Extra: map[string]interface{}{
					"groupId": t.getCompanyDomain(),
				},
			},
		})
	}
}

func (t *Telemetry) isTelemetryAnonymous() bool {
	t.mutex.RLock()
	defer t.mutex.RUnlock()
	return t.isAnonymous
}

func (t *Telemetry) SetTelemetryAnonymous(value bool) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.isAnonymous = value
}

func (t *Telemetry) isTelemetryEnabled() bool {
	t.mutex.RLock()
	defer t.mutex.RUnlock()
	return t.isEnabled
}

func (t *Telemetry) SetTelemetryEnabled(value bool) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.isEnabled = value
}

func (t *Telemetry) SetReader(reader interfaces.Reader) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.reader = reader
}

func (t *Telemetry) SetSqlStore(store sqlstore.SQLStore) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.sqlStore = store
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
