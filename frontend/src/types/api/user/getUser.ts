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
	/**
	 * @deprecated This will be removed in the future releases in favor of new AuthZ framework
	 */
	role: ROLES;
	updatedAt?: number | string;
	isRoot?: boolean;
	status?: 'active' | 'pending_invite' | 'deleted';
}
export interface PayloadProps {
	data: UserResponse;
	status: string;
}
