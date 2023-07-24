import { Time } from 'container/TopNav/DateTimeSelection/config';
import { ServicesList } from 'types/api/metrics/getService';
import { Tags } from 'types/reducer/trace';

export default interface ServiceTracesTableProps {
	services: ServicesList[];
	loading: boolean;
	error: boolean;
}

export interface ServiceTableProps {
	servicename?: string;
	maxTime: number;
	minTime: number;
	selectedTags: Tags[];
	selectedTime: Time;
}
