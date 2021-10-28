import { PayloadProps as ServicePayload } from 'types/api/trace/getServiceList';
import { PayloadProps as OperationsPayload } from 'types/api/trace/getServiceOperation';
import { PayloadProps as GetSpansPayloadProps } from 'types/api/trace/getSpans';
import { PayloadProps as TagsPayload } from 'types/api/trace/getTags';

type TagItemOperator = 'equals' | 'contains' | 'regex';
export interface TagItem {
	key: string;
	value: string;
	operator: TagItemOperator;
}

export interface LatencyValue {
	min: string;
	max: string;
}

export interface TraceReducer {
	tagsSuggestions: TagsPayload;
	selectedService: string;
	selectedLatency: LatencyValue;
	selectedOperation: string;
	selectedKind: '' | '2' | '3' | string;
	errorMessage: string;
	serviceList: ServicePayload;
	spanList: GetSpansPayloadProps;
	operationsList: OperationsPayload;
	error: boolean;
	loading: boolean;
	selectedTags: TagItem[];
}
