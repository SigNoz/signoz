import { User } from 'types/reducer/app';

export interface Props {
	oldPassword: string;
	newPassword: string;
	userId: User['userId'];
}

export interface PayloadProps {
	data: string;
}
