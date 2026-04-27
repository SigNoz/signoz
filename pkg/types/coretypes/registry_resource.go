package coretypes

var Resources = []Resource{
	ResourceAnonymous,
	ResourceOrganization,
	ResourceRole,
	ResourceServiceAccount,
	ResourceUser,
	ResourceMetaResourceRole,
	ResoureceMetaResourcesRole,
	ResourceMetaResourceDashboard,
	ResourceMetaResourcesDashboard,
	ResourceMetaResourcePublicDashboard,
	ResourceMetaResourcesPublicDashboard,
}

var (
	ResourceAnonymous                    Resource = NewResourceAnonymous()
	ResourceOrganization                          = NewResourceOrganization()
	ResourceRole                                  = NewResourceRole()
	ResourceServiceAccount                        = NewResourceServiceAccount()
	ResourceUser                                  = NewResourceUser()
	ResourceMetaResourceRole                      = NewResourceMetaResource(KindRole)
	ResoureceMetaResourcesRole                    = NewResourceMetaResources(KindRole)
	ResourceMetaResourceDashboard                 = NewResourceMetaResource(KindDashboard)
	ResourceMetaResourcesDashboard                = NewResourceMetaResources(KindDashboard)
	ResourceMetaResourcePublicDashboard           = NewResourceMetaResource(KindPublicDashboard)
	ResourceMetaResourcesPublicDashboard          = NewResourceMetaResources(KindPublicDashboard)
)
