import './Table.styles.scss';

import { Table } from 'antd';
import { initialFilters } from 'constants/queryBuilder';
import {
	useGetAlertRuleDetailsTimelineTable,
	useTimelineTable,
} from 'pages/AlertDetails/hooks';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { timelineTableColumns } from './useTimelineTable';

function TimelineTable(): JSX.Element {
	const [filters, setFilters] = useState<TagFilter>(initialFilters);

	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsTimelineTable({ filters });

	const { timelineData, totalItems } = useMemo(() => {
		const response = data?.payload?.data;
		return {
			timelineData: response?.items,
			totalItems: response?.total,
		};
	}, [data?.payload?.data]);

	const { paginationConfig, onChangeHandler } = useTimelineTable({
		totalItems: totalItems ?? 0,
	});

	const { t } = useTranslation('common');

	const labelsFromFirstItem = useMemo(
		() => data?.payload?.data?.items?.[0]?.labels ?? {},
		[data],
	);

	if (isError || !isValidRuleId || !ruleId) {
		return <div>{t('something_went_wrong')}</div>;
	}

	return (
		<div className="timeline-table">
			<Table
				rowKey={(row): string => `${row.fingerprint}-${row.value}-${row.unixMilli}`}
				columns={timelineTableColumns({
					filters,
					setFilters,
					labels: labelsFromFirstItem,
				})}
				dataSource={timelineData}
				pagination={paginationConfig}
				size="middle"
				onChange={onChangeHandler}
				loading={isLoading || isRefetching}
			/>
		</div>
	);
}

export default TimelineTable;
