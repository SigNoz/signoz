export interface Filter {
	key: string;
	dataType: string;
	type: string;
	isColumn: boolean;
	isJSON: boolean;
}

export interface Props {
	signal: string;
}

export type PayloadProps = {
	filters: Filter[];
	signal: string;
};
