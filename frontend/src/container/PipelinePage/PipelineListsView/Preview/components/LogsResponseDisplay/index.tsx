import { LogsResponse } from '../../types';
import LogsList from '../LogsList';

function LogsResponseDisplay({
	response,
}: LogsResponseDisplayProps): JSX.Element {
	const { isLoading, isError, logs } = response;

	if (isError) {
		return (
			<div className="sample-logs-notice-container">There was an error.</div>
		);
	}

	if (isLoading) {
		return <div className="sample-logs-notice-container">Loading...</div>;
	}

	if (logs.length < 1) {
		return <div className="sample-logs-notice-container">No logs found</div>;
	}

	return <LogsList logs={logs} />;
}

export interface LogsResponseDisplayProps {
	response: LogsResponse;
}

export default LogsResponseDisplay;
