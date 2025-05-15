export interface PayloadProps {
	data: UserLoginResponse;
	status: string;
}

export interface Props {
	email?: string;
	password?: string;
	refreshToken?: UserLoginResponse['refreshJwt'];
}

export interface UserLoginResponse {
	accessJwt: string;
	accessJwtExpiry: number;
	refreshJwt: string;
	refreshJwtExpiry: number;
	userId: string;
}
