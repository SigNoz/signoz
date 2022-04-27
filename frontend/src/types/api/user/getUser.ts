import { User } from 'types/reducer/app';

export interface Props {
	userId: User['userId'];
	token?: string;
}

export interface PayloadProps {
	createdAt: number;
	email: string;
	id: string;
	name: string;
	orgId: string;
	profilePictureURL: string;
}
