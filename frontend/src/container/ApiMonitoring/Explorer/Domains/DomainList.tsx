import '../Explorer.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Table, Typography } from 'antd';
import axios from 'api';
import logEvent from 'api/common/logEvent';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import cx from 'classnames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { HandleChangeQueryData } from 'types/common/operations.types';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	columnsConfig,
	formatDataForTable,
	hardcodedAttributeKeys,
} from '../../utils';
import DomainDetails from './DomainDetails/DomainDetails';

function DomainList({
	query,
	showIP,
	handleChangeQueryData,
}: {
	query: IBuilderQuery;
	showIP: boolean;
	handleChangeQueryData: HandleChangeQueryData;
}): JSX.Element {
	const [selectedDomainIndex, setSelectedDomainIndex] = useState<number>(-1);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const fetchApiOverview = async (): Promise<
		SuccessResponse<any> | ErrorResponse
	> => {
		const requestBody = {
			start: minTime,
			end: maxTime,
			show_ip: showIP,
			filters: {
				op: 'AND',
				items: query?.filters.items,
			},
		};

		try {
			const response = await axios.post(
				'/third-party-apis/overview/list',
				requestBody,
			);
			return {
				statusCode: 200,
				error: null,
				message: response.data.status,
				payload: response.data,
			};
		} catch (error) {
			return ErrorResponseHandler(error as AxiosError);
		}
	};

	const { data, isLoading, isFetching } = useQuery(
		[REACT_QUERY_KEY.GET_DOMAINS_LIST, minTime, maxTime, query, showIP],
		fetchApiOverview,
	);

	const formattedDataForTable = useMemo(
		() => formatDataForTable(data?.payload?.data?.result[0]?.table?.rows),
		[data],
	);

	return (
		<section className={cx('api-module-right-section')}>
			<div className={cx('api-monitoring-list-header')}>
				<QueryBuilderSearchV2
					query={query}
					onChange={(searchFilters): void =>
						handleChangeQueryData('filters', searchFilters)
					}
					placeholder="Search filters..."
					hardcodedAttributeKeys={hardcodedAttributeKeys}
				/>
				<DateTimeSelectionV2
					showAutoRefresh={false}
					showRefreshText={false}
					hideShareModal
				/>
			</div>
			<Table
				className={cx('api-monitoring-domain-list-table')}
				dataSource={isFetching || isLoading ? [] : formattedDataForTable}
				columns={columnsConfig}
				loading={{
					spinning: isFetching || isLoading,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				locale={{
					emptyText:
						isFetching || isLoading ? null : (
							<div className="no-filtered-domains-message-container">
								<div className="no-filtered-domains-message-content">
									<img
										src="/Icons/emptyState.svg"
										alt="thinking-emoji"
										className="empty-state-svg"
									/>

									<Typography.Text className="no-filtered-domains-message">
										This query had no results. Edit your query and try again!
									</Typography.Text>
								</div>
							</div>
						),
				}}
				scroll={{ x: true }}
				tableLayout="fixed"
				onRow={(record, index): { onClick: () => void; className: string } => ({
					onClick: (): void => {
						if (index !== undefined) {
							const dataIndex = formattedDataForTable.findIndex(
								(item) => item.key === record.key,
							);
							setSelectedDomainIndex(dataIndex);
							logEvent('API Monitoring: Domain name row clicked', {});
						}
					},
					className: 'expanded-clickable-row',
				})}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
				}
			/>
			{selectedDomainIndex !== -1 && (
				<DomainDetails
					domainData={formattedDataForTable[selectedDomainIndex]}
					selectedDomainIndex={selectedDomainIndex}
					setSelectedDomainIndex={setSelectedDomainIndex}
					domainListLength={formattedDataForTable.length}
					handleClose={(): void => {
						setSelectedDomainIndex(-1);
					}}
					domainListFilters={query?.filters}
				/>
			)}
		</section>
	);
}

export default DomainList;
