import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperDTO,
	SpantypesSpanMapperGroupConditionKeyDTO,
	SpantypesSpanMapperGroupDTO,
	SpantypesSpanMapperOperationDTO,
	SpantypesSpanMapperOriginDTO,
	SpantypesSpanMapperSourceDTO,
} from 'api/generated/services/sigNoz.schemas';

export type MapperGroup = SpantypesSpanMapperGroupDTO;
export type Mapper = SpantypesSpanMapperDTO;
export const FieldContext = SpantypesFieldContextDTO;
export type FieldContextValue = SpantypesFieldContextDTO;
export const MapperOperation = SpantypesSpanMapperOperationDTO;
export type MapperOperationValue = SpantypesSpanMapperOperationDTO;
export const MapperOrigin = SpantypesSpanMapperOriginDTO;
export type MapperOriginValue = SpantypesSpanMapperOriginDTO;

export type ConditionKey = SpantypesSpanMapperGroupConditionKeyDTO;

export type MapperDraftMode = 'add' | 'edit';

// `priority` is left out: it is derived from list order when the draft is
// serialized.
export type SourceConfig = Omit<SpantypesSpanMapperSourceDTO, 'priority'>;

// Editable form state for a mapper. `sources` is ordered highest priority
// first; `fieldContext` is where the standardized target is written.
export interface MapperDraft {
	id: string | null;
	name: string;
	fieldContext: FieldContextValue;
	sources: SourceConfig[];
	enabled: boolean;
}

export interface GroupDraft {
	id: string | null;
	name: string;
	attributes: ConditionKey[];
	resource: ConditionKey[];
	enabled: boolean;
}

// The editor tree identifies rows by `localId` so unsaved ones are addressable;
// `serverId` is null until the row has been persisted.
export type DraftMapper = Omit<MapperDraft, 'id'> & {
	localId: string;
	serverId: string | null;
};

export type DraftGroup = Omit<GroupDraft, 'id'> & {
	localId: string;
	serverId: string | null;
	mappers: DraftMapper[];
};
