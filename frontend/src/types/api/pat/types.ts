export interface APIKeyProps {
	name: string;
	expiresAt: number;
	role: string;
	token: string;
	id: string;
	createdAt: number;
	createdBy?: string;
	updatedAt?: string;
	updatedBy?: string;
}

export interface CreateAPIKeyProps {
	name: string;
	expiresAt: number;
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
	data: CreateAPIKeyProps;
}

export type PayloadProps = {
	status: string;
	data: string;
};
