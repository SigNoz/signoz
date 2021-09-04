export interface PayloadProps {
	status: 'success' | 'error';
	data: QueryData;
}

export interface QueryData {
	resultType: 'string';
	result: {
		metric: {
			__name__: string;
			state: string;
		};
		values: [string, string][];
	};
}

export interface Props {
	query: string;
	step: string;
	start: string;
	end: string;
}
