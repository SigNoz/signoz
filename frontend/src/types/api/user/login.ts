export interface PayloadProps {
	accessJwt: string;
	accessJwtExpiry: number;
	refreshJwt: string;
	refreshJwtExpiry: number;
	userId: string;
}

export interface Props {
	email?: string;
	password?: string;
	refreshToken?: PayloadProps['refreshJwt'];
}
