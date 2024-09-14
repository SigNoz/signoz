package clickhouseReader

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"os"
	"reflect"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"github.com/google/uuid"
	"github.com/mailru/easyjson"
	"github.com/oklog/oklog/pkg/group"
	"github.com/pkg/errors"
	"github.com/prometheus/common/promlog"
	"github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/promql"

	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
	"github.com/prometheus/prometheus/util/stats"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jmoiron/sqlx"

	promModel "github.com/prometheus/common/model"
	"go.uber.org/zap"

	queryprogress "go.signoz.io/signoz/pkg/query-service/app/clickhouseReader/query_progress"
	"go.signoz.io/signoz/pkg/query-service/app/logs"
	"go.signoz.io/signoz/pkg/query-service/app/services"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	chErrors "go.signoz.io/signoz/pkg/query-service/errors"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

const (
	primaryNamespace           = "clickhouse"
	archiveNamespace           = "clickhouse-archive"
	signozTraceDBName          = "signoz_traces"
	signozHistoryDBName        = "signoz_analytics"
	ruleStateHistoryTableName  = "distributed_rule_state_history_v0"
	signozDurationMVTable      = "distributed_durationSort"
	signozUsageExplorerTable   = "distributed_usage_explorer"
	signozSpansTable           = "distributed_signoz_spans"
	signozErrorIndexTable      = "distributed_signoz_error_index_v2"
	signozTraceTableName       = "distributed_signoz_index_v2"
	signozTraceLocalTableName  = "signoz_index_v2"
	signozMetricDBName         = "signoz_metrics"
	signozSampleLocalTableName = "samples_v4"
	signozSampleTableName      = "distributed_samples_v4"

	signozTSLocalTableNameV4 = "time_series_v4"
	signozTSTableNameV4      = "distributed_time_series_v4"

	signozTSLocalTableNameV46Hrs = "time_series_v4_6hrs"
	signozTSTableNameV46Hrs      = "distributed_time_series_v4_6hrs"

	signozTSLocalTableNameV41Day = "time_series_v4_1day"
	signozTSTableNameV41Day      = "distributed_time_series_v4_1day"

	minTimespanForProgressiveSearch       = time.Hour
	minTimespanForProgressiveSearchMargin = time.Minute
	maxProgressiveSteps                   = 4
	charset                               = "abcdefghijklmnopqrstuvwxyz" +
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	NANOSECOND = 1000000000
)

var (
	ErrNoOperationsTable            = errors.New("no operations table supplied")
	ErrNoIndexTable                 = errors.New("no index table supplied")
	ErrStartTimeRequired            = errors.New("start time is required for search queries")
	seededRand           *rand.Rand = rand.New(
		rand.NewSource(time.Now().UnixNano()))
)

// SpanWriter for reading spans from ClickHouse
type ClickHouseReader struct {
	db                      clickhouse.Conn
	localDB                 *sqlx.DB
	TraceDB                 string
	operationsTable         string
	durationTable           string
	indexTable              string
	errorTable              string
	usageExplorerTable      string
	SpansTable              string
	spanAttributeTable      string
	spanAttributesKeysTable string
	dependencyGraphTable    string
	topLevelOperationsTable string
	logsDB                  string
	logsTable               string
	logsLocalTable          string
	logsAttributeKeys       string
	logsResourceKeys        string
	logsTagAttributeTable   string
	queryEngine             *promql.Engine
	remoteStorage           *remote.Storage
	fanoutStorage           *storage.Storage
	queryProgressTracker    queryprogress.QueryProgressTracker

	logsTableV2              string
	logsLocalTableV2         string
	logsResourceTableV2      string
	logsResourceLocalTableV2 string

	promConfigFile string
	promConfig     *config.Config
	alertManager   am.Manager
	featureFlags   interfaces.FeatureLookup

	liveTailRefreshSeconds int
	cluster                string

	useLogsNewSchema bool
	logsTableName    string
}

// NewTraceReader returns a TraceReader for the database
func NewReader(
	localDB *sqlx.DB,
	configFile string,
	featureFlag interfaces.FeatureLookup,
	maxIdleConns int,
	maxOpenConns int,
	dialTimeout time.Duration,
	cluster string,
	useLogsNewSchema bool,
) *ClickHouseReader {

	datasource := os.Getenv("ClickHouseUrl")
	options := NewOptions(datasource, maxIdleConns, maxOpenConns, dialTimeout, primaryNamespace, archiveNamespace)
	db, err := initialize(options)

	if err != nil {
		zap.L().Fatal("failed to initialize ClickHouse", zap.Error(err))
	}

	return NewReaderFromClickhouseConnection(db, options, localDB, configFile, featureFlag, cluster, useLogsNewSchema)
}

func NewReaderFromClickhouseConnection(
	db driver.Conn,
	options *Options,
	localDB *sqlx.DB,
	configFile string,
	featureFlag interfaces.FeatureLookup,
	cluster string,
	useLogsNewSchema bool,
) *ClickHouseReader {
	alertManager, err := am.New("")
	if err != nil {
		zap.L().Error("failed to initialize alert manager", zap.Error(err))
		zap.L().Error("check if the alert manager URL is correctly set and valid")
		os.Exit(1)
	}

	regex := os.Getenv("ClickHouseOptimizeReadInOrderRegex")
	var regexCompiled *regexp.Regexp
	if regex != "" {
		regexCompiled, err = regexp.Compile(regex)
		if err != nil {
			zap.L().Error("Incorrect regex for ClickHouseOptimizeReadInOrderRegex")
			os.Exit(1)
		}
	}

	wrap := clickhouseConnWrapper{
		conn: db,
		settings: ClickhouseQuerySettings{
			MaxExecutionTime:                    os.Getenv("ClickHouseMaxExecutionTime"),
			MaxExecutionTimeLeaf:                os.Getenv("ClickHouseMaxExecutionTimeLeaf"),
			TimeoutBeforeCheckingExecutionSpeed: os.Getenv("ClickHouseTimeoutBeforeCheckingExecutionSpeed"),
			MaxBytesToRead:                      os.Getenv("ClickHouseMaxBytesToRead"),
			OptimizeReadInOrderRegex:            os.Getenv("ClickHouseOptimizeReadInOrderRegex"),
			OptimizeReadInOrderRegexCompiled:    regexCompiled,
		},
	}

	logsTableName := options.primary.LogsTable
	if useLogsNewSchema {
		logsTableName = options.primary.LogsTableV2
	}

	return &ClickHouseReader{
		db:                      wrap,
		localDB:                 localDB,
		TraceDB:                 options.primary.TraceDB,
		alertManager:            alertManager,
		operationsTable:         options.primary.OperationsTable,
		indexTable:              options.primary.IndexTable,
		errorTable:              options.primary.ErrorTable,
		usageExplorerTable:      options.primary.UsageExplorerTable,
		durationTable:           options.primary.DurationTable,
		SpansTable:              options.primary.SpansTable,
		spanAttributeTable:      options.primary.SpanAttributeTable,
		spanAttributesKeysTable: options.primary.SpanAttributeKeysTable,
		dependencyGraphTable:    options.primary.DependencyGraphTable,
		topLevelOperationsTable: options.primary.TopLevelOperationsTable,
		logsDB:                  options.primary.LogsDB,
		logsTable:               options.primary.LogsTable,
		logsLocalTable:          options.primary.LogsLocalTable,
		logsAttributeKeys:       options.primary.LogsAttributeKeysTable,
		logsResourceKeys:        options.primary.LogsResourceKeysTable,
		logsTagAttributeTable:   options.primary.LogsTagAttributeTable,
		liveTailRefreshSeconds:  options.primary.LiveTailRefreshSeconds,
		promConfigFile:          configFile,
		featureFlags:            featureFlag,
		cluster:                 cluster,
		queryProgressTracker:    queryprogress.NewQueryProgressTracker(),

		useLogsNewSchema: useLogsNewSchema,

		logsTableV2:              options.primary.LogsTableV2,
		logsLocalTableV2:         options.primary.LogsLocalTableV2,
		logsResourceTableV2:      options.primary.LogsResourceTableV2,
		logsResourceLocalTableV2: options.primary.LogsResourceLocalTableV2,
		logsTableName:            logsTableName,
	}
}

func (r *ClickHouseReader) Start(readerReady chan bool) {
	logLevel := promlog.AllowedLevel{}
	logLevel.Set("debug")
	allowedFormat := promlog.AllowedFormat{}
	allowedFormat.Set("logfmt")

	promlogConfig := promlog.Config{
		Level:  &logLevel,
		Format: &allowedFormat,
	}

	logger := promlog.New(&promlogConfig)

	startTime := func() (int64, error) {
		return int64(promModel.Latest), nil
	}

	remoteStorage := remote.NewStorage(
		log.With(logger, "component", "remote"),
		nil,
		startTime,
		"",
		time.Duration(1*time.Minute),
		nil,
	)

	cfg := struct {
		configFile string

		localStoragePath    string
		lookbackDelta       promModel.Duration
		webTimeout          promModel.Duration
		queryTimeout        promModel.Duration
		queryConcurrency    int
		queryMaxSamples     int
		RemoteFlushDeadline promModel.Duration

		prometheusURL string

		logLevel promlog.AllowedLevel
	}{
		configFile: r.promConfigFile,
	}

	fanoutStorage := storage.NewFanout(logger, remoteStorage)

	opts := promql.EngineOpts{
		Logger:     log.With(logger, "component", "query engine"),
		Reg:        nil,
		MaxSamples: 50000000,
		Timeout:    time.Duration(2 * time.Minute),
		ActiveQueryTracker: promql.NewActiveQueryTracker(
			"",
			20,
			log.With(logger, "component", "activeQueryTracker"),
		),
	}

	queryEngine := promql.NewEngine(opts)

	reloaders := []func(cfg *config.Config) error{
		remoteStorage.ApplyConfig,
	}

	// sync.Once is used to make sure we can close the channel at different execution stages(SIGTERM or when the config is loaded).
	type closeOnce struct {
		C     chan struct{}
		once  sync.Once
		Close func()
	}
	// Wait until the server is ready to handle reloading.
	reloadReady := &closeOnce{
		C: make(chan struct{}),
	}
	reloadReady.Close = func() {
		reloadReady.once.Do(func() {
			close(reloadReady.C)
		})
	}

	var g group.Group
	{
		// Initial configuration loading.
		cancel := make(chan struct{})
		g.Add(
			func() error {
				var err error
				r.promConfig, err = reloadConfig(cfg.configFile, logger, reloaders...)
				if err != nil {
					return fmt.Errorf("error loading config from %q: %s", cfg.configFile, err)
				}

				reloadReady.Close()

				<-cancel

				return nil
			},
			func(err error) {
				close(cancel)
			},
		)
	}
	r.queryEngine = queryEngine
	r.remoteStorage = remoteStorage
	r.fanoutStorage = &fanoutStorage
	readerReady <- true

	if err := g.Run(); err != nil {
		level.Error(logger).Log("err", err)
		os.Exit(1)
	}

}

func (r *ClickHouseReader) GetQueryEngine() *promql.Engine {
	return r.queryEngine
}

func (r *ClickHouseReader) GetFanoutStorage() *storage.Storage {
	return r.fanoutStorage
}

func reloadConfig(filename string, logger log.Logger, rls ...func(*config.Config) error) (promConfig *config.Config, err error) {
	level.Info(logger).Log("msg", "Loading configuration file", "filename", filename)

	conf, err := config.LoadFile(filename, false, false, logger)
	if err != nil {
		return nil, fmt.Errorf("couldn't load configuration (--config.file=%q): %v", filename, err)
	}

	failed := false
	for _, rl := range rls {
		if err := rl(conf); err != nil {
			level.Error(logger).Log("msg", "Failed to apply configuration", "err", err)
			failed = true
		}
	}
	if failed {
		return nil, fmt.Errorf("one or more errors occurred while applying the new configuration (--config.file=%q)", filename)
	}
	level.Info(logger).Log("msg", "Completed loading of configuration file", "filename", filename)
	return conf, nil
}

func initialize(options *Options) (clickhouse.Conn, error) {

	db, err := connect(options.getPrimary())
	if err != nil {
		return nil, fmt.Errorf("error connecting to primary db: %v", err)
	}

	return db, nil
}

func connect(cfg *namespaceConfig) (clickhouse.Conn, error) {
	if cfg.Encoding != EncodingJSON && cfg.Encoding != EncodingProto {
		return nil, fmt.Errorf("unknown encoding %q, supported: %q, %q", cfg.Encoding, EncodingJSON, EncodingProto)
	}

	return cfg.Connector(cfg)
}

func (r *ClickHouseReader) GetConn() clickhouse.Conn {
	return r.db
}

