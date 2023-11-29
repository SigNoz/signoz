import { ExclamationCircleFilled } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';
import { Events } from 'constants/events';
import { QueryTable } from 'container/QueryTable';
import { createTableColumnsFromQuery } from 'lib/query/createTableColumnsFromQuery';
import { memo, ReactNode, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { eventEmitter } from 'utils/getEventEmitter';

import { WrapperStyled } from './styles';
import { GridTableComponentProps } from './types';
import { findMatchingThreshold } from './utils';

function GridTableComponent({
	data,
	query,
	thresholds,
	...props
}: GridTableComponentProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);
	const { columns, dataSource } = useMemo(
		() =>
			createTableColumnsFromQuery({
				query,
				queryTableData: data,
			}),
		[data, query],
	);

	const newColumnData = columns.map((e) => ({
		...e,
		render: (text: string): ReactNode => {
			const isNumber = !Number.isNaN(Number(text));
			if (thresholds && isNumber) {
				const { hasMultipleMatches, threshold } = findMatchingThreshold(
					thresholds,
					e.title as string,
					Number(text),
				);

				const idx = thresholds.findIndex(
					(t) => t.thresholdTableOptions === e.title,
				);
				if (threshold && idx !== -1) {
					return (
						<div
							style={
								threshold.thresholdFormat === 'Background'
									? { backgroundColor: threshold.thresholdColor }
									: { color: threshold.thresholdColor }
							}
						>
							<Space>
								{text}
								{hasMultipleMatches && (
									<Tooltip title={t('this_value_satisfies_multiple_thresholds')}>
										<ExclamationCircleFilled className="value-graph-icon" />
									</Tooltip>
								)}
							</Space>
						</div>
					);
				}
			}
			return <div>{text}</div>;
		},
	}));

	useEffect(() => {
		eventEmitter.emit(Events.TABLE_COLUMNS_DATA, {
			columns: newColumnData,
			dataSource,
		});
	}, [dataSource, newColumnData]);

	return (
		<WrapperStyled>
			<QueryTable
				query={query}
				queryTableData={data}
				loading={false}
				columns={newColumnData}
				dataSource={dataSource}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</WrapperStyled>
	);
}

export default memo(GridTableComponent);
