import { WebhookChannel } from 'container/CreateAlertChannels/config';

export type Props = WebhookChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
