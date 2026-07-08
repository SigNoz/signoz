import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperGroupDTO,
	SpantypesSpanMapperOperationDTO,
} from 'api/generated/services/sigNoz.schemas';

// Convenience aliases over the generated DTOs. The read-only listing consumes
// the generated types directly, but the group-drawer form code reads better
// against these domain names (and FieldContext is used as a value/enum).
export type MapperGroup = SpantypesSpanMapperGroupDTO;
export const FieldContext = SpantypesFieldContextDTO;
export type FieldContextValue = SpantypesFieldContextDTO;

export type MapperDraftMode = 'add' | 'edit';

// One source candidate. `context` is where the key is read from (span
// attribute or resource); `operation` is move (delete source) or copy (keep).
// Priority is implicit in list order (top wins), derived on save.
export interface SourceConfig {
	key: string;
	context: SpantypesFieldContextDTO;
	operation: SpantypesSpanMapperOperationDTO;
}

// Read-only view model for a mapper row. Mappers are fetched lazily per group
// (see GroupMappers) and rendered as-is — mapper editing lands in a later PR.
export interface Mapping {
	id: string;
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

// Working-copy node for a group. `localId` is a stable client key (the server
// id once persisted, or a temporary id for not-yet-saved rows). `serverId` is
// null until the group has been persisted. The whole list is staged locally
// and diffed against the server snapshot on save (see saveDraft).
export interface DraftGroup {
	localId: string;
	serverId: string | null;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
}
