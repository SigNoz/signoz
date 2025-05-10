import { User } from 'types/reducer/app';

import { PayloadProps as Payload } from './get';

export type PayloadProps = Payload;

export interface Props {
	userId: User['userId'];
	name: User['displayName'];
}
