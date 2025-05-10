import { User } from 'types/reducer/app';

export interface Props {
	userId: User['userId'];
}

export interface PayloadProps {
	token: string;
	userId: string;
}
