import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperOperationDTO,
} from 'api/generated/services/sigNoz.schemas';

// One source candidate. `context` is where the key is read from (span
// attribute or resource); `operation` is move (delete source) or copy (keep).
// Priority is implicit in list order (top wins), derived on save.
export interface SourceConfig {
	key: string;
	context: SpantypesFieldContextDTO;
	operation: SpantypesSpanMapperOperationDTO;
}

// A mapper as shown in the read-only listing. `id` is the server id, used as a
// stable React key / testid anchor.
export interface Mapping {
	id: string;
	name: string;
	fieldContext: SpantypesFieldContextDTO;
	sources: SourceConfig[];
	enabled: boolean;
}

// A mapping group as shown in the read-only listing. `id` is the server id — a
// stable React key / testid anchor, and the id used to lazily fetch the group's
// mappers on expand (see GroupMappers). The mappers aren't held here.
export interface MappingGroup {
	id: string;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
}
