export interface PayloadProps {
	accessJwt: string;
	accessJwtExpiry: number;
	refreshJwt: string;
	refreshJwtExpiry: number;
}

export interface User {
	id: string;
	createdAt: string;
	updatedAt: string;
	displayName: string;
	email: string;
	role: string;
	orgId: string;
}

export interface Props {
	email?: string;
	password?: string;
	refreshToken?: PayloadProps['refreshJwt'];
}
