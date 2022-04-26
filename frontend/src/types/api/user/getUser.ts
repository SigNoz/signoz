import { User } from 'types/reducer/app';

export interface Props {
	userId: User['userId'];
}

export interface PayloadProps {
	createdAt: number;
	email: string;
	id: string;
	name: string;
	orgId: string;
	profilePictureURL: string;
}
