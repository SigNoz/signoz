import { WebhookChannel } from 'container/CreateAlertChannels/config';

export interface Props extends WebhookChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