func (r *ClickHouseReader) LoadChannel(channel *model.ChannelItem) *model.ApiError {

	receiver := &am.Receiver{}
	if err := json.Unmarshal([]byte(channel.Data), receiver); err != nil { // Parse []byte to go struct pointer
		return &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	response, err := http.Post(constants.GetAlertManagerApiPrefix()+"v1/receivers", "application/json", bytes.NewBuffer([]byte(channel.Data)))

	if err != nil {
		zap.L().Error("Error in getting response of API call to alertmanager/v1/receivers", zap.Error(err))
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if response.StatusCode > 299 {
		responseData, _ := io.ReadAll(response.Body)

		err := fmt.Errorf("error in getting 2xx response in API call to alertmanager/v1/receivers")
		zap.L().Error("Error in getting 2xx response in API call to alertmanager/v1/receivers", zap.String("Status", response.Status), zap.String("Data", string(responseData)))

		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (r *ClickHouseReader) GetChannel(id string) (*model.ChannelItem, *model.ApiError) {

	idInt, _ := strconv.Atoi(id)
	channel := model.ChannelItem{}

	query := "SELECT id, created_at, updated_at, name, type, data data FROM notification_channels WHERE id=? "

	stmt, err := r.localDB.Preparex(query)

	if err != nil {
		zap.L().Error("Error in preparing sql query for GetChannel", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = stmt.Get(&channel, idInt)

	if err != nil {
		zap.L().Error("Error in getting channel with id", zap.Int("id", idInt), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &channel, nil

}

func (r *ClickHouseReader) DeleteChannel(id string) *model.ApiError {

	idInt, _ := strconv.Atoi(id)

	channelToDelete, apiErrorObj := r.GetChannel(id)

	if apiErrorObj != nil {
		return apiErrorObj
	}

	tx, err := r.localDB.Begin()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	{
		stmt, err := tx.Prepare(`DELETE FROM notification_channels WHERE id=$1;`)
		if err != nil {
			zap.L().Error("Error in preparing statement for INSERT to notification_channels", zap.Error(err))
			tx.Rollback()
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(idInt); err != nil {
			zap.L().Error("Error in Executing prepared statement for INSERT to notification_channels", zap.Error(err))
			tx.Rollback() // return an error too, we may want to wrap them
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	}

	apiError := r.alertManager.DeleteRoute(channelToDelete.Name)
	if apiError != nil {
		tx.Rollback()
		return apiError
	}

	err = tx.Commit()
	if err != nil {
		zap.L().Error("Error in committing transaction for DELETE command to notification_channels", zap.Error(err))
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil

}

func (r *ClickHouseReader) GetChannels() (*[]model.ChannelItem, *model.ApiError) {

	channels := []model.ChannelItem{}

	query := "SELECT id, created_at, updated_at, name, type, data data FROM notification_channels"

	err := r.localDB.Select(&channels, query)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &channels, nil

}

func getChannelType(receiver *am.Receiver) string {

	if receiver.EmailConfigs != nil {
		return "email"
	}
	if receiver.OpsGenieConfigs != nil {
		return "opsgenie"
	}
	if receiver.PagerdutyConfigs != nil {
		return "pagerduty"
	}
	if receiver.PushoverConfigs != nil {
		return "pushover"
	}
	if receiver.SNSConfigs != nil {
		return "sns"
	}
	if receiver.SlackConfigs != nil {
		return "slack"
	}
	if receiver.VictorOpsConfigs != nil {
		return "victorops"
	}
	if receiver.WebhookConfigs != nil {
		return "webhook"
	}
	if receiver.WechatConfigs != nil {
		return "wechat"
	}
	if receiver.MSTeamsConfigs != nil {
		return "msteams"
	}
	return ""
}

func (r *ClickHouseReader) EditChannel(receiver *am.Receiver, id string) (*am.Receiver, *model.ApiError) {

	idInt, _ := strconv.Atoi(id)

	channel, apiErrObj := r.GetChannel(id)

	if apiErrObj != nil {
		return nil, apiErrObj
	}
	if channel.Name != receiver.Name {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("channel name cannot be changed")}
	}

	tx, err := r.localDB.Begin()
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	channel_type := getChannelType(receiver)

	// check if channel type is supported in the current user plan
	if err := r.featureFlags.CheckFeature(fmt.Sprintf("ALERT_CHANNEL_%s", strings.ToUpper(channel_type))); err != nil {
		zap.L().Warn("an unsupported feature was blocked", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("unsupported feature. please upgrade your plan to access this feature")}
	}

	receiverString, _ := json.Marshal(receiver)

	{
		stmt, err := tx.Prepare(`UPDATE notification_channels SET updated_at=$1, type=$2, data=$3 WHERE id=$4;`)

		if err != nil {
			zap.L().Error("Error in preparing statement for UPDATE to notification_channels", zap.Error(err))
			tx.Rollback()
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(time.Now(), channel_type, string(receiverString), idInt); err != nil {
			zap.L().Error("Error in Executing prepared statement for UPDATE to notification_channels", zap.Error(err))
			tx.Rollback() // return an error too, we may want to wrap them
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	}

	apiError := r.alertManager.EditRoute(receiver)
	if apiError != nil {
		tx.Rollback()
		return nil, apiError
	}

	err = tx.Commit()
	if err != nil {
		zap.L().Error("Error in committing transaction for INSERT to notification_channels", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return receiver, nil

}

func (r *ClickHouseReader) CreateChannel(receiver *am.Receiver) (*am.Receiver, *model.ApiError) {

	channel_type := getChannelType(receiver)

	// check if channel type is supported in the current user plan
	if err := r.featureFlags.CheckFeature(fmt.Sprintf("ALERT_CHANNEL_%s", strings.ToUpper(channel_type))); err != nil {
		zap.L().Warn("an unsupported feature was blocked", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("unsupported feature. please upgrade your plan to access this feature")}
	}

	receiverString, _ := json.Marshal(receiver)

	tx, err := r.localDB.Begin()
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	{
		stmt, err := tx.Prepare(`INSERT INTO notification_channels (created_at, updated_at, name, type, data) VALUES($1,$2,$3,$4,$5);`)
		if err != nil {
			zap.L().Error("Error in preparing statement for INSERT to notification_channels", zap.Error(err))
			tx.Rollback()
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(time.Now(), time.Now(), receiver.Name, channel_type, string(receiverString)); err != nil {
			zap.L().Error("Error in Executing prepared statement for INSERT to notification_channels", zap.Error(err))
			tx.Rollback() // return an error too, we may want to wrap them
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	}

	apiError := r.alertManager.AddRoute(receiver)
	if apiError != nil {
		tx.Rollback()
		return nil, apiError
	}

	err = tx.Commit()
	if err != nil {
		zap.L().Error("Error in committing transaction for INSERT to notification_channels", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return receiver, nil

}

func (r *ClickHouseReader) GetInstantQueryMetricsResult(ctx context.Context, queryParams *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.queryEngine.NewInstantQuery(ctx, r.remoteStorage, nil, queryParams.Query, queryParams.Time)
	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	res := qry.Exec(ctx)

	// Optional stats field in response if parameter "stats" is not empty.
	var qs stats.QueryStats
	if queryParams.Stats != "" {
		qs = stats.NewQueryStats(qry.Stats())
	}

	qry.Close()
	return res, &qs, nil

}

func (r *ClickHouseReader) GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.queryEngine.NewRangeQuery(ctx, r.remoteStorage, nil, query.Query, query.Start, query.End, query.Step)

	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	res := qry.Exec(ctx)

	// Optional stats field in response if parameter "stats" is not empty.
	var qs stats.QueryStats
	if query.Stats != "" {
		qs = stats.NewQueryStats(qry.Stats())
	}

	qry.Close()
	return res, &qs, nil
}

func (r *ClickHouseReader) GetServicesList(ctx context.Context) (*[]string, error) {

	services := []string{}
	query := fmt.Sprintf(`SELECT DISTINCT serviceName FROM %s.%s WHERE toDate(timestamp) > now() - INTERVAL 1 DAY`, r.TraceDB, r.indexTable)

	rows, err := r.db.Query(ctx, query)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	defer rows.Close()
	for rows.Next() {
		var serviceName string
		if err := rows.Scan(&serviceName); err != nil {
			return &services, err
		}
		services = append(services, serviceName)
	}
	return &services, nil
}

func (r *ClickHouseReader) GetTopLevelOperations(ctx context.Context, skipConfig *model.SkipConfig, start, end time.Time, services []string) (*map[string][]string, *model.ApiError) {

	start = start.In(time.UTC)

	// The `top_level_operations` that have `time` >= start
	operations := map[string][]string{}
	// We can't use the `end` because the `top_level_operations` table has the most recent instances of the operations
	// We can only use the `start` time to filter the operations
	query := fmt.Sprintf(`SELECT name, serviceName, max(time) as ts FROM %s.%s WHERE time >= @start`, r.TraceDB, r.topLevelOperationsTable)
	if len(services) > 0 {
		query += ` AND serviceName IN @services`
	}
	query += ` GROUP BY name, serviceName ORDER BY ts DESC LIMIT 5000`

	rows, err := r.db.Query(ctx, query, clickhouse.Named("start", start), clickhouse.Named("services", services))

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	defer rows.Close()
	for rows.Next() {
		var name, serviceName string
		var t time.Time
		if err := rows.Scan(&name, &serviceName, &t); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error in reading data")}
		}
		if _, ok := operations[serviceName]; !ok {
			operations[serviceName] = []string{"overflow_operation"}
		}
		if skipConfig.ShouldSkip(serviceName, name) {
			continue
		}
		operations[serviceName] = append(operations[serviceName], name)
	}
	return &operations, nil
}

func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams, skipConfig *model.SkipConfig) (*[]model.ServiceItem, *model.ApiError) {

	if r.indexTable == "" {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: ErrNoIndexTable}
	}

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx, skipConfig, *queryParams.Start, *queryParams.End, nil)
	if apiErr != nil {
		return nil, apiErr
	}

	serviceItems := []model.ServiceItem{}
	var wg sync.WaitGroup
	// limit the number of concurrent queries to not overload the clickhouse server
	sem := make(chan struct{}, 10)
	var mtx sync.RWMutex

	for svc, ops := range *topLevelOps {
		sem <- struct{}{}
		wg.Add(1)
		go func(svc string, ops []string) {
			defer wg.Done()
			defer func() { <-sem }()
			var serviceItem model.ServiceItem
			var numErrors uint64

			// Even if the total number of operations within the time range is less and the all
			// the top level operations are high, we want to warn to let user know the issue
			// with the instrumentation
			serviceItem.DataWarning = model.DataWarning{
				TopLevelOps: (*topLevelOps)[svc],
			}

			// default max_query_size = 262144
			// Let's assume the average size of the item in `ops` is 50 bytes
			// We can have 262144/50 = 5242 items in the `ops` array
			// Although we have make it as big as 5k, We cap the number of items
			// in the `ops` array to 1500

			ops = ops[:int(math.Min(1500, float64(len(ops))))]

			query := fmt.Sprintf(
				`SELECT
					quantile(0.99)(durationNano) as p99,
					avg(durationNano) as avgDuration,
					count(*) as numCalls
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end`,
				r.TraceDB, r.indexTable,
			)
			errorQuery := fmt.Sprintf(
				`SELECT
					count(*) as numErrors
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
				r.TraceDB, r.indexTable,
			)

			args := []interface{}{}
			args = append(args,
				clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
				clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
				clickhouse.Named("serviceName", svc),
				clickhouse.Named("names", ops),
			)
			// create TagQuery from TagQueryParams
			tags := createTagQueryFromTagQueryParams(queryParams.Tags)
			subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
			query += subQuery
			args = append(args, argsSubQuery...)
			if errStatus != nil {
				zap.L().Error("Error in processing sql query", zap.Error(errStatus))
				return
			}
			err := r.db.QueryRow(
				ctx,
				query,
				args...,
			).ScanStruct(&serviceItem)

			if serviceItem.NumCalls == 0 {
				return
			}

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}
			subQuery, argsSubQuery, errStatus = buildQueryWithTagParams(ctx, tags)
			if errStatus != nil {
				zap.L().Error("Error building query with tag params", zap.Error(errStatus))
				return
			}
			errorQuery += subQuery
			args = append(args, argsSubQuery...)
			err = r.db.QueryRow(ctx, errorQuery, args...).Scan(&numErrors)
			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}

			serviceItem.ServiceName = svc
			serviceItem.NumErrors = numErrors
			mtx.Lock()
			serviceItems = append(serviceItems, serviceItem)
			mtx.Unlock()
		}(svc, ops)
	}
	wg.Wait()

	for idx := range serviceItems {
		serviceItems[idx].CallRate = float64(serviceItems[idx].NumCalls) / float64(queryParams.Period)
		serviceItems[idx].ErrorRate = float64(serviceItems[idx].NumErrors) * 100 / float64(serviceItems[idx].NumCalls)
	}
	return &serviceItems, nil
}

func (r *ClickHouseReader) GetServiceOverview(ctx context.Context, queryParams *model.GetServiceOverviewParams, skipConfig *model.SkipConfig) (*[]model.ServiceOverviewItem, *model.ApiError) {

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx, skipConfig, *queryParams.Start, *queryParams.End, nil)
	if apiErr != nil {
		return nil, apiErr
	}
	ops, ok := (*topLevelOps)[queryParams.ServiceName]
	if !ok {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("service not found")}
	}

	namedArgs := []interface{}{
		clickhouse.Named("interval", strconv.Itoa(int(queryParams.StepSeconds/60))),
		clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
		clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
		clickhouse.Named("serviceName", queryParams.ServiceName),
		clickhouse.Named("names", ops),
	}

	serviceOverviewItems := []model.ServiceOverviewItem{}

	query := fmt.Sprintf(`
		SELECT
			toStartOfInterval(timestamp, INTERVAL @interval minute) as time,
			quantile(0.99)(durationNano) as p99,
			quantile(0.95)(durationNano) as p95,
			quantile(0.50)(durationNano) as p50,
			count(*) as numCalls
		FROM %s.%s
		WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end`,
		r.TraceDB, r.indexTable,
	)
	args := []interface{}{}
	args = append(args, namedArgs...)

	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY time ORDER BY time DESC"
	err := r.db.Select(ctx, &serviceOverviewItems, query, args...)

	zap.L().Debug("running query", zap.String("query", query))

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	serviceErrorItems := []model.ServiceErrorItem{}

	query = fmt.Sprintf(`
		SELECT
			toStartOfInterval(timestamp, INTERVAL @interval minute) as time,
			count(*) as numErrors
		FROM %s.%s
		WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
		r.TraceDB, r.indexTable,
	)
	args = []interface{}{}
	args = append(args, namedArgs...)
	subQuery, argsSubQuery, errStatus = buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY time ORDER BY time DESC"
	err = r.db.Select(ctx, &serviceErrorItems, query, args...)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	m := make(map[int64]int)

	for j := range serviceErrorItems {
		m[int64(serviceErrorItems[j].Time.UnixNano())] = int(serviceErrorItems[j].NumErrors)
	}

	for i := range serviceOverviewItems {
		serviceOverviewItems[i].Timestamp = int64(serviceOverviewItems[i].Time.UnixNano())

		if val, ok := m[serviceOverviewItems[i].Timestamp]; ok {
			serviceOverviewItems[i].NumErrors = uint64(val)
		}
		serviceOverviewItems[i].ErrorRate = float64(serviceOverviewItems[i].NumErrors) * 100 / float64(serviceOverviewItems[i].NumCalls)
		serviceOverviewItems[i].CallRate = float64(serviceOverviewItems[i].NumCalls) / float64(queryParams.StepSeconds)
	}

	return &serviceOverviewItems, nil
}

func buildFilterArrayQuery(ctx context.Context, excludeMap map[string]struct{}, params []string, filter string, query *string, args []interface{}) []interface{} {
	for i, e := range params {
		filterKey := filter + String(5)
		if i == 0 && i == len(params)-1 {
			if _, ok := excludeMap[filter]; ok {
				*query += fmt.Sprintf(" AND NOT (%s=@%s)", filter, filterKey)
			} else {
				*query += fmt.Sprintf(" AND (%s=@%s)", filter, filterKey)
			}
		} else if i == 0 && i != len(params)-1 {
			if _, ok := excludeMap[filter]; ok {
				*query += fmt.Sprintf(" AND NOT (%s=@%s", filter, filterKey)
			} else {
				*query += fmt.Sprintf(" AND (%s=@%s", filter, filterKey)
			}
		} else if i != 0 && i == len(params)-1 {
			*query += fmt.Sprintf(" OR %s=@%s)", filter, filterKey)
		} else {
			*query += fmt.Sprintf(" OR %s=@%s", filter, filterKey)
		}
		args = append(args, clickhouse.Named(filterKey, e))
	}
	return args
}

func (r *ClickHouseReader) GetSpanFilters(ctx context.Context, queryParams *model.SpanFilterParams) (*model.SpanFiltersResponse, *model.ApiError) {

	var query string
	excludeMap := make(map[string]struct{})
	for _, e := range queryParams.Exclude {
		if e == constants.OperationRequest {
			excludeMap[constants.OperationDB] = struct{}{}
			continue
		}
		excludeMap[e] = struct{}{}
	}

	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
	if len(queryParams.TraceID) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.TraceID, constants.TraceID, &query, args)
	}
	if len(queryParams.ServiceName) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ServiceName, constants.ServiceName, &query, args)
	}
	if len(queryParams.HttpRoute) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpRoute, constants.HttpRoute, &query, args)
	}
	if len(queryParams.HttpHost) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpHost, constants.HttpHost, &query, args)
	}
	if len(queryParams.HttpMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpMethod, constants.HttpMethod, &query, args)
	}
	if len(queryParams.HttpUrl) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpUrl, constants.HttpUrl, &query, args)
	}
	if len(queryParams.Operation) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Operation, constants.OperationDB, &query, args)
	}
	if len(queryParams.RPCMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.RPCMethod, constants.RPCMethod, &query, args)
	}
	if len(queryParams.ResponseStatusCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ResponseStatusCode, constants.ResponseStatusCode, &query, args)
	}

	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= @durationNanoMin"
		args = append(args, clickhouse.Named("durationNanoMin", queryParams.MinDuration))
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= @durationNanoMax"
		args = append(args, clickhouse.Named("durationNanoMax", queryParams.MaxDuration))
	}

	if len(queryParams.SpanKind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.SpanKind))
	}

	query = getStatusFilters(query, queryParams.Status, excludeMap)

	traceFilterReponse := model.SpanFiltersResponse{
		Status:             map[string]uint64{},
		Duration:           map[string]uint64{},
		ServiceName:        map[string]uint64{},
		Operation:          map[string]uint64{},
		ResponseStatusCode: map[string]uint64{},
		RPCMethod:          map[string]uint64{},
		HttpMethod:         map[string]uint64{},
		HttpUrl:            map[string]uint64{},
		HttpRoute:          map[string]uint64{},
		HttpHost:           map[string]uint64{},
	}

	for _, e := range queryParams.GetFilters {
		switch e {
		case constants.TraceID:
			continue
		case constants.ServiceName:
			finalQuery := fmt.Sprintf("SELECT serviceName, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY serviceName"
			var dBResponse []model.DBResponseServiceName
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.ServiceName != "" {
					traceFilterReponse.ServiceName[service.ServiceName] = service.Count
				}
			}
		case constants.HttpRoute:
			finalQuery := fmt.Sprintf("SELECT httpRoute, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY httpRoute"
			var dBResponse []model.DBResponseHttpRoute
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.HttpRoute != "" {
					traceFilterReponse.HttpRoute[service.HttpRoute] = service.Count
				}
			}
		case constants.HttpUrl:
			finalQuery := fmt.Sprintf("SELECT httpUrl, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY httpUrl"
			var dBResponse []model.DBResponseHttpUrl
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.HttpUrl != "" {
					traceFilterReponse.HttpUrl[service.HttpUrl] = service.Count
				}
			}
		case constants.HttpMethod:
			finalQuery := fmt.Sprintf("SELECT httpMethod, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY httpMethod"
			var dBResponse []model.DBResponseHttpMethod
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.HttpMethod != "" {
					traceFilterReponse.HttpMethod[service.HttpMethod] = service.Count
				}
			}
		case constants.HttpHost:
			finalQuery := fmt.Sprintf("SELECT httpHost, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY httpHost"
			var dBResponse []model.DBResponseHttpHost
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.HttpHost != "" {
					traceFilterReponse.HttpHost[service.HttpHost] = service.Count
				}
			}
		case constants.OperationRequest:
			finalQuery := fmt.Sprintf("SELECT name, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY name"
			var dBResponse []model.DBResponseOperation
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.Operation != "" {
					traceFilterReponse.Operation[service.Operation] = service.Count
				}
			}
		case constants.Status:
			finalQuery := fmt.Sprintf("SELECT COUNT(*) as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU AND hasError = true", r.TraceDB, r.indexTable)
			finalQuery += query
			var dBResponse []model.DBResponseTotal
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}

			finalQuery2 := fmt.Sprintf("SELECT COUNT(*) as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU AND hasError = false", r.TraceDB, r.indexTable)
			finalQuery2 += query
			var dBResponse2 []model.DBResponseTotal
			err = r.db.Select(ctx, &dBResponse2, finalQuery2, args...)
			zap.L().Info(finalQuery2)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			if len(dBResponse) > 0 && len(dBResponse2) > 0 {
				traceFilterReponse.Status = map[string]uint64{"ok": dBResponse2[0].NumTotal, "error": dBResponse[0].NumTotal}
			} else if len(dBResponse) > 0 {
				traceFilterReponse.Status = map[string]uint64{"ok": 0, "error": dBResponse[0].NumTotal}
			} else if len(dBResponse2) > 0 {
				traceFilterReponse.Status = map[string]uint64{"ok": dBResponse2[0].NumTotal, "error": 0}
			} else {
				traceFilterReponse.Status = map[string]uint64{"ok": 0, "error": 0}
			}
		case constants.Duration:
			err := r.featureFlags.CheckFeature(constants.DurationSort)
			durationSortEnabled := err == nil
			finalQuery := ""
			if !durationSortEnabled {
				// if duration sort is not enabled, we need to get the min and max duration from the index table
				finalQuery = fmt.Sprintf("SELECT min(durationNano) as min, max(durationNano) as max FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
				finalQuery += query
				var dBResponse []model.DBResponseMinMax
				err = r.db.Select(ctx, &dBResponse, finalQuery, args...)
				zap.L().Info(finalQuery)
				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
				}
				if len(dBResponse) > 0 {
					traceFilterReponse.Duration = map[string]uint64{"minDuration": dBResponse[0].Min, "maxDuration": dBResponse[0].Max}
				}
			} else {
				// when duration sort is enabled, we need to get the min and max duration from the duration table
				finalQuery = fmt.Sprintf("SELECT durationNano as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.durationTable)
				finalQuery += query
				finalQuery += " ORDER BY durationNano LIMIT 1"
				var dBResponse []model.DBResponseTotal
				err = r.db.Select(ctx, &dBResponse, finalQuery, args...)
				zap.L().Info(finalQuery)

				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
				}

				finalQuery = fmt.Sprintf("SELECT durationNano as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.durationTable)
				finalQuery += query
				finalQuery += " ORDER BY durationNano DESC LIMIT 1"
				var dBResponse2 []model.DBResponseTotal
				err = r.db.Select(ctx, &dBResponse2, finalQuery, args...)
				zap.L().Info(finalQuery)

				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
				}
				if len(dBResponse) > 0 {
					traceFilterReponse.Duration["minDuration"] = dBResponse[0].NumTotal
				}
				if len(dBResponse2) > 0 {
					traceFilterReponse.Duration["maxDuration"] = dBResponse2[0].NumTotal
				}
			}
		case constants.RPCMethod:
			finalQuery := fmt.Sprintf("SELECT rpcMethod, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY rpcMethod"
			var dBResponse []model.DBResponseRPCMethod
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.RPCMethod != "" {
					traceFilterReponse.RPCMethod[service.RPCMethod] = service.Count
				}
			}

		case constants.ResponseStatusCode:
			finalQuery := fmt.Sprintf("SELECT responseStatusCode, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY responseStatusCode"
			var dBResponse []model.DBResponseStatusCodeMethod
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.L().Info(finalQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.ResponseStatusCode != "" {
					traceFilterReponse.ResponseStatusCode[service.ResponseStatusCode] = service.Count
				}
			}

		default:
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("filter type: %s not supported", e)}
		}
	}

	return &traceFilterReponse, nil
}

func getStatusFilters(query string, statusParams []string, excludeMap map[string]struct{}) string {

	// status can only be two and if both are selected than they are equivalent to none selected
	if _, ok := excludeMap["status"]; ok {
		if len(statusParams) == 1 {
			if statusParams[0] == "error" {
				query += " AND hasError = false"
			} else if statusParams[0] == "ok" {
				query += " AND hasError = true"
			}
		}
	} else if len(statusParams) == 1 {
		if statusParams[0] == "error" {
			query += " AND hasError = true"
		} else if statusParams[0] == "ok" {
			query += " AND hasError = false"
		}
	}
	return query
}

func (r *ClickHouseReader) GetFilteredSpans(ctx context.Context, queryParams *model.GetFilteredSpansParams) (*model.GetFilterSpansResponse, *model.ApiError) {

	queryTable := fmt.Sprintf("%s.%s", r.TraceDB, r.indexTable)

	excludeMap := make(map[string]struct{})
	for _, e := range queryParams.Exclude {
		if e == constants.OperationRequest {
			excludeMap[constants.OperationDB] = struct{}{}
			continue
		}
		excludeMap[e] = struct{}{}
	}

	var query string
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
	if len(queryParams.TraceID) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.TraceID, constants.TraceID, &query, args)
	}
	if len(queryParams.ServiceName) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ServiceName, constants.ServiceName, &query, args)
	}
	if len(queryParams.HttpRoute) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpRoute, constants.HttpRoute, &query, args)
	}
	if len(queryParams.HttpHost) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpHost, constants.HttpHost, &query, args)
	}
	if len(queryParams.HttpMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpMethod, constants.HttpMethod, &query, args)
	}
	if len(queryParams.HttpUrl) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpUrl, constants.HttpUrl, &query, args)
	}
	if len(queryParams.Operation) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Operation, constants.OperationDB, &query, args)
	}
	if len(queryParams.RPCMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.RPCMethod, constants.RPCMethod, &query, args)
	}

	if len(queryParams.ResponseStatusCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ResponseStatusCode, constants.ResponseStatusCode, &query, args)
	}

	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= @durationNanoMin"
		args = append(args, clickhouse.Named("durationNanoMin", queryParams.MinDuration))
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= @durationNanoMax"
		args = append(args, clickhouse.Named("durationNanoMax", queryParams.MaxDuration))
	}
	query = getStatusFilters(query, queryParams.Status, excludeMap)

	if len(queryParams.SpanKind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.SpanKind))
	}

	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)
	if errStatus != nil {
		return nil, errStatus
	}

	if len(queryParams.OrderParam) != 0 {
		if queryParams.OrderParam == constants.Duration {
			queryTable = fmt.Sprintf("%s.%s", r.TraceDB, r.durationTable)
			if queryParams.Order == constants.Descending {
				query = query + " ORDER BY durationNano DESC"
			}
			if queryParams.Order == constants.Ascending {
				query = query + " ORDER BY durationNano ASC"
			}
		} else if queryParams.OrderParam == constants.Timestamp {
			projectionOptQuery := "SET allow_experimental_projection_optimization = 1"
			err := r.db.Exec(ctx, projectionOptQuery)

			zap.L().Info(projectionOptQuery)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
			}
			if queryParams.Order == constants.Descending {
				query = query + " ORDER BY timestamp DESC"
			}
			if queryParams.Order == constants.Ascending {
				query = query + " ORDER BY timestamp ASC"
			}
		}
	}
	if queryParams.Limit > 0 {
		query = query + " LIMIT @limit"
		args = append(args, clickhouse.Named("limit", queryParams.Limit))
	}

	if queryParams.Offset > 0 {
		query = query + " OFFSET @offset"
		args = append(args, clickhouse.Named("offset", queryParams.Offset))
	}

	var getFilterSpansResponseItems []model.GetFilterSpansResponseItem

	baseQuery := fmt.Sprintf("SELECT timestamp, spanID, traceID, serviceName, name, durationNano, httpMethod, rpcMethod, responseStatusCode FROM %s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryTable)
	baseQuery += query
	err := r.db.Select(ctx, &getFilterSpansResponseItems, baseQuery, args...)
	// Fill status and method
	for i, e := range getFilterSpansResponseItems {
		if e.RPCMethod != "" {
			getFilterSpansResponseItems[i].Method = e.RPCMethod
		} else {
			getFilterSpansResponseItems[i].Method = e.HttpMethod
		}
	}

	zap.L().Info(baseQuery)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	getFilterSpansResponse := model.GetFilterSpansResponse{
		Spans:      getFilterSpansResponseItems,
		TotalSpans: 1000,
	}

	return &getFilterSpansResponse, nil
}

