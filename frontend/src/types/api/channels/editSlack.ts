import { SlackChannel } from 'container/CreateAlertChannels/config';

export interface Props extends SlackChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
