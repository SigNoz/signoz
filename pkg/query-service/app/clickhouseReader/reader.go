package clickhouseReader

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	sd_config "github.com/prometheus/prometheus/discovery/config"
	"github.com/prometheus/prometheus/scrape"

	"github.com/pkg/errors"

	_ "github.com/ClickHouse/clickhouse-go"
	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"github.com/jmoiron/sqlx"
	"github.com/oklog/oklog/pkg/group"
	"github.com/prometheus/client_golang/prometheus"
	promModel "github.com/prometheus/common/model"
	"github.com/prometheus/common/promlog"
	"github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/discovery"
	"github.com/prometheus/prometheus/notifier"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/rules"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
	"github.com/prometheus/prometheus/util/stats"
	"github.com/prometheus/prometheus/util/strutil"
	"github.com/prometheus/tsdb"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

const (
	primaryNamespace     = "clickhouse"
	archiveNamespace     = "clickhouse-archive"
	signozTraceTableName = "signoz_index"
	signozMetricDBName   = "signoz_metrics"
	signozSampleName     = "samples"
	signozTSName         = "time_series"

	minTimespanForProgressiveSearch       = time.Hour
	minTimespanForProgressiveSearchMargin = time.Minute
	maxProgressiveSteps                   = 4
)

var (
	ErrNoOperationsTable = errors.New("no operations table supplied")
	ErrNoIndexTable      = errors.New("no index table supplied")
	ErrStartTimeRequired = errors.New("start time is required for search queries")
)

