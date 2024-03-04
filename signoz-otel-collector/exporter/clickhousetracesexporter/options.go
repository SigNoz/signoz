// Copyright  The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package clickhousetracesexporter

import (
	"context"
	"flag"
	"fmt"
	"net/url"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"github.com/spf13/viper"
)

const (
	defaultDatasource               string   = "tcp://127.0.0.1:9000/?database=signoz_traces"
	DefaultTraceDatabase            string   = "signoz_traces"
	defaultMigrations               string   = "/migrations"
	defaultOperationsTable          string   = "distributed_signoz_operations"
	DefaultIndexTable               string   = "distributed_signoz_index_v2"
	LocalIndexTable                 string   = "signoz_index_v2"
	defaultErrorTable               string   = "distributed_signoz_error_index_v2"
	defaultSpansTable               string   = "distributed_signoz_spans"
	defaultAttributeTable           string   = "distributed_span_attributes"
	defaultAttributeKeyTable        string   = "distributed_span_attributes_keys"
	DefaultDurationSortTable        string   = "durationSort"
	DefaultDurationSortMVTable      string   = "durationSortMV"
	defaultArchiveSpansTable        string   = "signoz_archive_spans"
	defaultClusterName              string   = "cluster"
	defaultDependencyGraphTable     string   = "dependency_graph_minutes"
	defaultDependencyGraphServiceMV string   = "dependency_graph_minutes_service_calls_mv"
	defaultDependencyGraphDbMV      string   = "dependency_graph_minutes_db_calls_mv"
	DependencyGraphMessagingMV      string   = "dependency_graph_minutes_messaging_calls_mv"
	defaultEncoding                 Encoding = EncodingJSON
)

const (
	suffixEnabled         = ".enabled"
	suffixDatasource      = ".datasource"
	suffixTraceDatabase   = ".trace-database"
	suffixMigrations      = ".migrations"
	suffixOperationsTable = ".operations-table"
	suffixIndexTable      = ".index-table"
	suffixSpansTable      = ".spans-table"
	suffixEncoding        = ".encoding"
)

// NamespaceConfig is Clickhouse's internal configuration data
type namespaceConfig struct {
	namespace                  string
	Enabled                    bool
	Datasource                 string
	Migrations                 string
	TraceDatabase              string
	OperationsTable            string
	IndexTable                 string
	LocalIndexTable            string
	SpansTable                 string
	ErrorTable                 string
	AttributeTable             string
	AttributeKeyTable          string
	Cluster                    string
	DurationSortTable          string
	DurationSortMVTable        string
	DependencyGraphServiceMV   string
	DependencyGraphDbMV        string
	DependencyGraphMessagingMV string
	DependencyGraphTable       string
	DockerMultiNodeCluster     bool
	NumConsumers               int
	Encoding                   Encoding
	Connector                  Connector
	ExporterId                 uuid.UUID
}

// Connecto defines how to connect to the database
type Connector func(cfg *namespaceConfig) (clickhouse.Conn, error)

