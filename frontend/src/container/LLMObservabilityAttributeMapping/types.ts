import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperConfigDTO,
	SpantypesSpanMapperDTO,
	SpantypesSpanMapperGroupConditionDTO,
	SpantypesSpanMapperGroupDTO,
	SpantypesSpanMapperOperationDTO,
	SpantypesSpanMapperSourceDTO,
} from 'api/generated/services/sigNoz.schemas';

export type MapperGroup = SpantypesSpanMapperGroupDTO;
export type MapperGroupCondition =
	NonNullable<SpantypesSpanMapperGroupConditionDTO>;
export type Mapper = SpantypesSpanMapperDTO;
export type MapperConfig = SpantypesSpanMapperConfigDTO;
export type MapperSource = SpantypesSpanMapperSourceDTO;

export const FieldContext = SpantypesFieldContextDTO;
export const MapperOperation = SpantypesSpanMapperOperationDTO;

export type FieldContextValue = SpantypesFieldContextDTO;
export type MapperOperationValue = SpantypesSpanMapperOperationDTO;

// A single human-readable condition clause shown in the group's Filters column.
export interface ConditionFilter {
	context: 'attribute' | 'resource';
	key: string;
}

export type MapperDraftMode = 'add' | 'edit';

// One source candidate. `context` is where the key is read from (span
// attribute or resource); `operation` is move (delete source) or copy (keep).
// Priority is implicit in list order (top wins), derived on save.
export interface SourceConfig {
	key: string;
	context: SpantypesFieldContextDTO;
	operation: SpantypesSpanMapperOperationDTO;
}

// Editable form state for a mapper. `sources` is ordered highest priority
// first; `fieldContext` is where the standardized target is written.
export interface MapperDraft {
	id: string | null;
	name: string;
	fieldContext: SpantypesFieldContextDTO;
	sources: SourceConfig[];
	enabled: boolean;
}

// Editable form state for a group. The group runs when a span carries a
// span-attribute key matching `attributes` OR a resource key matching
// `resource` (plain substring match).
export interface GroupDraft {
	id: string | null;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
}

// Working-copy node for a mapper. `localId` is a stable client key (the server
// id once persisted, or a temporary id for not-yet-saved rows). `serverId` is
// null until the row has been persisted.
export interface DraftMapper {
	localId: string;
	serverId: string | null;
	name: string;
	fieldContext: SpantypesFieldContextDTO;
	sources: SourceConfig[];
	enabled: boolean;
}

// Working-copy node for a group, holding its mappers inline so the whole tree
// can be staged locally and diffed against the server snapshot on save.
export interface DraftGroup {
	localId: string;
	serverId: string | null;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
	mappers: DraftMapper[];
}
