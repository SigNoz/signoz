import { OpsgenieChannel } from 'container/CreateAlertChannels/config';

export interface Props extends OpsgenieChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
