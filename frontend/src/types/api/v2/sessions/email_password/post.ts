export interface Props {
	email: string;
	password: string;
	orgId: string;
}

export interface Token {
	accessToken: string;
	refreshToken: string;
}
