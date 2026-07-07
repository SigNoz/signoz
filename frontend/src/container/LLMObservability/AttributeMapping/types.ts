import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperOperationDTO,
} from 'api/generated/services/sigNoz.schemas';

// A single human-readable condition clause shown in the group's Filters column.
export interface ConditionFilter {
	context: 'attribute' | 'resource';
	key: string;
}

// One source candidate. `context` is where the key is read from (span
// attribute or resource); `operation` is move (delete source) or copy (keep).
// Priority is implicit in list order (top wins), derived on save.
export interface SourceConfig {
	key: string;
	context: SpantypesFieldContextDTO;
	operation: SpantypesSpanMapperOperationDTO;
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
