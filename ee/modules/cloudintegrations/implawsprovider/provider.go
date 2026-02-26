package implawsprovider

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
)

var _ cloudintegrations.CloudProvider = (*AWSProvider)(nil)

type AWSProvider struct {
	store integrationtypes.Store
}

func NewAWSProvider(store integrationtypes.Store) *AWSProvider {
	return &AWSProvider{store: store}
}

func (a *AWSProvider) AgentCheckIn(ctx context.Context, req *cloudintegrations.PostableAgentCheckInPayload) (any, error) {
	// if apiErr := validateCloudProviderName(cloudProvider); apiErr != nil {
	// 	return nil, apiErr
	// }

	// existingAccount, apiErr := c.accountsRepo.get(ctx, orgId, cloudProvider, req.ID)
	// if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
	// 	return nil, model.BadRequest(fmt.Errorf(
	// 		"can't check in with new %s account id %s for account %s with existing %s id %s",
	// 		cloudProvider, req.AccountID, existingAccount.ID.StringValue(), cloudProvider, *existingAccount.AccountID,
	// 	))
	// }

	// existingAccount, apiErr = c.accountsRepo.getConnectedCloudAccount(ctx, orgId, cloudProvider, req.AccountID)
	// if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
	// 	return nil, model.BadRequest(fmt.Errorf(
	// 		"can't check in to %s account %s with id %s. already connected with id %s",
	// 		cloudProvider, req.AccountID, req.ID, existingAccount.ID.StringValue(),
	// 	))
	// }

	// agentReport := types.AgentReport{
	// 	TimestampMillis: time.Now().UnixMilli(),
	// 	Data:            req.Data,
	// }

	// account, apiErr := c.accountsRepo.upsert(
	// 	ctx, orgId, cloudProvider, &req.ID, nil, &req.AccountID, &agentReport, nil,
	// )
	// if apiErr != nil {
	// 	return nil, model.WrapApiError(apiErr, "couldn't upsert cloud account")
	// }

	// // prepare and return integration config to be consumed by agent
	// compiledStrategy, err := NewCompiledCollectionStrategy(cloudProvider)
	// if err != nil {
	// 	return nil, model.InternalError(fmt.Errorf(
	// 		"couldn't init telemetry collection strategy: %w", err,
	// 	))
	// }

	// agentConfig := IntegrationConfigForAgent{
	// 	EnabledRegions:              []string{},
	// 	TelemetryCollectionStrategy: compiledStrategy,
	// }

	// if account.Config != nil && account.Config.EnabledRegions != nil {
	// 	agentConfig.EnabledRegions = account.Config.EnabledRegions
	// }

	// services, err := services.Map(cloudProvider)
	// if err != nil {
	// 	return nil, err
	// }

	// svcConfigs, apiErr := c.serviceConfigRepo.getAllForAccount(
	// 	ctx, orgId, account.ID.StringValue(),
	// )
	// if apiErr != nil {
	// 	return nil, model.WrapApiError(
	// 		apiErr, "couldn't get service configs for cloud account",
	// 	)
	// }

	// // accumulate config in a fixed order to ensure same config generated across runs
	// configuredServices := maps.Keys(svcConfigs)
	// slices.Sort(configuredServices)

	// for _, svcType := range configuredServices {
	// 	definition, ok := services[svcType]
	// 	if !ok {
	// 		continue
	// 	}
	// 	config := svcConfigs[svcType]

	// 	err := AddServiceStrategy(svcType, compiledStrategy, definition.Strategy, config)
	// 	if err != nil {
	// 		return nil, err
	// 	}
	// }

	// return &AgentCheckInResponse{
	// 	AccountId:         account.ID.StringValue(),
	// 	CloudAccountId:    *account.AccountID,
	// 	RemovedAt:         account.RemovedAt,
	// 	IntegrationConfig: agentConfig,
	// }, nil
}

func (a *AWSProvider) ListServices(ctx context.Context, orgID string, cloudAccountID *string) (any, error) {
	svcConfigs := make(map[string]*integrationtypes.AWSServiceConfig)
	if cloudAccountID != nil {
		activeAccount, err := a.store.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), *cloudAccountID)
		if err != nil {
			return nil, err
		}

		serviceConfigs, err := a.ServiceConfigRepo.GetAllForAccount(ctx, orgID, activeAccount.ID.String())
		if err != nil {
			return nil, err
		}

		for svcType, config := range serviceConfigs {
			serviceConfig := new(integrationtypes.AWSServiceConfig)
			err = integrationtypes.UnmarshalJSON(config, serviceConfig)
			if err != nil {
				return nil, err
			}
			svcConfigs[svcType] = serviceConfig
		}
	}

	summaries := make([]integrationtypes.AWSServiceSummary, 0)

	definitions, err := a.ServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, err
	}

	for _, def := range definitions {
		summary := integrationtypes.AWSServiceSummary{
			DefinitionMetadata: def.DefinitionMetadata,
			Config:             nil,
		}

		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	slices.SortFunc(summaries, func(a, b integrationtypes.AWSServiceSummary) int {
		if a.DefinitionMetadata.Title < b.DefinitionMetadata.Title {
			return -1
		}
		if a.DefinitionMetadata.Title > b.DefinitionMetadata.Title {
			return 1
		}
		return 0
	})

	return &integrationtypes.GettableAWSServices{
		Services: summaries,
	}, nil
}