func createTagQueryFromTagQueryParams(queryParams []model.TagQueryParam) []model.TagQuery {
	tags := []model.TagQuery{}
	for _, tag := range queryParams {
		if len(tag.StringValues) > 0 {
			tags = append(tags, model.NewTagQueryString(tag))
		}
		if len(tag.NumberValues) > 0 {
			tags = append(tags, model.NewTagQueryNumber(tag))
		}
		if len(tag.BoolValues) > 0 {
			tags = append(tags, model.NewTagQueryBool(tag))
		}
	}
	return tags
}

func StringWithCharset(length int, charset string) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func String(length int) string {
	return StringWithCharset(length, charset)
}

func buildQueryWithTagParams(ctx context.Context, tags []model.TagQuery) (string, []interface{}, *model.ApiError) {
	query := ""
	var args []interface{}
	for _, item := range tags {
		var subQuery string
		var argsSubQuery []interface{}
		tagMapType := item.GetTagMapColumn()
		switch item.GetOperator() {
		case model.EqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "=")
		case model.NotEqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "!=")
		case model.LessThanOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "<")
		case model.GreaterThanOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, ">")
		case model.InOperator:
			subQuery, argsSubQuery = addInOperator(item, tagMapType, false)
		case model.NotInOperator:
			subQuery, argsSubQuery = addInOperator(item, tagMapType, true)
		case model.LessThanEqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "<=")
		case model.GreaterThanEqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, ">=")
		case model.ContainsOperator:
			subQuery, argsSubQuery = addContainsOperator(item, tagMapType, false)
		case model.NotContainsOperator:
			subQuery, argsSubQuery = addContainsOperator(item, tagMapType, true)
		case model.StartsWithOperator:
			subQuery, argsSubQuery = addStartsWithOperator(item, tagMapType, false)
		case model.NotStartsWithOperator:
			subQuery, argsSubQuery = addStartsWithOperator(item, tagMapType, true)
		case model.ExistsOperator:
			subQuery, argsSubQuery = addExistsOperator(item, tagMapType, false)
		case model.NotExistsOperator:
			subQuery, argsSubQuery = addExistsOperator(item, tagMapType, true)
		default:
			return "", nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("filter operator %s not supported", item.GetOperator())}
		}
		query += subQuery
		args = append(args, argsSubQuery...)
	}
	return query, args, nil
}

func addInOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	notStr := ""
	if not {
		notStr = "NOT"
	}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "inTagKey" + String(5)
		tagValue := "inTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] = @%s", tagMapType, tagKey, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, value))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagValuePair, " OR ")), args
}

func addContainsOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	notStr := ""
	if not {
		notStr = "NOT"
	}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "containsTagKey" + String(5)
		tagValue := "containsTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] ILIKE @%s", tagMapType, tagKey, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, "%"+fmt.Sprintf("%v", value)+"%"))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagValuePair, " OR ")), args
}

func addStartsWithOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	notStr := ""
	if not {
		notStr = "NOT"
	}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "startsWithTagKey" + String(5)
		tagValue := "startsWithTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] ILIKE @%s", tagMapType, tagKey, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, "%"+fmt.Sprintf("%v", value)+"%"))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagValuePair, " OR ")), args
}

func addArithmeticOperator(item model.TagQuery, tagMapType string, operator string) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "arithmeticTagKey" + String(5)
		tagValue := "arithmeticTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] %s @%s", tagMapType, tagKey, operator, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, value))
	}
	return fmt.Sprintf(" AND (%s)", strings.Join(tagValuePair, " OR ")), args
}

func addExistsOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	notStr := ""
	if not {
		notStr = "NOT"
	}
	args := []interface{}{}
	tagOperatorPair := []string{}
	for range values {
		tagKey := "existsTagKey" + String(5)
		tagOperatorPair = append(tagOperatorPair, fmt.Sprintf("mapContains(%s, @%s)", tagMapType, tagKey))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagOperatorPair, " OR ")), args
}

func (r *ClickHouseReader) GetTagFilters(ctx context.Context, queryParams *model.TagFilterParams) (*model.TagFilters, *model.ApiError) {

	excludeMap := make(map[string]struct{})
	for _, e := range queryParams.Exclude {
		if e == constants.OperationRequest {
			excludeMap[constants.OperationDB] = struct{}{}
			continue
		}
		excludeMap[e] = struct{}{}
	}

	var query string
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
	if len(queryParams.TraceID) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.TraceID, constants.TraceID, &query, args)
	}
	if len(queryParams.ServiceName) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ServiceName, constants.ServiceName, &query, args)
	}
	if len(queryParams.HttpRoute) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpRoute, constants.HttpRoute, &query, args)
	}
	if len(queryParams.HttpHost) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpHost, constants.HttpHost, &query, args)
	}
	if len(queryParams.HttpMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpMethod, constants.HttpMethod, &query, args)
	}
	if len(queryParams.HttpUrl) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpUrl, constants.HttpUrl, &query, args)
	}
	if len(queryParams.Operation) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Operation, constants.OperationDB, &query, args)
	}
	if len(queryParams.RPCMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.RPCMethod, constants.RPCMethod, &query, args)
	}
	if len(queryParams.ResponseStatusCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ResponseStatusCode, constants.ResponseStatusCode, &query, args)
	}
	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= @durationNanoMin"
		args = append(args, clickhouse.Named("durationNanoMin", queryParams.MinDuration))
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= @durationNanoMax"
		args = append(args, clickhouse.Named("durationNanoMax", queryParams.MaxDuration))
	}
	if len(queryParams.SpanKind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.SpanKind))
	}

	query = getStatusFilters(query, queryParams.Status, excludeMap)

	tagFilters := []model.TagFilters{}

	// Alternative finalQuery := fmt.Sprintf(`SELECT DISTINCT arrayJoin(tagMap.keys) as tagKeys FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.TraceDB, r.indexTable)
	finalQuery := fmt.Sprintf(`SELECT groupUniqArrayArray(mapKeys(stringTagMap)) as stringTagKeys, groupUniqArrayArray(mapKeys(numberTagMap)) as numberTagKeys, groupUniqArrayArray(mapKeys(boolTagMap)) as boolTagKeys FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.TraceDB, r.indexTable)
	finalQuery += query
	err := r.db.Select(ctx, &tagFilters, finalQuery, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}
	tagFiltersResult := model.TagFilters{
		StringTagKeys: make([]string, 0),
		NumberTagKeys: make([]string, 0),
		BoolTagKeys:   make([]string, 0),
	}
	if len(tagFilters) != 0 {
		tagFiltersResult.StringTagKeys = excludeTags(ctx, tagFilters[0].StringTagKeys)
		tagFiltersResult.NumberTagKeys = excludeTags(ctx, tagFilters[0].NumberTagKeys)
		tagFiltersResult.BoolTagKeys = excludeTags(ctx, tagFilters[0].BoolTagKeys)
	}
	return &tagFiltersResult, nil
}

func excludeTags(ctx context.Context, tags []string) []string {
	excludedTagsMap := map[string]bool{
		"http.code":           true,
		"http.route":          true,
		"http.method":         true,
		"http.url":            true,
		"http.status_code":    true,
		"http.host":           true,
		"messaging.system":    true,
		"messaging.operation": true,
		"error":               true,
		"service.name":        true,
	}
	newTags := make([]string, 0)
	for _, tag := range tags {
		_, ok := excludedTagsMap[tag]
		if !ok {
			newTags = append(newTags, tag)
		}
	}
	return newTags
}

func (r *ClickHouseReader) GetTagValues(ctx context.Context, queryParams *model.TagFilterParams) (*model.TagValues, *model.ApiError) {

	if queryParams.TagKey.Type == model.TagTypeNumber {
		return &model.TagValues{
			NumberTagValues: make([]float64, 0),
			StringTagValues: make([]string, 0),
			BoolTagValues:   make([]bool, 0),
		}, nil
	} else if queryParams.TagKey.Type == model.TagTypeBool {
		return &model.TagValues{
			NumberTagValues: make([]float64, 0),
			StringTagValues: make([]string, 0),
			BoolTagValues:   []bool{true, false},
		}, nil
	}

	excludeMap := make(map[string]struct{})
	for _, e := range queryParams.Exclude {
		if e == constants.OperationRequest {
			excludeMap[constants.OperationDB] = struct{}{}
			continue
		}
		excludeMap[e] = struct{}{}
	}

	var query string
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
	if len(queryParams.TraceID) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.TraceID, constants.TraceID, &query, args)
	}
	if len(queryParams.ServiceName) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ServiceName, constants.ServiceName, &query, args)
	}
	if len(queryParams.HttpRoute) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpRoute, constants.HttpRoute, &query, args)
	}
	if len(queryParams.HttpHost) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpHost, constants.HttpHost, &query, args)
	}
	if len(queryParams.HttpMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpMethod, constants.HttpMethod, &query, args)
	}
	if len(queryParams.HttpUrl) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpUrl, constants.HttpUrl, &query, args)
	}
	if len(queryParams.Operation) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Operation, constants.OperationDB, &query, args)
	}
	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= @durationNanoMin"
		args = append(args, clickhouse.Named("durationNanoMin", queryParams.MinDuration))
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= @durationNanoMax"
		args = append(args, clickhouse.Named("durationNanoMax", queryParams.MaxDuration))
	}
	if len(queryParams.SpanKind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.SpanKind))
	}

	query = getStatusFilters(query, queryParams.Status, excludeMap)

	tagValues := []model.TagValues{}

	finalQuery := fmt.Sprintf(`SELECT groupArray(DISTINCT stringTagMap[@key]) as stringTagValues FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.TraceDB, r.indexTable)
	finalQuery += query
	finalQuery += " LIMIT @limit"

	args = append(args, clickhouse.Named("key", queryParams.TagKey.Key))
	args = append(args, clickhouse.Named("limit", queryParams.Limit))
	err := r.db.Select(ctx, &tagValues, finalQuery, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	cleanedTagValues := model.TagValues{
		StringTagValues: []string{},
		NumberTagValues: []float64{},
		BoolTagValues:   []bool{},
	}
	if len(tagValues) == 0 {
		return &cleanedTagValues, nil
	}
	for _, e := range tagValues[0].StringTagValues {
		if e != "" {
			cleanedTagValues.StringTagValues = append(cleanedTagValues.StringTagValues, e)
		}
	}
	return &cleanedTagValues, nil
}

func (r *ClickHouseReader) GetTopOperations(ctx context.Context, queryParams *model.GetTopOperationsParams) (*[]model.TopOperationsItem, *model.ApiError) {

	namedArgs := []interface{}{
		clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
		clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
		clickhouse.Named("serviceName", queryParams.ServiceName),
	}

	var topOperationsItems []model.TopOperationsItem

	query := fmt.Sprintf(`
		SELECT
			quantile(0.5)(durationNano) as p50,
			quantile(0.95)(durationNano) as p95,
			quantile(0.99)(durationNano) as p99,
			COUNT(*) as numCalls,
			countIf(statusCode=2) as errorCount,
			name
		FROM %s.%s
		WHERE serviceName = @serviceName AND timestamp>= @start AND timestamp<= @end`,
		r.TraceDB, r.indexTable,
	)
	args := []interface{}{}
	args = append(args, namedArgs...)
	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY name ORDER BY p99 DESC"
	if queryParams.Limit > 0 {
		query += " LIMIT @limit"
		args = append(args, clickhouse.Named("limit", queryParams.Limit))
	}
	err := r.db.Select(ctx, &topOperationsItems, query, args...)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if topOperationsItems == nil {
		topOperationsItems = []model.TopOperationsItem{}
	}

	return &topOperationsItems, nil
}

func (r *ClickHouseReader) GetUsage(ctx context.Context, queryParams *model.GetUsageParams) (*[]model.UsageItem, error) {

	var usageItems []model.UsageItem
	namedArgs := []interface{}{
		clickhouse.Named("interval", queryParams.StepHour),
		clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
		clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
	}
	var query string
	if len(queryParams.ServiceName) != 0 {
		namedArgs = append(namedArgs, clickhouse.Named("serviceName", queryParams.ServiceName))
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL @interval HOUR) as time, sum(count) as count FROM %s.%s WHERE service_name=@serviceName AND timestamp>=@start AND timestamp<=@end GROUP BY time ORDER BY time ASC", r.TraceDB, r.usageExplorerTable)
	} else {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL @interval HOUR) as time, sum(count) as count FROM %s.%s WHERE timestamp>=@start AND timestamp<=@end GROUP BY time ORDER BY time ASC", r.TraceDB, r.usageExplorerTable)
	}

	err := r.db.Select(ctx, &usageItems, query, namedArgs...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	for i := range usageItems {
		usageItems[i].Timestamp = uint64(usageItems[i].Time.UnixNano())
	}

	if usageItems == nil {
		usageItems = []model.UsageItem{}
	}

	return &usageItems, nil
}

func (r *ClickHouseReader) SearchTraces(ctx context.Context, params *model.SearchTracesParams,
	smartTraceAlgorithm func(payload []model.SearchSpanResponseItem, targetSpanId string,
		levelUp int, levelDown int, spanLimit int) ([]model.SearchSpansResult, error)) (*[]model.SearchSpansResult, error) {

	var countSpans uint64
	countQuery := fmt.Sprintf("SELECT count() as count from %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)
	err := r.db.QueryRow(ctx, countQuery, params.TraceID).Scan(&countSpans)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	if countSpans > uint64(params.MaxSpansInTrace) {
		zap.L().Error("Max spans allowed in a trace limit reached", zap.Int("MaxSpansInTrace", params.MaxSpansInTrace),
			zap.Uint64("Count", countSpans))
		userEmail, err := auth.GetEmailFromJwt(ctx)
		if err == nil {
			data := map[string]interface{}{
				"traceSize":            countSpans,
				"maxSpansInTraceLimit": params.MaxSpansInTrace,
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_MAX_SPANS_ALLOWED_LIMIT_REACHED, data, userEmail, true, false)
		}
		return nil, fmt.Errorf("max spans allowed in trace limit reached, please contact support for more details")
	}

	userEmail, err := auth.GetEmailFromJwt(ctx)
	if err == nil {
		data := map[string]interface{}{
			"traceSize": countSpans,
		}
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_TRACE_DETAIL_API, data, userEmail, true, false)
	}

	var startTime, endTime, durationNano uint64
	var searchScanResponses []model.SearchSpanDBResponseItem

	query := fmt.Sprintf("SELECT timestamp, traceID, model FROM %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)

	start := time.Now()

	err = r.db.Select(ctx, &searchScanResponses, query, params.TraceID)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}
	end := time.Now()
	zap.L().Debug("getTraceSQLQuery took: ", zap.Duration("duration", end.Sub(start)))
	searchSpansResult := []model.SearchSpansResult{{
		Columns:   []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError", "StatusMessage", "StatusCodeString", "SpanKind"},
		Events:    make([][]interface{}, len(searchScanResponses)),
		IsSubTree: false,
	},
	}

	searchSpanResponses := []model.SearchSpanResponseItem{}
	start = time.Now()
	for _, item := range searchScanResponses {
		var jsonItem model.SearchSpanResponseItem
		easyjson.Unmarshal([]byte(item.Model), &jsonItem)
		jsonItem.TimeUnixNano = uint64(item.Timestamp.UnixNano() / 1000000)
		searchSpanResponses = append(searchSpanResponses, jsonItem)
		if startTime == 0 || jsonItem.TimeUnixNano < startTime {
			startTime = jsonItem.TimeUnixNano
		}
		if endTime == 0 || jsonItem.TimeUnixNano > endTime {
			endTime = jsonItem.TimeUnixNano
		}
		if durationNano == 0 || uint64(jsonItem.DurationNano) > durationNano {
			durationNano = uint64(jsonItem.DurationNano)
		}
	}
	end = time.Now()
	zap.L().Debug("getTraceSQLQuery unmarshal took: ", zap.Duration("duration", end.Sub(start)))

	err = r.featureFlags.CheckFeature(model.SmartTraceDetail)
	smartAlgoEnabled := err == nil
	if len(searchScanResponses) > params.SpansRenderLimit && smartAlgoEnabled {
		start = time.Now()
		searchSpansResult, err = smartTraceAlgorithm(searchSpanResponses, params.SpanID, params.LevelUp, params.LevelDown, params.SpansRenderLimit)
		if err != nil {
			return nil, err
		}
		end = time.Now()
		zap.L().Debug("smartTraceAlgo took: ", zap.Duration("duration", end.Sub(start)))
		userEmail, err := auth.GetEmailFromJwt(ctx)
		if err == nil {
			data := map[string]interface{}{
				"traceSize":        len(searchScanResponses),
				"spansRenderLimit": params.SpansRenderLimit,
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LARGE_TRACE_OPENED, data, userEmail, true, false)
		}
	} else {
		for i, item := range searchSpanResponses {
			spanEvents := item.GetValues()
			searchSpansResult[0].Events[i] = spanEvents
		}
	}

	searchSpansResult[0].StartTimestampMillis = startTime - (durationNano / 1000000)
	searchSpansResult[0].EndTimestampMillis = endTime + (durationNano / 1000000)

	return &searchSpansResult, nil
}

