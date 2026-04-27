package coretypes

var (
	ManagedRoleToTransactions = map[string][]Transaction{
		SigNozAdminRoleName: {
			{Verb: VerbCreate, Object: Object{Resource: ResourceRef{Type: TypeUser}}},
		},
	}
)
