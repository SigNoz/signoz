import { User } from 'types/reducer/app';

export interface Props {
	userId: User['userId'];
}

export interface GetResetPasswordToken {
	token: string;
	userId: string;
}

export interface PayloadProps {
	data: GetResetPasswordToken;
	status: string;
}
