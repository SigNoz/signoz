import './Table.styles.scss';

import { Table } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	useGetAlertRuleDetailsTimelineTable,
	useTimelineTable,
} from 'pages/AlertDetails/hooks';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { PayloadProps } from 'types/api/alerts/get';

import { timelineTableColumns } from './useTimelineTable';

function TimelineTable(): JSX.Element {
	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsTimelineTable();

	const { timelineData, totalItems } = useMemo(() => {
		const response = data?.payload?.data;
		return {
			timelineData: response?.items,
			totalItems: response?.total,
		};
	}, [data?.payload?.data]);

	const [searchText, setSearchText] = useState('');
	const { paginationConfig, onChangeHandler } = useTimelineTable({
		totalItems: totalItems ?? 0,
	});

	const visibleTimelineData = useMemo(() => {
		if (searchText === '') {
			return timelineData;
		}
		return timelineData?.filter((data) =>
			JSON.stringify(data.labels).toLowerCase().includes(searchText.toLowerCase()),
		);
	}, [searchText, timelineData]);

	const queryClient = useQueryClient();

	const { currentUnit, targetUnit } = useMemo(() => {
		const alertDetailsQuery = queryClient.getQueryData([
			REACT_QUERY_KEY.ALERT_RULE_DETAILS,
			ruleId,
		]) as {
			payload: PayloadProps;
		};
		const condition = alertDetailsQuery?.payload?.data?.condition;
		const { targetUnit } = condition ?? {};
		const { unit: currentUnit } = condition?.compositeQuery ?? {};

		return { currentUnit, targetUnit };
	}, [queryClient, ruleId]);

	const { t } = useTranslation('common');

	if (isError || !isValidRuleId || !ruleId) {
		return <div>{t('something_went_wrong')}</div>;
	}

	return (
		<div className="timeline-table">
			<Table
				rowKey={(row): string => `${row.fingerprint}-${row.value}`}
				columns={timelineTableColumns(setSearchText, currentUnit, targetUnit)}
				dataSource={visibleTimelineData}
				pagination={paginationConfig}
				size="middle"
				onChange={onChangeHandler}
				loading={isLoading || isRefetching}
			/>
		</div>
	);
}

export default TimelineTable;
