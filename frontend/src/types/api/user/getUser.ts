import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	userId: User['userId'];
	token?: string;
}

export interface UserResponse {
	createdAt: number | string;
	email: string;
	id: string;
	displayName: string;
	orgId: string;
	organization: string;
	role: ROLES;
	updatedAt?: number | string;
	isRoot?: boolean;
	status?: 'active' | 'pending_invite' | 'deleted';
}
export interface PayloadProps {
	data: UserResponse;
	status: string;
}
