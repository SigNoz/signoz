package implannotations

import (
	"context"
	"log/slog"
	"slices"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/modules/annotations"
	"github.com/SigNoz/signoz/pkg/statementbuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/sync/errgroup"
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

	var (
		tracesSpecs, logsSpecs             []annotationtypes.DeploymentSpec
		tracesHistoryEdge, logsHistoryEdge int64
	)
	signals := resolveSignals(req)
	errGroup, gCtx := errgroup.WithContext(ctx)

	if slices.Contains(signals, telemetrytypes.SignalTraces) {
		errGroup.Go(func() error {
			rows, edge, err := m.queryTracesDeployments(gCtx, orgID, req)
			if err != nil {
				return err
			}
			tracesSpecs, err = annotationtypes.NewDeploymentSpecsFromRows(rows)
			if err != nil {
				return err
			}
			tracesHistoryEdge = edge
			return nil
		})
	}

	if slices.Contains(signals, telemetrytypes.SignalLogs) {
		errGroup.Go(func() error {
			rows, edge, err := m.queryLogsDeployments(gCtx, orgID, req)
			if err != nil {
				return err
			}
			logsSpecs, err = annotationtypes.NewDeploymentSpecsFromRows(rows)
			if err != nil {
				return err
			}
			logsHistoryEdge = edge
			return nil
		})
	}

	if err := errGroup.Wait(); err != nil {
		return nil, err
	}

	page, total := annotationtypes.ApplyLimit(annotationtypes.MergeDeployments(tracesSpecs, logsSpecs), req.Limit)
	return annotationtypes.NewAnnotationsFromDeployments(page, total, annotationtypes.EarliestHistoryEdge(tracesHistoryEdge, logsHistoryEdge)), nil
}

func (m *module) withAnnotationsContext(ctx context.Context, signal telemetrytypes.Signal, functionName string) context.Context {
	comments := map[string]string{
		instrumentationtypes.TelemetrySignal:  signal.StringValue(),
		instrumentationtypes.CodeNamespace:    "annotations",
		instrumentationtypes.CodeFunctionName: functionName,
	}
	return ctxtypes.NewContextWithCommentVals(ctx, comments)
}
