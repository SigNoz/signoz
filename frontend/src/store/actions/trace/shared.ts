// Central location for trace filter shared helpers and types to avoid cyclic dependencies
import { TraceFilterEnum } from 'types/reducer/trace';
import { AllTraceFilterEnum } from 'types/reducer/trace';

export interface ParsedUrl<T> {
	currentValue: T;
	urlValue: T;
}

export function isTraceFilterEnum(
	value: TraceFilterEnum | string,
): value is TraceFilterEnum {
	return !!AllTraceFilterEnum.find((enums) => enums === value);
}
