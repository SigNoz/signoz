import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperDTO,
	SpantypesSpanMapperGroupDTO,
	SpantypesSpanMapperOperationDTO,
} from 'api/generated/services/sigNoz.schemas';

export type MapperGroup = SpantypesSpanMapperGroupDTO;
export type Mapper = SpantypesSpanMapperDTO;
export const FieldContext = SpantypesFieldContextDTO;
export type FieldContextValue = SpantypesFieldContextDTO;
export const MapperOperation = SpantypesSpanMapperOperationDTO;
export type MapperOperationValue = SpantypesSpanMapperOperationDTO;

export type MapperDraftMode = 'add' | 'edit';

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

export interface GroupDraft {
	id: string | null;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
}

export interface DraftMapper {
	localId: string;
	serverId: string | null;
	name: string;
	fieldContext: SpantypesFieldContextDTO;
	sources: SourceConfig[];
	enabled: boolean;
}

export interface DraftGroup {
	localId: string;
	serverId: string | null;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
	mappers: DraftMapper[];
}
