import { EllipsisOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { ColumnsType } from 'antd/es/table';
import ClientSideQBSearch, {
	AttributeKey,
} from 'components/ClientSideQBSearch/ClientSideQBSearch';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { ConditionalAlertPopover } from 'container/AlertHistory/AlertPopover/AlertPopover';
import { transformKeyValuesToAttributeValuesMap } from 'container/QueryBuilder/filters/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { Search } from 'lucide-react';
import AlertLabels, {
	AlertLabelsProps,
} from 'pages/AlertDetails/AlertHeader/AlertLabels/AlertLabels';
import AlertState from 'pages/AlertDetails/AlertHeader/AlertState/AlertState';
import { useMemo } from 'react';
import { AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

const transformLabelsToQbKeys = (
	labels: AlertRuleTimelineTableResponse['labels'],
): AttributeKey[] => Object.keys(labels).flatMap((key) => [{ key }]);

function LabelFilter({
	filters,
	setFilters,
	labels,
}: {
	setFilters: (filters: TagFilter) => void;
	filters: TagFilter;
	labels: AlertLabelsProps['labels'];
}): JSX.Element | null {
	const isDarkMode = useIsDarkMode();

	const { transformedKeys, attributesMap } = useMemo(
		() => ({
			transformedKeys: transformLabelsToQbKeys(labels || {}),
			attributesMap: transformKeyValuesToAttributeValuesMap(labels),
		}),
		[labels],
	);

	const handleSearch = (tagFilters: TagFilter): void => {
		const tagFiltersLength = tagFilters.items.length;

		if (
			(!tagFiltersLength && (!filters || !filters.items.length)) ||
			tagFiltersLength === filters?.items.length
		) {
			return;
		}
		setFilters(tagFilters);
	};

	return (
		<ClientSideQBSearch
			onChange={handleSearch}
			filters={filters}
			className="alert-history-label-search"
			attributeKeys={transformedKeys}
			attributeValuesMap={attributesMap}
			suffixIcon={
				<Search
					size={14}
					color={isDarkMode ? Color.TEXT_VANILLA_100 : Color.TEXT_INK_100}
				/>
			}
		/>
	);
}

export const timelineTableColumns = ({
	filters,
	labels,
	setFilters,
	formatTimezoneAdjustedTimestamp,
}: {
	filters: TagFilter;
	labels: AlertLabelsProps['labels'];
	setFilters: (filters: TagFilter) => void;
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string;
}): ColumnsType<AlertRuleTimelineTableResponse> => [
	{
		title: 'STATE',
		dataIndex: 'state',
		sorter: true,
		width: 140,
		render: (value): JSX.Element => (
			<div className="alert-rule-state">
				<AlertState state={value} showLabel />
			</div>
		),
	},
	{
		title: (
			<LabelFilter setFilters={setFilters} filters={filters} labels={labels} />
		),
		dataIndex: 'labels',
		render: (labels): JSX.Element => (
			<div className="alert-rule-labels">
				<AlertLabels labels={labels} />
			</div>
		),
	},
	{
		title: 'CREATED AT',
		dataIndex: 'unixMilli',
		width: 200,
		render: (value): JSX.Element => (
			<div className="alert-rule__created-at">
				{formatTimezoneAdjustedTimestamp(value, DATE_TIME_FORMATS.DASH_DATETIME)}
			</div>
		),
	},
	{
		title: 'ACTIONS',
		width: 140,
		align: 'right',
		render: (record): JSX.Element => (
			<ConditionalAlertPopover
				relatedTracesLink={record.relatedTracesLink}
				relatedLogsLink={record.relatedLogsLink}
			>
				<Button type="text" ghost>
					<EllipsisOutlined className="dropdown-icon" />
				</Button>
			</ConditionalAlertPopover>
		),
	},
];
