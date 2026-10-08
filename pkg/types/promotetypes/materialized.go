package promotetypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	DefaultMaterializedIndexType        = "bloom_filter(0.01)"
	DefaultMaterializedIndexGranularity = 64
)

type IndexMaterializedPathsResult struct {
	Indexed []*PromotePath `json:"indexed" required:"true"`
	Skipped []*PromotePath `json:"skipped" required:"true"`
}

type IndexMaterializedPathsParams struct {
	Signal string `query:"signal" json:"signal" required:"true"`
	DryRun bool   `query:"dryRun" json:"dryRun"`
}

func (p *IndexMaterializedPathsParams) Validate() error {
	if p.Signal == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "signal is required")
	}
	_, err := p.Target()
	return err
}

func (p *IndexMaterializedPathsParams) Target() (Target, error) {
	return NewTargetFromText(p.Signal, telemetrytypes.FieldContextAttribute.StringValue())
}

func NewMaterializedPromotePath(target Target, key *telemetrytypes.TelemetryFieldKey) (*PromotePath, error) {
	path := &PromotePath{
		Signal:  target.Entry.Signal.StringValue(),
		Context: target.Entry.FieldContext.StringValue(),
		Path:    key.Name,
		Promote: false,
		Indexes: []WrappedIndex{{FieldDataType: key.FieldDataType, Type: DefaultMaterializedIndexType, Granularity: DefaultMaterializedIndexGranularity}},
	}
	if err := path.ValidateAndSetDefaults(target); err != nil {
		return nil, err
	}
	return path, nil
}
