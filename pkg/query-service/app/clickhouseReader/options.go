package clickhouseReader

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.uber.org/zap"
)

type Encoding string

const (
	// EncodingJSON is used for spans encoded as JSON.
	EncodingJSON Encoding = "json"
	// EncodingProto is used for spans encoded as Protobuf.
	EncodingProto Encoding = "protobuf"
)

const (
	defaultDatasource              string        = "tcp://localhost:9000"
	defaultTraceDB                 string        = "signoz_traces"
	defaultOperationsTable         string        = "distributed_signoz_operations"
	defaultIndexTable              string        = "distributed_signoz_index_v2"
	defaultErrorTable              string        = "distributed_signoz_error_index_v2"
	defaultDurationTable           string        = "distributed_durationSort"
	defaultUsageExplorerTable      string        = "distributed_usage_explorer"
	defaultSpansTable              string        = "distributed_signoz_spans"
	defaultDependencyGraphTable    string        = "distributed_dependency_graph_minutes_v2"
	defaultTopLevelOperationsTable string        = "distributed_top_level_operations"
	defaultSpanAttributeTable      string        = "distributed_span_attributes"
	defaultSpanAttributeKeysTable  string        = "distributed_span_attributes_keys"
	defaultLogsDB                  string        = "signoz_logs"
	defaultLogsTable               string        = "distributed_logs"
	defaultLogsLocalTable          string        = "logs"
	defaultLogAttributeKeysTable   string        = "distributed_logs_attribute_keys"
	defaultLogResourceKeysTable    string        = "distributed_logs_resource_keys"
	defaultLogTagAttributeTable    string        = "distributed_tag_attributes"
	defaultLiveTailRefreshSeconds  int           = 5
	defaultWriteBatchDelay         time.Duration = 5 * time.Second
	defaultWriteBatchSize          int           = 10000
	defaultEncoding                Encoding      = EncodingJSON

	defaultLogsLocalTableV2         string = "logs_v2"
	defaultLogsTableV2              string = "distributed_logs_v2"
	defaultLogsResourceLocalTableV2 string = "logs_v2_resource"
	defaultLogsResourceTableV2      string = "distributed_logs_v2_resource"
)

// NamespaceConfig is Clickhouse's internal configuration data
type namespaceConfig struct {
	namespace               string
	Enabled                 bool
	Datasource              string
	MaxIdleConns            int
	MaxOpenConns            int
	DialTimeout             time.Duration
	TraceDB                 string
	OperationsTable         string
	IndexTable              string
	DurationTable           string
	UsageExplorerTable      string
	SpansTable              string
	ErrorTable              string
	SpanAttributeTable      string
	SpanAttributeKeysTable  string
	DependencyGraphTable    string
	TopLevelOperationsTable string
	LogsDB                  string
	LogsTable               string
	LogsLocalTable          string
	LogsAttributeKeysTable  string
	LogsResourceKeysTable   string
	LogsTagAttributeTable   string
	LiveTailRefreshSeconds  int
	WriteBatchDelay         time.Duration
	WriteBatchSize          int
	Encoding                Encoding
	Connector               Connector

	LogsLocalTableV2         string
	LogsTableV2              string
	LogsResourceLocalTableV2 string
	LogsResourceTableV2      string
}

// Connecto defines how to connect to the database
type Connector func(cfg *namespaceConfig) (clickhouse.Conn, error)

func defaultConnector(cfg *namespaceConfig) (clickhouse.Conn, error) {
	ctx := context.Background()
	options, err := clickhouse.ParseDSN(cfg.Datasource)
	if err != nil {
		return nil, err
	}

	// Check if the DSN contained any of the following options, if not set from configuration
	if options.MaxIdleConns == 0 {
		options.MaxIdleConns = cfg.MaxIdleConns
	}
	if options.MaxOpenConns == 0 {
		options.MaxOpenConns = cfg.MaxOpenConns
	}
	if options.DialTimeout == 0 {
		options.DialTimeout = cfg.DialTimeout
	}

	zap.L().Info("Connecting to Clickhouse", zap.String("at", options.Addr[0]), zap.Int("MaxIdleConns", options.MaxIdleConns), zap.Int("MaxOpenConns", options.MaxOpenConns), zap.Duration("DialTimeout", options.DialTimeout))
	db, err := clickhouse.Open(options)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(ctx); err != nil {
		return nil, err
	}

	return db, nil
}

