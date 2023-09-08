import { OpsgenieChannel } from 'container/CreateAlertChannels/config';

export type Props = OpsgenieChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