func (r *ClickHouseReader) GetDependencyGraph(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error) {

	response := []model.ServiceMapDependencyResponseItem{}

	args := []interface{}{}
	args = append(args,
		clickhouse.Named("start", uint64(queryParams.Start.Unix())),
		clickhouse.Named("end", uint64(queryParams.End.Unix())),
		clickhouse.Named("duration", uint64(queryParams.End.Unix()-queryParams.Start.Unix())),
	)

	query := fmt.Sprintf(`
		WITH
			quantilesMergeState(0.5, 0.75, 0.9, 0.95, 0.99)(duration_quantiles_state) AS duration_quantiles_state,
			finalizeAggregation(duration_quantiles_state) AS result
		SELECT
			src as parent,
			dest as child,
			result[1] AS p50,
			result[2] AS p75,
			result[3] AS p90,
			result[4] AS p95,
			result[5] AS p99,
			sum(total_count) as callCount,
			sum(total_count)/ @duration AS callRate,
			sum(error_count)/sum(total_count) * 100 as errorRate
		FROM %s.%s
		WHERE toUInt64(toDateTime(timestamp)) >= @start AND toUInt64(toDateTime(timestamp)) <= @end`,
		r.TraceDB, r.dependencyGraphTable,
	)

	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	filterQuery, filterArgs := services.BuildServiceMapQuery(tags)
	query += filterQuery + " GROUP BY src, dest;"
	args = append(args, filterArgs...)

	zap.L().Debug("GetDependencyGraph query", zap.String("query", query), zap.Any("args", args))

	err := r.db.Select(ctx, &response, query, args...)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query %w", err)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetFilteredSpansAggregates(ctx context.Context, queryParams *model.GetFilteredSpanAggregatesParams) (*model.GetFilteredSpansAggregatesResponse, *model.ApiError) {

	excludeMap := make(map[string]struct{})
	for _, e := range queryParams.Exclude {
		if e == constants.OperationRequest {
			excludeMap[constants.OperationDB] = struct{}{}
			continue
		}
		excludeMap[e] = struct{}{}
	}

	SpanAggregatesDBResponseItems := []model.SpanAggregatesDBResponseItem{}

	aggregation_query := ""
	if queryParams.Dimension == "duration" {
		switch queryParams.AggregationOption {
		case "p50":
			aggregation_query = " quantile(0.50)(durationNano) as float64Value "
		case "p95":
			aggregation_query = " quantile(0.95)(durationNano) as float64Value "
		case "p90":
			aggregation_query = " quantile(0.90)(durationNano) as float64Value "
		case "p99":
			aggregation_query = " quantile(0.99)(durationNano) as float64Value "
		case "max":
			aggregation_query = " max(durationNano) as value "
		case "min":
			aggregation_query = " min(durationNano) as value "
		case "avg":
			aggregation_query = " avg(durationNano) as float64Value "
		case "sum":
			aggregation_query = " sum(durationNano) as value "
		default:
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("aggregate type: %s not supported", queryParams.AggregationOption)}
		}
	} else if queryParams.Dimension == "calls" {
		aggregation_query = " count(*) as value "
	}

	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}

	var query string
	var customStr []string
	_, columnExists := constants.GroupByColMap[queryParams.GroupBy]
	// Using %s for groupBy params as it can be a custom column and custom columns are not supported by clickhouse-go yet:
	// issue link: https://github.com/ClickHouse/clickhouse-go/issues/870
	if queryParams.GroupBy != "" && columnExists {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, %s as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, queryParams.GroupBy, aggregation_query, r.TraceDB, r.indexTable)
		args = append(args, clickhouse.Named("groupByVar", queryParams.GroupBy))
	} else if queryParams.GroupBy != "" {
		customStr = strings.Split(queryParams.GroupBy, ".(")
		if len(customStr) < 2 {
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("GroupBy: %s not supported", queryParams.GroupBy)}
		}
		if customStr[1] == string(model.TagTypeString)+")" {
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, stringTagMap['%s'] as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, customStr[0], aggregation_query, r.TraceDB, r.indexTable)
		} else if customStr[1] == string(model.TagTypeNumber)+")" {
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, toString(numberTagMap['%s']) as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, customStr[0], aggregation_query, r.TraceDB, r.indexTable)
		} else if customStr[1] == string(model.TagTypeBool)+")" {
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, toString(boolTagMap['%s']) as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, customStr[0], aggregation_query, r.TraceDB, r.indexTable)
		} else {
			// return error for unsupported group by
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("GroupBy: %s not supported", queryParams.GroupBy)}
		}
	} else {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
	}

	if len(queryParams.TraceID) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.TraceID, constants.TraceID, &query, args)
	}
	if len(queryParams.ServiceName) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ServiceName, constants.ServiceName, &query, args)
	}
	if len(queryParams.HttpRoute) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpRoute, constants.HttpRoute, &query, args)
	}
	if len(queryParams.HttpHost) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpHost, constants.HttpHost, &query, args)
	}
	if len(queryParams.HttpMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpMethod, constants.HttpMethod, &query, args)
	}
	if len(queryParams.HttpUrl) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpUrl, constants.HttpUrl, &query, args)
	}
	if len(queryParams.Operation) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Operation, constants.OperationDB, &query, args)
	}
	if len(queryParams.RPCMethod) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.RPCMethod, constants.RPCMethod, &query, args)
	}
	if len(queryParams.ResponseStatusCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.ResponseStatusCode, constants.ResponseStatusCode, &query, args)
	}
	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= @durationNanoMin"
		args = append(args, clickhouse.Named("durationNanoMin", queryParams.MinDuration))
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= @durationNanoMax"
		args = append(args, clickhouse.Named("durationNanoMax", queryParams.MaxDuration))
	}
	query = getStatusFilters(query, queryParams.Status, excludeMap)

	if len(queryParams.SpanKind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.SpanKind))
	}
	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)

	if errStatus != nil {
		return nil, errStatus
	}

	if queryParams.GroupBy != "" && columnExists {
		query = query + fmt.Sprintf(" GROUP BY time, %s as groupBy ORDER BY time", queryParams.GroupBy)
	} else if queryParams.GroupBy != "" {
		if customStr[1] == string(model.TagTypeString)+")" {
			query = query + fmt.Sprintf(" GROUP BY time, stringTagMap['%s'] as groupBy ORDER BY time", customStr[0])
		} else if customStr[1] == string(model.TagTypeNumber)+")" {
			query = query + fmt.Sprintf(" GROUP BY time, toString(numberTagMap['%s']) as groupBy ORDER BY time", customStr[0])
		} else if customStr[1] == string(model.TagTypeBool)+")" {
			query = query + fmt.Sprintf(" GROUP BY time, toString(boolTagMap['%s']) as groupBy ORDER BY time", customStr[0])
		}
	} else {
		query = query + " GROUP BY time ORDER BY time"
	}

	err := r.db.Select(ctx, &SpanAggregatesDBResponseItems, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	GetFilteredSpansAggregatesResponse := model.GetFilteredSpansAggregatesResponse{
		Items: map[int64]model.SpanAggregatesResponseItem{},
	}

	for i := range SpanAggregatesDBResponseItems {
		if SpanAggregatesDBResponseItems[i].Value == 0 {
			SpanAggregatesDBResponseItems[i].Value = uint64(SpanAggregatesDBResponseItems[i].Float64Value)
		}
		SpanAggregatesDBResponseItems[i].Timestamp = int64(SpanAggregatesDBResponseItems[i].Time.UnixNano())
		SpanAggregatesDBResponseItems[i].FloatValue = float32(SpanAggregatesDBResponseItems[i].Value)
		if queryParams.AggregationOption == "rate_per_sec" {
			SpanAggregatesDBResponseItems[i].FloatValue = float32(SpanAggregatesDBResponseItems[i].Value) / float32(queryParams.StepSeconds)
		}
		if responseElement, ok := GetFilteredSpansAggregatesResponse.Items[SpanAggregatesDBResponseItems[i].Timestamp]; !ok {
			if queryParams.GroupBy != "" && SpanAggregatesDBResponseItems[i].GroupBy != "" {
				GetFilteredSpansAggregatesResponse.Items[SpanAggregatesDBResponseItems[i].Timestamp] = model.SpanAggregatesResponseItem{
					Timestamp: SpanAggregatesDBResponseItems[i].Timestamp,
					GroupBy:   map[string]float32{SpanAggregatesDBResponseItems[i].GroupBy: SpanAggregatesDBResponseItems[i].FloatValue},
				}
			} else if queryParams.GroupBy == "" {
				GetFilteredSpansAggregatesResponse.Items[SpanAggregatesDBResponseItems[i].Timestamp] = model.SpanAggregatesResponseItem{
					Timestamp: SpanAggregatesDBResponseItems[i].Timestamp,
					Value:     SpanAggregatesDBResponseItems[i].FloatValue,
				}
			}

		} else {
			if queryParams.GroupBy != "" && SpanAggregatesDBResponseItems[i].GroupBy != "" {
				responseElement.GroupBy[SpanAggregatesDBResponseItems[i].GroupBy] = SpanAggregatesDBResponseItems[i].FloatValue
			}
			GetFilteredSpansAggregatesResponse.Items[SpanAggregatesDBResponseItems[i].Timestamp] = responseElement
		}
	}

	return &GetFilteredSpansAggregatesResponse, nil
}

func getLocalTableName(tableName string) string {

	tableNameSplit := strings.Split(tableName, ".")
	return tableNameSplit[0] + "." + strings.Split(tableNameSplit[1], "distributed_")[1]

}

// SetTTL sets the TTL for traces or metrics or logs tables.
// This is an async API which creates goroutines to set TTL.
// Status of TTL update is tracked with ttl_status table in sqlite db.
func (r *ClickHouseReader) SetTTL(ctx context.Context,
	params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// Keep only latest 100 transactions/requests
	r.deleteTtlTransactions(ctx, 100)
	// uuid is used as transaction id
	uuidWithHyphen := uuid.New()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}

	switch params.Type {
	case constants.TraceTTL:
		tableNameArray := []string{signozTraceDBName + "." + signozTraceTableName, signozTraceDBName + "." + signozDurationMVTable, signozTraceDBName + "." + signozSpansTable, signozTraceDBName + "." + signozErrorIndexTable, signozTraceDBName + "." + signozUsageExplorerTable, signozTraceDBName + "." + defaultDependencyGraphTable}
		for _, tableName := range tableNameArray {
			tableName := getLocalTableName(tableName)
			statusItem, err := r.checkTTLStatusItem(ctx, tableName)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
			}
			if statusItem.Status == constants.StatusPending {
				return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
			}
		}
		for _, tableName := range tableNameArray {
			tableName := getLocalTableName(tableName)
			// TODO: DB queries should be implemented with transactional statements but currently clickhouse doesn't support them. Issue: https://github.com/ClickHouse/ClickHouse/issues/22086
			go func(tableName string) {
				_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
				if dbErr != nil {
					zap.L().Error("Error in inserting to ttl_status table", zap.Error(dbErr))
					return
				}
				req := fmt.Sprintf(
					"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(timestamp) + INTERVAL %v SECOND DELETE",
					tableName, r.cluster, params.DelDuration)
				if len(params.ColdStorageVolume) > 0 {
					req += fmt.Sprintf(", toDateTime(timestamp) + INTERVAL %v SECOND TO VOLUME '%s'",
						params.ToColdStorageDuration, params.ColdStorageVolume)
				}
				err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
				if err != nil {
					zap.L().Error("Error in setting cold storage", zap.Error(err))
					statusItem, err := r.checkTTLStatusItem(ctx, tableName)
					if err == nil {
						_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
						if dbErr != nil {
							zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
							return
						}
					}
					return
				}
				req += " SETTINGS distributed_ddl_task_timeout = -1;"
				zap.L().Error("Executing TTL request: ", zap.String("request", req))
				statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
				if err := r.db.Exec(context.Background(), req); err != nil {
					zap.L().Error("Error in executing set TTL query", zap.Error(err))
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
					return
				}
				_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
			}(tableName)
		}

	case constants.MetricsTTL:
		tableNames := []string{signozMetricDBName + "." + signozSampleLocalTableName, signozMetricDBName + "." + signozTSLocalTableNameV4, signozMetricDBName + "." + signozTSLocalTableNameV46Hrs, signozMetricDBName + "." + signozTSLocalTableNameV41Day}
		for _, tableName := range tableNames {
			statusItem, err := r.checkTTLStatusItem(ctx, tableName)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
			}
			if statusItem.Status == constants.StatusPending {
				return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
			}
		}
		metricTTL := func(tableName string) {
			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.L().Error("Error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}
			timeColumn := "timestamp_ms"
			if strings.Contains(tableName, "v4") {
				timeColumn = "unix_milli"
			}

			req := fmt.Sprintf(
				"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(toUInt32(%s / 1000), 'UTC') + "+
					"INTERVAL %v SECOND DELETE", tableName, r.cluster, timeColumn, params.DelDuration)
			if len(params.ColdStorageVolume) > 0 {
				req += fmt.Sprintf(", toDateTime(toUInt32(%s / 1000), 'UTC')"+
					" + INTERVAL %v SECOND TO VOLUME '%s'",
					timeColumn, params.ToColdStorageDuration, params.ColdStorageVolume)
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("Error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			req += " SETTINGS distributed_ddl_task_timeout = -1"
			zap.L().Info("Executing TTL request: ", zap.String("request", req))
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.L().Error("error while setting ttl.", zap.Error(err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}
		for _, tableName := range tableNames {
			go metricTTL(tableName)
		}
	case constants.LogsTTL:
		tableName := r.logsDB + "." + r.logsLocalTable
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending {
			return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
		}
		go func(tableName string) {
			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.L().Error("error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}
			req := fmt.Sprintf(
				"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(timestamp / 1000000000) + "+
					"INTERVAL %v SECOND DELETE", tableName, r.cluster, params.DelDuration)
			if len(params.ColdStorageVolume) > 0 {
				req += fmt.Sprintf(", toDateTime(timestamp / 1000000000)"+
					" + INTERVAL %v SECOND TO VOLUME '%s'",
					params.ToColdStorageDuration, params.ColdStorageVolume)
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			req += " SETTINGS distributed_ddl_task_timeout = -1"
			zap.L().Info("Executing TTL request: ", zap.String("request", req))
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.L().Error("error while setting ttl", zap.Error(err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}(tableName)

	default:
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while setting ttl. ttl type should be <metrics|traces>, got %v",
			params.Type)}
	}

	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) deleteTtlTransactions(ctx context.Context, numberOfTransactionsStore int) {
	_, err := r.localDB.Exec("DELETE FROM ttl_status WHERE transaction_id NOT IN (SELECT distinct transaction_id FROM ttl_status ORDER BY created_at DESC LIMIT ?)", numberOfTransactionsStore)
	if err != nil {
		zap.L().Error("Error in processing ttl_status delete sql query", zap.Error(err))
	}
}

// checkTTLStatusItem checks if ttl_status table has an entry for the given table name
func (r *ClickHouseReader) checkTTLStatusItem(ctx context.Context, tableName string) (model.TTLStatusItem, *model.ApiError) {
	statusItem := []model.TTLStatusItem{}

	query := `SELECT id, status, ttl, cold_storage_ttl FROM ttl_status WHERE table_name = ? ORDER BY created_at DESC`

	zap.L().Info("checkTTLStatusItem query", zap.String("query", query), zap.String("tableName", tableName))

	stmt, err := r.localDB.Preparex(query)

	if err != nil {
		zap.L().Error("Error preparing query for checkTTLStatusItem", zap.Error(err))
		return model.TTLStatusItem{}, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = stmt.Select(&statusItem, tableName)

	if len(statusItem) == 0 {
		return model.TTLStatusItem{}, nil
	}
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return model.TTLStatusItem{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
	}
	return statusItem[0], nil
}

// setTTLQueryStatus fetches ttl_status table status from DB
func (r *ClickHouseReader) setTTLQueryStatus(ctx context.Context, tableNameArray []string) (string, *model.ApiError) {
	failFlag := false
	status := constants.StatusSuccess
	for _, tableName := range tableNameArray {
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		emptyStatusStruct := model.TTLStatusItem{}
		if statusItem == emptyStatusStruct {
			return "", nil
		}
		if err != nil {
			return "", &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending && statusItem.UpdatedAt.Unix()-time.Now().Unix() < 3600 {
			status = constants.StatusPending
			return status, nil
		}
		if statusItem.Status == constants.StatusFailed {
			failFlag = true
		}
	}
	if failFlag {
		status = constants.StatusFailed
	}

	return status, nil
}

func (r *ClickHouseReader) setColdStorage(ctx context.Context, tableName string, coldStorageVolume string) *model.ApiError {

	// Set the storage policy for the required table. If it is already set, then setting it again
	// will not a problem.
	if len(coldStorageVolume) > 0 {
		policyReq := fmt.Sprintf("ALTER TABLE %s ON CLUSTER %s MODIFY SETTING storage_policy='tiered'", tableName, r.cluster)

		zap.L().Info("Executing Storage policy request: ", zap.String("request", policyReq))
		if err := r.db.Exec(ctx, policyReq); err != nil {
			zap.L().Error("error while setting storage policy", zap.Error(err))
			return &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while setting storage policy. Err=%v", err)}
		}
	}
	return nil
}

// GetDisks returns a list of disks {name, type} configured in clickhouse DB.
func (r *ClickHouseReader) GetDisks(ctx context.Context) (*[]model.DiskItem, *model.ApiError) {
	diskItems := []model.DiskItem{}

	query := "SELECT name,type FROM system.disks"
	if err := r.db.Select(ctx, &diskItems, query); err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting disks. Err=%v", err)}
	}

	return &diskItems, nil
}

func getLocalTableNameArray(tableNames []string) []string {
	var localTableNames []string
	for _, name := range tableNames {
		tableNameSplit := strings.Split(name, ".")
		localTableNames = append(localTableNames, tableNameSplit[0]+"."+strings.Split(tableNameSplit[1], "distributed_")[1])
	}
	return localTableNames
}

// GetTTL returns current ttl, expected ttl and past setTTL status for metrics/traces.
func (r *ClickHouseReader) GetTTL(ctx context.Context, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError) {

	parseTTL := func(queryResp string) (int, int) {

		zap.L().Info("Parsing TTL from: ", zap.String("queryResp", queryResp))
		deleteTTLExp := regexp.MustCompile(`toIntervalSecond\(([0-9]*)\)`)
		moveTTLExp := regexp.MustCompile(`toIntervalSecond\(([0-9]*)\) TO VOLUME`)

		var delTTL, moveTTL int = -1, -1

		m := deleteTTLExp.FindStringSubmatch(queryResp)
		if len(m) > 1 {
			seconds_int, err := strconv.Atoi(m[1])
			if err != nil {
				return -1, -1
			}
			delTTL = seconds_int / 3600
		}

		m = moveTTLExp.FindStringSubmatch(queryResp)
		if len(m) > 1 {
			seconds_int, err := strconv.Atoi(m[1])
			if err != nil {
				return -1, -1
			}
			moveTTL = seconds_int / 3600
		}

		return delTTL, moveTTL
	}

	getMetricsTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp []model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v'", signozSampleLocalTableName)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.L().Error("error while getting ttl", zap.Error(err))
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		if len(dbResp) == 0 {
			return nil, nil
		} else {
			return &dbResp[0], nil
		}
	}

	getTracesTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp []model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v' AND database='%v'", signozTraceLocalTableName, signozTraceDBName)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.L().Error("error while getting ttl", zap.Error(err))
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		if len(dbResp) == 0 {
			return nil, nil
		} else {
			return &dbResp[0], nil
		}
	}

	getLogsTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp []model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v' AND database='%v'", r.logsLocalTable, r.logsDB)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.L().Error("error while getting ttl", zap.Error(err))
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		if len(dbResp) == 0 {
			return nil, nil
		} else {
			return &dbResp[0], nil
		}
	}

	switch ttlParams.Type {
	case constants.TraceTTL:
		tableNameArray := []string{signozTraceDBName + "." + signozTraceTableName, signozTraceDBName + "." + signozDurationMVTable, signozTraceDBName + "." + signozSpansTable, signozTraceDBName + "." + signozErrorIndexTable, signozTraceDBName + "." + signozUsageExplorerTable, signozTraceDBName + "." + defaultDependencyGraphTable}

		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getTracesTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTtl != -1 {
			ttlQuery.ColdStorageTtl = ttlQuery.ColdStorageTtl / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{TracesTime: delTTL, TracesMoveTime: moveTTL, ExpectedTracesTime: ttlQuery.TTL, ExpectedTracesMoveTime: ttlQuery.ColdStorageTtl, Status: status}, nil

	case constants.MetricsTTL:
		tableNameArray := []string{signozMetricDBName + "." + signozSampleTableName}
		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getMetricsTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTtl != -1 {
			ttlQuery.ColdStorageTtl = ttlQuery.ColdStorageTtl / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{MetricsTime: delTTL, MetricsMoveTime: moveTTL, ExpectedMetricsTime: ttlQuery.TTL, ExpectedMetricsMoveTime: ttlQuery.ColdStorageTtl, Status: status}, nil

	case constants.LogsTTL:
		tableNameArray := []string{r.logsDB + "." + r.logsTable}
		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getLogsTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTtl != -1 {
			ttlQuery.ColdStorageTtl = ttlQuery.ColdStorageTtl / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{LogsTime: delTTL, LogsMoveTime: moveTTL, ExpectedLogsTime: ttlQuery.TTL, ExpectedLogsMoveTime: ttlQuery.ColdStorageTtl, Status: status}, nil

	default:
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. ttl type should be metrics|traces, got %v",
			ttlParams.Type)}
	}

}

func (r *ClickHouseReader) ListErrors(ctx context.Context, queryParams *model.ListErrorsParams) (*[]model.Error, *model.ApiError) {

	var getErrorResponses []model.Error

	query := "SELECT any(exceptionMessage) as exceptionMessage, count() AS exceptionCount, min(timestamp) as firstSeen, max(timestamp) as lastSeen, groupID"
	if len(queryParams.ServiceName) != 0 {
		query = query + ", serviceName"
	} else {
		query = query + ", any(serviceName) as serviceName"
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + ", exceptionType"
	} else {
		query = query + ", any(exceptionType) as exceptionType"
	}
	query += fmt.Sprintf(" FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}

	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName ilike @serviceName"
		args = append(args, clickhouse.Named("serviceName", "%"+queryParams.ServiceName+"%"))
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + " AND exceptionType ilike @exceptionType"
		args = append(args, clickhouse.Named("exceptionType", "%"+queryParams.ExceptionType+"%"))
	}

	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)

	if errStatus != nil {
		zap.L().Error("Error in processing tags", zap.Error(errStatus))
		return nil, errStatus
	}
	query = query + " GROUP BY groupID"
	if len(queryParams.ServiceName) != 0 {
		query = query + ", serviceName"
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + ", exceptionType"
	}
	if len(queryParams.OrderParam) != 0 {
		if queryParams.Order == constants.Descending {
			query = query + " ORDER BY " + queryParams.OrderParam + " DESC"
		} else if queryParams.Order == constants.Ascending {
			query = query + " ORDER BY " + queryParams.OrderParam + " ASC"
		}
	}
	if queryParams.Limit > 0 {
		query = query + " LIMIT @limit"
		args = append(args, clickhouse.Named("limit", queryParams.Limit))
	}

	if queryParams.Offset > 0 {
		query = query + " OFFSET @offset"
		args = append(args, clickhouse.Named("offset", queryParams.Offset))
	}

	err := r.db.Select(ctx, &getErrorResponses, query, args...)
	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	return &getErrorResponses, nil
}

func (r *ClickHouseReader) CountErrors(ctx context.Context, queryParams *model.CountErrorsParams) (uint64, *model.ApiError) {

	var errorCount uint64

	query := fmt.Sprintf("SELECT count(distinct(groupID)) FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName ilike @serviceName"
		args = append(args, clickhouse.Named("serviceName", "%"+queryParams.ServiceName+"%"))
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + " AND exceptionType ilike @exceptionType"
		args = append(args, clickhouse.Named("exceptionType", "%"+queryParams.ExceptionType+"%"))
	}

	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)

	if errStatus != nil {
		zap.L().Error("Error in processing tags", zap.Error(errStatus))
		return 0, errStatus
	}

	err := r.db.QueryRow(ctx, query, args...).Scan(&errorCount)
	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return 0, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	return errorCount, nil
}

func (r *ClickHouseReader) GetErrorFromErrorID(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.L().Error("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var getErrorWithSpanReponse []model.ErrorWithSpan

	query := fmt.Sprintf("SELECT errorID, exceptionType, exceptionStacktrace, exceptionEscaped, exceptionMessage, timestamp, spanID, traceID, serviceName, groupID FROM %s.%s WHERE timestamp = @timestamp AND groupID = @groupID AND errorID = @errorID LIMIT 1", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)
	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetErrorFromGroupID(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	var getErrorWithSpanReponse []model.ErrorWithSpan

	query := fmt.Sprintf("SELECT errorID, exceptionType, exceptionStacktrace, exceptionEscaped, exceptionMessage, timestamp, spanID, traceID, serviceName, groupID FROM %s.%s WHERE timestamp = @timestamp AND groupID = @groupID LIMIT 1", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetNextPrevErrorIDs(ctx context.Context, queryParams *model.GetErrorParams) (*model.NextPrevErrorIDs, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.L().Error("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var err *model.ApiError
	getNextPrevErrorIDsResponse := model.NextPrevErrorIDs{
		GroupID: queryParams.GroupID,
	}
	getNextPrevErrorIDsResponse.NextErrorID, getNextPrevErrorIDsResponse.NextTimestamp, err = r.getNextErrorID(ctx, queryParams)
	if err != nil {
		zap.L().Error("Unable to get next error ID due to err: ", zap.Error(err))
		return nil, err
	}
	getNextPrevErrorIDsResponse.PrevErrorID, getNextPrevErrorIDsResponse.PrevTimestamp, err = r.getPrevErrorID(ctx, queryParams)
	if err != nil {
		zap.L().Error("Unable to get prev error ID due to err: ", zap.Error(err))
		return nil, err
	}
	return &getNextPrevErrorIDsResponse, nil

}

func (r *ClickHouseReader) getNextErrorID(ctx context.Context, queryParams *model.GetErrorParams) (string, time.Time, *model.ApiError) {

	var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

	query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp >= @timestamp AND errorID != @errorID ORDER BY timestamp ASC LIMIT 2", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}
	if len(getNextErrorIDReponse) == 0 {
		zap.L().Info("NextErrorID not found")
		return "", time.Time{}, nil
	} else if len(getNextErrorIDReponse) == 1 {
		zap.L().Info("NextErrorID found")
		return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
	} else {
		if getNextErrorIDReponse[0].Timestamp.UnixNano() == getNextErrorIDReponse[1].Timestamp.UnixNano() {
			var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

			query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp = @timestamp AND errorID > @errorID ORDER BY errorID ASC LIMIT 1", r.TraceDB, r.errorTable)
			args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

			err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

			zap.L().Info(query)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
			}
			if len(getNextErrorIDReponse) == 0 {
				var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

				query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp > @timestamp ORDER BY timestamp ASC LIMIT 1", r.TraceDB, r.errorTable)
				args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

				err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

				zap.L().Info(query)

				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
				}

				if len(getNextErrorIDReponse) == 0 {
					zap.L().Info("NextErrorID not found")
					return "", time.Time{}, nil
				} else {
					zap.L().Info("NextErrorID found")
					return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
				}
			} else {
				zap.L().Info("NextErrorID found")
				return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
			}
		} else {
			zap.L().Info("NextErrorID found")
			return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
		}
	}
}

func (r *ClickHouseReader) getPrevErrorID(ctx context.Context, queryParams *model.GetErrorParams) (string, time.Time, *model.ApiError) {

	var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

	query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp <= @timestamp AND errorID != @errorID ORDER BY timestamp DESC LIMIT 2", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}
	if len(getPrevErrorIDReponse) == 0 {
		zap.L().Info("PrevErrorID not found")
		return "", time.Time{}, nil
	} else if len(getPrevErrorIDReponse) == 1 {
		zap.L().Info("PrevErrorID found")
		return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
	} else {
		if getPrevErrorIDReponse[0].Timestamp.UnixNano() == getPrevErrorIDReponse[1].Timestamp.UnixNano() {
			var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

			query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp = @timestamp AND errorID < @errorID ORDER BY errorID DESC LIMIT 1", r.TraceDB, r.errorTable)
			args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

			err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

			zap.L().Info(query)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
			}
			if len(getPrevErrorIDReponse) == 0 {
				var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

				query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp < @timestamp ORDER BY timestamp DESC LIMIT 1", r.TraceDB, r.errorTable)
				args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

				err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

				zap.L().Info(query)

				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
				}

				if len(getPrevErrorIDReponse) == 0 {
					zap.L().Info("PrevErrorID not found")
					return "", time.Time{}, nil
				} else {
					zap.L().Info("PrevErrorID found")
					return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
				}
			} else {
				zap.L().Info("PrevErrorID found")
				return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
			}
		} else {
			zap.L().Info("PrevErrorID found")
			return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
		}
	}
}

func (r *ClickHouseReader) GetTotalSpans(ctx context.Context) (uint64, error) {

	var totalSpans uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s;", signozTraceDBName, signozTraceTableName)
	r.db.QueryRow(ctx, queryStr).Scan(&totalSpans)

	return totalSpans, nil
}

func (r *ClickHouseReader) GetSpansInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (uint64, error) {

	var spansInLastHeartBeatInterval uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d));", signozTraceDBName, signozSpansTable, int(interval.Minutes()))

	r.db.QueryRow(ctx, queryStr).Scan(&spansInLastHeartBeatInterval)

	return spansInLastHeartBeatInterval, nil
}

func (r *ClickHouseReader) GetTotalLogs(ctx context.Context) (uint64, error) {

	var totalLogs uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s;", r.logsDB, r.logsTable)
	r.db.QueryRow(ctx, queryStr).Scan(&totalLogs)

	return totalLogs, nil
}

func (r *ClickHouseReader) FetchTemporality(ctx context.Context, metricNames []string) (map[string]map[v3.Temporality]bool, error) {

	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)

	query := fmt.Sprintf(`SELECT DISTINCT metric_name, temporality FROM %s.%s WHERE metric_name IN $1`, signozMetricDBName, signozTSTableNameV41Day)

	rows, err := r.db.Query(ctx, query, metricNames)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var metricName, temporality string
		err := rows.Scan(&metricName, &temporality)
		if err != nil {
			return nil, err
		}
		if _, ok := metricNameToTemporality[metricName]; !ok {
			metricNameToTemporality[metricName] = make(map[v3.Temporality]bool)
		}
		metricNameToTemporality[metricName][v3.Temporality(temporality)] = true
	}
	return metricNameToTemporality, nil
}

