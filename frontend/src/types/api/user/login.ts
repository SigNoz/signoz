export interface Props {
	email: string;
	password: string;
}

export interface PayloadProps {
	accessJwt: string;
	accessJwtExpiry: number;
	refreshJwt: string;
	refreshJwtExpiry: number;
}
