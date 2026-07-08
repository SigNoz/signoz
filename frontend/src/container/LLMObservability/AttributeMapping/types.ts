import {
	SpantypesFieldContextDTO,
	SpantypesSpanMapperOperationDTO,
} from 'api/generated/services/sigNoz.schemas';

export interface SourceConfig {
	key: string;
	context: SpantypesFieldContextDTO;
	operation: SpantypesSpanMapperOperationDTO;
}

export interface Mapping {
	id: string;
	name: string;
	fieldContext: SpantypesFieldContextDTO;
	sources: SourceConfig[];
	enabled: boolean;
}

export interface MappingGroup {
	id: string;
	name: string;
	attributes: string[];
	resource: string[];
	enabled: boolean;
}
