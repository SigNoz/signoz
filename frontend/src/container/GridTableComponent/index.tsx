import { ExclamationCircleFilled } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Events } from 'constants/events';
import { QueryTable } from 'container/QueryTable';
import {
	createTableColumnsFromQuery,
	RowData,
} from 'lib/query/createTableColumnsFromQuery';
import { cloneDeep, get, isEmpty, set } from 'lodash-es';
import { memo, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { eventEmitter } from 'utils/getEventEmitter';

import { WrapperStyled } from './styles';
import { GridTableComponentProps } from './types';
import { findMatchingThreshold } from './utils';

function GridTableComponent({
	data,
	query,
	thresholds,
	columnUnits,
	tableProcessedDataRef,
	...props
}: GridTableComponentProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);
	const { columns, dataSource: originalDataSource } = useMemo(
		() =>
			createTableColumnsFromQuery({
				query,
				queryTableData: data,
			}),
		[data, query],
	);
	const createDataInCorrectFormat = useCallback(
		(dataSource: RowData[]): RowData[] =>
			dataSource.map((d) => {
				const finalObject = {};
				const keys = Object.keys(d);
				keys.forEach((k) => {
					const label = get(
						columns.find((c) => get(c, 'dataIndex', '') === k) || {},
						'title',
						'',
					);
					if (label) {
						set(finalObject, label as string, d[k]);
					}
				});
				return finalObject as RowData;
			}),
		[columns],
	);

	const applyColumnUnits = useCallback(
		(dataSource: RowData[]): RowData[] => {
			let mutateDataSource = cloneDeep(dataSource);
			if (isEmpty(columnUnits)) {
				return mutateDataSource;
			}

			mutateDataSource = mutateDataSource.map(
				(val): RowData => {
					const newValue = val;
					Object.keys(val).forEach((k) => {
						if (columnUnits[k]) {
							newValue[k] = getYAxisFormattedValue(String(val[k]), columnUnits[k]);
						}
					});
					return newValue;
				},
			);

			return mutateDataSource;
		},
		[columnUnits],
	);

	const dataSource = useMemo(() => applyColumnUnits(originalDataSource), [
		applyColumnUnits,
		originalDataSource,
	]);

	useEffect(() => {
		if (tableProcessedDataRef) {
			// eslint-disable-next-line no-param-reassign
			tableProcessedDataRef.current = createDataInCorrectFormat(dataSource);
		}
	}, [createDataInCorrectFormat, dataSource, tableProcessedDataRef]);

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
