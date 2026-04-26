package coretypes

var TypeableRelations = map[Type][]Relation{
	TypeUser:           {RelationRead, RelationUpdate, RelationDelete},
	TypeServiceAccount: {RelationRead, RelationUpdate, RelationDelete},
	TypeRole:           {RelationAssignee, RelationRead, RelationUpdate, RelationDelete},
	TypeOrganization:   {RelationRead, RelationUpdate, RelationDelete},
	TypeMetaResource:   {RelationRead, RelationUpdate, RelationDelete},
	TypeMetaResources:  {RelationCreate, RelationList},
}

var RelationsTypeable = map[Relation][]Type{
	RelationCreate:   {TypeMetaResources},
	RelationRead:     {TypeUser, TypeServiceAccount, TypeRole, TypeOrganization, TypeMetaResource},
	RelationList:     {TypeMetaResources},
	RelationUpdate:   {TypeUser, TypeServiceAccount, TypeRole, TypeOrganization, TypeMetaResource},
	RelationDelete:   {TypeUser, TypeServiceAccount, TypeRole, TypeOrganization, TypeMetaResource},
	RelationAssignee: {TypeRole},
}
