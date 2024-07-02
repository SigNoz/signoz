import { TelegramChannel } from 'container/CreateAlertChannels/config';

export type Props = TelegramChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
