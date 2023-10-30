import './uplot.scss';

import { Typography } from 'antd';
import { useCallback, useEffect, useRef } from 'react';
import UPlot from 'uplot';

import { dataMatch, optionsUpdateState } from './utils';

export interface UplotProps {
	options: uPlot.Options;
	data: uPlot.AlignedData;
	onDelete?: (chart: uPlot) => void;
	onCreate?: (chart: uPlot) => void;
	resetScales?: boolean;
}

function Uplot({
	options,
	data,
	onDelete,
	onCreate,
	resetScales = true,
}: UplotProps): JSX.Element | null {
	const chartRef = useRef<uPlot | null>(null);
	const propOptionsRef = useRef(options);
	const targetRef = useRef<HTMLDivElement>(null);
	const propDataRef = useRef(data);
	const onCreateRef = useRef(onCreate);
	const onDeleteRef = useRef(onDelete);

	useEffect(() => {
		onCreateRef.current = onCreate;
		onDeleteRef.current = onDelete;
	});

	const destroy = useCallback((chart: uPlot | null) => {
		if (chart) {
			onDeleteRef.current?.(chart);
			chart.destroy();
			chartRef.current = null;
		}
	}, []);

	const create = useCallback(() => {
		if (targetRef.current === null) return;

		// If data is empty, hide cursor
		if (data && data[0] && data[0]?.length === 0) {
			propOptionsRef.current = {
				...propOptionsRef.current,
				cursor: { show: false },
			};
		}

		const newChart = new UPlot(
			propOptionsRef.current,
			propDataRef.current,
			targetRef.current,
		);

		chartRef.current = newChart;
		onCreateRef.current?.(newChart);
	}, [data]);

	useEffect(() => {
		create();
		return (): void => {
			destroy(chartRef.current);
		};
	}, [create, destroy]);

	useEffect(() => {
		if (propOptionsRef.current !== options) {
			const optionsState = optionsUpdateState(propOptionsRef.current, options);
			propOptionsRef.current = options;
			if (!chartRef.current || optionsState === 'create') {
				destroy(chartRef.current);
				create();
			} else if (optionsState === 'update') {
				chartRef.current.setSize({
					width: options.width,
					height: options.height,
				});
			}
		}
	}, [options, create, destroy]);

	useEffect(() => {
		if (propDataRef.current !== data) {
			if (!chartRef.current) {
				propDataRef.current = data;
				create();
			} else if (!dataMatch(propDataRef.current, data)) {
				if (resetScales) {
					chartRef.current.setData(data, true);
				} else {
					chartRef.current.setData(data, false);
					chartRef.current.redraw();
				}
			}
			propDataRef.current = data;
		}
	}, [data, resetScales, create]);

	return (
		<div ref={targetRef}>
			{data && data[0] && data[0]?.length === 0 ? (
				<div className="not-found">
					<Typography>No Data</Typography>
				</div>
			) : null}
		</div>
	);
}

Uplot.defaultProps = {
	onDelete: undefined,
	onCreate: undefined,
	resetScales: true,
};

export default Uplot;
