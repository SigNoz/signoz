import { EditFilled } from '@ant-design/icons';
import { Typography } from 'antd';
import Modal from 'antd/es/modal/Modal';
import RawLogView from 'components/Logs/RawLogView';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import LogsContextList from 'container/LogsContextList';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo, useCallback, useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { EditButton, TitleWrapper } from './styles';

interface LogsExplorerContextProps {
	log: ILog;
	onClose: () => void;
}

function LogsExplorerContext({
	log,
	onClose,
}: LogsExplorerContextProps): JSX.Element {
	const { updateAllQueriesOperators } = useQueryBuilder();

	const initialContextQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.logs,
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			),
		[updateAllQueriesOperators],
	);

	const [contextQuery, setContextQuery] = useState<Query>(initialContextQuery);
	const [filters, setFilters] = useState<TagFilter | null>(null);
	const [isEdit, setIsEdit] = useState<boolean>(false);

	const isDarkMode = useIsDarkMode();

	const handleClickEditButton = useCallback(
		() => setIsEdit((prevValue) => !prevValue),
		[],
	);

	const handleSearch = useCallback(
		(tagFilters: TagFilter): void => {
			const tagFiltersLength = tagFilters.items.length;

			if (
				(!tagFiltersLength && (!filters || !filters.items.length)) ||
				tagFiltersLength === filters?.items.length
			)
				return;

			const nextQuery: Query = {
				...contextQuery,
				builder: {
					...contextQuery.builder,
					queryData: contextQuery.builder.queryData.map((item) => ({
						...item,
						filters: tagFilters,
					})),
				},
			};

			setFilters(tagFilters);
			setContextQuery(nextQuery);
		},
		[contextQuery, filters],
	);

	const contextListParams = useMemo(
		() => ({ log, isEdit, filters, query: contextQuery }),
		[isEdit, log, filters, contextQuery],
	);

	return (
		<Modal
			centered
			destroyOnClose
			open
			width={816}
			onCancel={onClose}
			onOk={onClose}
			footer={null}
			title={
				<TitleWrapper block>
					<Typography>Logs Context</Typography>

					<EditButton
						$isDarkMode={isDarkMode}
						size="small"
						type="text"
						icon={<EditFilled />}
						onClick={handleClickEditButton}
					/>
				</TitleWrapper>
			}
		>
			{isEdit && (
				<QueryBuilderSearch
					query={contextQuery?.builder.queryData[0]}
					onChange={handleSearch}
				/>
			)}
			<LogsContextList
				order={FILTERS.ASC}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...contextListParams}
			/>
			<RawLogView isActiveLog isReadOnly data={log} linesPerRow={1} />
			<LogsContextList
				order={FILTERS.DESC}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...contextListParams}
			/>
		</Modal>
	);
}

export default memo(LogsExplorerContext);
