import { SelectSimple } from '@signozhq/ui/select';
import { RelativeDurationOptions } from 'container/TopNav/DateTimeSelectionV2/constants';
import { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import LogsCountInInterval from './components/LogsCountInInterval';

import './styles.scss';

function PreviewIntervalSelector({
	previewFilter,
	value,
	onChange,
}: PreviewIntervalSelectorProps): JSX.Element {
	const onSelectInterval = (value: string | string[]): void =>
		onChange(value as Time);

	const isEmptyFilter = (previewFilter?.items?.length || 0) < 1;

	const items = RelativeDurationOptions.map(({ value, label }) => ({
		value,
		label,
	}));

	return (
		<div className="logs-filter-preview-time-interval-summary">
			{!isEmptyFilter && (
				<LogsCountInInterval filter={previewFilter} timeInterval={value} />
			)}
			<div>
				<SelectSimple value={value} onChange={onSelectInterval} items={items} />
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
