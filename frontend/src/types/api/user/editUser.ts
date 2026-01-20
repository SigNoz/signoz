import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

import { PayloadProps as Payload } from './getUser';

export type PayloadProps = Payload;

export interface Props {
	userId: User['userId'];
	displayName: User['displayName'];
	role?: ROLES;
}