func (r *ClickHouseReader) GetTimeSeriesInfo(ctx context.Context) (map[string]interface{}, error) {

	queryStr := fmt.Sprintf("SELECT countDistinct(fingerprint) as count from %s.%s where metric_name not like 'signoz_%%' group by metric_name order by count desc;", signozMetricDBName, signozTSTableNameV41Day)

	rows, _ := r.db.Query(ctx, queryStr)

	var totalTS uint64
	totalTS = 0

	var maxTS uint64
	maxTS = 0

	count := 0
	for rows.Next() {

		var value uint64
		rows.Scan(&value)
		totalTS += value
		if count == 0 {
			maxTS = value
		}
		count += 1
	}

	timeSeriesData := map[string]interface{}{}
	timeSeriesData["totalTS"] = totalTS
	timeSeriesData["maxTS"] = maxTS

	return timeSeriesData, nil
}

func (r *ClickHouseReader) GetSamplesInfoInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (uint64, error) {

	var totalSamples uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where metric_name not like 'signoz_%%' and unix_milli > toUnixTimestamp(now()-toIntervalMinute(%d))*1000;", signozMetricDBName, signozSampleTableName, int(interval.Minutes()))

	r.db.QueryRow(ctx, queryStr).Scan(&totalSamples)

	return totalSamples, nil
}

func (r *ClickHouseReader) GetTotalSamples(ctx context.Context) (uint64, error) {
	var totalSamples uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where metric_name not like 'signoz_%%';", signozMetricDBName, signozSampleTableName)

	r.db.QueryRow(ctx, queryStr).Scan(&totalSamples)

	return totalSamples, nil
}

func (r *ClickHouseReader) GetDistributedInfoInLastHeartBeatInterval(ctx context.Context) (map[string]interface{}, error) {

	clusterInfo := []model.ClusterInfo{}

	queryStr := `SELECT shard_num, shard_weight, replica_num, errors_count, slowdowns_count, estimated_recovery_time FROM system.clusters where cluster='cluster';`
	r.db.Select(ctx, &clusterInfo, queryStr)
	if len(clusterInfo) == 1 {
		return clusterInfo[0].GetMapFromStruct(), nil
	}

	return nil, nil
}

func (r *ClickHouseReader) GetLogsInfoInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (uint64, error) {

	var totalLogLines uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d))*1000000000;", r.logsDB, r.logsTable, int(interval.Minutes()))

	err := r.db.QueryRow(ctx, queryStr).Scan(&totalLogLines)

	return totalLogLines, err
}

func (r *ClickHouseReader) GetTagsInfoInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (*model.TagsInfo, error) {

	queryStr := fmt.Sprintf(`select serviceName, stringTagMap['deployment.environment'] as env, 
	stringTagMap['telemetry.sdk.language'] as language from %s.%s 
	where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d))
	group by serviceName, env, language;`, r.TraceDB, r.indexTable, int(interval.Minutes()))

	tagTelemetryDataList := []model.TagTelemetryData{}
	err := r.db.Select(ctx, &tagTelemetryDataList, queryStr)

	if err != nil {
		zap.L().Error("Error in processing sql query: ", zap.Error(err))
		return nil, err
	}

	tagsInfo := model.TagsInfo{
		Languages: make(map[string]interface{}),
		Services:  make(map[string]interface{}),
	}

	for _, tagTelemetryData := range tagTelemetryDataList {

		if len(tagTelemetryData.ServiceName) != 0 && strings.Contains(tagTelemetryData.ServiceName, "prod") {
			tagsInfo.Env = tagTelemetryData.ServiceName
		}
		if len(tagTelemetryData.Env) != 0 && strings.Contains(tagTelemetryData.Env, "prod") {
			tagsInfo.Env = tagTelemetryData.Env
		}
		if len(tagTelemetryData.Language) != 0 {
			tagsInfo.Languages[tagTelemetryData.Language] = struct{}{}
		}
		if len(tagTelemetryData.ServiceName) != 0 {
			tagsInfo.Services[tagTelemetryData.ServiceName] = struct{}{}
		}

	}

	return &tagsInfo, nil
}

// remove this after sometime
func removeUnderscoreDuplicateFields(fields []model.LogField) []model.LogField {
	lookup := map[string]model.LogField{}
	for _, v := range fields {
		lookup[v.Name+v.DataType] = v
	}

	for k := range lookup {
		if strings.Contains(k, ".") {
			delete(lookup, strings.ReplaceAll(k, ".", "_"))
		}
	}

	updatedFields := []model.LogField{}
	for _, v := range lookup {
		updatedFields = append(updatedFields, v)
	}
	return updatedFields
}

func (r *ClickHouseReader) GetLogFields(ctx context.Context) (*model.GetFieldsResponse, *model.ApiError) {
	// response will contain top level fields from the otel log model
	response := model.GetFieldsResponse{
		Selected:    constants.StaticSelectedLogFields,
		Interesting: []model.LogField{},
	}

	// get attribute keys
	attributes := []model.LogField{}
	query := fmt.Sprintf("SELECT DISTINCT name, datatype from %s.%s group by name, datatype", r.logsDB, r.logsAttributeKeys)
	err := r.db.Select(ctx, &attributes, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	// get resource keys
	resources := []model.LogField{}
	query = fmt.Sprintf("SELECT DISTINCT name, datatype from %s.%s group by name, datatype", r.logsDB, r.logsResourceKeys)
	err = r.db.Select(ctx, &resources, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	//remove this code after sometime
	attributes = removeUnderscoreDuplicateFields(attributes)
	resources = removeUnderscoreDuplicateFields(resources)

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsTable)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	extractSelectedAndInterestingFields(statements[0].Statement, constants.Attributes, &attributes, &response)
	extractSelectedAndInterestingFields(statements[0].Statement, constants.Resources, &resources, &response)

	return &response, nil
}

func extractSelectedAndInterestingFields(tableStatement string, fieldType string, fields *[]model.LogField, response *model.GetFieldsResponse) {
	for _, field := range *fields {
		field.Type = fieldType
		// all static fields are assumed to be selected as we don't allow changing them
		if isSelectedField(tableStatement, field) {
			response.Selected = append(response.Selected, field)
		} else {
			response.Interesting = append(response.Interesting, field)
		}
	}
}

func isSelectedField(tableStatement string, field model.LogField) bool {
	// in case of attributes and resources, if there is a materialized column present then it is selected
	// TODO: handle partial change complete eg:- index is removed but materialized column is still present
	name := utils.GetClickhouseColumnName(field.Type, field.DataType, field.Name)
	return strings.Contains(tableStatement, name)
}

func (r *ClickHouseReader) UpdateLogFieldV2(ctx context.Context, field *model.UpdateField) *model.ApiError {
	if !field.Selected {
		return model.ForbiddenError(errors.New("removing a selected field is not allowed, please reach out to support."))
	}

	colname := utils.GetClickhouseColumnNameV2(field.Type, field.DataType, field.Name)

	dataType := strings.ToLower(field.DataType)
	if dataType == "int64" || dataType == "float64" {
		dataType = "number"
	}
	attrColName := fmt.Sprintf("%s_%s", field.Type, dataType)
	for _, table := range []string{r.logsLocalTableV2, r.logsTableV2} {
		q := "ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s` %s DEFAULT %s['%s'] CODEC(ZSTD(1))"
		query := fmt.Sprintf(q,
			r.logsDB, table,
			r.cluster,
			colname, field.DataType,
			attrColName,
			field.Name,
		)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}

		query = fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s_exists` bool DEFAULT if(mapContains(%s, '%s') != 0, true, false) CODEC(ZSTD(1))",
			r.logsDB, table,
			r.cluster,
			colname,
			attrColName,
			field.Name,
		)
		err = r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
	}

	// create the index
	if strings.ToLower(field.DataType) == "bool" {
		// there is no point in creating index for bool attributes as the cardinality is just 2
		return nil
	}

	if field.IndexType == "" {
		field.IndexType = constants.DefaultLogSkipIndexType
	}
	if field.IndexGranularity == 0 {
		field.IndexGranularity = constants.DefaultLogSkipIndexGranularity
	}
	query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD INDEX IF NOT EXISTS `%s_idx` (`%s`) TYPE %s  GRANULARITY %d",
		r.logsDB, r.logsLocalTableV2,
		r.cluster,
		colname,
		colname,
		field.IndexType,
		field.IndexGranularity,
	)
	err := r.db.Exec(ctx, query)
	if err != nil {
		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	return nil
}

func (r *ClickHouseReader) UpdateLogField(ctx context.Context, field *model.UpdateField) *model.ApiError {
	// don't allow updating static fields
	if field.Type == constants.Static {
		err := errors.New("cannot update static fields")
		return &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	if r.useLogsNewSchema {
		return r.UpdateLogFieldV2(ctx, field)
	}

	// if a field is selected it means that the field needs to be indexed
	if field.Selected {
		colname := utils.GetClickhouseColumnName(field.Type, field.DataType, field.Name)

		keyColName := fmt.Sprintf("%s_%s_key", field.Type, strings.ToLower(field.DataType))
		valueColName := fmt.Sprintf("%s_%s_value", field.Type, strings.ToLower(field.DataType))

		// create materialized column

		for _, table := range []string{r.logsLocalTable, r.logsTable} {
			q := "ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS %s %s DEFAULT %s[indexOf(%s, '%s')] CODEC(ZSTD(1))"
			query := fmt.Sprintf(q,
				r.logsDB, table,
				r.cluster,
				colname, field.DataType,
				valueColName,
				keyColName,
				field.Name,
			)
			err := r.db.Exec(ctx, query)
			if err != nil {
				return &model.ApiError{Err: err, Typ: model.ErrorInternal}
			}

			query = fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS %s_exists` bool DEFAULT if(indexOf(%s, '%s') != 0, true, false) CODEC(ZSTD(1))",
				r.logsDB, table,
				r.cluster,
				strings.TrimSuffix(colname, "`"),
				keyColName,
				field.Name,
			)
			err = r.db.Exec(ctx, query)
			if err != nil {
				return &model.ApiError{Err: err, Typ: model.ErrorInternal}
			}
		}

		// create the index
		if strings.ToLower(field.DataType) == "bool" {
			// there is no point in creating index for bool attributes as the cardinality is just 2
			return nil
		}

		if field.IndexType == "" {
			field.IndexType = constants.DefaultLogSkipIndexType
		}
		if field.IndexGranularity == 0 {
			field.IndexGranularity = constants.DefaultLogSkipIndexGranularity
		}
		query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD INDEX IF NOT EXISTS %s_idx` (%s) TYPE %s  GRANULARITY %d",
			r.logsDB, r.logsLocalTable,
			r.cluster,
			strings.TrimSuffix(colname, "`"),
			colname,
			field.IndexType,
			field.IndexGranularity,
		)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}

	} else {
		// We are not allowing to delete a materialized column
		// For more details please check https://github.com/SigNoz/signoz/issues/4566
		return model.ForbiddenError(errors.New("Removing a selected field is not allowed, please reach out to support."))

		// Delete the index first
		// query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s DROP INDEX IF EXISTS %s_idx`", r.logsDB, r.logsLocalTable, r.cluster, strings.TrimSuffix(colname, "`"))
		// err := r.db.Exec(ctx, query)
		// if err != nil {
		// 	return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		// }

		// for _, table := range []string{r.logsTable, r.logsLocalTable} {
		// 	// drop materialized column from logs table
		// 	query := "ALTER TABLE %s.%s ON CLUSTER %s DROP COLUMN IF EXISTS %s "
		// 	err := r.db.Exec(ctx, fmt.Sprintf(query,
		// 		r.logsDB, table,
		// 		r.cluster,
		// 		colname,
		// 	),
		// 	)
		// 	if err != nil {
		// 		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		// 	}

		// 	// drop exists column on logs table
		// 	query = "ALTER TABLE %s.%s ON CLUSTER %s DROP COLUMN IF EXISTS %s_exists` "
		// 	err = r.db.Exec(ctx, fmt.Sprintf(query,
		// 		r.logsDB, table,
		// 		r.cluster,
		// 		strings.TrimSuffix(colname, "`"),
		// 	),
		// 	)
		// 	if err != nil {
		// 		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		// 	}
		// }
	}
	return nil
}

