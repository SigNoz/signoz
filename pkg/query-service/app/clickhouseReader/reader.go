package clickhouseReader

import (
	"bytes"
	"context"
	"encoding/json"

	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"os"
	"reflect"
	"regexp"
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
	"github.com/prometheus/prometheus/discovery"
	sd_config "github.com/prometheus/prometheus/discovery/config"
	"github.com/prometheus/prometheus/promql"

	"github.com/prometheus/prometheus/scrape"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
	"github.com/prometheus/prometheus/util/stats"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jmoiron/sqlx"

	promModel "github.com/prometheus/common/model"
	"go.signoz.io/signoz/pkg/query-service/app/logs"
	"go.signoz.io/signoz/pkg/query-service/constants"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

const (
	primaryNamespace         = "clickhouse"
	archiveNamespace         = "clickhouse-archive"
	signozTraceDBName        = "signoz_traces"
	signozDurationMVTable    = "durationSort"
	signozUsageExplorerTable = "usage_explorer"
	signozSpansTable         = "signoz_spans"
	signozErrorIndexTable    = "signoz_error_index_v2"
	signozTraceTableName     = "signoz_index_v2"
	signozMetricDBName       = "signoz_metrics"
	signozSampleTableName    = "samples_v2"
	signozTSTableName        = "time_series_v2"

	minTimespanForProgressiveSearch       = time.Hour
	minTimespanForProgressiveSearchMargin = time.Minute
	maxProgressiveSteps                   = 4
	charset                               = "abcdefghijklmnopqrstuvwxyz" +
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
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
	dependencyGraphTable    string
	topLevelOperationsTable string
	logsDB                  string
	logsTable               string
	logsAttributeKeys       string
	logsResourceKeys        string
	queryEngine             *promql.Engine
	remoteStorage           *remote.Storage
	fanoutStorage           *storage.Storage

	promConfigFile string
	promConfig     *config.Config
	alertManager   am.Manager
	featureFlags   interfaces.FeatureLookup

	liveTailRefreshSeconds int
}

// NewTraceReader returns a TraceReader for the database
func NewReader(localDB *sqlx.DB, configFile string, featureFlag interfaces.FeatureLookup) *ClickHouseReader {

	datasource := os.Getenv("ClickHouseUrl")
	options := NewOptions(datasource, primaryNamespace, archiveNamespace)
	db, err := initialize(options)

	if err != nil {
		zap.S().Error("failed to initialize ClickHouse: ", err)
		os.Exit(1)
	}

	alertManager, err := am.New("")
	if err != nil {
		zap.S().Errorf("msg: failed to initialize alert manager: ", "/t error:", err)
		zap.S().Errorf("msg: check if the alert manager URL is correctly set and valid")
		os.Exit(1)
	}

	return &ClickHouseReader{
		db:                      db,
		localDB:                 localDB,
		TraceDB:                 options.primary.TraceDB,
		alertManager:            alertManager,
		operationsTable:         options.primary.OperationsTable,
		indexTable:              options.primary.IndexTable,
		errorTable:              options.primary.ErrorTable,
		usageExplorerTable:      options.primary.UsageExplorerTable,
		durationTable:           options.primary.DurationTable,
		SpansTable:              options.primary.SpansTable,
		dependencyGraphTable:    options.primary.DependencyGraphTable,
		topLevelOperationsTable: options.primary.TopLevelOperationsTable,
		logsDB:                  options.primary.LogsDB,
		logsTable:               options.primary.LogsTable,
		logsAttributeKeys:       options.primary.LogsAttributeKeysTable,
		logsResourceKeys:        options.primary.LogsResourceKeysTable,
		liveTailRefreshSeconds:  options.primary.LiveTailRefreshSeconds,
		promConfigFile:          configFile,
		featureFlags:            featureFlag,
	}
}

func (r *ClickHouseReader) Start(readerReady chan bool) {
	logLevel := promlog.AllowedLevel{}
	logLevel.Set("debug")
	// allowedFormat := promlog.AllowedFormat{}
	// allowedFormat.Set("logfmt")

	// promlogConfig := promlog.Config{
	// 	Level:  &logLevel,
	// 	Format: &allowedFormat,
	// }

	logger := promlog.New(logLevel)

	startTime := func() (int64, error) {
		return int64(promModel.Latest), nil
	}

	remoteStorage := remote.NewStorage(log.With(logger, "component", "remote"), startTime, time.Duration(1*time.Minute))

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

	// fanoutStorage := remoteStorage
	fanoutStorage := storage.NewFanout(logger, remoteStorage)

	ctxScrape, cancelScrape := context.WithCancel(context.Background())
	discoveryManagerScrape := discovery.NewManager(ctxScrape, log.With(logger, "component", "discovery manager scrape"), discovery.Name("scrape"))

	scrapeManager := scrape.NewManager(log.With(logger, "component", "scrape manager"), fanoutStorage)

	opts := promql.EngineOpts{
		Logger:        log.With(logger, "component", "query engine"),
		Reg:           nil,
		MaxConcurrent: 20,
		MaxSamples:    50000000,
		Timeout:       time.Duration(2 * time.Minute),
	}

	queryEngine := promql.NewEngine(opts)

	reloaders := []func(cfg *config.Config) error{
		remoteStorage.ApplyConfig,
		// The Scrape managers need to reload before the Discovery manager as
		// they need to read the most updated config when receiving the new targets list.
		scrapeManager.ApplyConfig,
		func(cfg *config.Config) error {
			c := make(map[string]sd_config.ServiceDiscoveryConfig)
			for _, v := range cfg.ScrapeConfigs {
				c[v.JobName] = v.ServiceDiscoveryConfig
			}
			return discoveryManagerScrape.ApplyConfig(c)
		},
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
		// Scrape discovery manager.
		g.Add(
			func() error {
				err := discoveryManagerScrape.Run()
				level.Info(logger).Log("msg", "Scrape discovery manager stopped")
				return err
			},
			func(err error) {
				level.Info(logger).Log("msg", "Stopping scrape discovery manager...")
				cancelScrape()
			},
		)
	}
	{
		// Scrape manager.
		g.Add(
			func() error {
				// When the scrape manager receives a new targets list
				// it needs to read a valid config for each job.
				// It depends on the config being in sync with the discovery manager so
				// we wait until the config is fully loaded.
				<-reloadReady.C

				err := scrapeManager.Run(discoveryManagerScrape.SyncCh())
				level.Info(logger).Log("msg", "Scrape manager stopped")
				return err
			},
			func(err error) {
				// Scrape manager needs to be stopped before closing the local TSDB
				// so that it doesn't try to write samples to a closed storage.
				level.Info(logger).Log("msg", "Stopping scrape manager...")
				scrapeManager.Stop()
			},
		)
	}
	{
		// Initial configuration loading.
		cancel := make(chan struct{})
		g.Add(
			func() error {
				// select {
				// case <-dbOpen:
				// 	break
				// // In case a shutdown is initiated before the dbOpen is released
				// case <-cancel:
				// 	reloadReady.Close()
				// 	return nil
				// }
				var err error
				r.promConfig, err = reloadConfig(cfg.configFile, logger, reloaders...)
				if err != nil {
					return fmt.Errorf("error loading config from %q: %s", cfg.configFile, err)
				}

				reloadReady.Close()

				// ! commented the alert manager can now
				// call query service to do this
				// channels, apiErrorObj := r.GetChannels()

				//if apiErrorObj != nil {
				//	zap.S().Errorf("Not able to read channels from DB")
				//}
				//for _, channel := range *channels {
				//apiErrorObj = r.LoadChannel(&channel)
				//if apiErrorObj != nil {
				//	zap.S().Errorf("Not able to load channel with id=%d loaded from DB", channel.Id, channel.Data)
				//}
				//}

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

	conf, err := config.LoadFile(filename)
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
		zap.S().Errorf("Error in getting response of API call to alertmanager/v1/receivers\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if response.StatusCode > 299 {
		responseData, _ := ioutil.ReadAll(response.Body)

		err := fmt.Errorf("Error in getting 2xx response in API call to alertmanager/v1/receivers\n Status: %s \n Data: %s", response.Status, string(responseData))
		zap.S().Error(err)

		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (r *ClickHouseReader) GetChannel(id string) (*model.ChannelItem, *model.ApiError) {

	idInt, _ := strconv.Atoi(id)
	channel := model.ChannelItem{}

	query := "SELECT id, created_at, updated_at, name, type, data data FROM notification_channels WHERE id=? "

	stmt, err := r.localDB.Preparex(query)

	zap.S().Info(query, idInt)

	if err != nil {
		zap.S().Debug("Error in preparing sql query for GetChannel : ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = stmt.Get(&channel, idInt)

	if err != nil {
		zap.S().Debug(fmt.Sprintf("Error in getting channel with id=%d : ", idInt), err)
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
			zap.S().Errorf("Error in preparing statement for INSERT to notification_channels\n", err)
			tx.Rollback()
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(idInt); err != nil {
			zap.S().Errorf("Error in Executing prepared statement for INSERT to notification_channels\n", err)
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
		zap.S().Errorf("Error in committing transaction for DELETE command to notification_channels\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil

}

func (r *ClickHouseReader) GetChannels() (*[]model.ChannelItem, *model.ApiError) {

	channels := []model.ChannelItem{}

	query := fmt.Sprintf("SELECT id, created_at, updated_at, name, type, data data FROM notification_channels")

	err := r.localDB.Select(&channels, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
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
	receiverString, _ := json.Marshal(receiver)

	{
		stmt, err := tx.Prepare(`UPDATE notification_channels SET updated_at=$1, type=$2, data=$3 WHERE id=$4;`)

		if err != nil {
			zap.S().Errorf("Error in preparing statement for UPDATE to notification_channels\n", err)
			tx.Rollback()
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(time.Now(), channel_type, string(receiverString), idInt); err != nil {
			zap.S().Errorf("Error in Executing prepared statement for UPDATE to notification_channels\n", err)
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
		zap.S().Errorf("Error in committing transaction for INSERT to notification_channels\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return receiver, nil

}

func (r *ClickHouseReader) CreateChannel(receiver *am.Receiver) (*am.Receiver, *model.ApiError) {

	tx, err := r.localDB.Begin()
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	channel_type := getChannelType(receiver)
	receiverString, _ := json.Marshal(receiver)

	// todo: check if the channel name already exists, raise an error if so

	{
		stmt, err := tx.Prepare(`INSERT INTO notification_channels (created_at, updated_at, name, type, data) VALUES($1,$2,$3,$4,$5);`)
		if err != nil {
			zap.S().Errorf("Error in preparing statement for INSERT to notification_channels\n", err)
			tx.Rollback()
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(time.Now(), time.Now(), receiver.Name, channel_type, string(receiverString)); err != nil {
			zap.S().Errorf("Error in Executing prepared statement for INSERT to notification_channels\n", err)
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
		zap.S().Errorf("Error in committing transaction for INSERT to notification_channels\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return receiver, nil

}

func (r *ClickHouseReader) GetInstantQueryMetricsResult(ctx context.Context, queryParams *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.queryEngine.NewInstantQuery(r.remoteStorage, queryParams.Query, queryParams.Time)
	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	res := qry.Exec(ctx)

	// Optional stats field in response if parameter "stats" is not empty.
	var qs *stats.QueryStats
	if queryParams.Stats != "" {
		qs = stats.NewQueryStats(qry.Stats())
	}

	qry.Close()
	return res, qs, nil

}

func (r *ClickHouseReader) GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {

	qry, err := r.queryEngine.NewRangeQuery(r.remoteStorage, query.Query, query.Start, query.End, query.Step)

	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	res := qry.Exec(ctx)

	// Optional stats field in response if parameter "stats" is not empty.
	var qs *stats.QueryStats
	if query.Stats != "" {
		qs = stats.NewQueryStats(qry.Stats())
	}

	qry.Close()
	return res, qs, nil
}

func (r *ClickHouseReader) GetServicesList(ctx context.Context) (*[]string, error) {

	services := []string{}
	query := fmt.Sprintf(`SELECT DISTINCT serviceName FROM %s.%s WHERE toDate(timestamp) > now() - INTERVAL 1 DAY`, r.TraceDB, r.indexTable)

	rows, err := r.db.Query(ctx, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
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

func (r *ClickHouseReader) GetTopLevelOperations(ctx context.Context) (*map[string][]string, *model.ApiError) {

	operations := map[string][]string{}
	query := fmt.Sprintf(`SELECT DISTINCT name, serviceName FROM %s.%s`, r.TraceDB, r.topLevelOperationsTable)

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.S().Error("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	defer rows.Close()
	for rows.Next() {
		var name, serviceName string
		if err := rows.Scan(&name, &serviceName); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("Error in reading data")}
		}
		if _, ok := operations[serviceName]; !ok {
			operations[serviceName] = []string{}
		}
		operations[serviceName] = append(operations[serviceName], name)
	}
	return &operations, nil
}

func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceItem, *model.ApiError) {

	if r.indexTable == "" {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: ErrNoIndexTable}
	}

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx)
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
			query := fmt.Sprintf(
				`SELECT
					quantile(0.99)(durationNano) as p99,
					avg(durationNano) as avgDuration,
					count(*) as numCalls
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In [@names] AND timestamp>= @start AND timestamp<= @end`,
				r.TraceDB, r.indexTable,
			)
			errorQuery := fmt.Sprintf(
				`SELECT
					count(*) as numErrors
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In [@names] AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
				r.TraceDB, r.indexTable,
			)

			args := []interface{}{}
			args = append(args,
				clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
				clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
				clickhouse.Named("serviceName", svc),
				clickhouse.Named("names", ops),
			)
			args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
			if errStatus != nil {
				zap.S().Error("Error in processing sql query: ", errStatus)
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
				zap.S().Error("Error in processing sql query: ", err)
				return
			}

			args, errStatus = buildQueryWithTagParams(ctx, queryParams.Tags, &errorQuery, args)
			err = r.db.QueryRow(ctx, errorQuery, args...).Scan(&numErrors)
			if err != nil {
				zap.S().Error("Error in processing sql query: ", err)
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

func (r *ClickHouseReader) GetServiceOverview(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, *model.ApiError) {

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx)
	if apiErr != nil {
		return nil, apiErr
	}
	ops, ok := (*topLevelOps)[queryParams.ServiceName]
	if !ok {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Service not found")}
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
		WHERE serviceName = @serviceName AND name In [@names] AND timestamp>= @start AND timestamp<= @end`,
		r.TraceDB, r.indexTable,
	)
	args := []interface{}{}
	args = append(args, namedArgs...)
	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY time ORDER BY time DESC"
	err := r.db.Select(ctx, &serviceOverviewItems, query, args...)

	zap.S().Debug(query)

	if err != nil {
		zap.S().Error("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	serviceErrorItems := []model.ServiceErrorItem{}

	query = fmt.Sprintf(`
		SELECT
			toStartOfInterval(timestamp, INTERVAL @interval minute) as time,
			count(*) as numErrors
		FROM %s.%s
		WHERE serviceName = @serviceName AND name In [@names] AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
		r.TraceDB, r.indexTable,
	)
	args = []interface{}{}
	args = append(args, namedArgs...)
	args, errStatus = buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY time ORDER BY time DESC"
	err = r.db.Select(ctx, &serviceErrorItems, query, args...)

	zap.S().Debug(query)

	if err != nil {
		zap.S().Error("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
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
	if len(queryParams.HttpCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpCode, constants.HttpCode, &query, args)
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
	if len(queryParams.Component) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Component, constants.Component, &query, args)
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

	traceFilterReponse := model.SpanFiltersResponse{
		Status:             map[string]uint64{},
		Duration:           map[string]uint64{},
		ServiceName:        map[string]uint64{},
		Operation:          map[string]uint64{},
		ResponseStatusCode: map[string]uint64{},
		RPCMethod:          map[string]uint64{},
		HttpCode:           map[string]uint64{},
		HttpMethod:         map[string]uint64{},
		HttpUrl:            map[string]uint64{},
		HttpRoute:          map[string]uint64{},
		HttpHost:           map[string]uint64{},
		Component:          map[string]uint64{},
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
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.ServiceName != "" {
					traceFilterReponse.ServiceName[service.ServiceName] = service.Count
				}
			}
		case constants.HttpCode:
			finalQuery := fmt.Sprintf("SELECT httpCode, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY httpCode"
			var dBResponse []model.DBResponseHttpCode
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.HttpCode != "" {
					traceFilterReponse.HttpCode[service.HttpCode] = service.Count
				}
			}
		case constants.HttpRoute:
			finalQuery := fmt.Sprintf("SELECT httpRoute, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY httpRoute"
			var dBResponse []model.DBResponseHttpRoute
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
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
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
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
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
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
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
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
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.Operation != "" {
					traceFilterReponse.Operation[service.Operation] = service.Count
				}
			}
		case constants.Component:
			finalQuery := fmt.Sprintf("SELECT component, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY component"
			var dBResponse []model.DBResponseComponent
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			for _, service := range dBResponse {
				if service.Component != "" {
					traceFilterReponse.Component[service.Component] = service.Count
				}
			}
		case constants.Status:
			finalQuery := fmt.Sprintf("SELECT COUNT(*) as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU AND hasError = true", r.TraceDB, r.indexTable)
			finalQuery += query
			var dBResponse []model.DBResponseTotal
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}

			finalQuery2 := fmt.Sprintf("SELECT COUNT(*) as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU AND hasError = false", r.TraceDB, r.indexTable)
			finalQuery2 += query
			var dBResponse2 []model.DBResponseTotal
			err = r.db.Select(ctx, &dBResponse2, finalQuery2, args...)
			zap.S().Info(finalQuery2)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
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
			finalQuery := fmt.Sprintf("SELECT durationNano as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.durationTable)
			finalQuery += query
			finalQuery += " ORDER BY durationNano LIMIT 1"
			var dBResponse []model.DBResponseTotal
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			finalQuery = fmt.Sprintf("SELECT durationNano as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.durationTable)
			finalQuery += query
			finalQuery += " ORDER BY durationNano DESC LIMIT 1"
			var dBResponse2 []model.DBResponseTotal
			err = r.db.Select(ctx, &dBResponse2, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			if len(dBResponse) > 0 {
				traceFilterReponse.Duration["minDuration"] = dBResponse[0].NumTotal
			}
			if len(dBResponse2) > 0 {
				traceFilterReponse.Duration["maxDuration"] = dBResponse2[0].NumTotal
			}
		case constants.RPCMethod:
			finalQuery := fmt.Sprintf("SELECT rpcMethod, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.indexTable)
			finalQuery += query
			finalQuery += " GROUP BY rpcMethod"
			var dBResponse []model.DBResponseRPCMethod
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
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
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
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
	if len(queryParams.HttpCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpCode, constants.HttpCode, &query, args)
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
	if len(queryParams.Component) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Component, constants.Component, &query, args)
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

	if len(queryParams.Kind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.Kind))
	}

	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
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

			zap.S().Info(projectionOptQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
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

	baseQuery := fmt.Sprintf("SELECT timestamp, spanID, traceID, serviceName, name, durationNano, httpCode, gRPCCode, gRPCMethod, httpMethod, rpcMethod, responseStatusCode FROM %s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryTable)
	baseQuery += query
	err := r.db.Select(ctx, &getFilterSpansResponseItems, baseQuery, args...)
	// Fill status and method
	for i, e := range getFilterSpansResponseItems {
		if e.GRPCode != "" {
			getFilterSpansResponseItems[i].StatusCode = e.GRPCode
		} else {
			getFilterSpansResponseItems[i].StatusCode = e.HttpCode
		}
		if e.GRPMethod != "" {
			getFilterSpansResponseItems[i].Method = e.GRPMethod
		} else {
			getFilterSpansResponseItems[i].Method = e.HttpMethod
		}
	}

	zap.S().Info(baseQuery)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	getFilterSpansResponse := model.GetFilterSpansResponse{
		Spans:      getFilterSpansResponseItems,
		TotalSpans: 1000,
	}

	return &getFilterSpansResponse, nil
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

func buildQueryWithTagParams(ctx context.Context, tags []model.TagQuery, query *string, args []interface{}) ([]interface{}, *model.ApiError) {

	for _, item := range tags {
		if item.Operator == "in" {
			for i, value := range item.Values {
				tagKey := "inTagKey" + String(5)
				tagValue := "inTagValue" + String(5)
				if i == 0 && i == len(item.Values)-1 {
					*query += fmt.Sprintf(" AND tagMap[@%s] = @%s", tagKey, tagValue)
				} else if i == 0 && i != len(item.Values)-1 {
					*query += fmt.Sprintf(" AND (tagMap[@%s] = @%s", tagKey, tagValue)
				} else if i != 0 && i == len(item.Values)-1 {
					*query += fmt.Sprintf(" OR tagMap[@%s] = @%s)", tagKey, tagValue)
				} else {
					*query += fmt.Sprintf(" OR tagMap[@%s] = @%s", tagKey, tagValue)
				}
				args = append(args, clickhouse.Named(tagKey, item.Key))
				args = append(args, clickhouse.Named(tagValue, value))
			}
		} else if item.Operator == "not in" {
			for i, value := range item.Values {
				tagKey := "notinTagKey" + String(5)
				tagValue := "notinTagValue" + String(5)
				if i == 0 && i == len(item.Values)-1 {
					*query += fmt.Sprintf(" AND NOT tagMap[@%s] = @%s", tagKey, tagValue)
				} else if i == 0 && i != len(item.Values)-1 {
					*query += fmt.Sprintf(" AND NOT (tagMap[@%s] = @%s", tagKey, tagValue)
				} else if i != 0 && i == len(item.Values)-1 {
					*query += fmt.Sprintf(" OR tagMap[@%s] = @%s)", tagKey, tagValue)
				} else {
					*query += fmt.Sprintf(" OR tagMap[@%s] = @%s", tagKey, tagValue)
				}
				args = append(args, clickhouse.Named(tagKey, item.Key))
				args = append(args, clickhouse.Named(tagValue, value))
			}
		} else {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Tag Operator %s not supported", item.Operator)}
		}
	}
	return args, nil
}

func (r *ClickHouseReader) GetTagFilters(ctx context.Context, queryParams *model.TagFilterParams) (*[]model.TagFilters, *model.ApiError) {

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
	if len(queryParams.HttpCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpCode, constants.HttpCode, &query, args)
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
	if len(queryParams.Component) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Component, constants.Component, &query, args)
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

	tagFilters := []model.TagFilters{}

	finalQuery := fmt.Sprintf(`SELECT DISTINCT arrayJoin(tagMap.keys) as tagKeys FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.TraceDB, r.indexTable)
	// Alternative query: SELECT groupUniqArrayArray(mapKeys(tagMap)) as tagKeys  FROM signoz_index_v2
	finalQuery += query
	err := r.db.Select(ctx, &tagFilters, finalQuery, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}
	tagFilters = excludeTags(ctx, tagFilters)

	return &tagFilters, nil
}

func excludeTags(ctx context.Context, tags []model.TagFilters) []model.TagFilters {
	excludedTagsMap := map[string]bool{
		"http.code":           true,
		"http.route":          true,
		"http.method":         true,
		"http.url":            true,
		"http.status_code":    true,
		"http.host":           true,
		"messaging.system":    true,
		"messaging.operation": true,
		"component":           true,
		"error":               true,
		"service.name":        true,
	}
	var newTags []model.TagFilters
	for _, tag := range tags {
		_, ok := excludedTagsMap[tag.TagKeys]
		if !ok {
			newTags = append(newTags, tag)
		}
	}
	return newTags
}

func (r *ClickHouseReader) GetTagValues(ctx context.Context, queryParams *model.TagFilterParams) (*[]model.TagValues, *model.ApiError) {

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
	if len(queryParams.HttpCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpCode, constants.HttpCode, &query, args)
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
	if len(queryParams.Component) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Component, constants.Component, &query, args)
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

	query = getStatusFilters(query, queryParams.Status, excludeMap)

	tagValues := []model.TagValues{}

	finalQuery := fmt.Sprintf(`SELECT tagMap[@key] as tagValues FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.TraceDB, r.indexTable)
	finalQuery += query
	finalQuery += " GROUP BY tagMap[@key]"
	args = append(args, clickhouse.Named("key", queryParams.TagKey))
	err := r.db.Select(ctx, &tagValues, finalQuery, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	cleanedTagValues := []model.TagValues{}
	for _, e := range tagValues {
		if e.TagValues != "" {
			cleanedTagValues = append(cleanedTagValues, e)
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
			name
		FROM %s.%s
		WHERE serviceName = @serviceName AND timestamp>= @start AND timestamp<= @end`,
		r.TraceDB, r.indexTable,
	)
	args := []interface{}{}
	args = append(args, namedArgs...)
	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY name ORDER BY p99 DESC LIMIT 10"
	err := r.db.Select(ctx, &topOperationsItems, query, args...)

	zap.S().Debug(query)

	if err != nil {
		zap.S().Error("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
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

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i := range usageItems {
		usageItems[i].Timestamp = uint64(usageItems[i].Time.UnixNano())
	}

	if usageItems == nil {
		usageItems = []model.UsageItem{}
	}

	return &usageItems, nil
}

func (r *ClickHouseReader) SearchTraces(ctx context.Context, traceId string, spanId string, levelUp int, levelDown int, spanLimit int, smartTraceAlgorithm func(payload []model.SearchSpanResponseItem, targetSpanId string, levelUp int, levelDown int, spanLimit int) ([]model.SearchSpansResult, error)) (*[]model.SearchSpansResult, error) {

	var searchScanResponses []model.SearchSpanDBResponseItem

	query := fmt.Sprintf("SELECT timestamp, traceID, model FROM %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)

	start := time.Now()

	err := r.db.Select(ctx, &searchScanResponses, query, traceId)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}
	end := time.Now()
	zap.S().Debug("getTraceSQLQuery took: ", end.Sub(start))
	searchSpansResult := []model.SearchSpansResult{{
		Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError"},
		Events:  make([][]interface{}, len(searchScanResponses)),
	},
	}

	searchSpanResponses := []model.SearchSpanResponseItem{}
	start = time.Now()
	for _, item := range searchScanResponses {
		var jsonItem model.SearchSpanResponseItem
		easyjson.Unmarshal([]byte(item.Model), &jsonItem)
		jsonItem.TimeUnixNano = uint64(item.Timestamp.UnixNano() / 1000000)
		searchSpanResponses = append(searchSpanResponses, jsonItem)
	}
	end = time.Now()
	zap.S().Debug("getTraceSQLQuery unmarshal took: ", end.Sub(start))

	err = r.featureFlags.CheckFeature(model.SmartTraceDetail)
	smartAlgoEnabled := err == nil
	if len(searchScanResponses) > spanLimit && spanId != "" && smartAlgoEnabled {
		start = time.Now()
		searchSpansResult, err = smartTraceAlgorithm(searchSpanResponses, spanId, levelUp, levelDown, spanLimit)
		if err != nil {
			return nil, err
		}
		end = time.Now()
		zap.S().Debug("smartTraceAlgo took: ", end.Sub(start))
	} else {
		for i, item := range searchSpanResponses {
			spanEvents := item.GetValues()
			searchSpansResult[0].Events[i] = spanEvents
		}
	}

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
			sum(error_count)/sum(total_count) as errorRate
		FROM %s.%s
		WHERE toUInt64(toDateTime(timestamp)) >= @start AND toUInt64(toDateTime(timestamp)) <= @end
		GROUP BY
			src,
			dest`,
		r.TraceDB, r.dependencyGraphTable,
	)

	zap.S().Debug(query, args)

	err := r.db.Select(ctx, &response, query, args...)

	if err != nil {
		zap.S().Error("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
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
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("Aggregate type: %s not supported", queryParams.AggregationOption)}
		}
	} else if queryParams.Dimension == "calls" {
		aggregation_query = " count(*) as value "
	}

	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}

	var query string
	if queryParams.GroupBy != "" {
		switch queryParams.GroupBy {
		case constants.ServiceName:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, serviceName as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.HttpCode:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpCode as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.HttpMethod:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpMethod as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.HttpUrl:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpUrl as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.HttpRoute:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpRoute as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.HttpHost:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpHost as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.DBName:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, dbName as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.DBOperation:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, dbOperation as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.OperationRequest:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, name as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.MsgSystem:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, msgSystem as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.MsgOperation:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, msgOperation as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.DBSystem:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, dbSystem as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.Component:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, component as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.RPCMethod:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, rpcMethod as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)
		case constants.ResponseStatusCode:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, responseStatusCode as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.TraceDB, r.indexTable)

		default:
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("groupBy type: %s not supported", queryParams.GroupBy)}
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
	if len(queryParams.HttpCode) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.HttpCode, constants.HttpCode, &query, args)
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
	if len(queryParams.Component) > 0 {
		args = buildFilterArrayQuery(ctx, excludeMap, queryParams.Component, constants.Component, &query, args)
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

	if len(queryParams.Kind) != 0 {
		query = query + " AND kind = @kind"
		args = append(args, clickhouse.Named("kind", queryParams.Kind))
	}

	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}

	if queryParams.GroupBy != "" {
		switch queryParams.GroupBy {
		case constants.ServiceName:
			query = query + " GROUP BY time, serviceName as groupBy ORDER BY time"
		case constants.HttpCode:
			query = query + " GROUP BY time, httpCode as groupBy ORDER BY time"
		case constants.HttpMethod:
			query = query + " GROUP BY time, httpMethod as groupBy ORDER BY time"
		case constants.HttpUrl:
			query = query + " GROUP BY time, httpUrl as groupBy ORDER BY time"
		case constants.HttpRoute:
			query = query + " GROUP BY time, httpRoute as groupBy ORDER BY time"
		case constants.HttpHost:
			query = query + " GROUP BY time, httpHost as groupBy ORDER BY time"
		case constants.DBName:
			query = query + " GROUP BY time, dbName as groupBy ORDER BY time"
		case constants.DBOperation:
			query = query + " GROUP BY time, dbOperation as groupBy ORDER BY time"
		case constants.OperationRequest:
			query = query + " GROUP BY time, name as groupBy ORDER BY time"
		case constants.MsgSystem:
			query = query + " GROUP BY time, msgSystem as groupBy ORDER BY time"
		case constants.MsgOperation:
			query = query + " GROUP BY time, msgOperation as groupBy ORDER BY time"
		case constants.DBSystem:
			query = query + " GROUP BY time, dbSystem as groupBy ORDER BY time"
		case constants.Component:
			query = query + " GROUP BY time, component as groupBy ORDER BY time"
		case constants.RPCMethod:
			query = query + " GROUP BY time, rpcMethod as groupBy ORDER BY time"
		case constants.ResponseStatusCode:
			query = query + " GROUP BY time, responseStatusCode as groupBy ORDER BY time"

		default:
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("groupBy type: %s not supported", queryParams.GroupBy)}
		}
	} else {
		query = query + " GROUP BY time ORDER BY time"
	}

	err := r.db.Select(ctx, &SpanAggregatesDBResponseItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
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

// SetTTL sets the TTL for traces or metrics or logs tables.
// This is an async API which creates goroutines to set TTL.
// Status of TTL update is tracked with ttl_status table in sqlite db.
func (r *ClickHouseReader) SetTTL(ctx context.Context,
	params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// Keep only latest 100 transactions/requests
	r.deleteTtlTransactions(ctx, 100)
	var req, tableName string
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
		for _, tableName = range tableNameArray {
			statusItem, err := r.checkTTLStatusItem(ctx, tableName)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing ttl_status check sql query")}
			}
			if statusItem.Status == constants.StatusPending {
				return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
			}
		}
		for _, tableName := range tableNameArray {
			// TODO: DB queries should be implemented with transactional statements but currently clickhouse doesn't support them. Issue: https://github.com/ClickHouse/ClickHouse/issues/22086
			go func(tableName string) {
				_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
				if dbErr != nil {
					zap.S().Error(fmt.Errorf("Error in inserting to ttl_status table: %s", dbErr.Error()))
					return
				}
				req = fmt.Sprintf(
					"ALTER TABLE %v MODIFY TTL toDateTime(timestamp) + INTERVAL %v SECOND DELETE",
					tableName, params.DelDuration)
				if len(params.ColdStorageVolume) > 0 {
					req += fmt.Sprintf(", toDateTime(timestamp) + INTERVAL %v SECOND TO VOLUME '%s'",
						params.ToColdStorageDuration, params.ColdStorageVolume)
				}
				err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
				if err != nil {
					zap.S().Error(fmt.Errorf("Error in setting cold storage: %s", err.Err.Error()))
					statusItem, err := r.checkTTLStatusItem(ctx, tableName)
					if err == nil {
						_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
						if dbErr != nil {
							zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
							return
						}
					}
					return
				}
				zap.S().Debugf("Executing TTL request: %s\n", req)
				statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
				if err := r.db.Exec(context.Background(), req); err != nil {
					zap.S().Error(fmt.Errorf("Error in executing set TTL query: %s", err.Error()))
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
						return
					}
					return
				}
				_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
				if dbErr != nil {
					zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
					return
				}
			}(tableName)
		}

	case constants.MetricsTTL:
		tableName = signozMetricDBName + "." + signozSampleTableName
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending {
			return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
		}
		go func(tableName string) {
			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.S().Error(fmt.Errorf("Error in inserting to ttl_status table: %s", dbErr.Error()))
				return
			}
			req = fmt.Sprintf(
				"ALTER TABLE %v MODIFY TTL toDateTime(toUInt32(timestamp_ms / 1000), 'UTC') + "+
					"INTERVAL %v SECOND DELETE", tableName, params.DelDuration)
			if len(params.ColdStorageVolume) > 0 {
				req += fmt.Sprintf(", toDateTime(toUInt32(timestamp_ms / 1000), 'UTC')"+
					" + INTERVAL %v SECOND TO VOLUME '%s'",
					params.ToColdStorageDuration, params.ColdStorageVolume)
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.S().Error(fmt.Errorf("Error in setting cold storage: %s", err.Err.Error()))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
						return
					}
				}
				return
			}
			zap.S().Debugf("Executing TTL request: %s\n", req)
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.S().Error(fmt.Errorf("error while setting ttl. Err=%v", err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
				return
			}
		}(tableName)
	case constants.LogsTTL:
		tableName = r.logsDB + "." + r.logsTable
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
				zap.S().Error(fmt.Errorf("error in inserting to ttl_status table: %s", dbErr.Error()))
				return
			}
			req = fmt.Sprintf(
				"ALTER TABLE %v MODIFY TTL toDateTime(timestamp / 1000000000) + "+
					"INTERVAL %v SECOND DELETE", tableName, params.DelDuration)
			if len(params.ColdStorageVolume) > 0 {
				req += fmt.Sprintf(", toDateTime(timestamp / 1000000000)"+
					" + INTERVAL %v SECOND TO VOLUME '%s'",
					params.ToColdStorageDuration, params.ColdStorageVolume)
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.S().Error(fmt.Errorf("error in setting cold storage: %s", err.Err.Error()))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
						return
					}
				}
				return
			}
			zap.S().Debugf("Executing TTL request: %s\n", req)
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.S().Error(fmt.Errorf("error while setting ttl. Err=%v", err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.S().Debug("Error in processing ttl_status update sql query: ", dbErr)
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
		zap.S().Debug("Error in processing ttl_status delete sql query: ", err)
	}
}

// checkTTLStatusItem checks if ttl_status table has an entry for the given table name
func (r *ClickHouseReader) checkTTLStatusItem(ctx context.Context, tableName string) (model.TTLStatusItem, *model.ApiError) {
	statusItem := []model.TTLStatusItem{}

	query := fmt.Sprintf("SELECT id, status, ttl, cold_storage_ttl FROM ttl_status WHERE table_name = '%s' ORDER BY created_at DESC", tableName)

	err := r.localDB.Select(&statusItem, query)

	zap.S().Info(query)

	if len(statusItem) == 0 {
		return model.TTLStatusItem{}, nil
	}
	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return model.TTLStatusItem{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing ttl_status check sql query")}
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
			return "", &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing ttl_status check sql query")}
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
		policyReq := fmt.Sprintf("ALTER TABLE %s MODIFY SETTING storage_policy='tiered'", tableName)

		zap.S().Debugf("Executing Storage policy request: %s\n", policyReq)
		if err := r.db.Exec(ctx, policyReq); err != nil {
			zap.S().Error(fmt.Errorf("error while setting storage policy. Err=%v", err))
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
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting disks. Err=%v", err)}
	}

	zap.S().Infof("Got response: %+v\n", diskItems)

	return &diskItems, nil
}

// GetTTL returns current ttl, expected ttl and past setTTL status for metrics/traces.
func (r *ClickHouseReader) GetTTL(ctx context.Context, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError) {

	parseTTL := func(queryResp string) (int, int) {

		zap.S().Debugf("Parsing TTL from: %s", queryResp)
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

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v'", signozSampleTableName)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while getting ttl. Err=%v", err))
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

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v' AND database='%v'", signozTraceTableName, signozTraceDBName)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while getting ttl. Err=%v", err))
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

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v' AND database='%v'", r.logsTable, r.logsDB)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while getting ttl. Err=%v", err))
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

	query := fmt.Sprintf("SELECT any(exceptionType) as exceptionType, any(exceptionMessage) as exceptionMessage, count() AS exceptionCount, min(timestamp) as firstSeen, max(timestamp) as lastSeen, any(serviceName) as serviceName, groupID FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU GROUP BY groupID", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
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
	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	return &getErrorResponses, nil
}

func (r *ClickHouseReader) CountErrors(ctx context.Context, queryParams *model.CountErrorsParams) (uint64, *model.ApiError) {

	var errorCount uint64

	query := fmt.Sprintf("SELECT count(distinct(groupID)) FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}

	err := r.db.QueryRow(ctx, query, args...).Scan(&errorCount)
	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return 0, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	return errorCount, nil
}

func (r *ClickHouseReader) GetErrorFromErrorID(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.S().Debug("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var getErrorWithSpanReponse []model.ErrorWithSpan

	query := fmt.Sprintf("SELECT * FROM %s.%s WHERE timestamp = @timestamp AND groupID = @groupID AND errorID = @errorID LIMIT 1", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)
	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetErrorFromGroupID(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	var getErrorWithSpanReponse []model.ErrorWithSpan

	query := fmt.Sprintf("SELECT * FROM %s.%s WHERE timestamp = @timestamp AND groupID = @groupID LIMIT 1", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetNextPrevErrorIDs(ctx context.Context, queryParams *model.GetErrorParams) (*model.NextPrevErrorIDs, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.S().Debug("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var err *model.ApiError
	getNextPrevErrorIDsResponse := model.NextPrevErrorIDs{
		GroupID: queryParams.GroupID,
	}
	getNextPrevErrorIDsResponse.NextErrorID, getNextPrevErrorIDsResponse.NextTimestamp, err = r.getNextErrorID(ctx, queryParams)
	if err != nil {
		zap.S().Debug("Unable to get next error ID due to err: ", err)
		return nil, err
	}
	getNextPrevErrorIDsResponse.PrevErrorID, getNextPrevErrorIDsResponse.PrevTimestamp, err = r.getPrevErrorID(ctx, queryParams)
	if err != nil {
		zap.S().Debug("Unable to get prev error ID due to err: ", err)
		return nil, err
	}
	return &getNextPrevErrorIDsResponse, nil

}

func (r *ClickHouseReader) getNextErrorID(ctx context.Context, queryParams *model.GetErrorParams) (string, time.Time, *model.ApiError) {

	var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

	query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp >= @timestamp AND errorID != @errorID ORDER BY timestamp ASC LIMIT 2", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}
	if len(getNextErrorIDReponse) == 0 {
		zap.S().Info("NextErrorID not found")
		return "", time.Time{}, nil
	} else if len(getNextErrorIDReponse) == 1 {
		zap.S().Info("NextErrorID found")
		return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
	} else {
		if getNextErrorIDReponse[0].Timestamp.UnixNano() == getNextErrorIDReponse[1].Timestamp.UnixNano() {
			var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

			query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp = @timestamp AND errorID > @errorID ORDER BY errorID ASC LIMIT 1", r.TraceDB, r.errorTable)
			args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

			err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

			zap.S().Info(query)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
			}
			if len(getNextErrorIDReponse) == 0 {
				var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

				query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp > @timestamp ORDER BY timestamp ASC LIMIT 1", r.TraceDB, r.errorTable)
				args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

				err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

				zap.S().Info(query)

				if err != nil {
					zap.S().Debug("Error in processing sql query: ", err)
					return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
				}

				if len(getNextErrorIDReponse) == 0 {
					zap.S().Info("NextErrorID not found")
					return "", time.Time{}, nil
				} else {
					zap.S().Info("NextErrorID found")
					return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
				}
			} else {
				zap.S().Info("NextErrorID found")
				return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
			}
		} else {
			zap.S().Info("NextErrorID found")
			return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
		}
	}
}

func (r *ClickHouseReader) getPrevErrorID(ctx context.Context, queryParams *model.GetErrorParams) (string, time.Time, *model.ApiError) {

	var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

	query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp <= @timestamp AND errorID != @errorID ORDER BY timestamp DESC LIMIT 2", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}
	if len(getPrevErrorIDReponse) == 0 {
		zap.S().Info("PrevErrorID not found")
		return "", time.Time{}, nil
	} else if len(getPrevErrorIDReponse) == 1 {
		zap.S().Info("PrevErrorID found")
		return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
	} else {
		if getPrevErrorIDReponse[0].Timestamp.UnixNano() == getPrevErrorIDReponse[1].Timestamp.UnixNano() {
			var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

			query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp = @timestamp AND errorID < @errorID ORDER BY errorID DESC LIMIT 1", r.TraceDB, r.errorTable)
			args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

			err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

			zap.S().Info(query)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
			}
			if len(getPrevErrorIDReponse) == 0 {
				var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

				query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp < @timestamp ORDER BY timestamp DESC LIMIT 1", r.TraceDB, r.errorTable)
				args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

				err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

				zap.S().Info(query)

				if err != nil {
					zap.S().Debug("Error in processing sql query: ", err)
					return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
				}

				if len(getPrevErrorIDReponse) == 0 {
					zap.S().Info("PrevErrorID not found")
					return "", time.Time{}, nil
				} else {
					zap.S().Info("PrevErrorID found")
					return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
				}
			} else {
				zap.S().Info("PrevErrorID found")
				return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
			}
		} else {
			zap.S().Info("PrevErrorID found")
			return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
		}
	}
}

func (r *ClickHouseReader) GetMetricAutocompleteTagKey(ctx context.Context, params *model.MetricAutocompleteTagParams) (*[]string, *model.ApiError) {

	var query string
	var err error
	var tagKeyList []string
	var rows driver.Rows

	tagsWhereClause := ""

	for key, val := range params.MetricTags {
		tagsWhereClause += fmt.Sprintf(" AND JSONExtractString(labels, '%s') = '%s' ", key, val)
	}
	// "select distinctTagKeys from (SELECT DISTINCT arrayJoin(tagKeys) distinctTagKeys from (SELECT DISTINCT(JSONExtractKeys(labels)) tagKeys from signoz_metrics.time_series WHERE JSONExtractString(labels,'__name__')='node_udp_queues'))  WHERE distinctTagKeys ILIKE '%host%';"
	if len(params.Match) != 0 {
		query = fmt.Sprintf("select distinctTagKeys from (SELECT DISTINCT arrayJoin(tagKeys) distinctTagKeys from (SELECT DISTINCT(JSONExtractKeys(labels)) tagKeys from %s.%s WHERE metric_name=$1 %s)) WHERE distinctTagKeys ILIKE $2;", signozMetricDBName, signozTSTableName, tagsWhereClause)

		rows, err = r.db.Query(ctx, query, params.MetricName, fmt.Sprintf("%%%s%%", params.Match))

	} else {
		query = fmt.Sprintf("select distinctTagKeys from (SELECT DISTINCT arrayJoin(tagKeys) distinctTagKeys from (SELECT DISTINCT(JSONExtractKeys(labels)) tagKeys from %s.%s WHERE metric_name=$1 %s ));", signozMetricDBName, signozTSTableName, tagsWhereClause)

		rows, err = r.db.Query(ctx, query, params.MetricName)
	}

	if err != nil {
		zap.S().Error(err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	defer rows.Close()
	var tagKey string
	for rows.Next() {
		if err := rows.Scan(&tagKey); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
		}
		tagKeyList = append(tagKeyList, tagKey)
	}
	return &tagKeyList, nil
}

func (r *ClickHouseReader) GetMetricAutocompleteTagValue(ctx context.Context, params *model.MetricAutocompleteTagParams) (*[]string, *model.ApiError) {

	var query string
	var err error
	var tagValueList []string
	var rows driver.Rows
	tagsWhereClause := ""

	for key, val := range params.MetricTags {
		tagsWhereClause += fmt.Sprintf(" AND JSONExtractString(labels, '%s') = '%s' ", key, val)
	}

	if len(params.Match) != 0 {
		query = fmt.Sprintf("SELECT DISTINCT(JSONExtractString(labels, '%s')) from %s.%s WHERE metric_name=$1 %s AND JSONExtractString(labels, '%s') ILIKE $2;", params.TagKey, signozMetricDBName, signozTSTableName, tagsWhereClause, params.TagKey)

		rows, err = r.db.Query(ctx, query, params.TagKey, params.MetricName, fmt.Sprintf("%%%s%%", params.Match))

	} else {
		query = fmt.Sprintf("SELECT DISTINCT(JSONExtractString(labels, '%s')) FROM %s.%s WHERE metric_name=$2 %s;", params.TagKey, signozMetricDBName, signozTSTableName, tagsWhereClause)
		rows, err = r.db.Query(ctx, query, params.TagKey, params.MetricName)

	}

	if err != nil {
		zap.S().Error(err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	defer rows.Close()
	var tagValue string
	for rows.Next() {
		if err := rows.Scan(&tagValue); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
		}
		tagValueList = append(tagValueList, tagValue)
	}

	return &tagValueList, nil
}

func (r *ClickHouseReader) GetMetricAutocompleteMetricNames(ctx context.Context, matchText string, limit int) (*[]string, *model.ApiError) {

	var query string
	var err error
	var metricNameList []string
	var rows driver.Rows

	query = fmt.Sprintf("SELECT DISTINCT(metric_name) from %s.%s WHERE metric_name ILIKE $1", signozMetricDBName, signozTSTableName)
	if limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", limit)
	}
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", matchText))

	if err != nil {
		zap.S().Error(err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	defer rows.Close()
	var metricName string
	for rows.Next() {
		if err := rows.Scan(&metricName); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
		}
		metricNameList = append(metricNameList, metricName)
	}

	return &metricNameList, nil

}

func (r *ClickHouseReader) GetMetricResultEE(ctx context.Context, query string) ([]*model.Series, string, error) {
	zap.S().Error("GetMetricResultEE is not implemented for opensource version")
	return nil, "", fmt.Errorf("GetMetricResultEE is not implemented for opensource version")
}

// GetMetricResult runs the query and returns list of time series
func (r *ClickHouseReader) GetMetricResult(ctx context.Context, query string) ([]*model.Series, error) {

	defer utils.Elapsed("GetMetricResult")()

	zap.S().Infof("Executing metric result query: %s", query)

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.S().Debug("Error in processing query: ", err)
		return nil, err
	}

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
		vars        = make([]interface{}, len(columnTypes))
	)
	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
	}
	// when group by is applied, each combination of cartesian product
	// of attributes is separate series. each item in metricPointsMap
	// represent a unique series.
	metricPointsMap := make(map[string][]model.MetricPoint)
	// attribute key-value pairs for each group selection
	attributesMap := make(map[string]map[string]string)

	defer rows.Close()
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		var groupBy []string
		var metricPoint model.MetricPoint
		groupAttributes := make(map[string]string)
		// Assuming that the end result row contains a timestamp, value and option labels
		// Label key and value are both strings.
		for idx, v := range vars {
			colName := columnNames[idx]
			switch v := v.(type) {
			case *string:
				// special case for returning all labels
				if colName == "fullLabels" {
					var metric map[string]string
					err := json.Unmarshal([]byte(*v), &metric)
					if err != nil {
						return nil, err
					}
					for key, val := range metric {
						groupBy = append(groupBy, val)
						groupAttributes[key] = val
					}
				} else {
					groupBy = append(groupBy, *v)
					groupAttributes[colName] = *v
				}
			case *time.Time:
				metricPoint.Timestamp = v.UnixMilli()
			case *float64:
				metricPoint.Value = *v
			}
		}
		sort.Strings(groupBy)
		key := strings.Join(groupBy, "")
		attributesMap[key] = groupAttributes
		metricPointsMap[key] = append(metricPointsMap[key], metricPoint)
	}

	var seriesList []*model.Series
	for key := range metricPointsMap {
		points := metricPointsMap[key]
		// first point in each series could be invalid since the
		// aggregations are applied with point from prev series
		if len(points) != 0 && len(points) > 1 {
			points = points[1:]
		}
		attributes := attributesMap[key]
		series := model.Series{Labels: attributes, Points: points}
		seriesList = append(seriesList, &series)
	}
	return seriesList, nil
}

func (r *ClickHouseReader) GetTotalSpans(ctx context.Context) (uint64, error) {

	var totalSpans uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s;", signozTraceDBName, signozTraceTableName)
	r.db.QueryRow(ctx, queryStr).Scan(&totalSpans)

	return totalSpans, nil
}

func (r *ClickHouseReader) GetSpansInLastHeartBeatInterval(ctx context.Context) (uint64, error) {

	var spansInLastHeartBeatInterval uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d));", signozTraceDBName, signozSpansTable, 30)

	r.db.QueryRow(ctx, queryStr).Scan(&spansInLastHeartBeatInterval)

	return spansInLastHeartBeatInterval, nil
}

// func sum(array []tsByMetricName) uint64 {
// 	var result uint64
// 	result = 0
// 	for _, v := range array {
// 		result += v.count
// 	}
// 	return result
// }

func (r *ClickHouseReader) GetTimeSeriesInfo(ctx context.Context) (map[string]interface{}, error) {

	queryStr := fmt.Sprintf("SELECT count() as count from %s.%s group by metric_name order by count desc;", signozMetricDBName, signozTSTableName)

	// r.db.Select(ctx, &tsByMetricName, queryStr)

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

func (r *ClickHouseReader) GetSamplesInfoInLastHeartBeatInterval(ctx context.Context) (uint64, error) {

	var totalSamples uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where timestamp_ms > toUnixTimestamp(now()-toIntervalMinute(%d))*1000;", signozMetricDBName, signozSampleTableName, 30)

	r.db.QueryRow(ctx, queryStr).Scan(&totalSamples)

	return totalSamples, nil
}
func (r *ClickHouseReader) GetLogsInfoInLastHeartBeatInterval(ctx context.Context) (uint64, error) {

	var totalLogLines uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d))*1000000000;", r.logsDB, r.logsTable, 30)

	r.db.QueryRow(ctx, queryStr).Scan(&totalLogLines)

	return totalLogLines, nil
}

func (r *ClickHouseReader) GetTagsInfoInLastHeartBeatInterval(ctx context.Context) (*model.TagsInfo, error) {

	queryStr := fmt.Sprintf("select tagMap['service.name'] as serviceName, tagMap['deployment.environment'] as env, tagMap['telemetry.sdk.language'] as language from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d));", r.TraceDB, r.indexTable, 1)

	tagTelemetryDataList := []model.TagTelemetryData{}
	err := r.db.Select(ctx, &tagTelemetryDataList, queryStr)

	if err != nil {
		zap.S().Info(queryStr)
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, err
	}

	tagsInfo := model.TagsInfo{
		Languages: make(map[string]interface{}),
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

	}

	return &tagsInfo, nil
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

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsTable)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	extractSelectedAndInterestingFields(statements[0].Statement, constants.Attributes, &attributes, &response)
	extractSelectedAndInterestingFields(statements[0].Statement, constants.Resources, &resources, &response)
	extractSelectedAndInterestingFields(statements[0].Statement, constants.Static, &constants.StaticInterestingLogFields, &response)

	return &response, nil
}

func extractSelectedAndInterestingFields(tableStatement string, fieldType string, fields *[]model.LogField, response *model.GetFieldsResponse) {
	for _, field := range *fields {
		field.Type = fieldType
		if strings.Contains(tableStatement, fmt.Sprintf("INDEX %s_idx", field.Name)) {
			response.Selected = append(response.Selected, field)
		} else {
			response.Interesting = append(response.Interesting, field)
		}
	}
}

func (r *ClickHouseReader) UpdateLogField(ctx context.Context, field *model.UpdateField) *model.ApiError {
	// if a field is selected it means that the field needs to be indexed
	if field.Selected {
		// if the type is attribute or resource, create the materialized column first
		if field.Type == constants.Attributes || field.Type == constants.Resources {
			// create materialized
			query := fmt.Sprintf("ALTER TABLE %s.%s ADD COLUMN IF NOT EXISTS %s %s MATERIALIZED %s_%s_value[indexOf(%s_%s_key, '%s')] CODEC(LZ4)", r.logsDB, r.logsTable, field.Name, field.DataType, field.Type, strings.ToLower(field.DataType), field.Type, strings.ToLower(field.DataType), field.Name)
			err := r.db.Exec(ctx, query)
			if err != nil {
				return &model.ApiError{Err: err, Typ: model.ErrorInternal}
			}
		}

		// create the index
		if field.IndexType == "" {
			field.IndexType = constants.DefaultLogSkipIndexType
		}
		if field.IndexGranularity == 0 {
			field.IndexGranularity = constants.DefaultLogSkipIndexGranularity
		}
		query := fmt.Sprintf("ALTER TABLE %s.%s ADD INDEX IF NOT EXISTS %s_idx (%s) TYPE %s  GRANULARITY %d", r.logsDB, r.logsTable, field.Name, field.Name, field.IndexType, field.IndexGranularity)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
	} else {
		// remove index
		query := fmt.Sprintf("ALTER TABLE %s.%s DROP INDEX IF EXISTS %s_idx", r.logsDB, r.logsTable, field.Name)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
	}
	return nil
}

func (r *ClickHouseReader) GetLogs(ctx context.Context, params *model.LogsFilterParams) (*[]model.GetLogsResponse, *model.ApiError) {
	response := []model.GetLogsResponse{}
	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	isPaginatePrev := logs.CheckIfPrevousPaginateAndModifyOrder(params)
	filterSql, err := logs.GenerateSQLWhere(fields, params)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	query := fmt.Sprintf("%s from %s.%s", constants.LogsSQLSelect, r.logsDB, r.logsTable)

	if filterSql != "" {
		query = fmt.Sprintf("%s where %s", query, filterSql)
	}

	query = fmt.Sprintf("%s order by %s %s limit %d", query, params.OrderBy, params.Order, params.Limit)
	zap.S().Debug(query)
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

	filterSql, err := logs.GenerateSQLWhere(fields, &model.LogsFilterParams{
		Query: client.Filter.Query,
	})

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
			zap.S().Debug("closing go routine : " + client.Name)
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
			zap.S().Debug(tmpQuery)
			response := []model.GetLogsResponse{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.S().Error(err)
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				select {
				case <-ctx.Done():
					done := true
					client.Done <- &done
					zap.S().Debug("closing go routine while sending logs : " + client.Name)
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

	filterSql, err := logs.GenerateSQLWhere(fields, &model.LogsFilterParams{
		Query: params.Query,
	})
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	query := ""
	if params.GroupBy != "" {
		query = fmt.Sprintf("SELECT toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(timestamp/1000000000), INTERVAL %d minute))*1000000000) as ts_start_interval, toString(%s) as groupBy, "+
			"%s "+
			"FROM %s.%s WHERE timestamp >= '%d' AND timestamp <= '%d' ",
			params.StepSeconds/60, params.GroupBy, function, r.logsDB, r.logsTable, params.TimestampStart, params.TimestampEnd)
	} else {
		query = fmt.Sprintf("SELECT toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(timestamp/1000000000), INTERVAL %d minute))*1000000000) as ts_start_interval, "+
			"%s "+
			"FROM %s.%s WHERE timestamp >= '%d' AND timestamp <= '%d' ",
			params.StepSeconds/60, function, r.logsDB, r.logsTable, params.TimestampStart, params.TimestampEnd)
	}
	if filterSql != "" {
		query = fmt.Sprintf("%s AND %s ", query, filterSql)
	}
	if params.GroupBy != "" {
		query = fmt.Sprintf("%s GROUP BY ts_start_interval, toString(%s) as groupBy ORDER BY ts_start_interval", query, params.GroupBy)
	} else {
		query = fmt.Sprintf("%s GROUP BY ts_start_interval ORDER BY ts_start_interval", query)
	}

	zap.S().Debug(query)
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

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
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
