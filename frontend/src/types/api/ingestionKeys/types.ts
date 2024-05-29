export interface User {
	createdAt?: number;
	email?: string;
	id: string;
	name?: string;
	notFound?: boolean;
	profilePictureURL?: string;
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
	limits?: string[];
}

export interface CreateIngestionKeyProps {
	name: string;
	expires_at?: number;
	tags: string[];
}

export interface AllIngestionKeyProps {
	status: string;
	data: IngestionKeyProps[];
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
		expires_at?: number;
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
