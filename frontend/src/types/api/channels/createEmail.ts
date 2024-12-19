import { EmailChannel } from 'container/CreateAlertChannels/config';

export type Props = EmailChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
