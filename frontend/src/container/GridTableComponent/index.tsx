/* eslint-disable sonarjs/no-duplicate-string */
import './GridTableComponent.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Events } from 'constants/events';
import { QueryTable } from 'container/QueryTable';
import { getColumnUnit, RowData } from 'lib/query/createTableColumnsFromQuery';
import { cloneDeep, get, isEmpty } from 'lodash-es';
import { Compass } from 'lucide-react';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { memo, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { eventEmitter } from 'utils/getEventEmitter';

import { WrapperStyled } from './styles';
import { GridTableComponentProps } from './types';
import {
	createColumnsAndDataSource,
	findMatchingThreshold,
	TableData,
} from './utils';

const ButtonWrapper = styled.div`
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
`;

const RelativeWrapper = styled.div`
	position: relative;
`;

function GridTableComponent({
	data,
	query,
	thresholds,
	columnUnits,
	tableProcessedDataRef,
	sticky,
	openTracesButton,
	onOpenTraceBtnClick,
	customOnRowClick,
	widgetId,
	panelType,
	queryRangeRequest,
	decimalPrecision,
	hiddenColumns = [],
	...props
}: GridTableComponentProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);

	// create columns and dataSource in the ui friendly structure
	// use the query from the widget here to extract the legend information
	const { columns: allColumns, dataSource: originalDataSource } = useMemo(
		() => createColumnsAndDataSource((data as unknown) as TableData, query),
		[query, data],
	);

	// Filter out hidden columns from being displayed
	const columns = useMemo(
		() =>
			allColumns.filter(
				(column) =>
					!('dataIndex' in column) ||
					!hiddenColumns.includes(column.dataIndex as string),
			),
		[allColumns, hiddenColumns],
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
						const unit = getColumnUnit(k, columnUnits);

						if (unit) {
							// the check below takes care of not adding units for rows that have n/a or null values
							if (val[k] !== 'n/a' && val[k] !== null) {
								newValue[k] = getYAxisFormattedValue(
									String(val[k]),
									unit,
									decimalPrecision,
								);
							} else if (val[k] === null) {
								newValue[k] = 'n/a';
							}
							newValue[`${k}_without_unit`] = val[k];
						}
					});
					return newValue;
				},
			);

			return mutateDataSource;
		},
		[columnUnits, decimalPrecision],
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

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const newColumnData = columns.map((e) => ({
		...e,
		render: (text: string, ...rest: any): ReactNode => {
			let textForThreshold = text;
			const dataIndex = (e as ColumnType<RowData>)?.dataIndex || e.title;
			const unit = getColumnUnit(dataIndex as string, columnUnits || {});
			if (unit) {
				textForThreshold = rest[0][`${dataIndex}_without_unit`];
			}
			const isNumber = !Number.isNaN(Number(textForThreshold));

			if (thresholds && isNumber) {
				const { hasMultipleMatches, threshold } = findMatchingThreshold(
					thresholds,
					dataIndex as string,
					Number(textForThreshold),
					unit,
				);

				const idx = thresholds.findIndex(
					(t) => t.thresholdTableOptions === dataIndex,
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

	const columnDataWithOpenTracesButton = useMemo(
		() =>
			newColumnData.map((column, index) => ({
				...column,
				render: (text: string): JSX.Element => {
					const LineClampedTextComponent = (
						<LineClampedText
							text={text}
							lines={3}
							tooltipProps={{
								placement: 'right',
								autoAdjustOverflow: true,
								overlayClassName: 'long-text-tooltip',
							}}
						/>
					);
					if (index !== 0) {
						return <div>{LineClampedTextComponent}</div>;
					}

					return (
						<RelativeWrapper>
							{LineClampedTextComponent}
							<ButtonWrapper className="hover-button">
								<button type="button" className="open-traces-button">
									<Compass size={12} />
									Open Trace
								</button>
							</ButtonWrapper>
						</RelativeWrapper>
					);
				},
			})),
		[newColumnData],
	);

	const newColumnsWithRenderColumnCell = useMemo(
		() =>
			newColumnData.map((column) => ({
				...column,
				...('dataIndex' in column &&
				props.renderColumnCell?.[column.dataIndex as string]
					? { render: props.renderColumnCell[column.dataIndex as string] }
					: {}),
			})),
		[newColumnData, props.renderColumnCell],
	);

	const newColumnsWithCustomColTitles = useMemo(
		() =>
			newColumnsWithRenderColumnCell.map((column) => ({
				...column,
				...('dataIndex' in column &&
				props.customColTitles?.[column.dataIndex as string]
					? { title: props.customColTitles[column.dataIndex as string] }
					: {}),
			})),
		[newColumnsWithRenderColumnCell, props.customColTitles],
	);

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
				columns={
					openTracesButton
						? columnDataWithOpenTracesButton
						: newColumnsWithCustomColTitles
				}
				dataSource={dataSource}
				sticky={sticky}
				widgetId={widgetId}
				panelType={panelType}
				queryRangeRequest={queryRangeRequest}
				onRow={
					openTracesButton || customOnRowClick
						? (record): React.HTMLAttributes<HTMLElement> => ({
								onClick: (): void => {
									if (openTracesButton) {
										onOpenTraceBtnClick?.(record);
									}
									customOnRowClick?.(record);
								},
						  })
						: undefined
				}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</WrapperStyled>
	);
}

export default memo(GridTableComponent);
