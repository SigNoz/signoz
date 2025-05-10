import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	userId: User['userId'];
	token?: string;
}

export interface UserResponse {
	createdAt: string;
	displayName: string;
	email: string;
	id: string;
	orgId: string;
	role: ROLES;
	updatedAt: string;
}

export interface PayloadProps {
	data: UserResponse;
	status: string;
}
