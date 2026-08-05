import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryKeyDataSuggestionsProps } from 'types/api/querySuggestions/types';

const fieldContextToSuggestionMap: Record<
	TelemetrytypesFieldContextDTO,
	QueryKeyDataSuggestionsProps['fieldContext']
> = {
	[TelemetrytypesFieldContextDTO.resource]: 'resource',
	[TelemetrytypesFieldContextDTO.span]: 'span',
	[TelemetrytypesFieldContextDTO.attribute]: 'attribute',
	// no maps for the following values on suggestion context
	[TelemetrytypesFieldContextDTO.body]: undefined,
	[TelemetrytypesFieldContextDTO.metric]: undefined,
	[TelemetrytypesFieldContextDTO.log]: undefined,
	[TelemetrytypesFieldContextDTO['']]: undefined,
};

export function fieldContextToSuggestionContext(
	fc: TelemetrytypesFieldContextDTO | undefined,
): QueryKeyDataSuggestionsProps['fieldContext'] {
	if (fc === undefined) {
		return undefined;
	}

	return fieldContextToSuggestionMap[fc];
}
