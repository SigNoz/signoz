package coretypes

var (
	ManagedRoleToTransactions = map[string][]Transaction{
		SigNozAnonymousRoleName: {
			{
				Verb:   VerbRead,
				Object: *MustNewObject(ResourceRef{Type: TypeMetaResource, Kind: KindPublicDashboard}, WildCardSelectorString),
			},
		},
	}
)
