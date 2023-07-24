import { EditFilled } from '@ant-design/icons';
import { Typography } from 'antd';
import Modal from 'antd/es/modal/Modal';
import RawLogView from 'components/Logs/RawLogView';
import LogsContextList from 'container/LogsContextList';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo, useCallback, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import { EditButton, TitleWrapper } from './styles';

interface LogsExplorerContextProps {
	log: ILog;
	onClose: () => void;
}

function LogsExplorerContext({
	log,
	onClose,
}: LogsExplorerContextProps): JSX.Element {
	const [isEdit, setIsEdit] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();

	const { currentQuery, handleSetQueryData } = useQueryBuilder();

	const handleClickEditButton = useCallback(
		() => setIsEdit((prevValue) => !prevValue),
		[],
	);

	const handleSearch = useCallback(
		(filters: TagFilter): void => {
			const queryData: IBuilderQuery = {
				...currentQuery.builder.queryData[0],
				filters,
			};

			handleSetQueryData(0, queryData);
		},

		[currentQuery, handleSetQueryData],
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
					query={currentQuery.builder.queryData[0]}
					onChange={handleSearch}
				/>
			)}

			<LogsContextList log={log} order={FILTERS.ASC} />
			<RawLogView isActiveLog isReadOnly data={log} linesPerRow={1} />
			<LogsContextList log={log} order={FILTERS.DESC} />
		</Modal>
	);
}

export default memo(LogsExplorerContext);
