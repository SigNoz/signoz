import { TelegramChannel } from 'container/CreateAlertChannels/config';

export interface Props extends TelegramChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