// SpanWriter for reading spans from ClickHouse
type ClickHouseReader struct {
	db              *sqlx.DB
	localDB         *sqlx.DB
	operationsTable string
	indexTable      string
	spansTable      string
	queryEngine     *promql.Engine
	remoteStorage   *remote.Storage
	ruleManager     *rules.Manager
	promConfig      *config.Config
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

	return &ClickHouseReader{
		db:              db,
		localDB:         localDB,
		operationsTable: options.primary.OperationsTable,
		indexTable:      options.primary.IndexTable,
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

	ExternalURL, err := computeExternalURL("", "0.0.0.0:3000")
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

func initialize(options *Options) (*sqlx.DB, error) {

	db, err := connect(options.getPrimary())
	if err != nil {
		return nil, fmt.Errorf("error connecting to primary db: %v", err)
	}

	return db, nil
}

func connect(cfg *namespaceConfig) (*sqlx.DB, error) {
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

	receiver := &model.Receiver{}
	if err := json.Unmarshal([]byte(channel.Data), receiver); err != nil { // Parse []byte to go struct pointer
		return &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	response, err := http.Post(constants.ALERTMANAGER_API_PREFIX+"v1/receivers", "application/json", bytes.NewBuffer([]byte(channel.Data)))

	if err != nil {
		zap.S().Errorf("Error in getting response of API call to alertmanager/v1/receivers\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if response.StatusCode > 299 {
		responseData, _ := ioutil.ReadAll(response.Body)

		err := fmt.Errorf("Error in getting 2xx response in API call to alertmanager/v1/receivers\n", response.Status, string(responseData))
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

	values := map[string]string{"name": channelToDelete.Name}
	jsonValue, _ := json.Marshal(values)

	req, err := http.NewRequest(http.MethodDelete, constants.ALERTMANAGER_API_PREFIX+"v1/receivers", bytes.NewBuffer(jsonValue))

	if err != nil {
		zap.S().Errorf("Error in creating new delete request to alertmanager/v1/receivers\n", err)
		tx.Rollback()
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(req)

	if err != nil {
		zap.S().Errorf("Error in delete API call to alertmanager/v1/receivers\n", err)
		tx.Rollback()
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if response.StatusCode > 299 {
		err := fmt.Errorf("Error in getting 2xx response in API call to delete alertmanager/v1/receivers\n", response.Status)
		zap.S().Error(err)
		tx.Rollback()
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in commiting transaction for DELETE command to notification_channels\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil

}

func (r *ClickHouseReader) GetChannels() (*[]model.ChannelItem, *model.ApiError) {

	channels := []model.ChannelItem{}

	query := fmt.Sprintf("SELECT id, created_at, updated_at, name, type, data data FROM notification_channels")

	err := r.localDB.Select(&channels, query)

	// zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return &channels, nil

}

func getChannelType(receiver *model.Receiver) string {

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

func (r *ClickHouseReader) EditChannel(receiver *model.Receiver, id string) (*model.Receiver, *model.ApiError) {

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

	req, err := http.NewRequest(http.MethodPut, constants.ALERTMANAGER_API_PREFIX+"v1/receivers", bytes.NewBuffer(receiverString))

	if err != nil {
		zap.S().Errorf("Error in creating new update request to alertmanager/v1/receivers\n", err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(req)

	if err != nil {
		zap.S().Errorf("Error in update API call to alertmanager/v1/receivers\n", err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	if response.StatusCode > 299 {
		err := fmt.Errorf("Error in getting 2xx response in API call to alertmanager/v1/receivers\n", response.Status)
		zap.S().Error(err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in commiting transaction for INSERT to notification_channels\n", err)
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return receiver, nil

}

func (r *ClickHouseReader) CreateChannel(receiver *model.Receiver) (*model.Receiver, *model.ApiError) {

	tx, err := r.localDB.Begin()
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	channel_type := getChannelType(receiver)
	receiverString, _ := json.Marshal(receiver)

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

	response, err := http.Post(constants.ALERTMANAGER_API_PREFIX+"v1/receivers", "application/json", bytes.NewBuffer(receiverString))

	if err != nil {
		zap.S().Errorf("Error in getting response of API call to alertmanager/v1/receivers\n", err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	if response.StatusCode > 299 {
		err := fmt.Errorf("Error in getting 2xx response in API call to alertmanager/v1/receivers\n", response.Status)
		zap.S().Error(err)
		tx.Rollback()
		return nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = tx.Commit()
	if err != nil {
		zap.S().Errorf("Error in commiting transaction for INSERT to notification_channels\n", err)
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
		zap.S().Errorf("Error in commiting transaction for INSERT to rules\n", err)
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
		zap.S().Errorf("Error in commiting transaction for UPDATE to rules\n", err)
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
		zap.S().Errorf("Error in commiting transaction for deleting rules\n", err)
		return &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	return nil
}

func (r *ClickHouseReader) GetInstantQueryMetricsResult(ctx context.Context, queryParams *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.queryEngine.NewInstantQuery(r.remoteStorage, queryParams.Query, queryParams.Time)
	if err != nil {
		return nil, nil, &model.ApiError{model.ErrorBadData, err}
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
		return nil, nil, &model.ApiError{model.ErrorBadData, err}
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

func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceItem, error) {

	if r.indexTable == "" {
		return nil, ErrNoIndexTable
	}

	serviceItems := []model.ServiceItem{}

	query := fmt.Sprintf("SELECT serviceName, quantile(0.99)(durationNano) as p99, avg(durationNano) as avgDuration, count(*) as numCalls FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' GROUP BY serviceName ORDER BY p99 DESC", r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(&serviceItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	//////////////////		Below block gets 5xx of services
	serviceErrorItems := []model.ServiceItem{}

	query = fmt.Sprintf("SELECT serviceName, count(*) as numErrors FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND (statusCode>=500 OR statusCode=2) GROUP BY serviceName", r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err = r.db.Select(&serviceErrorItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	m5xx := make(map[string]int)

	for j, _ := range serviceErrorItems {
		m5xx[serviceErrorItems[j].ServiceName] = serviceErrorItems[j].NumErrors
	}
	///////////////////////////////////////////

	//////////////////		Below block gets 4xx of services

	service4xxItems := []model.ServiceItem{}

	query = fmt.Sprintf("SELECT serviceName, count(*) as num4xx FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND statusCode>=400 AND statusCode<500 GROUP BY serviceName", r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err = r.db.Select(&service4xxItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	m4xx := make(map[string]int)

	for j, _ := range service4xxItems {
		m5xx[service4xxItems[j].ServiceName] = service4xxItems[j].Num4XX
	}

	for i, _ := range serviceItems {
		if val, ok := m5xx[serviceItems[i].ServiceName]; ok {
			serviceItems[i].NumErrors = val
		}
		if val, ok := m4xx[serviceItems[i].ServiceName]; ok {
			serviceItems[i].Num4XX = val
		}
		serviceItems[i].CallRate = float32(serviceItems[i].NumCalls) / float32(queryParams.Period)
		serviceItems[i].FourXXRate = float32(serviceItems[i].Num4XX) / float32(queryParams.Period)
		serviceItems[i].ErrorRate = float32(serviceItems[i].NumErrors) / float32(queryParams.Period)
	}

	return &serviceItems, nil
}

func (r *ClickHouseReader) GetServiceOverview(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, error) {

	serviceOverviewItems := []model.ServiceOverviewItem{}

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, quantile(0.99)(durationNano) as p99, quantile(0.95)(durationNano) as p95,quantile(0.50)(durationNano) as p50, count(*) as numCalls FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND serviceName='%s' GROUP BY time ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)

	err := r.db.Select(&serviceOverviewItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	serviceErrorItems := []model.ServiceErrorItem{}

	query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, count(*) as numErrors FROM %s WHERE timestamp>='%s' AND timestamp<='%s' AND kind='2' AND serviceName='%s' AND (statusCode>=500 OR statusCode=2) GROUP BY time ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)

	err = r.db.Select(&serviceErrorItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	m := make(map[int64]int)

	for j, _ := range serviceErrorItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceErrorItems[j].Time)
		m[int64(timeObj.UnixNano())] = serviceErrorItems[j].NumErrors
	}

	for i, _ := range serviceOverviewItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceOverviewItems[i].Time)
		serviceOverviewItems[i].Timestamp = int64(timeObj.UnixNano())
		serviceOverviewItems[i].Time = ""

		if val, ok := m[serviceOverviewItems[i].Timestamp]; ok {
			serviceOverviewItems[i].NumErrors = val
		}
		serviceOverviewItems[i].ErrorRate = float32(serviceOverviewItems[i].NumErrors) * 100 / float32(serviceOverviewItems[i].NumCalls)
		serviceOverviewItems[i].CallRate = float32(serviceOverviewItems[i].NumCalls) / float32(queryParams.StepSeconds)
	}

	return &serviceOverviewItems, nil

}

func (r *ClickHouseReader) SearchSpans(ctx context.Context, queryParams *model.SpanSearchParams) (*[]model.SearchSpansResult, error) {

	query := fmt.Sprintf("SELECT timestamp, spanID, traceID, serviceName, name, kind, durationNano, tagsKeys, tagsValues FROM %s WHERE timestamp >= ? AND timestamp <= ?", r.indexTable)

	args := []interface{}{strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10)}

	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName = ?"
		args = append(args, queryParams.ServiceName)
	}

	if len(queryParams.OperationName) != 0 {

		query = query + " AND name = ?"
		args = append(args, queryParams.OperationName)

	}

	if len(queryParams.Kind) != 0 {
		query = query + " AND kind = ?"
		args = append(args, queryParams.Kind)

	}

	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= ?"
		args = append(args, queryParams.MinDuration)
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= ?"
		args = append(args, queryParams.MaxDuration)
	}

	for _, item := range queryParams.Tags {

		if item.Key == "error" && item.Value == "true" {
			query = query + " AND ( has(tags, 'error:true') OR statusCode>=500 OR statusCode=2)"
			continue
		}

		if item.Operator == "equals" {
			query = query + " AND has(tags, ?)"
			args = append(args, fmt.Sprintf("%s:%s", item.Key, item.Value))
		} else if item.Operator == "contains" {
			query = query + " AND tagsValues[indexOf(tagsKeys, ?)] ILIKE ?"
			args = append(args, item.Key)
			args = append(args, fmt.Sprintf("%%%s%%", item.Value))
		} else if item.Operator == "regex" {
			query = query + " AND match(tagsValues[indexOf(tagsKeys, ?)], ?)"
			args = append(args, item.Key)
			args = append(args, item.Value)
		} else if item.Operator == "isnotnull" {
			query = query + " AND has(tagsKeys, ?)"
			args = append(args, item.Key)
		} else {
			return nil, fmt.Errorf("Tag Operator %s not supported", item.Operator)
		}

	}

	query = query + " ORDER BY timestamp DESC LIMIT 100"

	var searchScanReponses []model.SearchSpanReponseItem

	err := r.db.Select(&searchScanReponses, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	searchSpansResult := []model.SearchSpansResult{
		model.SearchSpansResult{
			Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues"},
			Events:  make([][]interface{}, len(searchScanReponses)),
		},
	}

	for i, item := range searchScanReponses {
		spanEvents := item.GetValues()
		searchSpansResult[0].Events[i] = spanEvents
	}

	return &searchSpansResult, nil
}

func (r *ClickHouseReader) GetServiceDBOverview(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceDBOverviewItem, error) {

	var serviceDBOverviewItems []model.ServiceDBOverviewItem

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, avg(durationNano) as avgDuration, count(1) as numCalls, dbSystem FROM %s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' AND kind='3' AND dbName IS NOT NULL GROUP BY time, dbSystem ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(&serviceDBOverviewItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i, _ := range serviceDBOverviewItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceDBOverviewItems[i].Time)
		serviceDBOverviewItems[i].Timestamp = int64(timeObj.UnixNano())
		serviceDBOverviewItems[i].Time = ""
		serviceDBOverviewItems[i].CallRate = float32(serviceDBOverviewItems[i].NumCalls) / float32(queryParams.StepSeconds)
	}

	if serviceDBOverviewItems == nil {
		serviceDBOverviewItems = []model.ServiceDBOverviewItem{}
	}

	return &serviceDBOverviewItems, nil

}

func (r *ClickHouseReader) GetServiceExternalAvgDuration(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error) {

	var serviceExternalItems []model.ServiceExternalItem

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, avg(durationNano) as avgDuration FROM %s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' AND kind='3' AND externalHttpUrl IS NOT NULL GROUP BY time ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(&serviceExternalItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i, _ := range serviceExternalItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceExternalItems[i].Time)
		serviceExternalItems[i].Timestamp = int64(timeObj.UnixNano())
		serviceExternalItems[i].Time = ""
		serviceExternalItems[i].CallRate = float32(serviceExternalItems[i].NumCalls) / float32(queryParams.StepSeconds)
	}

	if serviceExternalItems == nil {
		serviceExternalItems = []model.ServiceExternalItem{}
	}

	return &serviceExternalItems, nil
}

func (r *ClickHouseReader) GetServiceExternalErrors(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error) {

	var serviceExternalErrorItems []model.ServiceExternalItem

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, avg(durationNano) as avgDuration, count(1) as numCalls, externalHttpUrl FROM %s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' AND kind='3' AND externalHttpUrl IS NOT NULL AND (statusCode >= 500 OR statusCode=2) GROUP BY time, externalHttpUrl ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(&serviceExternalErrorItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}
	var serviceExternalTotalItems []model.ServiceExternalItem

	queryTotal := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, avg(durationNano) as avgDuration, count(1) as numCalls, externalHttpUrl FROM %s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' AND kind='3' AND externalHttpUrl IS NOT NULL GROUP BY time, externalHttpUrl ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	errTotal := r.db.Select(&serviceExternalTotalItems, queryTotal)

	if errTotal != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	m := make(map[string]int)

	for j, _ := range serviceExternalErrorItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceExternalErrorItems[j].Time)
		m[strconv.FormatInt(timeObj.UnixNano(), 10)+"-"+serviceExternalErrorItems[j].ExternalHttpUrl] = serviceExternalErrorItems[j].NumCalls
	}

	for i, _ := range serviceExternalTotalItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceExternalTotalItems[i].Time)
		serviceExternalTotalItems[i].Timestamp = int64(timeObj.UnixNano())
		serviceExternalTotalItems[i].Time = ""
		// serviceExternalTotalItems[i].CallRate = float32(serviceExternalTotalItems[i].NumCalls) / float32(queryParams.StepSeconds)

		if val, ok := m[strconv.FormatInt(serviceExternalTotalItems[i].Timestamp, 10)+"-"+serviceExternalTotalItems[i].ExternalHttpUrl]; ok {
			serviceExternalTotalItems[i].NumErrors = val
			serviceExternalTotalItems[i].ErrorRate = float32(serviceExternalTotalItems[i].NumErrors) * 100 / float32(serviceExternalTotalItems[i].NumCalls)
		}
		serviceExternalTotalItems[i].CallRate = 0
		serviceExternalTotalItems[i].NumCalls = 0

	}

	if serviceExternalTotalItems == nil {
		serviceExternalTotalItems = []model.ServiceExternalItem{}
	}

	return &serviceExternalTotalItems, nil
}

func (r *ClickHouseReader) GetServiceExternal(ctx context.Context, queryParams *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error) {

	var serviceExternalItems []model.ServiceExternalItem

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %s minute) as time, avg(durationNano) as avgDuration, count(1) as numCalls, externalHttpUrl FROM %s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' AND kind='3' AND externalHttpUrl IS NOT NULL GROUP BY time, externalHttpUrl ORDER BY time DESC", strconv.Itoa(int(queryParams.StepSeconds/60)), r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(&serviceExternalItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i, _ := range serviceExternalItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, serviceExternalItems[i].Time)
		serviceExternalItems[i].Timestamp = int64(timeObj.UnixNano())
		serviceExternalItems[i].Time = ""
		serviceExternalItems[i].CallRate = float32(serviceExternalItems[i].NumCalls) / float32(queryParams.StepSeconds)
	}

	if serviceExternalItems == nil {
		serviceExternalItems = []model.ServiceExternalItem{}
	}

	return &serviceExternalItems, nil
}

func (r *ClickHouseReader) GetTopEndpoints(ctx context.Context, queryParams *model.GetTopEndpointsParams) (*[]model.TopEndpointsItem, error) {

	var topEndpointsItems []model.TopEndpointsItem

	query := fmt.Sprintf("SELECT quantile(0.5)(durationNano) as p50, quantile(0.95)(durationNano) as p95, quantile(0.99)(durationNano) as p99, COUNT(1) as numCalls, name  FROM %s WHERE  timestamp >= '%s' AND timestamp <= '%s' AND  kind='2' and serviceName='%s' GROUP BY name", r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10), queryParams.ServiceName)

	err := r.db.Select(&topEndpointsItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
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
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d HOUR) as time, count(1) as count FROM %s WHERE serviceName='%s' AND timestamp>='%s' AND timestamp<='%s' GROUP BY time ORDER BY time ASC", queryParams.StepHour, r.indexTable, queryParams.ServiceName, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	} else {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d HOUR) as time, count(1) as count FROM %s WHERE timestamp>='%s' AND timestamp<='%s' GROUP BY time ORDER BY time ASC", queryParams.StepHour, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))
	}

	err := r.db.Select(&usageItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i, _ := range usageItems {
		timeObj, _ := time.Parse(time.RFC3339Nano, usageItems[i].Time)
		usageItems[i].Timestamp = int64(timeObj.UnixNano())
		usageItems[i].Time = ""
	}

	if usageItems == nil {
		usageItems = []model.UsageItem{}
	}

	return &usageItems, nil
}

func (r *ClickHouseReader) GetServicesList(ctx context.Context) (*[]string, error) {

	services := []string{}

	query := fmt.Sprintf(`SELECT DISTINCT serviceName FROM %s WHERE toDate(timestamp) > now() - INTERVAL 1 DAY`, r.indexTable)

	err := r.db.Select(&services, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	return &services, nil
}

func (r *ClickHouseReader) GetTags(ctx context.Context, serviceName string) (*[]model.TagItem, error) {

	tagItems := []model.TagItem{}

	query := fmt.Sprintf(`SELECT DISTINCT arrayJoin(tagsKeys) as tagKeys FROM %s WHERE serviceName=?  AND toDate(timestamp) > now() - INTERVAL 1 DAY`, r.indexTable)

	err := r.db.Select(&tagItems, query, serviceName)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	return &tagItems, nil
}

func (r *ClickHouseReader) GetOperations(ctx context.Context, serviceName string) (*[]string, error) {

	operations := []string{}

	query := fmt.Sprintf(`SELECT DISTINCT(name) FROM %s WHERE serviceName=?  AND toDate(timestamp) > now() - INTERVAL 1 DAY`, r.indexTable)

	err := r.db.Select(&operations, query, serviceName)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}
	return &operations, nil
}

func (r *ClickHouseReader) SearchTraces(ctx context.Context, traceId string) (*[]model.SearchSpansResult, error) {

	var searchScanReponses []model.SearchSpanReponseItem

	query := fmt.Sprintf("SELECT timestamp, spanID, traceID, serviceName, name, kind, durationNano, tagsKeys, tagsValues, references FROM %s WHERE traceID=?", r.indexTable)

	err := r.db.Select(&searchScanReponses, query, traceId)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	searchSpansResult := []model.SearchSpansResult{
		model.SearchSpansResult{
			Columns: []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References"},
			Events:  make([][]interface{}, len(searchScanReponses)),
		},
	}

	for i, item := range searchScanReponses {
		spanEvents := item.GetValues()
		searchSpansResult[0].Events[i] = spanEvents
	}

	return &searchSpansResult, nil

}
func (r *ClickHouseReader) GetServiceMapDependencies(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error) {
	serviceMapDependencyItems := []model.ServiceMapDependencyItem{}

	query := fmt.Sprintf(`SELECT spanID, parentSpanID, serviceName FROM %s WHERE timestamp>='%s' AND timestamp<='%s'`, r.indexTable, strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10))

	err := r.db.Select(&serviceMapDependencyItems, query)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	serviceMap := make(map[string]*model.ServiceMapDependencyResponseItem)

	spanId2ServiceNameMap := make(map[string]string)
	for i, _ := range serviceMapDependencyItems {
		spanId2ServiceNameMap[serviceMapDependencyItems[i].SpanId] = serviceMapDependencyItems[i].ServiceName
	}
	for i, _ := range serviceMapDependencyItems {
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

func (r *ClickHouseReader) SearchSpansAggregate(ctx context.Context, queryParams *model.SpanSearchAggregatesParams) ([]model.SpanSearchAggregatesResponseItem, error) {

	spanSearchAggregatesResponseItems := []model.SpanSearchAggregatesResponseItem{}

	aggregation_query := ""
	if queryParams.Dimension == "duration" {
		switch queryParams.AggregationOption {
		case "p50":
			aggregation_query = " quantile(0.50)(durationNano) as value "
			break

		case "p95":
			aggregation_query = " quantile(0.95)(durationNano) as value "
			break

		case "p99":
			aggregation_query = " quantile(0.99)(durationNano) as value "
			break
		}
	} else if queryParams.Dimension == "calls" {
		aggregation_query = " count(*) as value "
	}

	query := fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL %d minute) as time, %s FROM %s WHERE timestamp >= ? AND timestamp <= ?", queryParams.StepSeconds/60, aggregation_query, r.indexTable)

	args := []interface{}{strconv.FormatInt(queryParams.Start.UnixNano(), 10), strconv.FormatInt(queryParams.End.UnixNano(), 10)}

	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName = ?"
		args = append(args, queryParams.ServiceName)
	}

	if len(queryParams.OperationName) != 0 {

		query = query + " AND name = ?"
		args = append(args, queryParams.OperationName)

	}

	if len(queryParams.Kind) != 0 {
		query = query + " AND kind = ?"
		args = append(args, queryParams.Kind)

	}

	if len(queryParams.MinDuration) != 0 {
		query = query + " AND durationNano >= ?"
		args = append(args, queryParams.MinDuration)
	}
	if len(queryParams.MaxDuration) != 0 {
		query = query + " AND durationNano <= ?"
		args = append(args, queryParams.MaxDuration)
	}

	for _, item := range queryParams.Tags {

		if item.Key == "error" && item.Value == "true" {
			query = query + " AND ( has(tags, 'error:true') OR statusCode>=500 OR statusCode=2)"
			continue
		}

		if item.Operator == "equals" {
			query = query + " AND has(tags, ?)"
			args = append(args, fmt.Sprintf("%s:%s", item.Key, item.Value))
		} else if item.Operator == "contains" {
			query = query + " AND tagsValues[indexOf(tagsKeys, ?)] ILIKE ?"
			args = append(args, item.Key)
			args = append(args, fmt.Sprintf("%%%s%%", item.Value))
		} else if item.Operator == "regex" {
			query = query + " AND match(tagsValues[indexOf(tagsKeys, ?)], ?)"
			args = append(args, item.Key)
			args = append(args, item.Value)
		} else if item.Operator == "isnotnull" {
			query = query + " AND has(tagsKeys, ?)"
			args = append(args, item.Key)
		} else {
			return nil, fmt.Errorf("Tag Operator %s not supported", item.Operator)
		}

	}

	query = query + " GROUP BY time ORDER BY time"

	err := r.db.Select(&spanSearchAggregatesResponseItems, query, args...)

	zap.S().Info(query)

	if err != nil {
		zap.S().Debug("Error in processing sql query: ", err)
		return nil, fmt.Errorf("Error in processing sql query")
	}

	for i, _ := range spanSearchAggregatesResponseItems {

		timeObj, _ := time.Parse(time.RFC3339Nano, spanSearchAggregatesResponseItems[i].Time)
		spanSearchAggregatesResponseItems[i].Timestamp = int64(timeObj.UnixNano())
		spanSearchAggregatesResponseItems[i].Time = ""
		if queryParams.AggregationOption == "rate_per_sec" {
			spanSearchAggregatesResponseItems[i].Value = float32(spanSearchAggregatesResponseItems[i].Value) / float32(queryParams.StepSeconds)
		}
	}

	return spanSearchAggregatesResponseItems, nil

}

func (r *ClickHouseReader) SetTTL(ctx context.Context, ttlParams *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {

	switch ttlParams.Type {

	case constants.TraceTTL:
		// error is skipped, handled earlier as bad request
		tracesDuration, _ := time.ParseDuration(ttlParams.Duration)
		second := int(tracesDuration.Seconds())
		query := fmt.Sprintf("ALTER TABLE default.%v MODIFY TTL toDateTime(timestamp) + INTERVAL %v SECOND", signozTraceTableName, second)
		_, err := r.db.Exec(query)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while setting ttl. Err=%v", err))
			return nil, &model.ApiError{model.ErrorExec, fmt.Errorf("error while setting ttl. Err=%v", err)}
		}

	case constants.MetricsTTL:
		// error is skipped, handled earlier as bad request
		metricsDuration, _ := time.ParseDuration(ttlParams.Duration)
		second := int(metricsDuration.Seconds())
		query := fmt.Sprintf("ALTER TABLE %v.%v MODIFY TTL toDateTime(toUInt32(timestamp_ms / 1000), 'UTC') + INTERVAL %v SECOND", signozMetricDBName, signozSampleName, second)
		_, err := r.db.Exec(query)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while setting ttl. Err=%v", err))
			return nil, &model.ApiError{model.ErrorExec, fmt.Errorf("error while setting ttl. Err=%v", err)}
		}

	default:
		return nil, &model.ApiError{model.ErrorExec, fmt.Errorf("error while setting ttl. ttl type should be <metrics|traces>, got %v", ttlParams.Type)}
	}

	return &model.SetTTLResponseItem{Message: "ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) GetTTL(ctx context.Context, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError) {

	parseTTL := func(queryResp string) int {
		values := strings.Split(queryResp, " ")
		N := len(values)
		ttlIdx := -1

		for i := 0; i < N; i++ {
			if strings.Contains(values[i], "toIntervalSecond") {
				ttlIdx = i
				break
			}
		}
		if ttlIdx == -1 {
			return ttlIdx
		}

		output := strings.SplitN(values[ttlIdx], "(", 2)
		timePart := strings.Trim(output[1], ")")
		seconds_int, err := strconv.Atoi(timePart)
		if err != nil {
			return -1
		}
		ttl_hrs := seconds_int / 3600
		return ttl_hrs
	}

	getMetricsTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v'", signozSampleName)

		err := r.db.QueryRowx(query).StructScan(&dbResp)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while getting ttl. Err=%v", err))
			return nil, &model.ApiError{model.ErrorExec, fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		return &dbResp, nil
	}

	getTracesTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v'", signozTraceTableName)

		err := r.db.QueryRowx(query).StructScan(&dbResp)

		if err != nil {
			zap.S().Error(fmt.Errorf("error while getting ttl. Err=%v", err))
			return nil, &model.ApiError{model.ErrorExec, fmt.Errorf("error while getting ttl. Err=%v", err)}
		}

		return &dbResp, nil
	}

	switch ttlParams.Type {
	case constants.TraceTTL:
		dbResp, err := getTracesTTL()
		if err != nil {
			return nil, err
		}

		return &model.GetTTLResponseItem{TracesTime: parseTTL(dbResp.EngineFull)}, nil

	case constants.MetricsTTL:
		dbResp, err := getMetricsTTL()
		if err != nil {
			return nil, err
		}

		return &model.GetTTLResponseItem{MetricsTime: parseTTL(dbResp.EngineFull)}, nil
	}
	db1, err := getTracesTTL()
	if err != nil {
		return nil, err
	}

	db2, err := getMetricsTTL()
	if err != nil {
		return nil, err
	}

	return &model.GetTTLResponseItem{TracesTime: parseTTL(db1.EngineFull), MetricsTime: parseTTL(db2.EngineFull)}, nil

}
