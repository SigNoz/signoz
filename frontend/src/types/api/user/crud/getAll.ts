import { ROLES } from 'types/roles';

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
	data: UserResponse[];
	status: string;
}
