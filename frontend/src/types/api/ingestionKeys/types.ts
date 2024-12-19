export interface User {
	createdAt?: number;
	email?: string;
	id: string;
	name?: string;
	notFound?: boolean;
	profilePictureURL?: string;
}

export interface Limit {
	signal: string;
	id: string;
	config?: {
		day?: {
			size?: number;
		};
		second?: {
			size?: number;
		};
	};
	tags?: [];
}

export interface IngestionKeyProps {
	name: string;
	expires_at?: string;
	value: string;
	workspace_id: string;
	id: string;
	created_at: string;
	updated_at: string;
	tags?: string[];
	limits?: Limit[];
}

export interface GetIngestionKeyProps {
	page: number;
	per_page: number;
	search?: string;
}

export interface CreateIngestionKeyProps {
	name: string;
	expires_at: string;
	tags: string[];
}

export interface PaginationProps {
	page: number;
	per_page: number;
	pages?: number;
	total?: number;
}

export interface AllIngestionKeyProps {
	status: string;
	data: IngestionKeyProps[];
	_pagination: PaginationProps;
}

export interface CreateIngestionKeyProp {
	data: IngestionKeyProps;
}

export interface DeleteIngestionKeyPayloadProps {
	status: string;
}

export interface UpdateIngestionKeyProps {
	id: string;
	data: {
		name: string;
		expires_at: string;
		tags: string[];
	};
}

export type IngestionKeysPayloadProps = {
	status: string;
	data: string;
};

export type GetIngestionKeyPayloadProps = {
	id: string;
};
