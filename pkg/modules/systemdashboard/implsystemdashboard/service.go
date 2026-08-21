package implsystemdashboard

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/systemdashboard"
)

const reconcileRetryInterval = 30 * time.Second

type service struct {
	settings  factory.ScopedProviderSettings
	module    systemdashboard.Module
	orgGetter organization.Getter
	stopC     chan struct{}
	healthyC  chan struct{}
}

// NewService reconciles every org's system dashboards once at startup. Orgs
// created later are reconciled by the organization setter instead.
func NewService(providerSettings factory.ProviderSettings, module systemdashboard.Module, orgGetter organization.Getter) factory.Service {
	return &service{
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/systemdashboard/implsystemdashboard"),
		module:    module,
		orgGetter: orgGetter,
		stopC:     make(chan struct{}),
		healthyC:  make(chan struct{}),
	}
}

func (service *service) Start(ctx context.Context) error {
	ticker := time.NewTicker(reconcileRetryInterval)
	defer ticker.Stop()

	for {
		err := service.reconcile(ctx)
		if err == nil {
			close(service.healthyC)
			<-service.stopC
			return nil
		}

		service.settings.Logger().WarnContext(ctx, "system dashboard reconciliation failed, retrying", errors.Attr(err))

		select {
		case <-service.stopC:
			return nil
		case <-ticker.C:
		}
	}
}

func (service *service) Healthy() <-chan struct{} {
	return service.healthyC
}

func (service *service) Stop(_ context.Context) error {
	close(service.stopC)
	return nil
}

func (service *service) reconcile(ctx context.Context) error {
	orgs, err := service.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	for _, org := range orgs {
		if err := service.module.Reconcile(ctx, org.ID); err != nil {
			return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "couldn't reconcile system dashboards for org %s", org.ID.StringValue())
		}
	}

	service.settings.Logger().InfoContext(ctx, "system dashboard reconciliation completed", slog.Int("orgs", len(orgs)))
	return nil
}
