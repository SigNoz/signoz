import { JiraChannel } from 'container/CreateAlertChannels/config';

export interface Props extends JiraChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
