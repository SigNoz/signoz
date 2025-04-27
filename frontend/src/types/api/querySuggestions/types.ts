export interface QueryKeySuggestionsProps {
	id: string;
	name: string;
}

export interface QueryKeySuggestionsResponseProps {
	status: string;
	data: QueryKeySuggestionsProps[];
}

export interface QueryKeyRequestProps {
	signal: string;
}

export interface QueryKeyValueSuggestionsProps {
	id: string;
	name: string;
}

export interface QueryKeyValueSuggestionsResponseProps {
	status: string;
	data: QueryKeyValueSuggestionsProps[];
}

export interface QueryKeyValueRequestProps {
	signal: string;
	key: string;
}
