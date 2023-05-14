import { MsTeamsChannel } from 'container/CreateAlertChannels/config';

export interface Props extends MsTeamsChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
