import { Color } from '@signozhq/design-tokens';
import { Input } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
import { useIsDarkMode } from 'hooks/useDarkMode';
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
	const isDarkMode = useIsDarkMode();

	return (
		<Input
			className="label-filter"
			placeholder="labels"
			onChange={handleDebouncedSearch}
			suffix={
				<Search
					size={14}
					color={isDarkMode ? Color.TEXT_VANILLA_100 : Color.TEXT_INK_100}
				/>
			}
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
		width: '12.5%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-state">
					<AlertState state={value} showLabel />
				</div>
			</ConditionalAlertPopover>
		),
	},
	{
		title: <LabelFilter setSearchText={setSearchText} />,
		dataIndex: 'labels',
		width: '54.5%',
		render: (labels, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-labels">
					<AlertLabels labels={labels} />
				</div>
			</ConditionalAlertPopover>
		),
	},
	{
		title: 'VALUE',
		dataIndex: 'value',
		width: '14%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-value">
					{/* convert the value based on y axis and target unit */}
					{convertValue(value.toFixed(2), currentUnit, targetUnit)}
				</div>
			</ConditionalAlertPopover>
		),
	},
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		width: '32.5%',
		render: (value, record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<div className="alert-rule-created-at">{formatEpochTimestamp(value)}</div>
			</ConditionalAlertPopover>
		),
	},
];
