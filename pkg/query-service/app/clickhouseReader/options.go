package clickhouseReader

import (
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
	defaultTraceDB                 string        = "signoz_traces"
	defaultOperationsTable         string        = "distributed_signoz_operations"
	defaultIndexTable              string        = "distributed_signoz_index_v2"
	defaultLocalIndexTable         string        = "signoz_index_v2"
	defaultErrorTable              string        = "distributed_signoz_error_index_v2"
	defaultDurationTable           string        = "distributed_durationSort"
	defaultUsageExplorerTable      string        = "distributed_usage_explorer"
	defaultSpansTable              string        = "distributed_signoz_spans"
	defaultDependencyGraphTable    string        = "distributed_dependency_graph_minutes_v2"
	defaultTopLevelOperationsTable string        = "distributed_top_level_operations"
	defaultSpanAttributeTableV2    string        = "distributed_tag_attributes_v2"
	defaultSpanAttributeKeysTable  string        = "distributed_span_attributes_keys"
	defaultLogsDB                  string        = "signoz_logs"
	defaultLogsTable               string        = "distributed_logs"
	defaultLogsLocalTable          string        = "logs"
	defaultLogAttributeKeysTable   string        = "distributed_logs_attribute_keys"
	defaultLogResourceKeysTable    string        = "distributed_logs_resource_keys"
	defaultLogTagAttributeTableV2  string        = "distributed_tag_attributes_v2"
	defaultLiveTailRefreshSeconds  int           = 5
	defaultWriteBatchDelay         time.Duration = 5 * time.Second
	defaultWriteBatchSize          int           = 10000
	defaultEncoding                Encoding      = EncodingJSON

	defaultLogsLocalTableV2         string = "logs_v2"
	defaultLogsTableV2              string = "distributed_logs_v2"
	defaultLogsResourceLocalTableV2 string = "logs_v2_resource"
	defaultLogsResourceTableV2      string = "distributed_logs_v2_resource"

	defaultTraceIndexTableV3    string = "distributed_signoz_index_v3"
	defaultTraceLocalTableName  string = "signoz_index_v3"
	defaultTraceResourceTableV3 string = "distributed_traces_v3_resource"
	defaultTraceSummaryTable    string = "distributed_trace_summary"
)

// NamespaceConfig is Clickhouse's internal configuration data
type namespaceConfig struct {
	namespace               string
	Enabled                 bool
	Datasource              string
	TraceDB                 string
	OperationsTable         string
	IndexTable              string
	LocalIndexTable         string
	DurationTable           string
	UsageExplorerTable      string
	SpansTable              string
	ErrorTable              string
	SpanAttributeTableV2    string
	SpanAttributeKeysTable  string
	DependencyGraphTable    string
	TopLevelOperationsTable string
	LogsDB                  string
	LogsTable               string
	LogsLocalTable          string
	LogsAttributeKeysTable  string
	LogsResourceKeysTable   string
	LogsTagAttributeTableV2 string
	LiveTailRefreshSeconds  int
	WriteBatchDelay         time.Duration
	WriteBatchSize          int
	Encoding                Encoding
	Connector               Connector

	LogsLocalTableV2         string
	LogsTableV2              string
	LogsResourceLocalTableV2 string
	LogsResourceTableV2      string

	TraceIndexTableV3     string
	TraceLocalTableNameV3 string
	TraceResourceTableV3  string
	TraceSummaryTable     string
}

// Connecto defines how to connect to the database
type Connector func(cfg *namespaceConfig) (clickhouse.Conn, error)

// Options store storage plugin related configs
type Options struct {
	primary *namespaceConfig

	others map[string]*namespaceConfig
}

// NewOptions creates a new Options struct.
func NewOptions(
	primaryNamespace string,
	otherNamespaces ...string,
) *Options {
	options := &Options{
		primary: &namespaceConfig{
			namespace:               primaryNamespace,
			Enabled:                 true,
			TraceDB:                 defaultTraceDB,
			OperationsTable:         defaultOperationsTable,
			IndexTable:              defaultIndexTable,
			LocalIndexTable:         defaultLocalIndexTable,
			ErrorTable:              defaultErrorTable,
			DurationTable:           defaultDurationTable,
			UsageExplorerTable:      defaultUsageExplorerTable,
			SpansTable:              defaultSpansTable,
			SpanAttributeTableV2:    defaultSpanAttributeTableV2,
			SpanAttributeKeysTable:  defaultSpanAttributeKeysTable,
			DependencyGraphTable:    defaultDependencyGraphTable,
			TopLevelOperationsTable: defaultTopLevelOperationsTable,
			LogsDB:                  defaultLogsDB,
			LogsTable:               defaultLogsTable,
			LogsLocalTable:          defaultLogsLocalTable,
			LogsAttributeKeysTable:  defaultLogAttributeKeysTable,
			LogsResourceKeysTable:   defaultLogResourceKeysTable,
			LogsTagAttributeTableV2: defaultLogTagAttributeTableV2,
			LiveTailRefreshSeconds:  defaultLiveTailRefreshSeconds,
			WriteBatchDelay:         defaultWriteBatchDelay,
			WriteBatchSize:          defaultWriteBatchSize,
			Encoding:                defaultEncoding,

			LogsTableV2:              defaultLogsTableV2,
			LogsLocalTableV2:         defaultLogsLocalTableV2,
			LogsResourceTableV2:      defaultLogsResourceTableV2,
			LogsResourceLocalTableV2: defaultLogsResourceLocalTableV2,

			TraceIndexTableV3:     defaultTraceIndexTableV3,
			TraceLocalTableNameV3: defaultTraceLocalTableName,
			TraceResourceTableV3:  defaultTraceResourceTableV3,
			TraceSummaryTable:     defaultTraceSummaryTable,
		},
		others: make(map[string]*namespaceConfig, len(otherNamespaces)),
	}

	for _, namespace := range otherNamespaces {
		if namespace == archiveNamespace {
			options.others[namespace] = &namespaceConfig{
				namespace:              namespace,
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
