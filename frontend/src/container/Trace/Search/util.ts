import { TraceReducer } from 'types/reducer/trace';

type Tags = TraceReducer['selectedTags'];

interface PayloadProps<T> {
	isError: boolean;
	payload: T;
}

export const parseQueryToTags = (query: string): PayloadProps<Tags> => {
	return {
		isError: false,
		payload: [],
	};
};

export const parseTagsToQuery = (tags: Tags): PayloadProps<string> => {
	return {
		isError: false,
		payload: '',
	};
};