// Options store storage plugin related configs
type Options struct {
	primary *namespaceConfig

	others map[string]*namespaceConfig
}

// NewOptions creates a new Options struct.
func NewOptions(
	datasource string,
	maxIdleConns int,
	maxOpenConns int,
	dialTimeout time.Duration,
	primaryNamespace string,
	otherNamespaces ...string,
) *Options {

	if datasource == "" {
		datasource = defaultDatasource
	}

	options := &Options{
		primary: &namespaceConfig{
			namespace:               primaryNamespace,
			Enabled:                 true,
			Datasource:              datasource,
			MaxIdleConns:            maxIdleConns,
			MaxOpenConns:            maxOpenConns,
			DialTimeout:             dialTimeout,
			TraceDB:                 defaultTraceDB,
			OperationsTable:         defaultOperationsTable,
			IndexTable:              defaultIndexTable,
			ErrorTable:              defaultErrorTable,
			DurationTable:           defaultDurationTable,
			UsageExplorerTable:      defaultUsageExplorerTable,
			SpansTable:              defaultSpansTable,
			SpanAttributeTable:      defaultSpanAttributeTable,
			SpanAttributeKeysTable:  defaultSpanAttributeKeysTable,
			DependencyGraphTable:    defaultDependencyGraphTable,
			TopLevelOperationsTable: defaultTopLevelOperationsTable,
			LogsDB:                  defaultLogsDB,
			LogsTable:               defaultLogsTable,
			LogsLocalTable:          defaultLogsLocalTable,
			LogsAttributeKeysTable:  defaultLogAttributeKeysTable,
			LogsResourceKeysTable:   defaultLogResourceKeysTable,
			LogsTagAttributeTable:   defaultLogTagAttributeTable,
			LiveTailRefreshSeconds:  defaultLiveTailRefreshSeconds,
			WriteBatchDelay:         defaultWriteBatchDelay,
			WriteBatchSize:          defaultWriteBatchSize,
			Encoding:                defaultEncoding,
			Connector:               defaultConnector,

			LogsTableV2:              defaultLogsTableV2,
			LogsLocalTableV2:         defaultLogsLocalTableV2,
			LogsResourceTableV2:      defaultLogsResourceTableV2,
			LogsResourceLocalTableV2: defaultLogsResourceLocalTableV2,
		},
		others: make(map[string]*namespaceConfig, len(otherNamespaces)),
	}

	for _, namespace := range otherNamespaces {
		if namespace == archiveNamespace {
			options.others[namespace] = &namespaceConfig{
				namespace:              namespace,
				Datasource:             datasource,
				TraceDB:                "",
				OperationsTable:        "",
				IndexTable:             "",
				ErrorTable:             "",
				LogsDB:                 "",
				LogsTable:              "",
				LogsLocalTable:         "",
				LogsAttributeKeysTable: "",
				LogsResourceKeysTable:  "",
				LiveTailRefreshSeconds: defaultLiveTailRefreshSeconds,
				WriteBatchDelay:        defaultWriteBatchDelay,
				WriteBatchSize:         defaultWriteBatchSize,
				Encoding:               defaultEncoding,
				Connector:              defaultConnector,
			}
		} else {
			options.others[namespace] = &namespaceConfig{namespace: namespace}
		}
	}

	return options
}

// GetPrimary returns the primary namespace configuration
func (opt *Options) getPrimary() *namespaceConfig {
	return opt.primary
}
