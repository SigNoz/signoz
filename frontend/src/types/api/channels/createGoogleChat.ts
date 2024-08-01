import { GoogleChatChannel } from 'container/CreateAlertChannels/config';

export type Props = GoogleChatChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
