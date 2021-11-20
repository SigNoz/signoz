import { SlackChannel } from 'container/CreateAlertChannels/config';

export type Props = SlackChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
