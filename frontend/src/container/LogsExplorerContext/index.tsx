import { EditFilled } from '@ant-design/icons';
import { Modal, Typography } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import LogsContextList from 'container/LogsContextList';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo, useCallback, useState } from 'react';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { EditButton, LogContainer, TitleWrapper } from './styles';
import { LogsExplorerContextProps } from './types';
import useInitialQuery from './useInitialQuery';

function LogsExplorerContext({
	log,
	onClose,
}: LogsExplorerContextProps): JSX.Element | null {
	const initialContextQuery = useInitialQuery(log);

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
				order={ORDERBY_FILTERS.ASC}
				filters={filters}
				isEdit={isEdit}
				log={log}
				query={contextQuery}
			/>
			<LogContainer>
				<RawLogView
					isActiveLog
					isReadOnly
					isTextOverflowEllipsisDisabled
					data={log}
					linesPerRow={1}
					fontSize={FontSize.SMALL}
				/>
			</LogContainer>
			<LogsContextList
				order={ORDERBY_FILTERS.DESC}
				filters={filters}
				isEdit={isEdit}
				log={log}
				query={contextQuery}
			/>
		</Modal>
	);
}

export default memo(LogsExplorerContext);
