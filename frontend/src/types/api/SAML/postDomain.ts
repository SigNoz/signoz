import { AuthDomain } from './listDomain';

export type Props = {
	name: string;
	orgId: string;
};

export interface PayloadProps {
	data: AuthDomain;
	status: string;
}
