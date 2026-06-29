import { JsmOpsChannel } from 'container/CreateAlertChannels/config';

export interface Props extends JsmOpsChannel {
	id: string;
}

export interface PayloadProps {
	data: string;
	status: string;
}
