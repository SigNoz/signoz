package agentconfig

type ElementTypeDef string

const (
	ElementTypeRules        ElementTypeDef = "ingestion_rules"
	ElementTypeLogPipelines ElementTypeDef = "log_pipelines"
)

type DeployStatus string

const (
	PendingDeploy DeployStatus = "DIRTY"
	Deploying     DeployStatus = "DEPLOYING"
	Deployed      DeployStatus = "DEPLOYED"
	DeployFailed  DeployStatus = "FAILED"
)

type ConfigVersion struct {
	ID          string
	Version     float32
	ElementType ElementTypeDef
	CreatedBy   string

	Active  bool
	IsValid bool

	DeployStatus DeployStatus
	DeployResult string
}

type ConfigElements struct {
	VersionID   string
	Version     float32
	ElementType ElementTypeDef
	ElementId   string
}
