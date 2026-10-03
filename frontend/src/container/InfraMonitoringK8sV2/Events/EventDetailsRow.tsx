import { EventContents } from '../EntityDetailsUtils/EntityEvents/EventsContent';
import { K8sEventRow } from './types';

interface EventDetailsRowProps {
	record: K8sEventRow;
}

function EventDetailsRow({ record }: EventDetailsRowProps): JSX.Element {
	return (
		<EventContents
			data={{ ...record.attributes_string, ...record.resources_string }}
		/>
	);
}

export default EventDetailsRow;