func (r *ClickHouseReader) GetLogs(ctx context.Context, params *model.LogsFilterParams) (*[]model.SignozLog, *model.ApiError) {
	response := []model.SignozLog{}
	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	isPaginatePrev := logs.CheckIfPrevousPaginateAndModifyOrder(params)
	filterSql, lenFilters, err := logs.GenerateSQLWhere(fields, params)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	data := map[string]interface{}{
		"lenFilters": lenFilters,
	}
	if lenFilters != 0 {
		userEmail, err := auth.GetEmailFromJwt(ctx)
		if err == nil {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LOGS_FILTERS, data, userEmail, true, false)
		}
	}

	query := fmt.Sprintf("%s from %s.%s", constants.LogsSQLSelect, r.logsDB, r.logsTable)

	if filterSql != "" {
		query = fmt.Sprintf("%s where %s", query, filterSql)
	}

	query = fmt.Sprintf("%s order by %s %s limit %d", query, params.OrderBy, params.Order, params.Limit)
	err = r.db.Select(ctx, &response, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	if isPaginatePrev {
		// rever the results from db
		for i, j := 0, len(response)-1; i < j; i, j = i+1, j-1 {
			response[i], response[j] = response[j], response[i]
		}
	}
	return &response, nil
}

func (r *ClickHouseReader) TailLogs(ctx context.Context, client *model.LogsTailClient) {

	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		client.Error <- apiErr.Err
		return
	}

	filterSql, lenFilters, err := logs.GenerateSQLWhere(fields, &model.LogsFilterParams{
		Query: client.Filter.Query,
	})

	data := map[string]interface{}{
		"lenFilters": lenFilters,
	}
	if lenFilters != 0 {
		userEmail, err := auth.GetEmailFromJwt(ctx)
		if err == nil {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LOGS_FILTERS, data, userEmail, true, false)
		}
	}

	if err != nil {
		client.Error <- err
		return
	}

	query := fmt.Sprintf("%s from %s.%s", constants.LogsSQLSelect, r.logsDB, r.logsTable)

	tsStart := uint64(time.Now().UnixNano())
	if client.Filter.TimestampStart != 0 {
		tsStart = client.Filter.TimestampStart
	}

	var idStart string
	if client.Filter.IdGt != "" {
		idStart = client.Filter.IdGt
	}

	ticker := time.NewTicker(time.Duration(r.liveTailRefreshSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			zap.L().Debug("closing go routine : " + client.Name)
			return
		case <-ticker.C:
			// get the new 100 logs as anything more older won't make sense
			tmpQuery := fmt.Sprintf("%s where timestamp >='%d'", query, tsStart)
			if filterSql != "" {
				tmpQuery = fmt.Sprintf("%s and %s", tmpQuery, filterSql)
			}
			if idStart != "" {
				tmpQuery = fmt.Sprintf("%s and id > '%s'", tmpQuery, idStart)
			}
			tmpQuery = fmt.Sprintf("%s order by timestamp desc, id desc limit 100", tmpQuery)
			response := []model.SignozLog{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.L().Error("Error while getting logs", zap.Error(err))
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				select {
				case <-ctx.Done():
					done := true
					client.Done <- &done
					zap.L().Debug("closing go routine while sending logs : " + client.Name)
					return
				default:
					client.Logs <- &response[i]
					if i == 0 {
						tsStart = response[i].Timestamp
						idStart = response[i].ID
					}
				}
			}
		}
	}
}

func (r *ClickHouseReader) AggregateLogs(ctx context.Context, params *model.LogsAggregateParams) (*model.GetLogsAggregatesResponse, *model.ApiError) {
	logAggregatesDBResponseItems := []model.LogsAggregatesDBResponseItem{}

	function := "toFloat64(count()) as value"
	if params.Function != "" {
		function = fmt.Sprintf("toFloat64(%s) as value", params.Function)
	}

	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	filterSql, lenFilters, err := logs.GenerateSQLWhere(fields, &model.LogsFilterParams{
		Query: params.Query,
	})
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	data := map[string]interface{}{
		"lenFilters": lenFilters,
	}
	if lenFilters != 0 {
		userEmail, err := auth.GetEmailFromJwt(ctx)
		if err == nil {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LOGS_FILTERS, data, userEmail, true, false)
		}
	}

	query := ""
	if params.GroupBy != "" {
		query = fmt.Sprintf("SELECT toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(timestamp/1000000000), INTERVAL %d minute))*1000000000) as ts_start_interval, toString(%s) as groupBy, "+
			"%s "+
			"FROM %s.%s WHERE (timestamp >= '%d' AND timestamp <= '%d' )",
			params.StepSeconds/60, params.GroupBy, function, r.logsDB, r.logsTable, params.TimestampStart, params.TimestampEnd)
	} else {
		query = fmt.Sprintf("SELECT toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(timestamp/1000000000), INTERVAL %d minute))*1000000000) as ts_start_interval, "+
			"%s "+
			"FROM %s.%s WHERE (timestamp >= '%d' AND timestamp <= '%d' )",
			params.StepSeconds/60, function, r.logsDB, r.logsTable, params.TimestampStart, params.TimestampEnd)
	}
	if filterSql != "" {
		query = fmt.Sprintf("%s AND ( %s ) ", query, filterSql)
	}
	if params.GroupBy != "" {
		query = fmt.Sprintf("%s GROUP BY ts_start_interval, toString(%s) as groupBy ORDER BY ts_start_interval", query, params.GroupBy)
	} else {
		query = fmt.Sprintf("%s GROUP BY ts_start_interval ORDER BY ts_start_interval", query)
	}

	err = r.db.Select(ctx, &logAggregatesDBResponseItems, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	aggregateResponse := model.GetLogsAggregatesResponse{
		Items: make(map[int64]model.LogsAggregatesResponseItem),
	}

	for i := range logAggregatesDBResponseItems {
		if elem, ok := aggregateResponse.Items[int64(logAggregatesDBResponseItems[i].Timestamp)]; ok {
			if params.GroupBy != "" && logAggregatesDBResponseItems[i].GroupBy != "" {
				elem.GroupBy[logAggregatesDBResponseItems[i].GroupBy] = logAggregatesDBResponseItems[i].Value
			}
			aggregateResponse.Items[logAggregatesDBResponseItems[i].Timestamp] = elem
		} else {
			if params.GroupBy != "" && logAggregatesDBResponseItems[i].GroupBy != "" {
				aggregateResponse.Items[logAggregatesDBResponseItems[i].Timestamp] = model.LogsAggregatesResponseItem{
					Timestamp: logAggregatesDBResponseItems[i].Timestamp,
					GroupBy:   map[string]interface{}{logAggregatesDBResponseItems[i].GroupBy: logAggregatesDBResponseItems[i].Value},
				}
			} else if params.GroupBy == "" {
				aggregateResponse.Items[logAggregatesDBResponseItems[i].Timestamp] = model.LogsAggregatesResponseItem{
					Timestamp: logAggregatesDBResponseItems[i].Timestamp,
					Value:     logAggregatesDBResponseItems[i].Value,
				}
			}
		}

	}

	return &aggregateResponse, nil
}

func (r *ClickHouseReader) QueryDashboardVars(ctx context.Context, query string) (*model.DashboardVar, error) {
	var result model.DashboardVar
	rows, err := r.db.Query(ctx, query)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	var (
		columnTypes = rows.ColumnTypes()
		vars        = make([]interface{}, len(columnTypes))
	)
	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
	}

	defer rows.Close()
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		for _, v := range vars {
			switch v := v.(type) {
			case *string, *int8, *int16, *int32, *int64, *uint8, *uint16, *uint32, *uint64, *float32, *float64, *time.Time, *bool:
				result.VariableValues = append(result.VariableValues, reflect.ValueOf(v).Elem().Interface())
			default:
				return nil, fmt.Errorf("unsupported value type encountered")
			}
		}
	}
	return &result, nil
}

func (r *ClickHouseReader) GetMetricAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.AggregateAttributeResponse

	query = fmt.Sprintf("SELECT metric_name, type, is_monotonic, temporality FROM %s.%s WHERE metric_name ILIKE $1 GROUP BY metric_name, type, is_monotonic, temporality", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText))

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	seen := make(map[string]struct{})

	var metricName, typ, temporality string
	var isMonotonic bool
	for rows.Next() {
		if err := rows.Scan(&metricName, &typ, &isMonotonic, &temporality); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		// Non-monotonic cumulative sums are treated as gauges
		if typ == "Sum" && !isMonotonic && temporality == string(v3.Cumulative) {
			typ = "Gauge"
		}
		// unlike traces/logs `tag`/`resource` type, the `Type` will be metric type
		key := v3.AttributeKey{
			Key:      metricName,
			DataType: v3.AttributeKeyDataTypeFloat64,
			Type:     v3.AttributeKeyType(typ),
			IsColumn: true,
		}
		// remove duplicates
		if _, ok := seen[metricName+typ]; ok {
			continue
		}
		seen[metricName+typ] = struct{}{}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMetricAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	// skips the internal attributes i.e attributes starting with __
	query = fmt.Sprintf("SELECT arrayJoin(tagKeys) AS distinctTagKey FROM (SELECT JSONExtractKeys(labels) AS tagKeys FROM %s.%s WHERE metric_name=$1 AND unix_milli >= $2 GROUP BY tagKeys) WHERE distinctTagKey ILIKE $3 AND distinctTagKey NOT LIKE '\\_\\_%%' GROUP BY distinctTagKey", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, req.AggregateAttribute, common.PastDayRoundOff(), fmt.Sprintf("%%%s%%", req.SearchText))
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var attributeKey string
	for rows.Next() {
		if err := rows.Scan(&attributeKey); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      attributeKey,
			DataType: v3.AttributeKeyDataTypeString, // https://github.com/OpenObservability/OpenMetrics/blob/main/proto/openmetrics_data_model.proto#L64-L72.
			Type:     v3.AttributeKeyTypeTag,
			IsColumn: false,
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMetricAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var attributeValues v3.FilterAttributeValueResponse

	query = fmt.Sprintf("SELECT JSONExtractString(labels, $1) AS tagValue FROM %s.%s WHERE metric_name=$2 AND JSONExtractString(labels, $3) ILIKE $4 AND unix_milli >= $5 GROUP BY tagValue", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, req.AggregateAttribute, req.FilterAttributeKey, fmt.Sprintf("%%%s%%", req.SearchText), common.PastDayRoundOff())

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var atrributeValue string
	for rows.Next() {
		if err := rows.Scan(&atrributeValue); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		// https://github.com/OpenObservability/OpenMetrics/blob/main/proto/openmetrics_data_model.proto#L64-L72
		// this may change in future if we use OTLP as the data model
		attributeValues.StringAttributeValues = append(attributeValues.StringAttributeValues, atrributeValue)
	}

	return &attributeValues, nil
}

func (r *ClickHouseReader) GetMetricMetadata(ctx context.Context, metricName, serviceName string) (*v3.MetricMetadataResponse, error) {

	unixMilli := common.PastDayRoundOff()

	// Note: metric metadata should be accessible regardless of the time range selection
	// our standard retention period is 30 days, so we are querying the table v4_1_day to reduce the
	// amount of data scanned
	query := fmt.Sprintf("SELECT temporality, description, type, unit, is_monotonic from %s.%s WHERE metric_name=$1 AND unix_milli >= $2 GROUP BY temporality, description, type, unit, is_monotonic", signozMetricDBName, signozTSTableNameV41Day)
	rows, err := r.db.Query(ctx, query, metricName, unixMilli)
	if err != nil {
		zap.L().Error("Error while fetching metric metadata", zap.Error(err))
		return nil, fmt.Errorf("error while fetching metric metadata: %s", err.Error())
	}
	defer rows.Close()

	var deltaExists, isMonotonic bool
	var temporality, description, metricType, unit string
	for rows.Next() {
		if err := rows.Scan(&temporality, &description, &metricType, &unit, &isMonotonic); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		if temporality == string(v3.Delta) {
			deltaExists = true
		}
	}

	query = fmt.Sprintf("SELECT JSONExtractString(labels, 'le') as le from %s.%s WHERE metric_name=$1 AND unix_milli >= $2 AND type = 'Histogram' AND JSONExtractString(labels, 'service_name') = $3 GROUP BY le ORDER BY le", signozMetricDBName, signozTSTableNameV41Day)
	rows, err = r.db.Query(ctx, query, metricName, unixMilli, serviceName)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var leFloat64 []float64
	for rows.Next() {
		var leStr string
		if err := rows.Scan(&leStr); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		le, err := strconv.ParseFloat(leStr, 64)
		// ignore the error and continue if the value is not a float
		// ideally this should not happen but we have seen ClickHouse
		// returning empty string for some values
		if err != nil {
			zap.L().Error("error while parsing le value", zap.Error(err))
			continue
		}
		if math.IsInf(le, 0) {
			continue
		}
		leFloat64 = append(leFloat64, le)
	}

	return &v3.MetricMetadataResponse{
		Delta:       deltaExists,
		Le:          leFloat64,
		Description: description,
		Unit:        unit,
		Type:        metricType,
		IsMonotonic: isMonotonic,
		Temporality: temporality,
	}, nil
}

func (r *ClickHouseReader) GetLatestReceivedMetric(
	ctx context.Context, metricNames []string,
) (*model.MetricStatus, *model.ApiError) {
	if len(metricNames) < 1 {
		return nil, nil
	}

	quotedMetricNames := []string{}
	for _, m := range metricNames {
		quotedMetricNames = append(quotedMetricNames, fmt.Sprintf(`'%s'`, m))
	}
	commaSeparatedMetricNames := strings.Join(quotedMetricNames, ", ")

	query := fmt.Sprintf(`
		SELECT metric_name, labels, unix_milli
		from %s.%s
		where metric_name in (
			%s
		)
		order by unix_milli desc
		limit 1
		`, signozMetricDBName, signozTSTableNameV4, commaSeparatedMetricNames,
	)

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query clickhouse for received metrics status: %w", err,
		))
	}
	defer rows.Close()

	var result *model.MetricStatus

	if rows.Next() {

		result = &model.MetricStatus{}
		var labelsJson string

		err := rows.Scan(
			&result.MetricName,
			&labelsJson,
			&result.LastReceivedTsMillis,
		)
		if err != nil {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't scan metric status row: %w", err,
			))
		}

		err = json.Unmarshal([]byte(labelsJson), &result.LastReceivedLabels)
		if err != nil {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't unmarshal metric labels json: %w", err,
			))
		}
	}

	return result, nil
}

func isColumn(useLogsNewSchema bool, tableStatement, attrType, field, datType string) bool {
	// value of attrType will be `resource` or `tag`, if `tag` change it to `attribute`
	var name string
	if useLogsNewSchema {
		name = utils.GetClickhouseColumnNameV2(attrType, datType, field)
	} else {
		name = utils.GetClickhouseColumnName(attrType, datType, field)
	}
	return strings.Contains(tableStatement, fmt.Sprintf("%s ", name))
}

