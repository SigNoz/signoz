import { PagerChannel } from 'container/CreateAlertChannels/config';

export interface Props extends PagerChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
