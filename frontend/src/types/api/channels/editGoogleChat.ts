import { GoogleChatChannel } from 'container/CreateAlertChannels/config';

export interface Props extends GoogleChatChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