func defaultConnector(cfg *namespaceConfig) (clickhouse.Conn, error) {
	ctx := context.Background()
	// setting maxOpenIdleConnections = numConsumers + 1 to avoid `prepareBatch:clickhouse: acquire conn timeout`
	// error when using multiple consumers along with usage exporter
	maxOpenIdleConnections := cfg.NumConsumers + 1
	dsnURL, err := url.Parse(cfg.Datasource)
	options := &clickhouse.Options{
		Addr:         []string{dsnURL.Host},
		MaxOpenConns: maxOpenIdleConnections + 5,
		MaxIdleConns: maxOpenIdleConnections,
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

	query := fmt.Sprintf(`CREATE DATABASE IF NOT EXISTS %s ON CLUSTER %s`, dsnURL.Query().Get("database"), cfg.Cluster)
	if err := db.Exec(ctx, query); err != nil {
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
func NewOptions(exporterId uuid.UUID, migrations string, datasource string, dockerMultiNodeCluster bool, numConsumers int, primaryNamespace string, otherNamespaces ...string) *Options {

	if datasource == "" {
		datasource = defaultDatasource
	}
	if migrations == "" {
		migrations = defaultMigrations
	}

	options := &Options{
		primary: &namespaceConfig{
			namespace:                  primaryNamespace,
			Enabled:                    true,
			Datasource:                 datasource,
			Migrations:                 migrations,
			TraceDatabase:              DefaultTraceDatabase,
			OperationsTable:            defaultOperationsTable,
			IndexTable:                 DefaultIndexTable,
			LocalIndexTable:            LocalIndexTable,
			ErrorTable:                 defaultErrorTable,
			SpansTable:                 defaultSpansTable,
			AttributeTable:             defaultAttributeTable,
			AttributeKeyTable:          defaultAttributeKeyTable,
			DurationSortTable:          DefaultDurationSortTable,
			DurationSortMVTable:        DefaultDurationSortMVTable,
			Cluster:                    defaultClusterName,
			DependencyGraphTable:       defaultDependencyGraphTable,
			DependencyGraphServiceMV:   defaultDependencyGraphServiceMV,
			DependencyGraphDbMV:        defaultDependencyGraphDbMV,
			DependencyGraphMessagingMV: DependencyGraphMessagingMV,
			DockerMultiNodeCluster:     dockerMultiNodeCluster,
			NumConsumers:               numConsumers,
			Encoding:                   defaultEncoding,
			Connector:                  defaultConnector,
			ExporterId:                 exporterId,
		},
		others: make(map[string]*namespaceConfig, len(otherNamespaces)),
	}

	for _, namespace := range otherNamespaces {
		if namespace == archiveNamespace {
			options.others[namespace] = &namespaceConfig{
				namespace:       namespace,
				Datasource:      datasource,
				Migrations:      migrations,
				OperationsTable: "",
				IndexTable:      "",
				SpansTable:      defaultArchiveSpansTable,
				Encoding:        defaultEncoding,
				Connector:       defaultConnector,
				ExporterId:      exporterId,
			}
		} else {
			options.others[namespace] = &namespaceConfig{namespace: namespace}
		}
	}

	return options
}

// AddFlags adds flags for Options
func (opt *Options) AddFlags(flagSet *flag.FlagSet) {
	addFlags(flagSet, opt.primary)
	for _, cfg := range opt.others {
		addFlags(flagSet, cfg)
	}
}

func addFlags(flagSet *flag.FlagSet, nsConfig *namespaceConfig) {
	if nsConfig.namespace == archiveNamespace {
		flagSet.Bool(
			nsConfig.namespace+suffixEnabled,
			nsConfig.Enabled,
			"Enable archive storage")
	}

	flagSet.String(
		nsConfig.namespace+suffixDatasource,
		nsConfig.Datasource,
		"Clickhouse datasource string.",
	)

	if nsConfig.namespace != archiveNamespace {
		flagSet.String(
			nsConfig.namespace+suffixOperationsTable,
			nsConfig.OperationsTable,
			"Clickhouse operations table name.",
		)

		flagSet.String(
			nsConfig.namespace+suffixIndexTable,
			nsConfig.IndexTable,
			"Clickhouse index table name.",
		)
	}

	flagSet.String(
		nsConfig.namespace+suffixSpansTable,
		nsConfig.SpansTable,
		"Clickhouse spans table name.",
	)

	flagSet.String(
		nsConfig.namespace+suffixEncoding,
		string(nsConfig.Encoding),
		"Encoding to store spans (json allows out of band queries, protobuf is more compact)",
	)
}

// InitFromViper initializes Options with properties from viper
func (opt *Options) InitFromViper(v *viper.Viper) {
	initFromViper(opt.primary, v)
	for _, cfg := range opt.others {
		initFromViper(cfg, v)
	}
}

func initFromViper(cfg *namespaceConfig, v *viper.Viper) {
	cfg.Enabled = v.GetBool(cfg.namespace + suffixEnabled)
	cfg.Datasource = v.GetString(cfg.namespace + suffixDatasource)
	cfg.TraceDatabase = v.GetString(cfg.namespace + suffixTraceDatabase)
	cfg.IndexTable = v.GetString(cfg.namespace + suffixIndexTable)
	cfg.SpansTable = v.GetString(cfg.namespace + suffixSpansTable)
	cfg.OperationsTable = v.GetString(cfg.namespace + suffixOperationsTable)
	cfg.Encoding = Encoding(v.GetString(cfg.namespace + suffixEncoding))
}

// getPrimary returns the primary namespace configuration
func (opt *Options) getPrimary() *namespaceConfig {
	return opt.primary
}
