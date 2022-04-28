import { ROLES } from 'types/roles';

export interface Props {
	group_name: ROLES;
	userId: string;
}

export interface PayloadProps {
	data: string;
}
