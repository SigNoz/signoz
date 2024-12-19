export interface User {
	createdAt?: number;
	email?: string;
	id: string;
	name?: string;
	notFound?: boolean;
	profilePictureURL?: string;
}

export interface APIKeyProps {
	name: string;
	expiresAt: number;
	role: string;
	token: string;
	id: string;
	createdAt: number;
	createdByUser?: User;
	updatedAt?: number;
	updatedByUser?: User;
	lastUsed?: number;
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
