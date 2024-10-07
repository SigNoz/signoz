import './GridTableComponent.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Events } from 'constants/events';
import { QueryTable } from 'container/QueryTable';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { cloneDeep, get, isEmpty } from 'lodash-es';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { memo, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { eventEmitter } from 'utils/getEventEmitter';

import { WrapperStyled } from './styles';
import { GridTableComponentProps } from './types';
import {
	createColumnsAndDataSource,
	findMatchingThreshold,
	TableData,
} from './utils';

function GridTableComponent({
	data,
	query,
	thresholds,
	columnUnits,
	tableProcessedDataRef,
	sticky,
	...props
}: GridTableComponentProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);

	// create columns and dataSource in the ui friendly structure
	// use the query from the widget here to extract the legend information
	const { columns, dataSource: originalDataSource } = useMemo(
		() => createColumnsAndDataSource((data as unknown) as TableData, query),
		[query, data],
	);

	const createDataInCorrectFormat = useCallback(
		(dataSource: RowData[]): RowData[] =>
			dataSource.map((d) => {
				const finalObject: Record<string, number | string> = {};

				// we use the order of the columns here to have similar download as the user view
				// the [] access for the object is used because the titles can contain dot(.) as well
				columns.forEach((k) => {
					finalObject[`${get(k, 'title', '')}`] =
						d[`${get(k, 'dataIndex', '')}`] || 'n/a';
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
					const newValue = { ...val };
					Object.keys(val).forEach((k) => {
						if (columnUnits[k]) {
							// the check below takes care of not adding units for rows that have n/a values
							newValue[k] =
								val[k] !== 'n/a'
									? getYAxisFormattedValue(String(val[k]), columnUnits[k])
									: val[k];
							newValue[`${k}_without_unit`] = val[k];
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
								<LineClampedText
									text={text}
									lines={3}
									tooltipProps={{
										placement: 'right',
										autoAdjustOverflow: true,
										overlayClassName: 'long-text-tooltip',
									}}
								/>

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
			return (
				<div>
					<LineClampedText
						text={text}
						lines={3}
						tooltipProps={{
							placement: 'right',
							autoAdjustOverflow: true,
							overlayClassName: 'long-text-tooltip',
						}}
					/>
				</div>
			);
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
				sticky={sticky}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</WrapperStyled>
	);
}

export default memo(GridTableComponent);
