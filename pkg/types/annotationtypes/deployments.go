package annotationtypes

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

type DeploymentSpec struct {
	ID                 string                `json:"id" required:"true"`
	Signal             telemetrytypes.Signal `json:"signal" required:"true"`
	Service            string                `json:"service" required:"true"`
	Environment        string                `json:"environment" required:"true"`
	Version            string                `json:"version" required:"true"`
	FirstSeen          int64                 `json:"firstSeen" required:"true"`
	TraceID            string                `json:"traceId" required:"true"`
	SpanID             string                `json:"spanId" required:"true"`
	LogID              string                `json:"logId" required:"true"`
	ResourceAttributes map[string]string     `json:"resourceAttributes" required:"true"`
}
