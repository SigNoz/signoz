import './styles.scss';

import { Select } from 'antd';
import {
	RelativeDurationOptions,
	Time,
} from 'container/TopNav/DateTimeSelection/config';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import LogsCountInInterval from './components/LogsCountInInterval';

function PreviewIntervalSelector({
	previewFilter,
	value,
	onChange,
}: PreviewIntervalSelectorProps): JSX.Element {
	const onSelectInterval = (value: unknown): void => onChange(value as Time);

	const isEmptyFilter = (previewFilter?.items?.length || 0) < 1;

	return (
		<div className="logs-filter-preview-time-interval-summary">
			{!isEmptyFilter && (
				<LogsCountInInterval filter={previewFilter} timeInterval={value} />
			)}
			<div>
				<Select value={value} onSelect={onSelectInterval}>
					{RelativeDurationOptions.map(({ value, label }) => (
						<Select.Option key={value + label} value={value}>
							{label}
						</Select.Option>
					))}
				</Select>
			</div>
		</div>
	);
}

interface PreviewIntervalSelectorProps {
	value: Time;
	onChange: (interval: Time) => void;
	previewFilter: TagFilter;
}

export default PreviewIntervalSelector;
