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
	defaultOperationsTable         string        = "signoz_operations"
	defaultIndexTable              string        = "signoz_index_v2"
	defaultErrorTable              string        = "signoz_error_index_v2"
	defaultDurationTable           string        = "durationSortMV"
	defaultSpansTable              string        = "signoz_spans"
	defaultDependencyGraphTable    string        = "dependency_graph_minutes"
	defaultTopLevelOperationsTable string        = "top_level_operations"
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
	SpansTable              string
	ErrorTable              string
	DependencyGraphTable    string
	TopLevelOperationsTable string
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
			SpansTable:              defaultSpansTable,
			DependencyGraphTable:    defaultDependencyGraphTable,
			TopLevelOperationsTable: defaultTopLevelOperationsTable,
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
				namespace:       namespace,
				Datasource:      datasource,
				TraceDB:         "",
				OperationsTable: "",
				IndexTable:      "",
				ErrorTable:      "",
				WriteBatchDelay: defaultWriteBatchDelay,
				WriteBatchSize:  defaultWriteBatchSize,
				Encoding:        defaultEncoding,
				Connector:       defaultConnector,
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
