import { Input } from 'antd';
import { ColumnsType } from 'antd/es/table';
import AlertPopover from 'container/AlertHistory/AlertPopover/AlertPopover';
import { convertValue } from 'lib/getConvertedValue';
import { debounce } from 'lodash-es';
import { Search } from 'lucide-react';
import AlertLabels from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
import { BaseSyntheticEvent } from 'react';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import { formatEpochTimestamp } from 'utils/timeUtils';

function LabelFilter({
	setSearchText,
}: {
	setSearchText: (text: string) => void;
}): JSX.Element {
	const handleSearch = (searchEv: BaseSyntheticEvent): void => {
		setSearchText(searchEv?.target?.value || '');
	};

	const handleDebouncedSearch = debounce(handleSearch, 300);

	return (
		<Input
			className="label-filter"
			placeholder="labels"
			onChange={handleDebouncedSearch}
			suffix={<Search size={14} color="var(--text-vanilla-100)" />}
		/>
	);
}

export const timelineTableColumns = (
	setSearchText: (text: string) => void,
	currentUnit?: string,
	targetUnit?: string,
): ColumnsType<AlertRuleTimelineTableResponse> => [
	{
		title: 'STATE',
		dataIndex: 'state',
		sorter: true,
		render: (value, record): JSX.Element => (
			<AlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-state">
					<AlertState state={value} showLabel />
				</div>
			</AlertPopover>
		),
	},
	{
		title: <LabelFilter setSearchText={setSearchText} />,
		dataIndex: 'labels',
		render: (labels, record): JSX.Element => (
			<AlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-labels">
					<AlertLabels labels={labels} />
				</div>
			</AlertPopover>
		),
	},
	{
		title: 'VALUE',
		dataIndex: 'value',
		render: (value, record): JSX.Element => (
			<AlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-value">
					{/* convert the value based on y axis and target unit */}
					{convertValue(value, currentUnit, targetUnit)}
				</div>
			</AlertPopover>
		),
	},
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		render: (value, record): JSX.Element => (
			<AlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-created-at">{formatEpochTimestamp(value)}</div>
			</AlertPopover>
		),
	},
];
