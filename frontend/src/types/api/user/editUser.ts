import { User } from 'types/reducer/app';

import { PayloadProps as Payload } from './getUser';

export type PayloadProps = Payload;

export interface Props {
	userId: User['userId'];
	name: User['name'];
}
