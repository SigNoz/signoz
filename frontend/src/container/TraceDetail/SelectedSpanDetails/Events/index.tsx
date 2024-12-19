import { Typography } from 'antd';
import { ITraceEvents } from 'types/api/trace/getTraceItem';

import ErrorTag from './Event';

function Events({
	events = [],
	onToggleHandler,
	setText,
	firstSpanStartTime,
}: EventsProps): JSX.Element {
	if (events.length === 0) {
		return <Typography>No events data in selected span</Typography>;
	}

	const sortedTraceEvents = events.sort((a, b) => {
		// Handle undefined names by treating them as empty strings
		const nameA = a.name || '';
		const nameB = b.name || '';
		return nameA.localeCompare(nameB);
	});

	return (
		<ErrorTag
			onToggleHandler={onToggleHandler}
			setText={setText}
			event={sortedTraceEvents}
			firstSpanStartTime={firstSpanStartTime}
		/>
	);
}

interface EventsProps {
	events?: ITraceEvents[];
	onToggleHandler: (event: boolean) => void;
	setText: (props: { subText: string; text: string }) => void;
	firstSpanStartTime: number;
}

Events.defaultProps = {
	events: [],
};

export default Events;
