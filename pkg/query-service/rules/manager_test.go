package rules

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"go.signoz.io/query-service/app/clickhouseReader"
	am "go.signoz.io/query-service/integrations/alertManager"
	"go.signoz.io/query-service/model"
	pqle "go.signoz.io/query-service/pqlEngine"
	"go.signoz.io/query-service/utils/value"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"net/url"
	"testing"
	"time"
)

func initZapLog() *zap.Logger {
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, _ := config.Build()
	return logger
}

func TestRules(t *testing.T) {
	fmt.Println("starting test TestRules..")
	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()

	configFile := "../config/prometheus.yml"
	// create engine
	pqle, err := pqle.FromConfigPath(configFile)
	if err != nil {
		fmt.Println("failed to create pql:", err)
		t.Errorf("failed to create pql engine : %v", err)
	}

	// create db conn
	db, err := sqlx.Open("sqlite3", "../signoz.db")
	if err != nil {
		fmt.Println("failed to create db conn:", err)
		t.Errorf("failed to create db conn: %v", err)
	}

	// create ch reader
	ch := clickhouseReader.NewReader(db, configFile)

	// notifier opts
	notifierOpts := am.NotifierOptions{
		QueueCapacity:    10000,
		Timeout:          1 * time.Second,
		AlertManagerURLs: []string{"http://localhost:9093/api/"},
	}

	externalURL, _ := url.Parse("http://signoz.io")

	// create manager opts
	managerOpts := &ManagerOptions{
		NotifierOpts: notifierOpts,
		Queriers: &Queriers{
			PqlEngine: pqle,
			Ch:        ch,
		},
		ExternalURL: externalURL,
		Conn:        db,
		Context:     context.Background(),
		Logger:      nil,
	}

	// create Manager
	manager, err := NewManager(managerOpts)
	if err != nil {
		fmt.Println("manager error:", err)
		t.Errorf("manager error: %v", err)
	}
	fmt.Println("manager is ready:", manager)

	manager.run()

	// test rules
	// create promql rule
	/* promql rule
	postableRule := PostableRule{
		Alert:      "test alert 1 - promql",
		RuleType:   RuleTypeProm,
		EvalWindow: 5 * time.Minute,
		Frequency:  30 * time.Second,
		RuleCondition: RuleCondition{
			CompositeMetricQuery: &model.CompositeMetricQuery{
				QueryType: model.PROM,
				PromQueries: map[string]*model.PromQuery{
					"A": &model.PromQuery{Query: `sum(signoz_latency_count{span_kind="SPAN_KIND_SERVER"}) by (service_name) > 100`},
				},
			},
		},
		Labels:      map[string]string{},
		Annotations: map[string]string{},
	}*/
	// create builder rule
	metricQuery := &model.MetricQuery{
		QueryName:  "A",
		MetricName: "signoz_latency_count",
		TagFilters: &model.FilterSet{Operation: "AND", Items: []model.FilterItem{
			{Key: "span_kind", Value: "SPAN_KIND_SERVER", Operation: "neq"},
		}},
		GroupingTags:      []string{"service_name"},
		AggregateOperator: model.RATE_SUM,
		Expression:        "A",
	}

	postableRule := PostableRule{
		Alert:      "test alert 2 - builder",
		RuleType:   RuleTypeThreshold,
		EvalWindow: 5 * time.Minute,
		Frequency:  30 * time.Second,
		RuleCondition: RuleCondition{
			Target:    value.Float64(500),
			CompareOp: TargetIsMore,
			CompositeMetricQuery: &model.CompositeMetricQuery{
				QueryType: model.QUERY_BUILDER,
				BuilderQueries: map[string]*model.MetricQuery{
					"A": metricQuery,
				},
			},
		},
		Labels:      map[string]string{"host": "server1"},
		Annotations: map[string]string{},
	}
	err = manager.addTask(&postableRule, postableRule.Alert)
	if err != nil {
		fmt.Println("failed to add rule: ", err)
		t.Errorf("failed to add rule")
	}

	signalsChannel := make(chan os.Signal, 1)
	signal.Notify(signalsChannel, os.Interrupt, syscall.SIGTERM)

	for {
		select {
		case <-signalsChannel:
			logger.Fatal("Received OS Interrupt Signal ... ")
		}
	}
}
