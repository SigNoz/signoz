export interface User {
	createdAt?: number;
	email?: string;
	id: string;
	displayName?: string;
}

export interface APIKeyProps {
	name: string;
	expiresAt: number;
	role: string;
	token: string;
	id: string;
	createdAt: string;
	createdByUser?: User;
	updatedAt?: string;
	updatedByUser?: User;
	lastUsed?: number;
}

export interface CreatePayloadProps {
	data: APIKeyProps;
	status: string;
}

export interface CreateAPIKeyProps {
	name: string;
	expiresInDays: number;
	role: string;
}

export interface AllAPIKeyProps {
	status: string;
	data: APIKeyProps[];
}

export interface CreateAPIKeyProp {
	data: APIKeyProps;
}

export interface DeleteAPIKeyPayloadProps {
	status: string;
}

export interface UpdateAPIKeyProps {
	id: string;
	data: {
		name: string;
		role: string;
	};
}

export type PayloadProps = {
	status: string;
	data: string;
};
