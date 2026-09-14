import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';

/** What reaches the keys endpoint. */
export interface FieldKeysConfig {
	builderQueryType?: BuilderQueryType;
	fieldContext?: TelemetrytypesFieldContextDTO;
	metricName?: string;
	metricNamespace?: string;
	signalSource?: TelemetrytypesSourceDTO | '';
}

/** The fetch params plus the manual fields the endpoint never returns. */
export interface FieldSuggestionsConfig extends FieldKeysConfig {
	staticFields?: TelemetryFieldKey[];
}