func (r *ClickHouseReader) GetLogAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.AggregateAttributeResponse
	var stringAllowed bool

	where := ""
	switch req.Operator {
	case
		v3.AggregateOperatorCountDistinct,
		v3.AggregateOperatorCount:
		where = "tagKey ILIKE $1"
		stringAllowed = true
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRate,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorP05,
		v3.AggregateOperatorP10,
		v3.AggregateOperatorP20,
		v3.AggregateOperatorP25,
		v3.AggregateOperatorP50,
		v3.AggregateOperatorP75,
		v3.AggregateOperatorP90,
		v3.AggregateOperatorP95,
		v3.AggregateOperatorP99,
		v3.AggregateOperatorAvg,
		v3.AggregateOperatorSum,
		v3.AggregateOperatorMin,
		v3.AggregateOperatorMax:
		where = "tagKey ILIKE $1 AND (tagDataType='int64' or tagDataType='float64')"
		stringAllowed = false
	case
		v3.AggregateOperatorNoOp:
		return &v3.AggregateAttributeResponse{}, nil
	default:
		return nil, fmt.Errorf("unsupported aggregate operator")
	}

	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, tagDataType from %s.%s WHERE %s limit $2", r.logsDB, r.logsTagAttributeTable, where)
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), req.Limit)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsTable)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching logs schema: %s", err.Error())
	}

	var tagKey string
	var dataType string
	var attType string
	for rows.Next() {
		if err := rows.Scan(&tagKey, &attType, &dataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(attType),
			IsColumn: isColumn(r.useLogsNewSchema, statements[0].Statement, attType, tagKey, dataType),
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}
	// add other attributes
	for _, field := range constants.StaticFieldsLogsV3 {
		if (!stringAllowed && field.DataType == v3.AttributeKeyDataTypeString) || (v3.AttributeKey{} == field) {
			continue
		} else if len(req.SearchText) == 0 || strings.Contains(field.Key, req.SearchText) {
			response.AttributeKeys = append(response.AttributeKeys, field)
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) GetLogAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	if len(req.SearchText) != 0 {
		query = fmt.Sprintf("select distinct tagKey, tagType, tagDataType from  %s.%s where tagKey ILIKE $1 limit $2", r.logsDB, r.logsTagAttributeTable)
		rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), req.Limit)
	} else {
		query = fmt.Sprintf("select distinct tagKey, tagType, tagDataType from  %s.%s limit $1", r.logsDB, r.logsTagAttributeTable)
		rows, err = r.db.Query(ctx, query, req.Limit)
	}

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsTable)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching logs schema: %s", err.Error())
	}

	var attributeKey string
	var attributeDataType string
	var tagType string
	for rows.Next() {
		if err := rows.Scan(&attributeKey, &tagType, &attributeDataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}

		key := v3.AttributeKey{
			Key:      attributeKey,
			DataType: v3.AttributeKeyDataType(attributeDataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn(r.useLogsNewSchema, statements[0].Statement, tagType, attributeKey, attributeDataType),
		}

		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	// add other attributes
	for _, f := range constants.StaticFieldsLogsV3 {
		if (v3.AttributeKey{} == f) {
			continue
		}
		if len(req.SearchText) == 0 || strings.Contains(f.Key, req.SearchText) {
			response.AttributeKeys = append(response.AttributeKeys, f)
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) GetLogAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	var err error
	var filterValueColumn string
	var rows driver.Rows
	var attributeValues v3.FilterAttributeValueResponse

	// if dataType or tagType is not present return empty response
	if len(req.FilterAttributeKeyDataType) == 0 || len(req.TagType) == 0 {
		// also check if it is not a top level key
		if _, ok := constants.StaticFieldsLogsV3[req.FilterAttributeKey]; !ok {
			return &v3.FilterAttributeValueResponse{}, nil
		}
	}

	// ignore autocomplete request for body
	if req.FilterAttributeKey == "body" || req.FilterAttributeKey == "__attrs" {
		return &v3.FilterAttributeValueResponse{}, nil
	}

	// if data type is bool, return true and false
	if req.FilterAttributeKeyDataType == v3.AttributeKeyDataTypeBool {
		return &v3.FilterAttributeValueResponse{
			BoolAttributeValues: []bool{true, false},
		}, nil
	}

	query := "select distinct"
	switch req.FilterAttributeKeyDataType {
	case v3.AttributeKeyDataTypeInt64:
		filterValueColumn = "int64TagValue"
	case v3.AttributeKeyDataTypeFloat64:
		filterValueColumn = "float64TagValue"
	case v3.AttributeKeyDataTypeString:
		filterValueColumn = "stringTagValue"
	}

	searchText := fmt.Sprintf("%%%s%%", req.SearchText)

	// check if the tagKey is a topLevelColumn
	if _, ok := constants.StaticFieldsLogsV3[req.FilterAttributeKey]; ok {
		// query the column for the last 48 hours
		filterValueColumnWhere := req.FilterAttributeKey
		selectKey := req.FilterAttributeKey
		if req.FilterAttributeKeyDataType != v3.AttributeKeyDataTypeString {
			filterValueColumnWhere = fmt.Sprintf("toString(%s)", req.FilterAttributeKey)
			selectKey = fmt.Sprintf("toInt64(%s)", req.FilterAttributeKey)
		}

		// prepare the query and run
		if len(req.SearchText) != 0 {
			query = fmt.Sprintf("select distinct %s from %s.%s where timestamp >= toInt64(toUnixTimestamp(now() - INTERVAL 48 HOUR)*1000000000) and %s ILIKE $1 limit $2", selectKey, r.logsDB, r.logsTable, filterValueColumnWhere)
			rows, err = r.db.Query(ctx, query, searchText, req.Limit)
		} else {
			query = fmt.Sprintf("select distinct %s from %s.%s where timestamp >= toInt64(toUnixTimestamp(now() - INTERVAL 48 HOUR)*1000000000) limit $1", selectKey, r.logsDB, r.logsTable)
			rows, err = r.db.Query(ctx, query, req.Limit)
		}
	} else if len(req.SearchText) != 0 {
		filterValueColumnWhere := filterValueColumn
		if req.FilterAttributeKeyDataType != v3.AttributeKeyDataTypeString {
			filterValueColumnWhere = fmt.Sprintf("toString(%s)", filterValueColumn)
		}
		query = fmt.Sprintf("select distinct %s  from  %s.%s where tagKey=$1 and %s ILIKE $2  and tagType=$3 limit $4", filterValueColumn, r.logsDB, r.logsTagAttributeTable, filterValueColumnWhere)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, searchText, req.TagType, req.Limit)
	} else {
		query = fmt.Sprintf("select distinct %s from  %s.%s where tagKey=$1 and tagType=$2 limit $3", filterValueColumn, r.logsDB, r.logsTagAttributeTable)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, req.TagType, req.Limit)
	}

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var strAttributeValue string
	var float64AttributeValue sql.NullFloat64
	var int64AttributeValue sql.NullInt64
	for rows.Next() {
		switch req.FilterAttributeKeyDataType {
		case v3.AttributeKeyDataTypeInt64:
			if err := rows.Scan(&int64AttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			if int64AttributeValue.Valid {
				attributeValues.NumberAttributeValues = append(attributeValues.NumberAttributeValues, int64AttributeValue.Int64)
			}
		case v3.AttributeKeyDataTypeFloat64:
			if err := rows.Scan(&float64AttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			if float64AttributeValue.Valid {
				attributeValues.NumberAttributeValues = append(attributeValues.NumberAttributeValues, float64AttributeValue.Float64)
			}
		case v3.AttributeKeyDataTypeString:
			if err := rows.Scan(&strAttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			attributeValues.StringAttributeValues = append(attributeValues.StringAttributeValues, strAttributeValue)
		}
	}

	return &attributeValues, nil

}

func (r *ClickHouseReader) GetQBFilterSuggestionsForLogs(
	ctx context.Context,
	req *v3.QBFilterSuggestionsRequest,
) (*v3.QBFilterSuggestionsResponse, *model.ApiError) {
	suggestions := v3.QBFilterSuggestionsResponse{
		AttributeKeys:  []v3.AttributeKey{},
		ExampleQueries: []v3.FilterSet{},
	}

	// Use existing autocomplete logic for generating attribute suggestions
	attribKeysResp, err := r.GetLogAttributeKeys(
		ctx, &v3.FilterAttributeKeyRequest{
			SearchText: req.SearchText,
			DataSource: v3.DataSourceLogs,
			Limit:      int(req.AttributesLimit),
		})
	if err != nil {
		return nil, model.InternalError(fmt.Errorf("couldn't get attribute keys: %w", err))
	}

	suggestions.AttributeKeys = attribKeysResp.AttributeKeys

	// Rank suggested attributes
	slices.SortFunc(suggestions.AttributeKeys, func(a v3.AttributeKey, b v3.AttributeKey) int {

		// Higher score => higher rank
		attribKeyScore := func(a v3.AttributeKey) int {

			// Scoring criteria is expected to get more sophisticated in follow up changes
			if a.Type == v3.AttributeKeyTypeResource {
				return 2
			}

			if a.Type == v3.AttributeKeyTypeTag {
				return 1
			}

			return 0
		}

		// To sort in descending order of score the return value must be negative when a > b
		return attribKeyScore(b) - attribKeyScore(a)
	})

	// Put together suggested example queries.

	newExampleQuery := func() v3.FilterSet {
		// Include existing filter in example query if specified.
		if req.ExistingFilter != nil {
			return *req.ExistingFilter
		}

		return v3.FilterSet{
			Operator: "AND",
			Items:    []v3.FilterItem{},
		}
	}

	// Suggest example queries for top suggested log attributes and resource attributes
	exampleAttribs := []v3.AttributeKey{}
	for _, attrib := range suggestions.AttributeKeys {
		isAttributeOrResource := slices.Contains([]v3.AttributeKeyType{
			v3.AttributeKeyTypeResource, v3.AttributeKeyTypeTag,
		}, attrib.Type)

		isNumOrStringType := slices.Contains([]v3.AttributeKeyDataType{
			v3.AttributeKeyDataTypeInt64, v3.AttributeKeyDataTypeFloat64, v3.AttributeKeyDataTypeString,
		}, attrib.DataType)

		if isAttributeOrResource && isNumOrStringType {
			exampleAttribs = append(exampleAttribs, attrib)
		}

		if len(exampleAttribs) >= int(req.ExamplesLimit) {
			break
		}
	}

	if len(exampleAttribs) > 0 {
		exampleAttribValues, err := r.getValuesForLogAttributes(
			ctx, exampleAttribs, req.ExamplesLimit,
		)
		if err != nil {
			// Do not fail the entire request if only example query generation fails
			zap.L().Error("could not find attribute values for creating example query", zap.Error(err))
		} else {

			// add example queries for as many attributes as possible.
			// suggest 1st value for 1st attrib, followed by 1st value for second attrib and so on
			// and if there is still room, suggest 2nd value for 1st attrib, 2nd value for 2nd attrib and so on
			for valueIdx := 0; valueIdx < int(req.ExamplesLimit); valueIdx++ {
				for attrIdx, attr := range exampleAttribs {
					needMoreExamples := len(suggestions.ExampleQueries) < int(req.ExamplesLimit)

					if needMoreExamples && valueIdx < len(exampleAttribValues[attrIdx]) {
						exampleQuery := newExampleQuery()
						exampleQuery.Items = append(exampleQuery.Items, v3.FilterItem{
							Key:      attr,
							Operator: "=",
							Value:    exampleAttribValues[attrIdx][valueIdx],
						})

						suggestions.ExampleQueries = append(
							suggestions.ExampleQueries, exampleQuery,
						)
					}
				}
			}
		}
	}

	// Suggest static example queries for standard log attributes if needed.
	if len(suggestions.ExampleQueries) < int(req.ExamplesLimit) {
		exampleQuery := newExampleQuery()
		exampleQuery.Items = append(exampleQuery.Items, v3.FilterItem{
			Key: v3.AttributeKey{
				Key:      "body",
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeUnspecified,
				IsColumn: true,
			},
			Operator: "contains",
			Value:    "error",
		})
		suggestions.ExampleQueries = append(suggestions.ExampleQueries, exampleQuery)
	}

	return &suggestions, nil
}

// Get up to `limit` values seen for each attribute in `attributes`
// Returns a slice of slices where the ith slice has values for ith entry in `attributes`
func (r *ClickHouseReader) getValuesForLogAttributes(
	ctx context.Context, attributes []v3.AttributeKey, limit uint64,
) ([][]any, *model.ApiError) {
	// query top `limit` distinct values seen for `tagKey`s of interest
	// ordered by timestamp when the value was seen
	query := fmt.Sprintf(
		`
		select tagKey, stringTagValue, int64TagValue, float64TagValue
		from (
			select
				tagKey,
				stringTagValue,
				int64TagValue,
				float64TagValue,
				row_number() over (partition by tagKey order by ts desc) as rank
			from (
				select
					tagKey,
					stringTagValue,
					int64TagValue,
					float64TagValue,
					max(timestamp) as ts
				from %s.%s
				where tagKey in $1
				group by (tagKey, stringTagValue, int64TagValue, float64TagValue)
			)
		)
		where rank <= %d
		`,
		r.logsDB, r.logsTagAttributeTable, limit,
	)

	attribNames := []string{}
	for _, attrib := range attributes {
		attribNames = append(attribNames, attrib.Key)
	}

	rows, err := r.db.Query(ctx, query, attribNames)
	if err != nil {
		zap.L().Error("couldn't query attrib values for suggestions", zap.Error(err))
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query attrib values for suggestions: %w", err,
		))
	}
	defer rows.Close()

	result := make([][]any, len(attributes))

	// Helper for getting hold of the result slice to append to for each scanned row
	resultIdxForAttrib := func(key string, dataType v3.AttributeKeyDataType) int {
		return slices.IndexFunc(attributes, func(attrib v3.AttributeKey) bool {
			return attrib.Key == key && attrib.DataType == dataType
		})
	}

	// Scan rows and append to result
	for rows.Next() {
		var tagKey string
		var stringValue string
		var float64Value sql.NullFloat64
		var int64Value sql.NullInt64

		err := rows.Scan(
			&tagKey, &stringValue, &int64Value, &float64Value,
		)
		if err != nil {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't scan attrib value rows: %w", err,
			))
		}

		if len(stringValue) > 0 {
			attrResultIdx := resultIdxForAttrib(tagKey, v3.AttributeKeyDataTypeString)
			if attrResultIdx >= 0 {
				result[attrResultIdx] = append(result[attrResultIdx], stringValue)
			}

		} else if int64Value.Valid {
			attrResultIdx := resultIdxForAttrib(tagKey, v3.AttributeKeyDataTypeInt64)
			if attrResultIdx >= 0 {
				result[attrResultIdx] = append(result[attrResultIdx], int64Value.Int64)
			}

		} else if float64Value.Valid {
			attrResultIdx := resultIdxForAttrib(tagKey, v3.AttributeKeyDataTypeFloat64)
			if attrResultIdx >= 0 {
				result[attrResultIdx] = append(result[attrResultIdx], float64Value.Float64)
			}
		}
	}

	if err := rows.Err(); err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't scan attrib value rows: %w", err,
		))
	}

	return result, nil
}

func readRow(vars []interface{}, columnNames []string, countOfNumberCols int) ([]string, map[string]string, []map[string]string, *v3.Point) {
	// Each row will have a value and a timestamp, and an optional list of label values
	// example: {Timestamp: ..., Value: ...}
	// The timestamp may also not present in some cases where the time series is reduced to single value
	var point v3.Point

	// groupBy is a container to hold label values for the current point
	// example: ["frontend", "/fetch"]
	var groupBy []string

	var groupAttributesArray []map[string]string
	// groupAttributes is a container to hold the key-value pairs for the current
	// metric point.
	// example: {"serviceName": "frontend", "operation": "/fetch"}
	groupAttributes := make(map[string]string)

	isValidPoint := false

	for idx, v := range vars {
		colName := columnNames[idx]
		switch v := v.(type) {
		case *string:
			// special case for returning all labels in metrics datasource
			if colName == "fullLabels" {
				var metric map[string]string
				err := json.Unmarshal([]byte(*v), &metric)
				if err != nil {
					zap.L().Error("unexpected error encountered", zap.Error(err))
				}
				for key, val := range metric {
					groupBy = append(groupBy, val)
					if _, ok := groupAttributes[key]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{key: val})
					}
					groupAttributes[key] = val
				}
			} else {
				groupBy = append(groupBy, *v)
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: *v})
				}
				groupAttributes[colName] = *v
			}
		case *time.Time:
			point.Timestamp = v.UnixMilli()
		case *float64, *float32:
			if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
				isValidPoint = true
				point.Value = float64(reflect.ValueOf(v).Elem().Float())
			} else {
				groupBy = append(groupBy, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Float()))
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Float())})
				}
				groupAttributes[colName] = fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Float())
			}
		case **float64, **float32:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Float()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = value
				} else {
					groupBy = append(groupBy, fmt.Sprintf("%v", value))
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", value)})
					}
					groupAttributes[colName] = fmt.Sprintf("%v", value)
				}
			}
		case *uint, *uint8, *uint64, *uint16, *uint32:
			if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
				isValidPoint = true
				point.Value = float64(reflect.ValueOf(v).Elem().Uint())
			} else {
				groupBy = append(groupBy, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint()))
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint())})
				}
				groupAttributes[colName] = fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint())
			}
		case **uint, **uint8, **uint64, **uint16, **uint32:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Uint()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = float64(value)
				} else {
					groupBy = append(groupBy, fmt.Sprintf("%v", value))
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", value)})
					}
					groupAttributes[colName] = fmt.Sprintf("%v", value)
				}
			}
		case *int, *int8, *int16, *int32, *int64:
			if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
				isValidPoint = true
				point.Value = float64(reflect.ValueOf(v).Elem().Int())
			} else {
				groupBy = append(groupBy, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int()))
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int())})
				}
				groupAttributes[colName] = fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int())
			}
		case **int, **int8, **int16, **int32, **int64:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Int()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = float64(value)
				} else {
					groupBy = append(groupBy, fmt.Sprintf("%v", value))
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", value)})
					}
					groupAttributes[colName] = fmt.Sprintf("%v", value)
				}
			}
		case *bool:
			groupBy = append(groupBy, fmt.Sprintf("%v", *v))
			if _, ok := groupAttributes[colName]; !ok {
				groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", *v)})
			}
			groupAttributes[colName] = fmt.Sprintf("%v", *v)

		default:
			zap.L().Error("unsupported var type found in query builder query result", zap.Any("v", v), zap.String("colName", colName))
		}
	}
	if isValidPoint {
		return groupBy, groupAttributes, groupAttributesArray, &point
	}
	return groupBy, groupAttributes, groupAttributesArray, nil
}

func readRowsForTimeSeriesResult(rows driver.Rows, vars []interface{}, columnNames []string, countOfNumberCols int) ([]*v3.Series, error) {
	// when groupBy is applied, each combination of cartesian product
	// of attribute values is a separate series. Each item in seriesToPoints
	// represent a unique series where the key is sorted attribute values joined
	// by "," and the value is the list of points for that series

	// For instance, group by (serviceName, operation)
	// with two services and three operations in each will result in (maximum of) 6 series
	// ("frontend", "order") x ("/fetch", "/fetch/{Id}", "/order")
	//
	// ("frontend", "/fetch")
	// ("frontend", "/fetch/{Id}")
	// ("frontend", "/order")
	// ("order", "/fetch")
	// ("order", "/fetch/{Id}")
	// ("order", "/order")
	seriesToPoints := make(map[string][]v3.Point)
	var keys []string
	// seriesToAttrs is a mapping of key to a map of attribute key to attribute value
	// for each series. This is used to populate the series' attributes
	// For instance, for the above example, the seriesToAttrs will be
	// {
	//   "frontend,/fetch": {"serviceName": "frontend", "operation": "/fetch"},
	//   "frontend,/fetch/{Id}": {"serviceName": "frontend", "operation": "/fetch/{Id}"},
	//   "frontend,/order": {"serviceName": "frontend", "operation": "/order"},
	//   "order,/fetch": {"serviceName": "order", "operation": "/fetch"},
	//   "order,/fetch/{Id}": {"serviceName": "order", "operation": "/fetch/{Id}"},
	//   "order,/order": {"serviceName": "order", "operation": "/order"},
	// }
	seriesToAttrs := make(map[string]map[string]string)
	labelsArray := make(map[string][]map[string]string)
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		groupBy, groupAttributes, groupAttributesArray, metricPoint := readRow(vars, columnNames, countOfNumberCols)
		// skip the point if the value is NaN or Inf
		// are they ever useful enough to be returned?
		if metricPoint != nil && (math.IsNaN(metricPoint.Value) || math.IsInf(metricPoint.Value, 0)) {
			continue
		}
		sort.Strings(groupBy)
		key := strings.Join(groupBy, "")
		if _, exists := seriesToAttrs[key]; !exists {
			keys = append(keys, key)
		}
		seriesToAttrs[key] = groupAttributes
		labelsArray[key] = groupAttributesArray
		if metricPoint != nil {
			seriesToPoints[key] = append(seriesToPoints[key], *metricPoint)
		}
	}

	var seriesList []*v3.Series
	for _, key := range keys {
		points := seriesToPoints[key]
		series := v3.Series{Labels: seriesToAttrs[key], Points: points, LabelsArray: labelsArray[key]}
		seriesList = append(seriesList, &series)
	}
	return seriesList, getPersonalisedError(rows.Err())
}

func logCommentKVs(ctx context.Context) map[string]string {
	kv := ctx.Value(common.LogCommentKey)
	if kv == nil {
		return nil
	}
	logCommentKVs, ok := kv.(map[string]string)
	if !ok {
		return nil
	}
	return logCommentKVs
}

// GetTimeSeriesResultV3 runs the query and returns list of time series
func (r *ClickHouseReader) GetTimeSeriesResultV3(ctx context.Context, query string) ([]*v3.Series, error) {

	ctxArgs := map[string]interface{}{"query": query}
	for k, v := range logCommentKVs(ctx) {
		ctxArgs[k] = v
	}

	defer utils.Elapsed("GetTimeSeriesResultV3", ctxArgs)()

	// Hook up query progress reporting if requested.
	queryId := ctx.Value("queryId")
	if queryId != nil {
		qid, ok := queryId.(string)
		if !ok {
			zap.L().Error("GetTimeSeriesResultV3: queryId in ctx not a string as expected", zap.Any("queryId", queryId))

		} else {
			ctx = clickhouse.Context(ctx, clickhouse.WithProgress(
				func(p *clickhouse.Progress) {
					go func() {
						err := r.queryProgressTracker.ReportQueryProgress(qid, p)
						if err != nil {
							zap.L().Error(
								"Couldn't report query progress",
								zap.String("queryId", qid), zap.Error(err),
							)
						}
					}()
				},
			))
		}
	}

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("error while reading time series result", zap.Error(err))
		return nil, errors.New(err.Error())
	}
	defer rows.Close()

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
		vars        = make([]interface{}, len(columnTypes))
	)
	var countOfNumberCols int

	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
		switch columnTypes[i].ScanType().Kind() {
		case reflect.Float32,
			reflect.Float64,
			reflect.Uint,
			reflect.Uint8,
			reflect.Uint16,
			reflect.Uint32,
			reflect.Uint64,
			reflect.Int,
			reflect.Int8,
			reflect.Int16,
			reflect.Int32,
			reflect.Int64:
			countOfNumberCols++
		}
	}

	return readRowsForTimeSeriesResult(rows, vars, columnNames, countOfNumberCols)
}

// GetListResultV3 runs the query and returns list of rows
func (r *ClickHouseReader) GetListResultV3(ctx context.Context, query string) ([]*v3.Row, error) {

	ctxArgs := map[string]interface{}{"query": query}
	for k, v := range logCommentKVs(ctx) {
		ctxArgs[k] = v
	}

	defer utils.Elapsed("GetListResultV3", ctxArgs)()

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("error while reading time series result", zap.Error(err))
		return nil, errors.New(err.Error())
	}
	defer rows.Close()

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
	)

	var rowList []*v3.Row

	for rows.Next() {
		var vars = make([]interface{}, len(columnTypes))
		for i := range columnTypes {
			vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
		}
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		row := map[string]interface{}{}
		var t time.Time
		for idx, v := range vars {
			if columnNames[idx] == "timestamp" {
				t = time.Unix(0, int64(*v.(*uint64)))
			} else if columnNames[idx] == "timestamp_datetime" {
				t = *v.(*time.Time)
			} else {
				row[columnNames[idx]] = v
			}
		}

		// remove duplicate _ attributes for logs.
		// remove this function after a month
		removeDuplicateUnderscoreAttributes(row)

		rowList = append(rowList, &v3.Row{Timestamp: t, Data: row})
	}

	return rowList, getPersonalisedError(rows.Err())

}

func getPersonalisedError(err error) error {
	if err == nil {
		return nil
	}
	zap.L().Error("error while reading result", zap.Error(err))
	if strings.Contains(err.Error(), "code: 307") {
		return chErrors.ErrResourceBytesLimitExceeded
	}

	if strings.Contains(err.Error(), "code: 159") {
		return chErrors.ErrResourceTimeLimitExceeded
	}
	return err
}

