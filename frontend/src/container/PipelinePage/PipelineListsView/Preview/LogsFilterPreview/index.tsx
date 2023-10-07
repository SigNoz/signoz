import './styles.scss';

import { RelativeDurationOptions } from 'container/TopNav/DateTimeSelection/config';
import { useState } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import PreviewIntervalSelector from '../components/PreviewIntervalSelector';
import SampleLogs from '../components/SampleLogs';

function LogsFilterPreview({ filter }: LogsFilterPreviewProps): JSX.Element {
	const last1HourInterval = RelativeDurationOptions[3].value;
	const [previewTimeInterval, setPreviewTimeInterval] = useState(
		last1HourInterval,
	);

	return (
		<div>
			<div className="logs-filter-preview-header">
				<div>Filtered Logs Preview</div>
				<PreviewIntervalSelector
					previewFilter={filter}
					value={previewTimeInterval}
					onChange={setPreviewTimeInterval}
				/>
			</div>
			<div className="logs-filter-preview-content">
				<SampleLogs filter={filter} timeInterval={previewTimeInterval} />
			</div>
		</div>
	);
}

interface LogsFilterPreviewProps {
	filter: TagFilter;
}

export default LogsFilterPreview;
