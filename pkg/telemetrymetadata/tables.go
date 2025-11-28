package telemetrymetadata

import otelcollectorconst "github.com/SigNoz/signoz-otel-collector/constants"

const (
	DBName                           = "signoz_metadata"
	AttributesMetadataTableName      = "distributed_attributes_metadata"
	AttributesMetadataLocalTableName = "attributes_metadata"
	PathTypesTableName               = otelcollectorconst.DistributedPathTypesTable
	PromotedPathsTableName           = otelcollectorconst.DistributedPromotedPathsTable
	SkipIndexTableName               = "system.data_skipping_indices"
)
