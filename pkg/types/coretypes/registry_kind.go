package coretypes

var Kinds = []Kind{
	KindAnonymous,
	KindOrganization,
	KindRole,
	KindServiceAccount,
	KindUser,
	KindDashboard,
	KindPublicDashboard,
}

var (
	KindAnonymous       Kind = MustNewKind("anonymous")
	KindOrganization         = MustNewKind("organization")
	KindRole                 = MustNewKind("role")
	KindServiceAccount       = MustNewKind("serviceaccount")
	KindUser                 = MustNewKind("user")
	KindDashboard            = MustNewKind("dashboard")
	KindPublicDashboard      = MustNewKind("public-dashboard")
)
