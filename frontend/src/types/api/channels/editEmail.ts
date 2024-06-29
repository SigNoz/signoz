import { EmailChannel } from 'container/CreateAlertChannels/config';

export interface Props extends EmailChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
