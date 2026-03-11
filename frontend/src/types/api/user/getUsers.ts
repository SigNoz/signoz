import { ROLES } from 'types/roles';

export interface UserResponse {
	createdAt: number;
	email: string;
	id: string;
	displayName: string;
	orgId: string;
	organization: string;
	role: ROLES;
	updatedAt?: number;
}
export interface PayloadProps {
	data: UserResponse[];
	status: string;
}
