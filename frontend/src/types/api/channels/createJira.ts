import { JiraChannel } from 'container/CreateAlertChannels/config';

export type Props = JiraChannel;

export interface PayloadProps {
	data: string;
	status: string;
}
