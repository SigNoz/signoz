package clickhouseReader

import (
	"context"
	"net/url"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
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
	defaultDependencyGraphTable    string        = "distributed_dependency_graph_minutes"
	defaultTopLevelOperationsTable string        = "distributed_top_level_operations"
	defaultLogsDB                  string        = "signoz_logs"
	defaultLogsTable               string        = "distributed_logs"
	defaultLogsLocalTable          string        = "logs"
	defaultLogAttributeKeysTable   string        = "distributed_logs_atrribute_keys"
	defaultLogResourceKeysTable    string        = "distributed_logs_resource_keys"
	defaultLiveTailRefreshSeconds  int           = 10
	defaultWriteBatchDelay         time.Duration = 5 * time.Second
	defaultWriteBatchSize          int           = 10000
	defaultEncoding                Encoding      = EncodingJSON
)

const (
	suffixEnabled         = ".enabled"
	suffixDatasource      = ".datasource"
	suffixOperationsTable = ".operations-table"
	suffixIndexTable      = ".index-table"
	suffixSpansTable      = ".spans-table"
	suffixWriteBatchDelay = ".write-batch-delay"
	suffixWriteBatchSize  = ".write-batch-size"
	suffixEncoding        = ".encoding"
)

// NamespaceConfig is Clickhouse's internal configuration data
type namespaceConfig struct {
	namespace               string
	Enabled                 bool
	Datasource              string
	TraceDB                 string
	OperationsTable         string
	IndexTable              string
	DurationTable           string
	UsageExplorerTable      string
	SpansTable              string
	ErrorTable              string
	DependencyGraphTable    string
	TopLevelOperationsTable string
	LogsDB                  string
	LogsTable               string
	LogsLocalTable          string
	LogsAttributeKeysTable  string
	LogsResourceKeysTable   string
	LiveTailRefreshSeconds  int
	WriteBatchDelay         time.Duration
	WriteBatchSize          int
	Encoding                Encoding
	Connector               Connector
}

// Connecto defines how to connect to the database
type Connector func(cfg *namespaceConfig) (clickhouse.Conn, error)

func defaultConnector(cfg *namespaceConfig) (clickhouse.Conn, error) {
	ctx := context.Background()
	dsnURL, err := url.Parse(cfg.Datasource)
	options := &clickhouse.Options{
		Addr: []string{dsnURL.Host},
	}
	if dsnURL.Query().Get("username") != "" {
		auth := clickhouse.Auth{
			Username: dsnURL.Query().Get("username"),
			Password: dsnURL.Query().Get("password"),
		}
		options.Auth = auth
	}
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
func NewOptions(datasource string, primaryNamespace string, otherNamespaces ...string) *Options {

	if datasource == "" {
		datasource = defaultDatasource
	}

	options := &Options{
		primary: &namespaceConfig{
			namespace:               primaryNamespace,
			Enabled:                 true,
			Datasource:              datasource,
			TraceDB:                 defaultTraceDB,
			OperationsTable:         defaultOperationsTable,
			IndexTable:              defaultIndexTable,
			ErrorTable:              defaultErrorTable,
			DurationTable:           defaultDurationTable,
			UsageExplorerTable:      defaultUsageExplorerTable,
			SpansTable:              defaultSpansTable,
			DependencyGraphTable:    defaultDependencyGraphTable,
			TopLevelOperationsTable: defaultTopLevelOperationsTable,
			LogsDB:                  defaultLogsDB,
			LogsTable:               defaultLogsTable,
			LogsLocalTable:          defaultLogsLocalTable,
			LogsAttributeKeysTable:  defaultLogAttributeKeysTable,
			LogsResourceKeysTable:   defaultLogResourceKeysTable,
			LiveTailRefreshSeconds:  defaultLiveTailRefreshSeconds,
			WriteBatchDelay:         defaultWriteBatchDelay,
			WriteBatchSize:          defaultWriteBatchSize,
			Encoding:                defaultEncoding,
			Connector:               defaultConnector,
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
