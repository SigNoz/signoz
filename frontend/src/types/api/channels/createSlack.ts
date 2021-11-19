import { SlackChannel } from 'container/AlertChannels/CreateAlertChannels/config';

export type Props = SlackChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
