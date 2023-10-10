import './styles.scss';

import { Time } from 'container/TopNav/DateTimeSelection/config';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import LogsList from '../../../components/LogsList';
import useSampleLogs from '../../../hooks/useSampleLogs';

function SampleLogs({ filter, timeInterval }: SampleLogsProps): JSX.Element {
	const { isLoading, isError, logs } = useSampleLogs({
		filter,
		timeInterval,
		count: 5,
	});

	if (isError) {
		return (
			<div className="sample-logs-notice-container">
				could not fetch logs for filter
			</div>
		);
	}

	if (isLoading) {
		return <div className="sample-logs-notice-container">Loading...</div>;
	}

	if ((filter?.items?.length || 0) < 1) {
		return (
			<div className="sample-logs-notice-container">Please select a filter</div>
		);
	}

	if (logs.length < 1) {
		return <div className="sample-logs-notice-container">No logs found</div>;
	}

	return <LogsList logs={logs} />;
}

interface SampleLogsProps {
	filter: TagFilter;
	timeInterval: Time;
}

export default SampleLogs;
