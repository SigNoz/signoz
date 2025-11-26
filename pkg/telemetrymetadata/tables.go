package telemetrymetadata

import "github.com/SigNoz/signoz-otel-collector/constants"

const (
	DBName                           = "signoz_metadata"
	AttributesMetadataTableName      = "distributed_attributes_metadata"
	AttributesMetadataLocalTableName = "attributes_metadata"
	PathTypesTableName               = constants.DistributedPathTypesTable
	PromotedPathsTableName           = constants.DistributedPromotedPathsTable
	SkipIndexTableName               = "system.data_skipping_indices"
)
