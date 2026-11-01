package annotationtypes

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var deploymentIdentityKeys = []string{"service.name", "deployment.environment", "deployment.environment.name", "service.version"}

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

// DeploymentRow is the storage shape one marker row is scanned into; FirstSeen is epoch ms.
type DeploymentRow struct {
	Signal      telemetrytypes.Signal
	Service     string
	Environment string
	Version     string
	FirstSeen   int64
	TraceID     string
	SpanID      string
	LogID       string
	Labels      string
}

func NewDeploymentSpecFromRow(row DeploymentRow) (DeploymentSpec, error) {
	resourceAttributes := map[string]string{}
	if row.Labels != "" {
		if err := json.Unmarshal([]byte(row.Labels), &resourceAttributes); err != nil {
			return DeploymentSpec{}, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse resource labels for %s/%s/%s", row.Service, row.Environment, row.Version)
		}
	}
	for _, key := range deploymentIdentityKeys {
		delete(resourceAttributes, key)
	}

	return DeploymentSpec{
		ID:                 NewDeploymentID(row.Service, row.Environment, row.Version),
		Signal:             row.Signal,
		Service:            row.Service,
		Environment:        row.Environment,
		Version:            row.Version,
		FirstSeen:          row.FirstSeen,
		TraceID:            row.TraceID,
		SpanID:             row.SpanID,
		LogID:              row.LogID,
		ResourceAttributes: resourceAttributes,
	}, nil
}

func NewDeploymentSpecsFromRows(rows []DeploymentRow) ([]DeploymentSpec, error) {
	specs := make([]DeploymentSpec, 0, len(rows))
	for _, row := range rows {
		spec, err := NewDeploymentSpecFromRow(row)
		if err != nil {
			return nil, err
		}
		specs = append(specs, spec)
	}
	return specs, nil
}

func NewDeploymentID(service, environment, version string) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{service, environment, version}, "\x00")))
	return "dep_" + hex.EncodeToString(sum[:4])
}

// MergeDeployments keeps the earliest FirstSeen per (service, environment, version); on a tie the first input wins.
func MergeDeployments(specs ...[]DeploymentSpec) []DeploymentSpec {
	byTuple := map[string]DeploymentSpec{}
	for _, list := range specs {
		for _, spec := range list {
			key := strings.Join([]string{spec.Service, spec.Environment, spec.Version}, "\x00")
			existing, ok := byTuple[key]
			if !ok || spec.FirstSeen < existing.FirstSeen {
				byTuple[key] = spec
			}
		}
	}

	merged := make([]DeploymentSpec, 0, len(byTuple))
	for _, spec := range byTuple {
		merged = append(merged, spec)
	}
	sort.Slice(merged, func(i, j int) bool {
		if merged[i].FirstSeen != merged[j].FirstSeen {
			return merged[i].FirstSeen < merged[j].FirstSeen
		}
		if merged[i].Service != merged[j].Service {
			return merged[i].Service < merged[j].Service
		}
		if merged[i].Environment != merged[j].Environment {
			return merged[i].Environment < merged[j].Environment
		}
		return merged[i].Version < merged[j].Version
	})
	return merged
}

// EarliestHistoryEdge returns the smallest non-zero edge, 0 when no signal has history.
func EarliestHistoryEdge(edges ...int64) int64 {
	var earliest int64
	for _, edge := range edges {
		if edge != 0 && (earliest == 0 || edge < earliest) {
			earliest = edge
		}
	}
	return earliest
}

func NewAnnotationsFromDeployments(specs []DeploymentSpec, total int, historyAvailableFrom int64) *Annotations {
	records := make([]Annotation, 0, len(specs))
	for _, spec := range specs {
		records = append(records, Annotation{Kind: AnnotationKindDeployment, Spec: spec})
	}
	return &Annotations{Records: records, Total: total, HistoryAvailableFrom: historyAvailableFrom}
}

func ApplyLimit(specs []DeploymentSpec, limit int) ([]DeploymentSpec, int) {
	if limit >= len(specs) {
		return specs, len(specs)
	}
	return specs[:limit], len(specs)
}
