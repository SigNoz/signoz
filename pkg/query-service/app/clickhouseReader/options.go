package clickhouseReader

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type Encoding string

const (
	// EncodingJSON is used for spans encoded as JSON.
	EncodingJSON Encoding = "json"
	// EncodingProto is used for spans encoded as Protobuf.
	EncodingProto Encoding = "protobuf"
)

const (
	defaultDatasource        string        = "tcp://localhost:9000"
	defaultOperationsTable   string        = "signoz_operations"
	defaultIndexTable        string        = "signoz_index"
	defaultSpansTable        string        = "signoz_spans"
	defaultErrorTable        string        = "signoz_error_index"
	defaultArchiveSpansTable string        = "signoz_archive_spans"
	defaultWriteBatchDelay   time.Duration = 5 * time.Second
	defaultWriteBatchSize    int           = 10000
	defaultEncoding          Encoding      = EncodingJSON
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
	namespace       string
	Enabled         bool
	Datasource      string
	OperationsTable string
	IndexTable      string
	SpansTable      string
	ErrorTable      string
	WriteBatchDelay time.Duration
	WriteBatchSize  int
	Encoding        Encoding
	Connector       Connector
}

// Connecto defines how to connect to the database
type Connector func(cfg *namespaceConfig) (*sqlx.DB, error)

func defaultConnector(cfg *namespaceConfig) (*sqlx.DB, error) {
	db, err := sqlx.Open("clickhouse", cfg.Datasource)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
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
			namespace:       primaryNamespace,
			Enabled:         true,
			Datasource:      datasource,
			OperationsTable: defaultOperationsTable,
			IndexTable:      defaultIndexTable,
			SpansTable:      defaultSpansTable,
			ErrorTable:      defaultErrorTable,
			WriteBatchDelay: defaultWriteBatchDelay,
			WriteBatchSize:  defaultWriteBatchSize,
			Encoding:        defaultEncoding,
			Connector:       defaultConnector,
		},
		others: make(map[string]*namespaceConfig, len(otherNamespaces)),
	}

	for _, namespace := range otherNamespaces {
		if namespace == archiveNamespace {
			options.others[namespace] = &namespaceConfig{
				namespace:       namespace,
				Datasource:      datasource,
				OperationsTable: "",
				IndexTable:      "",
				SpansTable:      defaultArchiveSpansTable,
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
