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

// A single human-readable condition clause shown in the group's Filters column.
export interface ConditionFilter {
	context: 'attribute' | 'resource';
	key: string;
}

export type MapperDraftMode = 'add' | 'edit';

// Editable form state for a mapper. `sources` is ordered highest priority
// first; the backend priority integers are derived from this order on save.
export interface MapperDraft {
	id: string | null;
	name: string;
	sources: string[];
	enabled: boolean;
}

// Editable form state for a group. `attributes` are the span-attribute key
// substrings that gate the group; `resource` is left empty for the LLM use
// case (the backend also matches on resource keys when provided).
export interface GroupDraft {
	id: string | null;
	name: string;
	attributes: string[];
	enabled: boolean;
}

// Working-copy node for a mapper. `localId` is a stable client key (the server
// id once persisted, or a temporary id for not-yet-saved rows). `serverId` is
// null until the row has been persisted.
export interface DraftMapper {
	localId: string;
	serverId: string | null;
	name: string;
	sources: string[];
	enabled: boolean;
}

// Working-copy node for a group, holding its mappers inline so the whole tree
// can be staged locally and diffed against the server snapshot on save.
export interface DraftGroup {
	localId: string;
	serverId: string | null;
	name: string;
	attributes: string[];
	enabled: boolean;
	mappers: DraftMapper[];
}