func removeDuplicateUnderscoreAttributes(row map[string]interface{}) {
	if val, ok := row["attributes_int64"]; ok {
		attributes := val.(*map[string]int64)
		for key := range *attributes {
			if strings.Contains(key, ".") {
				uKey := strings.ReplaceAll(key, ".", "_")
				delete(*attributes, uKey)
			}
		}

	}

	if val, ok := row["attributes_float64"]; ok {
		attributes := val.(*map[string]float64)
		for key := range *attributes {
			if strings.Contains(key, ".") {
				uKey := strings.ReplaceAll(key, ".", "_")
				delete(*attributes, uKey)
			}
		}

	}

	if val, ok := row["attributes_bool"]; ok {
		attributes := val.(*map[string]bool)
		for key := range *attributes {
			if strings.Contains(key, ".") {
				uKey := strings.ReplaceAll(key, ".", "_")
				delete(*attributes, uKey)
			}
		}

	}
	for _, k := range []string{"attributes_string", "resources_string"} {
		if val, ok := row[k]; ok {
			attributes := val.(*map[string]string)
			for key := range *attributes {
				if strings.Contains(key, ".") {
					uKey := strings.ReplaceAll(key, ".", "_")
					delete(*attributes, uKey)
				}
			}

		}
	}
}
func (r *ClickHouseReader) CheckClickHouse(ctx context.Context) error {
	rows, err := r.db.Query(ctx, "SELECT 1")
	if err != nil {
		return err
	}
	defer rows.Close()

	return nil
}

func (r *ClickHouseReader) GetTraceAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error) {
	var query string
	var err error
	var rows driver.Rows
	var response v3.AggregateAttributeResponse
	where := ""
	switch req.Operator {
	case
		v3.AggregateOperatorCountDistinct,
		v3.AggregateOperatorCount:
		where = "tagKey ILIKE $1"
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRate,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorP05,
		v3.AggregateOperatorP10,
		v3.AggregateOperatorP20,
		v3.AggregateOperatorP25,
		v3.AggregateOperatorP50,
		v3.AggregateOperatorP75,
		v3.AggregateOperatorP90,
		v3.AggregateOperatorP95,
		v3.AggregateOperatorP99,
		v3.AggregateOperatorAvg,
		v3.AggregateOperatorSum,
		v3.AggregateOperatorMin,
		v3.AggregateOperatorMax:
		where = "tagKey ILIKE $1 AND dataType='float64'"
	case
		v3.AggregateOperatorNoOp:
		return &v3.AggregateAttributeResponse{}, nil
	default:
		return nil, fmt.Errorf("unsupported aggregate operator")
	}
	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, dataType, isColumn FROM %s.%s WHERE %s", r.TraceDB, r.spanAttributeTable, where)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText))

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var tagKey string
	var dataType string
	var tagType string
	var isColumn bool
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType, &isColumn); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		// TODO: Remove this once the column name are updated in the table
		tagKey = tempHandleFixedColumns(tagKey)
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn,
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}
	return &response, nil
}

func (r *ClickHouseReader) GetTraceAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, dataType, isColumn FROM %s.%s WHERE tagKey ILIKE $1", r.TraceDB, r.spanAttributeTable)

	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText))

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var tagKey string
	var dataType string
	var tagType string
	var isColumn bool
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType, &isColumn); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		// TODO: Remove this once the column name are updated in the table
		tagKey = tempHandleFixedColumns(tagKey)
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn,
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}
	return &response, nil
}

// tempHandleFixedColumns is a temporary function to handle the fixed columns whose name has been changed in AttributeKeys Table
func tempHandleFixedColumns(tagKey string) string {
	switch {
	case tagKey == "traceId":
		tagKey = "traceID"
	case tagKey == "spanId":
		tagKey = "spanID"
	case tagKey == "parentSpanId":
		tagKey = "parentSpanID"
	}
	return tagKey
}

func (r *ClickHouseReader) GetTraceAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var attributeValues v3.FilterAttributeValueResponse
	// if dataType or tagType is not present return empty response
	if len(req.FilterAttributeKeyDataType) == 0 || len(req.TagType) == 0 || req.FilterAttributeKey == "body" {
		return &v3.FilterAttributeValueResponse{}, nil
	}
	switch req.FilterAttributeKeyDataType {
	case v3.AttributeKeyDataTypeString:
		query = fmt.Sprintf("SELECT DISTINCT stringTagValue from %s.%s WHERE tagKey = $1 AND stringTagValue ILIKE $2 AND tagType=$3 limit $4", r.TraceDB, r.spanAttributeTable)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, fmt.Sprintf("%%%s%%", req.SearchText), req.TagType, req.Limit)
		if err != nil {
			zap.L().Error("Error while executing query", zap.Error(err))
			return nil, fmt.Errorf("error while executing query: %s", err.Error())
		}
		defer rows.Close()

		var strAttributeValue string
		for rows.Next() {
			if err := rows.Scan(&strAttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			attributeValues.StringAttributeValues = append(attributeValues.StringAttributeValues, strAttributeValue)
		}
	case v3.AttributeKeyDataTypeFloat64, v3.AttributeKeyDataTypeInt64:
		query = fmt.Sprintf("SELECT DISTINCT float64TagValue from %s.%s where tagKey = $1 AND toString(float64TagValue) ILIKE $2 AND tagType=$3 limit $4", r.TraceDB, r.spanAttributeTable)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, fmt.Sprintf("%%%s%%", req.SearchText), req.TagType, req.Limit)
		if err != nil {
			zap.L().Error("Error while executing query", zap.Error(err))
			return nil, fmt.Errorf("error while executing query: %s", err.Error())
		}
		defer rows.Close()

		var numberAttributeValue sql.NullFloat64
		for rows.Next() {
			if err := rows.Scan(&numberAttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			if numberAttributeValue.Valid {
				attributeValues.NumberAttributeValues = append(attributeValues.NumberAttributeValues, numberAttributeValue.Float64)
			}
		}
	case v3.AttributeKeyDataTypeBool:
		attributeValues.BoolAttributeValues = []bool{true, false}
	default:
		return nil, fmt.Errorf("invalid data type")
	}

	return &attributeValues, nil
}

func (r *ClickHouseReader) GetSpanAttributeKeys(ctx context.Context) (map[string]v3.AttributeKey, error) {
	var query string
	var err error
	var rows driver.Rows
	response := map[string]v3.AttributeKey{}

	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, dataType, isColumn FROM %s.%s", r.TraceDB, r.spanAttributesKeysTable)

	rows, err = r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var tagKey string
	var dataType string
	var tagType string
	var isColumn bool
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType, &isColumn); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn,
		}
		response[tagKey] = key
	}
	return response, nil
}

func (r *ClickHouseReader) LiveTailLogsV4(ctx context.Context, query string, timestampStart uint64, idStart string, client *model.LogsLiveTailClientV2) {
	if timestampStart == 0 {
		timestampStart = uint64(time.Now().UnixNano())
	} else {
		timestampStart = uint64(utils.GetEpochNanoSecs(int64(timestampStart)))
	}

	ticker := time.NewTicker(time.Duration(r.liveTailRefreshSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			zap.L().Debug("closing go routine : " + client.Name)
			return
		case <-ticker.C:
			// get the new 100 logs as anything more older won't make sense
			var tmpQuery string
			bucketStart := (timestampStart / NANOSECOND) - 1800

			// we have to form the query differently if the resource filters are used
			if strings.Contains(query, r.logsResourceTableV2) {
				tmpQuery = fmt.Sprintf("seen_at_ts_bucket_start >=%d)) AND ts_bucket_start >=%d AND timestamp >=%d", bucketStart, bucketStart, timestampStart)
			} else {
				tmpQuery = fmt.Sprintf("ts_bucket_start >=%d AND timestamp >=%d", bucketStart, timestampStart)
			}
			if idStart != "" {
				tmpQuery = fmt.Sprintf("%s AND id > '%s'", tmpQuery, idStart)
			}

			// the reason we are doing desc is that we need the latest logs first
			tmpQuery = query + tmpQuery + " order by timestamp desc, id desc limit 100"

			// using the old structure since we can directly read it to the struct as use it.
			response := []model.SignozLogV2{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.L().Error("Error while getting logs", zap.Error(err))
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				client.Logs <- &response[i]
				if i == 0 {
					timestampStart = response[i].Timestamp
					idStart = response[i].ID
				}
			}
		}
	}
}

func (r *ClickHouseReader) LiveTailLogsV3(ctx context.Context, query string, timestampStart uint64, idStart string, client *model.LogsLiveTailClient) {
	if timestampStart == 0 {
		timestampStart = uint64(time.Now().UnixNano())
	} else {
		timestampStart = uint64(utils.GetEpochNanoSecs(int64(timestampStart)))
	}

	ticker := time.NewTicker(time.Duration(r.liveTailRefreshSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			zap.L().Debug("closing go routine : " + client.Name)
			return
		case <-ticker.C:
			// get the new 100 logs as anything more older won't make sense
			tmpQuery := fmt.Sprintf("timestamp >='%d'", timestampStart)
			if idStart != "" {
				tmpQuery = fmt.Sprintf("%s AND id > '%s'", tmpQuery, idStart)
			}
			// the reason we are doing desc is that we need the latest logs first
			tmpQuery = query + tmpQuery + " order by timestamp desc, id desc limit 100"

			// using the old structure since we can directly read it to the struct as use it.
			response := []model.SignozLog{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.L().Error("Error while getting logs", zap.Error(err))
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				client.Logs <- &response[i]
				if i == 0 {
					timestampStart = response[i].Timestamp
					idStart = response[i].ID
				}
			}
		}
	}
}

func (r *ClickHouseReader) AddRuleStateHistory(ctx context.Context, ruleStateHistory []model.RuleStateHistory) error {
	var statement driver.Batch
	var err error

	defer func() {
		if statement != nil {
			statement.Abort()
		}
	}()

	statement, err = r.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s (rule_id, rule_name, overall_state, overall_state_changed, state, state_changed, unix_milli, labels, fingerprint, value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
		signozHistoryDBName, ruleStateHistoryTableName))

	if err != nil {
		return err
	}

	for _, history := range ruleStateHistory {
		err = statement.Append(history.RuleID, history.RuleName, history.OverallState, history.OverallStateChanged, history.State, history.StateChanged, history.UnixMilli, history.Labels, history.Fingerprint, history.Value)
		if err != nil {
			return err
		}
	}

	err = statement.Send()
	if err != nil {
		return err
	}
	return nil
}

func (r *ClickHouseReader) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]model.RuleStateHistory, error) {
	query := fmt.Sprintf("SELECT * FROM %s.%s WHERE rule_id = '%s' AND state_changed = true ORDER BY unix_milli DESC LIMIT 1 BY fingerprint",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID)

	history := []model.RuleStateHistory{}
	err := r.db.Select(ctx, &history, query)
	if err != nil {
		return nil, err
	}
	return history, nil
}

func (r *ClickHouseReader) ReadRuleStateHistoryByRuleID(
	ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*model.RuleStateTimeline, error) {

	var conditions []string

	conditions = append(conditions, fmt.Sprintf("rule_id = '%s'", ruleID))

	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", params.Start, params.End))

	if params.State != "" {
		conditions = append(conditions, fmt.Sprintf("state = '%s'", params.State))
	}

	if params.Filters != nil && len(params.Filters.Items) != 0 {
		for _, item := range params.Filters.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			if op == v3.FilterOperatorContains || op == v3.FilterOperatorNotContains {
				toFormat = fmt.Sprintf("%%%s%%", toFormat)
			}
			fmtVal := utils.ClickHouseFormattedValue(toFormat)
			switch op {
			case v3.FilterOperatorEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') = %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') != %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') NOT IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLike:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotLike:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorRegex:
				conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotRegex:
				conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') > %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') >= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') < %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') <= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorContains:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotContains:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorExists:
				conditions = append(conditions, fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			case v3.FilterOperatorNotExists:
				conditions = append(conditions, fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			default:
				return nil, fmt.Errorf("unsupported filter operator")
			}
		}
	}
	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf("SELECT * FROM %s.%s WHERE %s ORDER BY unix_milli %s LIMIT %d OFFSET %d",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause, params.Order, params.Limit, params.Offset)

	history := []model.RuleStateHistory{}
	zap.L().Debug("rule state history query", zap.String("query", query))
	err := r.db.Select(ctx, &history, query)
	if err != nil {
		zap.L().Error("Error while reading rule state history", zap.Error(err))
		return nil, err
	}

	var total uint64
	zap.L().Debug("rule state history total query", zap.String("query", fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE %s",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause)))
	err = r.db.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE %s",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause)).Scan(&total)
	if err != nil {
		return nil, err
	}

	labelsQuery := fmt.Sprintf("SELECT DISTINCT labels FROM %s.%s WHERE rule_id = $1",
		signozHistoryDBName, ruleStateHistoryTableName)
	rows, err := r.db.Query(ctx, labelsQuery, ruleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	labelsMap := make(map[string][]string)
	for rows.Next() {
		var rawLabel string
		err = rows.Scan(&rawLabel)
		if err != nil {
			return nil, err
		}
		label := map[string]string{}
		err = json.Unmarshal([]byte(rawLabel), &label)
		if err != nil {
			return nil, err
		}
		for k, v := range label {
			labelsMap[k] = append(labelsMap[k], v)
		}
	}

	timeline := &model.RuleStateTimeline{
		Items:  history,
		Total:  total,
		Labels: labelsMap,
	}

	return timeline, nil
}

func (r *ClickHouseReader) ReadRuleStateHistoryTopContributorsByRuleID(
	ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) ([]model.RuleStateHistoryContributor, error) {
	query := fmt.Sprintf(`SELECT
		fingerprint,
		any(labels) as labels,
		count(*) as count
	FROM %s.%s
	WHERE rule_id = '%s' AND (state_changed = true) AND (state = '%s') AND unix_milli >= %d AND unix_milli <= %d
	GROUP BY fingerprint
	HAVING labels != '{}'
	ORDER BY count DESC`,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.Start, params.End)

	zap.L().Debug("rule state history top contributors query", zap.String("query", query))
	contributors := []model.RuleStateHistoryContributor{}
	err := r.db.Select(ctx, &contributors, query)
	if err != nil {
		zap.L().Error("Error while reading rule state history", zap.Error(err))
		return nil, err
	}

	return contributors, nil
}

func (r *ClickHouseReader) GetOverallStateTransitions(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) ([]model.ReleStateItem, error) {

	tmpl := `WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateFiring.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateInactive.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT *
FROM matched_events
ORDER BY firing_time ASC;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End)

	zap.L().Debug("overall state transitions query", zap.String("query", query))

	transitions := []model.RuleStateTransition{}
	err := r.db.Select(ctx, &transitions, query)
	if err != nil {
		return nil, err
	}

	stateItems := []model.ReleStateItem{}

	for idx, item := range transitions {
		start := item.FiringTime
		end := item.ResolutionTime
		stateItems = append(stateItems, model.ReleStateItem{
			State: item.State,
			Start: start,
			End:   end,
		})
		if idx < len(transitions)-1 {
			nextStart := transitions[idx+1].FiringTime
			if nextStart > end {
				stateItems = append(stateItems, model.ReleStateItem{
					State: model.StateInactive,
					Start: end,
					End:   nextStart,
				})
			}
		}
	}

	// fetch the most recent overall_state from the table
	var state model.AlertState
	stateQuery := fmt.Sprintf("SELECT state FROM %s.%s WHERE rule_id = '%s' AND unix_milli <= %d ORDER BY unix_milli DESC LIMIT 1",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.End)
	if err := r.db.QueryRow(ctx, stateQuery).Scan(&state); err != nil {
		if err != sql.ErrNoRows {
			return nil, err
		}
		state = model.StateInactive
	}

	if len(transitions) == 0 {
		// no transitions found, it is either firing or inactive for whole time range
		stateItems = append(stateItems, model.ReleStateItem{
			State: state,
			Start: params.Start,
			End:   params.End,
		})
	} else {
		// there were some transitions, we need to add the last state at the end
		if state == model.StateInactive {
			stateItems = append(stateItems, model.ReleStateItem{
				State: model.StateInactive,
				Start: transitions[len(transitions)-1].ResolutionTime,
				End:   params.End,
			})
		} else {
			// fetch the most recent firing event from the table in the given time range
			var firingTime int64
			firingQuery := fmt.Sprintf(`
			SELECT
				unix_milli
			FROM %s.%s
			WHERE rule_id = '%s' AND overall_state_changed = true AND overall_state = '%s' AND unix_milli <= %d
			ORDER BY unix_milli DESC LIMIT 1`, signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.End)
			if err := r.db.QueryRow(ctx, firingQuery).Scan(&firingTime); err != nil {
				return nil, err
			}
			stateItems = append(stateItems, model.ReleStateItem{
				State: model.StateInactive,
				Start: transitions[len(transitions)-1].ResolutionTime,
				End:   firingTime,
			})
			stateItems = append(stateItems, model.ReleStateItem{
				State: model.StateFiring,
				Start: firingTime,
				End:   params.End,
			})
		}
	}
	return stateItems, nil
}

func (r *ClickHouseReader) GetAvgResolutionTime(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (float64, error) {

	tmpl := `
WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateFiring.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateInactive.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT AVG(resolution_time - firing_time) / 1000 AS avg_resolution_time
FROM matched_events;
`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End)

	zap.L().Debug("avg resolution time query", zap.String("query", query))
	var avgResolutionTime float64
	err := r.db.QueryRow(ctx, query).Scan(&avgResolutionTime)
	if err != nil {
		return 0, err
	}

	return avgResolutionTime, nil
}

func (r *ClickHouseReader) GetAvgResolutionTimeByInterval(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*v3.Series, error) {

	step := common.MinAllowedStepInterval(params.Start, params.End)

	tmpl := `
WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateFiring.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateInactive.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT toStartOfInterval(toDateTime(firing_time / 1000), INTERVAL %d SECOND) AS ts, AVG(resolution_time - firing_time) / 1000 AS avg_resolution_time
FROM matched_events
GROUP BY ts
ORDER BY ts ASC;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End, step)

	zap.L().Debug("avg resolution time by interval query", zap.String("query", query))
	result, err := r.GetTimeSeriesResultV3(ctx, query)
	if err != nil || len(result) == 0 {
		return nil, err
	}

	return result[0], nil
}

func (r *ClickHouseReader) GetTotalTriggers(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (uint64, error) {
	query := fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE rule_id = '%s' AND (state_changed = true) AND (state = '%s') AND unix_milli >= %d AND unix_milli <= %d",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.Start, params.End)

	var totalTriggers uint64

	err := r.db.QueryRow(ctx, query).Scan(&totalTriggers)
	if err != nil {
		return 0, err
	}

	return totalTriggers, nil
}

func (r *ClickHouseReader) GetTriggersByInterval(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*v3.Series, error) {
	step := common.MinAllowedStepInterval(params.Start, params.End)

	query := fmt.Sprintf("SELECT count(*), toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) as ts FROM %s.%s WHERE rule_id = '%s' AND (state_changed = true) AND (state = '%s') AND unix_milli >= %d AND unix_milli <= %d GROUP BY ts ORDER BY ts ASC",
		step, signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.Start, params.End)

	result, err := r.GetTimeSeriesResultV3(ctx, query)
	if err != nil || len(result) == 0 {
		return nil, err
	}

	return result[0], nil
}

func (r *ClickHouseReader) GetMinAndMaxTimestampForTraceID(ctx context.Context, traceID []string) (int64, int64, error) {
	var minTime, maxTime time.Time

	query := fmt.Sprintf("SELECT min(timestamp), max(timestamp) FROM %s.%s WHERE traceID IN ('%s')",
		r.TraceDB, r.SpansTable, strings.Join(traceID, "','"))

	zap.L().Debug("GetMinAndMaxTimestampForTraceID", zap.String("query", query))

	err := r.db.QueryRow(ctx, query).Scan(&minTime, &maxTime)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return 0, 0, err
	}

	// return current time if traceID not found
	if minTime.IsZero() || maxTime.IsZero() {
		zap.L().Debug("minTime or maxTime is zero, traceID not found")
		return time.Now().UnixNano(), time.Now().UnixNano(), nil
	}

	zap.L().Debug("GetMinAndMaxTimestampForTraceID", zap.Any("minTime", minTime), zap.Any("maxTime", maxTime))

	return minTime.UnixNano(), maxTime.UnixNano(), nil
}

func (r *ClickHouseReader) ReportQueryStartForProgressTracking(
	queryId string,
) (func(), *model.ApiError) {
	return r.queryProgressTracker.ReportQueryStarted(queryId)
}

func (r *ClickHouseReader) SubscribeToQueryProgress(
	queryId string,
) (<-chan model.QueryProgress, func(), *model.ApiError) {
	return r.queryProgressTracker.SubscribeToQueryProgress(queryId)
}
