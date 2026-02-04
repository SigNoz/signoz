package implorganization

import (
	"context"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/types"
)

type setter struct {
	store        types.OrganizationStore
	alertmanager alertmanager.Alertmanager
	quickfilter  quickfilter.Module
}

func NewSetter(store types.OrganizationStore, alertmanager alertmanager.Alertmanager, quickfilter quickfilter.Module) organization.Setter {
	return &setter{store: store, alertmanager: alertmanager, quickfilter: quickfilter}
}

func (module *setter) Create(ctx context.Context, organization *types.Organization) error {
	if err := module.store.Create(ctx, organization); err != nil {
		return err
	}

	if err := module.alertmanager.SetDefaultConfig(ctx, organization.ID.StringValue()); err != nil {
		return err
	}

	if err := module.quickfilter.SetDefaultConfig(ctx, organization.ID); err != nil {
		return err
	}

	return nil
}

func (module *setter) Update(ctx context.Context, updatedOrganization *types.Organization) error {
	return module.store.Update(ctx, updatedOrganization)
}
