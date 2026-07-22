import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QUERY_BUILDER_KEY_TYPES } from 'constants/antlrQueryConstants';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';

export function dataTypeToKeyType(
	dt: TelemetrytypesFieldDataTypeDTO | undefined,
): QUERY_BUILDER_KEY_TYPES {
	if (
		dt === TelemetrytypesFieldDataTypeDTO.float64 ||
		dt === TelemetrytypesFieldDataTypeDTO.int64 ||
		dt === TelemetrytypesFieldDataTypeDTO.number
	) {
		return QUERY_BUILDER_KEY_TYPES.NUMBER;
	}
	if (dt === TelemetrytypesFieldDataTypeDTO.bool) {
		return QUERY_BUILDER_KEY_TYPES.BOOLEAN;
	}
	return QUERY_BUILDER_KEY_TYPES.STRING;
}

export function fieldContextToSuggestionContext(
	fc: TelemetrytypesFieldContextDTO | undefined,
): QueryKeyDataSuggestionsProps['fieldContext'] {
	if (fc === TelemetrytypesFieldContextDTO.resource) {
		return 'resource';
	}
	if (fc === TelemetrytypesFieldContextDTO.span) {
		return 'span';
	}
	if (fc === TelemetrytypesFieldContextDTO.attribute) {
		return 'attribute';
	}
	return undefined;
}

export function dataTypeToSuggestionType(
	dt: TelemetrytypesFieldDataTypeDTO | undefined,
): string {
	if (dt === TelemetrytypesFieldDataTypeDTO.string) {
		return 'keyword';
	}
	if (
		dt === TelemetrytypesFieldDataTypeDTO.float64 ||
		dt === TelemetrytypesFieldDataTypeDTO.int64 ||
		dt === TelemetrytypesFieldDataTypeDTO.number
	) {
		return 'number';
	}
	if (dt === TelemetrytypesFieldDataTypeDTO.bool) {
		return 'bool';
	}
	return 'keyword';
}
