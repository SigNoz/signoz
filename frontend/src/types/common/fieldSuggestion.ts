import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';

/** What reaches the keys endpoint. */
export interface FieldKeysConfig {
	builderQueryType?: BuilderQueryType;
	fieldContext?: TelemetrytypesFieldContextDTO;
	metricName?: string;
	metricNamespace?: string;
	signalSource?: TelemetrytypesSourceDTO | '';
}

/**
 * Field-suggestion sources for the pickers: the fetch params plus the manual
 * fields the endpoint never returns. Unrelated to QuickFilterCheckboxUseFieldApis,
 * which switches that component between two value APIs.
 */
export interface UseFieldApis extends FieldKeysConfig {
	staticFields?: TelemetryFieldKey[];
}
