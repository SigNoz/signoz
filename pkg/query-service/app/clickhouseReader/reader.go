package clickhouseReader

import (
	"bytes"
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net"
	"net/http"
	"net/url"
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
	"github.com/oklog/oklog/pkg/group"
	"github.com/pkg/errors"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/promlog"
	"github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/discovery"
	sd_config "github.com/prometheus/prometheus/discovery/config"
	"github.com/prometheus/prometheus/notifier"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/rules"
	"github.com/prometheus/prometheus/scrape"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
	"github.com/prometheus/prometheus/util/stats"
	"github.com/prometheus/prometheus/util/strutil"
	"github.com/prometheus/tsdb"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jmoiron/sqlx"

	promModel "github.com/prometheus/common/model"
	"go.signoz.io/query-service/constants"
	am "go.signoz.io/query-service/integrations/alertManager"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

const (
	primaryNamespace      = "clickhouse"
	archiveNamespace      = "clickhouse-archive"
	signozTraceDBName     = "signoz_traces"
	signozDurationMVTable = "durationSort"
	signozSpansTable      = "signoz_spans"
	signozErrorIndexTable = "signoz_error_index"
	signozTraceTableName  = "signoz_index_v2"
	signozMetricDBName    = "signoz_metrics"
	signozSampleTableName = "samples_v2"
	signozTSTableName     = "time_series_v2"

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
	db              clickhouse.Conn
	localDB         *sqlx.DB
	traceDB         string
	operationsTable string
	durationTable   string
	indexTable      string
	errorTable      string
	spansTable      string
	queryEngine     *promql.Engine
	remoteStorage   *remote.Storage
	ruleManager     *rules.Manager
	promConfig      *config.Config
	alertManager    am.Manager
}

// NewTraceReader returns a TraceReader for the database
func NewReader(localDB *sqlx.DB) *ClickHouseReader {

	datasource := os.Getenv("ClickHouseUrl")
	options := NewOptions(datasource, primaryNamespace, archiveNamespace)
	db, err := initialize(options)

	if err != nil {
		zap.S().Error(err)
		os.Exit(1)
	}

	alertManager := am.New("")

	return &ClickHouseReader{
		db:              db,
		localDB:         localDB,
		traceDB:         options.primary.TraceDB,
		alertManager:    alertManager,
		operationsTable: options.primary.OperationsTable,
		indexTable:      options.primary.IndexTable,
		errorTable:      options.primary.ErrorTable,
		durationTable:   options.primary.DurationTable,
		spansTable:      options.primary.SpansTable,
	}
}

func (r *ClickHouseReader) Start() {
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

	// conf, err := config.LoadFile(*filename)
	// if err != nil {
	// 	zap.S().Error("couldn't load configuration (--config.file=%q): %v", filename, err)
	// }

	// err = remoteStorage.ApplyConfig(conf)
	// if err != nil {
	// 	zap.S().Error("Error in remoteStorage.ApplyConfig: ", err)
	// }
	cfg := struct {
		configFile string

		localStoragePath    string
		notifier            notifier.Options
		notifierTimeout     promModel.Duration
		forGracePeriod      promModel.Duration
		outageTolerance     promModel.Duration
		resendDelay         promModel.Duration
		tsdb                tsdb.Options
		lookbackDelta       promModel.Duration
		webTimeout          promModel.Duration
		queryTimeout        promModel.Duration
		queryConcurrency    int
		queryMaxSamples     int
		RemoteFlushDeadline promModel.Duration

		prometheusURL string

		logLevel promlog.AllowedLevel
	}{
		notifier: notifier.Options{
			Registerer: prometheus.DefaultRegisterer,
		},
	}

	flag.StringVar(&cfg.configFile, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	flag.Parse()

	// fanoutStorage := remoteStorage
	fanoutStorage := storage.NewFanout(logger, remoteStorage)
	localStorage := remoteStorage

	cfg.notifier.QueueCapacity = 10000
	cfg.notifierTimeout = promModel.Duration(time.Duration.Seconds(10))
	notifier := notifier.NewManager(&cfg.notifier, log.With(logger, "component", "notifier"))
	// notifier.ApplyConfig(conf)

	ExternalURL, err := computeExternalURL("", "0.0.0.0:3301")
	if err != nil {
		fmt.Fprintln(os.Stderr, errors.Wrapf(err, "parse external URL %q", ExternalURL.String()))
		os.Exit(2)
	}

	cfg.outageTolerance = promModel.Duration(time.Duration.Hours(1))
	cfg.forGracePeriod = promModel.Duration(time.Duration.Minutes(10))
	cfg.resendDelay = promModel.Duration(time.Duration.Minutes(1))

	ctxScrape, cancelScrape := context.WithCancel(context.Background())
	discoveryManagerScrape := discovery.NewManager(ctxScrape, log.With(logger, "component", "discovery manager scrape"), discovery.Name("scrape"))

	ctxNotify, cancelNotify := context.WithCancel(context.Background())
	discoveryManagerNotify := discovery.NewManager(ctxNotify, log.With(logger, "component", "discovery manager notify"), discovery.Name("notify"))

	scrapeManager := scrape.NewManager(log.With(logger, "component", "scrape manager"), fanoutStorage)

	opts := promql.EngineOpts{
		Logger:        log.With(logger, "component", "query engine"),
		Reg:           nil,
		MaxConcurrent: 20,
		MaxSamples:    50000000,
		Timeout:       time.Duration(2 * time.Minute),
	}

	queryEngine := promql.NewEngine(opts)

	ruleManager := rules.NewManager(&rules.ManagerOptions{
		Appendable:      fanoutStorage,
		TSDB:            localStorage,
		QueryFunc:       rules.EngineQueryFunc(queryEngine, fanoutStorage),
		NotifyFunc:      sendAlerts(notifier, ExternalURL.String()),
		Context:         context.Background(),
		ExternalURL:     ExternalURL,
		Registerer:      prometheus.DefaultRegisterer,
		Logger:          log.With(logger, "component", "rule manager"),
		OutageTolerance: time.Duration(cfg.outageTolerance),
		ForGracePeriod:  time.Duration(cfg.forGracePeriod),
		ResendDelay:     time.Duration(cfg.resendDelay),
	})

	reloaders := []func(cfg *config.Config) error{
		remoteStorage.ApplyConfig,
		// The Scrape and notifier managers need to reload before the Discovery manager as
		// they need to read the most updated config when receiving the new targets list.
		notifier.ApplyConfig,
		scrapeManager.ApplyConfig,
		func(cfg *config.Config) error {
			c := make(map[string]sd_config.ServiceDiscoveryConfig)
			for _, v := range cfg.ScrapeConfigs {
				c[v.JobName] = v.ServiceDiscoveryConfig
			}
			return discoveryManagerScrape.ApplyConfig(c)
		},
		func(cfg *config.Config) error {
			c := make(map[string]sd_config.ServiceDiscoveryConfig)
			for _, v := range cfg.AlertingConfig.AlertmanagerConfigs {
				// AlertmanagerConfigs doesn't hold an unique identifier so we use the config hash as the identifier.
				b, err := json.Marshal(v)
				if err != nil {
					return err
				}
				c[fmt.Sprintf("%x", md5.Sum(b))] = v.ServiceDiscoveryConfig
			}
			return discoveryManagerNotify.ApplyConfig(c)
		},
		// func(cfg *config.Config) error {
		// 	// Get all rule files matching the configuration oaths.
		// 	var files []string
		// 	for _, pat := range cfg.RuleFiles {
		// 		fs, err := filepath.Glob(pat)
		// 		if err != nil {
		// 			// The only error can be a bad pattern.
		// 			return fmt.Errorf("error retrieving rule files for %s: %s", pat, err)
		// 		}
		// 		files = append(files, fs...)
		// 	}
		// 	return ruleManager.Update(time.Duration(cfg.GlobalConfig.EvaluationInterval), files)
		// },

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
		// Notify discovery manager.
		g.Add(
			func() error {
				err := discoveryManagerNotify.Run()
				level.Info(logger).Log("msg", "Notify discovery manager stopped")
				return err
			},
			func(err error) {
				level.Info(logger).Log("msg", "Stopping notify discovery manager...")
				cancelNotify()
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
				r.promConfig, err = reloadConfig(cfg.configFile, logger, reloaders...)
				if err != nil {
					return fmt.Errorf("error loading config from %q: %s", cfg.configFile, err)
				}

				reloadReady.Close()

				rules, apiErrorObj := r.GetRulesFromDB()

				if apiErrorObj != nil {
					zap.S().Errorf("Not able to read rules from DB")
				}
				for _, rule := range *rules {
					apiErrorObj = r.LoadRule(rule)
					if apiErrorObj != nil {
						zap.S().Errorf("Not able to load rule with id=%d loaded from DB", rule.Id, rule.Data)
					}
				}

				channels, apiErrorObj := r.GetChannels()

				if apiErrorObj != nil {
					zap.S().Errorf("Not able to read channels from DB")
				}
				for _, channel := range *channels {
					apiErrorObj = r.LoadChannel(&channel)
					if apiErrorObj != nil {
						zap.S().Errorf("Not able to load channel with id=%d loaded from DB", channel.Id, channel.Data)
					}
				}

				<-cancel

				return nil
			},
			func(err error) {
				close(cancel)
			},
		)
	}
	{
		// Rule manager.
		// TODO(krasi) refactor ruleManager.Run() to be blocking to avoid using an extra blocking channel.
		cancel := make(chan struct{})
		g.Add(
			func() error {
				<-reloadReady.C
				ruleManager.Run()
				<-cancel
				return nil
			},
			func(err error) {
				ruleManager.Stop()
				close(cancel)
			},
		)
	}
	{
		// Notifier.

		// Calling notifier.Stop() before ruleManager.Stop() will cause a panic if the ruleManager isn't running,
		// so keep this interrupt after the ruleManager.Stop().
		g.Add(
			func() error {
				// When the notifier manager receives a new targets list
				// it needs to read a valid config for each job.
				// It depends on the config being in sync with the discovery manager
				// so we wait until the config is fully loaded.
				<-reloadReady.C

				notifier.Run(discoveryManagerNotify.SyncCh())
				level.Info(logger).Log("msg", "Notifier manager stopped")
				return nil
			},
			func(err error) {
				notifier.Stop()
			},
		)
	}
	r.queryEngine = queryEngine
	r.remoteStorage = remoteStorage
	r.ruleManager = ruleManager

	if err := g.Run(); err != nil {
		level.Error(logger).Log("err", err)
		os.Exit(1)
	}

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

func startsOrEndsWithQuote(s string) bool {
	return strings.HasPrefix(s, "\"") || strings.HasPrefix(s, "'") ||
		strings.HasSuffix(s, "\"") || strings.HasSuffix(s, "'")
}

// computeExternalURL computes a sanitized external URL from a raw input. It infers unset
// URL parts from the OS and the given listen address.
func computeExternalURL(u, listenAddr string) (*url.URL, error) {
	if u == "" {
		hostname, err := os.Hostname()
		if err != nil {
			return nil, err
		}
		_, port, err := net.SplitHostPort(listenAddr)
		if err != nil {
			return nil, err
		}
		u = fmt.Sprintf("http://%s:%s/", hostname, port)
	}

	if startsOrEndsWithQuote(u) {
		return nil, fmt.Errorf("URL must not begin or end with quotes")
	}

	eu, err := url.Parse(u)
	if err != nil {
		return nil, err
	}

	ppref := strings.TrimRight(eu.Path, "/")
	if ppref != "" && !strings.HasPrefix(ppref, "/") {
		ppref = "/" + ppref
	}
	eu.Path = ppref

	return eu, nil
}

// sendAlerts implements the rules.NotifyFunc for a Notifier.
func sendAlerts(n *notifier.Manager, externalURL string) rules.NotifyFunc {
	return func(ctx context.Context, expr string, alerts ...*rules.Alert) {
		var res []*notifier.Alert

		for _, alert := range alerts {
			a := &notifier.Alert{
				StartsAt:     alert.FiredAt,
				Labels:       alert.Labels,
				Annotations:  alert.Annotations,
				GeneratorURL: externalURL + strutil.TableLinkForExpression(expr),
			}
			if !alert.ResolvedAt.IsZero() {
				a.EndsAt = alert.ResolvedAt
			} else {
				a.EndsAt = alert.ValidUntil
			}
			res = append(res, a)
		}

		if len(alerts) > 0 {
			n.Send(res...)
		}
	}
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

type byAlertStateAndNameSorter struct {
	alerts []*AlertingRuleWithGroup
}

func (s byAlertStateAndNameSorter) Len() int {
	return len(s.alerts)
}

func (s byAlertStateAndNameSorter) Less(i, j int) bool {
	return s.alerts[i].State() > s.alerts[j].State() ||
		(s.alerts[i].State() == s.alerts[j].State() &&
			s.alerts[i].Name() < s.alerts[j].Name())
}

func (s byAlertStateAndNameSorter) Swap(i, j int) {
	s.alerts[i], s.alerts[j] = s.alerts[j], s.alerts[i]
}

type AlertingRuleWithGroup struct {
	rules.AlertingRule
	Id int
}

func (r *ClickHouseReader) GetRulesFromDB() (*[]model.RuleResponseItem, *model.ApiError) {

	rules := []model.RuleResponseItem{}

	query := fmt.Sprintf("SELECT id, updated_at, data FROM rules")

	err := r.localDB.Select(&rules, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &rules, nil
}

func (r *ClickHouseReader) GetRule(id string) (*model.RuleResponseItem, *model.ApiError) {

	idInt, _ := strconv.Atoi(id)

	rule := &model.RuleResponseItem{}

	query := fmt.Sprintf("SELECT id, updated_at, data FROM rules WHERE id=%d", idInt)

	err := r.localDB.Get(rule, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return rule, nil
}

func (r *ClickHouseReader) ListRulesFromProm() (*model.AlertDiscovery, *model.ApiError) {

	groups := r.ruleManager.RuleGroups()

	alertingRulesWithGroupObjects := []*AlertingRuleWithGroup{}

	for _, group := range groups {
		groupNameParts := strings.Split(group.Name(), "-groupname")
		if len(groupNameParts) < 2 {
			continue
		}
		id, _ := strconv.Atoi(groupNameParts[0])
		for _, rule := range group.Rules() {
			if alertingRule, ok := rule.(*rules.AlertingRule); ok {
				alertingRulesWithGroupObject := AlertingRuleWithGroup{
					*alertingRule,
					id,
				}
				alertingRulesWithGroupObjects = append(alertingRulesWithGroupObjects, &alertingRulesWithGroupObject)
			}
		}
	}

	// alertingRules := r.ruleManager.AlertingRules()

	alertsSorter := byAlertStateAndNameSorter{alerts: alertingRulesWithGroupObjects}
	sort.Sort(alertsSorter)
	alerts := []*model.AlertingRuleResponse{}

	for _, alertingRule := range alertsSorter.alerts {

		alertingRuleResponseObject := &model.AlertingRuleResponse{
			Labels: alertingRule.Labels(),
			// Annotations: alertingRule.Annotations(),
			Name: alertingRule.Name(),
			Id:   alertingRule.Id,
		}
		if len(alertingRule.ActiveAlerts()) == 0 {
			alertingRuleResponseObject.State = rules.StateInactive.String()
		} else {
			alertingRuleResponseObject.State = (*(alertingRule.ActiveAlerts()[0])).State.String()
		}

		alerts = append(
			alerts,
			alertingRuleResponseObject,
		)
	}

	res := &model.AlertDiscovery{Alerts: alerts}

	return res, nil
}

func (r *ClickHouseReader) LoadRule(rule model.RuleResponseItem) *model.ApiError {

	groupName := fmt.Sprintf("%d-groupname", rule.Id)

	err := r.ruleManager.AddGroup(time.Duration(r.promConfig.GlobalConfig.EvaluationInterval), rule.Data, groupName)

	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
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

	query := fmt.Sprintf("SELECT id, created_at, updated_at, name, type, data data FROM notification_channels WHERE id=%d", idInt)

	err := r.localDB.Get(&channel, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
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

func (r *ClickHouseReader) CreateRule(rule string) *model.ApiError {

	tx, err := r.localDB.Begin()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	var lastInsertId int64

	{
		stmt, err := tx.Prepare(`INSERT into rules (updated_at, data) VALUES($1,$2);`)
		if err != nil {
			zap.S().Errorf("Error in preparing statement for INSERT to rules\n", err)
			tx.Rollback()
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		result, err := stmt.Exec(time.Now(), rule)
		if err != nil {
			zap.S().Errorf("Error in Executing prepared statement for INSERT to rules\n", err)
			tx.Rollback() // return an error too, we may want to wrap them
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		lastInsertId, _ = result.LastInsertId()

		groupName := fmt.Sprintf("%d-groupname", lastInsertId)

		err = r.ruleManager.AddGroup(time.Duration(r.promConfig.GlobalConfig.EvaluationInterval), rule, groupName)

		if err != nil {
			tx.Rollback()
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	}
	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in committing transaction for INSERT to rules\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return nil
}

func (r *ClickHouseReader) EditRule(rule string, id string) *model.ApiError {

	idInt, _ := strconv.Atoi(id)

	tx, err := r.localDB.Begin()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	{
		stmt, err := tx.Prepare(`UPDATE rules SET updated_at=$1, data=$2 WHERE id=$3;`)
		if err != nil {
			zap.S().Errorf("Error in preparing statement for UPDATE to rules\n", err)
			tx.Rollback()
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(time.Now(), rule, idInt); err != nil {
			zap.S().Errorf("Error in Executing prepared statement for UPDATE to rules\n", err)
			tx.Rollback() // return an error too, we may want to wrap them
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}

		groupName := fmt.Sprintf("%d-groupname", idInt)

		err = r.ruleManager.EditGroup(time.Duration(r.promConfig.GlobalConfig.EvaluationInterval), rule, groupName)

		if err != nil {
			tx.Rollback()
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
	}

	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in committing transaction for UPDATE to rules\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (r *ClickHouseReader) DeleteRule(id string) *model.ApiError {

	idInt, _ := strconv.Atoi(id)

	tx, err := r.localDB.Begin()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	{
		stmt, err := tx.Prepare(`DELETE FROM rules WHERE id=$1;`)

		if err != nil {
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}
		defer stmt.Close()

		if _, err := stmt.Exec(idInt); err != nil {
			zap.S().Errorf("Error in Executing prepared statement for DELETE to rules\n", err)
			tx.Rollback() // return an error too, we may want to wrap them
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}

		groupName := fmt.Sprintf("%d-groupname", idInt)

		rule := "" // dummy rule to pass to function
		// err = r.ruleManager.UpdateGroupWithAction(time.Duration(r.promConfig.GlobalConfig.EvaluationInterval), rule, groupName, "delete")
		err = r.ruleManager.DeleteGroup(time.Duration(r.promConfig.GlobalConfig.EvaluationInterval), rule, groupName)

		if err != nil {
			tx.Rollback()
			zap.S().Errorf("Error in deleting rule from rulemanager...\n", err)
			return &model.ApiError{Typ: model.ErrorInternal, Err: err}
		}

	}

	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in committing transaction for deleting rules\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
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
	query := fmt.Sprintf(`SELECT DISTINCT serviceName FROM %s.%s WHERE toDate(timestamp) > now() - INTERVAL 1 DAY`, r.traceDB, r.indexTable)

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

func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceItem, *model.ApiError) {

	if r.indexTable == "" {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: ErrNoIndexTable}
	}

	serviceItems := []model.ServiceItem{}

	query := fmt.Sprintf("SELECT serviceName, quantile(0.99)(durationNano) as p99, avg(durationNano) as avgDuration, count(*) as numCalls FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2'", r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	args := []interface{}{}
	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY serviceName ORDER BY p99 DESC"
	err := r.db.Select(ctx, &serviceItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	//////////////////		Below block gets 5xx of services
	serviceErrorItems := []model.ServiceItem{}

	query = fmt.Sprintf("SELECT serviceName, count(*) as numErrors FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND (statusCode>=500 OR statusCode=2)", r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	args = []interface{}{}
	args, errStatus = buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY serviceName"
	err = r.db.Select(ctx, &serviceErrorItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	m5xx := make(map[string]uint64)

	for j := range serviceErrorItems {
		m5xx[serviceErrorItems[j].ServiceName] = serviceErrorItems[j].NumErrors
	}
	///////////////////////////////////////////

	//////////////////		Below block gets 4xx of services

	service4xxItems := []model.ServiceItem{}

	query = fmt.Sprintf("SELECT serviceName, count(*) as num4xx FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND statusCode>=400 AND statusCode<500", r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	args = []interface{}{}
	args, errStatus = buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY serviceName"
	err = r.db.Select(ctx, &service4xxItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	m4xx := make(map[string]uint64)

	for j := range service4xxItems {
		m4xx[service4xxItems[j].ServiceName] = service4xxItems[j].Num4XX
	}

	for i := range serviceItems {
		if val, ok := m5xx[serviceItems[i].ServiceName]; ok {
			serviceItems[i].NumErrors = val
		}
		if val, ok := m4xx[serviceItems[i].ServiceName]; ok {
			serviceItems[i].Num4XX = val
		}
		serviceItems[i].CallRate = float64(serviceItems[i].NumCalls) / float64(queryParams.Period)
		serviceItems[i].FourXXRate = float64(serviceItems[i].Num4XX) / float64(queryParams.Period)
		serviceItems[i].ErrorRate = float64(serviceItems[i].NumErrors) / float64(queryParams.Period)
	}

	return &serviceItems, nil
}

func (r *ClickHouseReader) GetServiceOverview(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, *model.ApiError) {

	serviceOverviewItems := []model.ServiceOverviewItem{}

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, quantile(0.99)(durationNano) as p99, quantile(0.95)(durationNano) as p95,quantile(0.50)(durationNano) as p50, count(*) as numCalls FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND serviceName='%s'", strconv.Itoa(int(queryParams.StepSeconds/60)), r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)
	args := []interface{}{}
	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY time ORDER BY time DESC"
	err := r.db.Select(ctx, &serviceOverviewItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	serviceErrorItems := []model.ServiceErrorItem{}

	query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, count(*) as numErrors FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND serviceName='%s' AND hasError=true", strconv.Itoa(int(queryParams.StepSeconds/60)), r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)
	args = []interface{}{}
	args, errStatus = buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY time ORDER BY time DESC"
	err = r.db.Select(ctx, &serviceErrorItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
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

	traceFilterReponse := model.SpanFiltersResponse{
		Status:      map[string]uint64{},
		Duration:    map[string]uint64{},
		ServiceName: map[string]uint64{},
		Operation:   map[string]uint64{},
		HttpCode:    map[string]uint64{},
		HttpMethod:  map[string]uint64{},
		HttpUrl:     map[string]uint64{},
		HttpRoute:   map[string]uint64{},
		HttpHost:    map[string]uint64{},
		Component:   map[string]uint64{},
	}

	for _, e := range queryParams.GetFilters {
		switch e {
		case constants.ServiceName:
			finalQuery := fmt.Sprintf("SELECT serviceName, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT httpCode, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT httpRoute, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT httpUrl, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT httpMethod, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT httpHost, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT name, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT component, count() as count FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT COUNT(*) as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU AND hasError = true", r.traceDB, r.indexTable)
			finalQuery += query
			var dBResponse []model.DBResponseTotal
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}

			finalQuery2 := fmt.Sprintf("SELECT COUNT(*) as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU AND hasError = false", r.traceDB, r.indexTable)
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
			finalQuery := fmt.Sprintf("SELECT durationNano as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.durationTable)
			finalQuery += query
			finalQuery += " ORDER BY durationNano LIMIT 1"
			var dBResponse []model.DBResponseTotal
			err := r.db.Select(ctx, &dBResponse, finalQuery, args...)
			zap.S().Info(finalQuery)

			if err != nil {
				zap.S().Debug("Error in processing sql query: ", err)
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query: %s", err)}
			}
			finalQuery = fmt.Sprintf("SELECT durationNano as numTotal FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.traceDB, r.durationTable)
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

	queryTable := fmt.Sprintf("%s.%s", r.traceDB, r.indexTable)

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
			queryTable = fmt.Sprintf("%s.%s", r.traceDB, r.durationTable)
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

	baseQuery := fmt.Sprintf("SELECT timestamp, spanID, traceID, serviceName, name, durationNano, httpCode, gRPCCode, gRPCMethod, httpMethod FROM %s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryTable)
	baseQuery += query
	err := r.db.Select(ctx, &getFilterSpansResponseItems, baseQuery, args...)
	// Fill status and method
	for i, e := range getFilterSpansResponseItems {
		if e.HttpCode == "" {
			getFilterSpansResponseItems[i].StatusCode = e.GRPCode
		} else {
			getFilterSpansResponseItems[i].StatusCode = e.HttpCode
		}
		if e.HttpMethod == "" {
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

	tagFilters := []model.TagFilters{}

	finalQuery := fmt.Sprintf(`SELECT DISTINCT arrayJoin(tagMap.keys) as tagKeys FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.traceDB, r.indexTable)
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

	finalQuery := fmt.Sprintf(`SELECT tagMap[@key] as tagValues FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU`, r.traceDB, r.indexTable)
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

func (r *ClickHouseReader) GetTopEndpoints(ctx context.Context, queryParams *model.GetTopEndpointsParams) (*[]model.TopEndpointsItem, *model.ApiError) {

	var topEndpointsItems []model.TopEndpointsItem

	query := fmt.Sprintf("SELECT quantile(0.5)(durationNano) as p50, quantile(0.95)(durationNano) as p95, quantile(0.99)(durationNano) as p99, COUNT(1) as numCalls, name  FROM %s.%s WHERE  timestamp >= '%s' AND timestamp <= '%s' AND  kind='2' and serviceName='%s'", r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)
	args := []interface{}{}
	args, errStatus := buildQueryWithTagParams(ctx, queryParams.Tags, &query, args)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY name"
	err := r.db.Select(ctx, &topEndpointsItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	if topEndpointsItems == nil {
		topEndpointsItems = []model.TopEndpointsItem{}
	}

	return &topEndpointsItems, nil
}

func (r *ClickHouseReader) GetUsage(ctx context.Context, queryParams *model.GetUsageParams) (*[]model.UsageItem, error) {

	var usageItems []model.UsageItem

	var query string
	if len(queryParams.ServiceName) != 0 {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d HOUR) as time, count(1) as count FROM %s.%s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' GROUP BY time ORDER BY time ASC", queryParams.StepHour, r.traceDB, r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	} else {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d HOUR) as time, count(1) as count FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s' GROUP BY time ORDER BY time ASC", queryParams.StepHour, r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	}

	err := r.db.Select(ctx, &usageItems, query)

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

func (r *ClickHouseReader) SearchTraces(ctx context.Context, traceId string) (*[]model.SearchSpansResult, error) {

	var searchScanReponses []model.SearchSpanDBReponseItem

	query := fmt.Sprintf("SELECT timestamp, traceID, model FROM %s.%s WHERE traceID=$1", r.traceDB, r.spansTable)

	err := r.db.Select(ctx, &searchScanReponses, query, traceId)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	searchSpansResult := []model.SearchSpansResult{{
		Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError"},
		Events:  make([][]interface{}, len(searchScanReponses)),
	},
	}

	for i, item := range searchScanReponses {
		var jsonItem model.SearchSpanReponseItem
		json.Unmarshal([]byte(item.Model), &jsonItem)
		jsonItem.TimeUnixNano = uint64(item.Timestamp.UnixNano() / 1000000)
		spanEvents := jsonItem.GetValues()
		searchSpansResult[0].Events[i] = spanEvents
	}

	return &searchSpansResult, nil

}
func interfaceArrayToStringArray(array []interface{}) []string {
	var strArray []string
	for _, item := range array {
		strArray = append(strArray, item.(string))
	}
	return strArray
}

func (r *ClickHouseReader) GetServiceMapDependencies(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error) {
	serviceMapDependencyItems := []model.ServiceMapDependencyItem{}

	query := fmt.Sprintf(`SELECT spanID, parentSpanID, serviceName FROM %s.%s WHERE timestamp>='%s' AND timestamp<='%s'`, r.traceDB, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(ctx, &serviceMapDependencyItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	serviceMap := make(map[string]*model.ServiceMapDependencyResponseItem)

	spanId2ServiceNameMap := make(map[string]string)
	for i := range serviceMapDependencyItems {
		spanId2ServiceNameMap[serviceMapDependencyItems[i].SpanId] = serviceMapDependencyItems[i].ServiceName
	}
	for i := range serviceMapDependencyItems {
		parent2childServiceName := spanId2ServiceNameMap[serviceMapDependencyItems[i].ParentSpanId] + "-" + spanId2ServiceNameMap[serviceMapDependencyItems[i].SpanId]
		if _, ok := serviceMap[parent2childServiceName]; !ok {
			serviceMap[parent2childServiceName] = &model.ServiceMapDependencyResponseItem{
				Parent:    spanId2ServiceNameMap[serviceMapDependencyItems[i].ParentSpanId],
				Child:     spanId2ServiceNameMap[serviceMapDependencyItems[i].SpanId],
				CallCount: 1,
			}
		} else {
			serviceMap[parent2childServiceName].CallCount++
		}
	}

	retMe := make([]model.ServiceMapDependencyResponseItem, 0, len(serviceMap))
	for _, dependency := range serviceMap {
		if dependency.Parent == "" {
			continue
		}
		retMe = append(retMe, *dependency)
	}

	return &retMe, nil
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
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, serviceName as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.HttpCode:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpCode as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.HttpMethod:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpMethod as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.HttpUrl:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpUrl as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.HttpRoute:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpRoute as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.HttpHost:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, httpHost as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.DBName:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, dbName as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.DBOperation:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, dbOperation as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.OperationRequest:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, name as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.MsgSystem:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, msgSystem as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.MsgOperation:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, msgOperation as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.DBSystem:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, dbSystem as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		case constants.Component:
			query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, component as groupBy, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
		default:
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("groupBy type: %s not supported", queryParams.GroupBy)}
		}
	} else {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, %s FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", queryParams.StepSeconds/60, aggregation_query, r.traceDB, r.indexTable)
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

// SetTTL sets the TTL for traces or metrics tables.
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
		tableNameArray := []string{signozTraceDBName + "." + signozTraceTableName, signozTraceDBName + "." + signozDurationMVTable, signozTraceDBName + "." + signozSpansTable, signozTraceDBName + "." + signozErrorIndexTable}
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

	switch ttlParams.Type {
	case constants.TraceTTL:
		tableNameArray := []string{signozTraceDBName + "." + signozTraceTableName, signozTraceDBName + "." + signozDurationMVTable, signozTraceDBName + "." + signozSpansTable, signozTraceDBName + "." + signozErrorIndexTable}
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
	default:
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. ttl type should be metrics|traces, got %v",
			ttlParams.Type)}
	}

}

func (r *ClickHouseReader) GetErrors(ctx context.Context, queryParams *model.GetErrorsParams) (*[]model.Error, *model.ApiError) {

	var getErrorReponses []model.Error

	query := fmt.Sprintf("SELECT exceptionType, exceptionMessage, count() AS exceptionCount, min(timestamp) as firstSeen, max(timestamp) as lastSeen, serviceName FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU GROUP BY serviceName, exceptionType, exceptionMessage", r.traceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorReponses, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	return &getErrorReponses, nil

}

func (r *ClickHouseReader) GetErrorForId(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.S().Debug("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var getErrorWithSpanReponse []model.ErrorWithSpan

	// TODO: Optimize this query further
	query := fmt.Sprintf("SELECT spanID, traceID, errorID, timestamp, serviceName, exceptionType, exceptionMessage, exceptionStacktrace, exceptionEscaped, olderErrorId, newerErrorId FROM (SELECT *, lagInFrame(toNullable(errorID)) over w as olderErrorId, leadInFrame(toNullable(errorID)) over w as newerErrorId FROM %s.%s window w as (ORDER BY exceptionType, serviceName, timestamp rows between unbounded preceding and unbounded following)) WHERE errorID = @errorID", r.traceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID)}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)

	zap.S().Info(query)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return &model.ErrorWithSpan{}, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error ID not found")}
	}

}

func (r *ClickHouseReader) GetErrorForType(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	if queryParams.ErrorType == "" || queryParams.ServiceName == "" {
		zap.S().Debug("errorType/serviceName missing from params")
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("ErrorType/serviceName missing from params")}
	}
	var getErrorWithSpanReponse []model.ErrorWithSpan

	// TODO: Optimize this query further
	query := fmt.Sprintf("SELECT spanID, traceID, errorID, timestamp , serviceName, exceptionType, exceptionMessage, exceptionStacktrace, exceptionEscaped, newerErrorId, olderErrorId FROM (SELECT *, lagInFrame(errorID) over w as olderErrorId, leadInFrame(errorID) over w as newerErrorId FROM %s.%s WHERE serviceName = @serviceName AND exceptionType = @errorType window w as (ORDER BY timestamp DESC rows between unbounded preceding and unbounded following))", r.traceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("serviceName", queryParams.ServiceName), clickhouse.Named("errorType", queryParams.ErrorType)}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("Error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorUnavailable, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetMetricAutocompleteTagKey(ctx context.Context, params *model.MetricAutocompleteTagParams) (*[]string, *model.ApiError) {

	var query string
	var err error
	var tagKeyList []string
	var rows driver.Rows

	tagsWhereClause := ""

	for key, val := range params.MetricTags {
		tagsWhereClause += fmt.Sprintf(" AND labels_object.%s = '%s' ", key, val)
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
		tagsWhereClause += fmt.Sprintf(" AND labels_object.%s = '%s' ", key, val)
	}

	if len(params.Match) != 0 {
		query = fmt.Sprintf("SELECT DISTINCT(labels_object.%s) from %s.%s WHERE metric_name=$1 %s AND labels_object.%s ILIKE $2;", params.TagKey, signozMetricDBName, signozTSTableName, tagsWhereClause, params.TagKey)

		rows, err = r.db.Query(ctx, query, params.TagKey, params.MetricName, fmt.Sprintf("%%%s%%", params.Match))

	} else {
		query = fmt.Sprintf("SELECT DISTINCT(labels_object.%s) FROM %s.%s WHERE metric_name=$2 %s;", params.TagKey, signozMetricDBName, signozTSTableName, tagsWhereClause)
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

// GetMetricResult runs the query and returns list of time series
func (r *ClickHouseReader) GetMetricResult(ctx context.Context, query string) ([]*model.Series, error) {

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("error in processing sql query")
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
