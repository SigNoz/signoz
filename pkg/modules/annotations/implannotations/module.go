package implannotations

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/annotations"
	"github.com/SigNoz/signoz/pkg/statementbuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	storage                qbtypes.Storage
	fl                     flagger.Flagger
	logger                 *slog.Logger
}

func NewModule(
	telemetryStore telemetrystore.TelemetryStore,
	telemetryMetadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
	providerSettings factory.ProviderSettings,
) annotations.Module {
	return &module{
		telemetryStore:         telemetryStore,
		telemetryMetadataStore: telemetryMetadataStore,
		storage:                resourcefilter.NewStorage(),
		fl:                     fl,
		logger:                 providerSettings.Logger,
	}
}

func (m *module) ListAnnotations(ctx context.Context, orgID valuer.UUID, req *annotationtypes.PostableAnnotations) (*annotationtypes.Annotations, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	return &annotationtypes.Annotations{
		Records:              []annotationtypes.Annotation{},
		Total:                0,
		HistoryAvailableFrom: 0,
	}, nil
}
