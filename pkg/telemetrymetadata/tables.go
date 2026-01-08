package telemetrymetadata

import otelcollectorconst "github.com/SigNoz/signoz-otel-collector/constants"

const (
	DBName                           = "signoz_metadata"
	AttributesMetadataTableName      = "distributed_attributes_metadata"
	AttributesMetadataLocalTableName = "attributes_metadata"
	ColumnEvolutionMetadataTableName = "distributed_column_evolution_metadata"
	PathTypesTableName               = otelcollectorconst.DistributedPathTypesTable
	PromotedPathsTableName           = otelcollectorconst.DistributedPromotedPathsTable
	SkipIndexTableName               = "system.data_skipping_indices"
)
