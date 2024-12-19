/* eslint-disable sonarjs/cognitive-complexity */
import './Uplot.styles.scss';

import * as Sentry from '@sentry/react';
import { Typography } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import { LineChart } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from 'react';
import UPlot from 'uplot';

import { dataMatch, optionsUpdateState } from './utils';

export interface UplotProps {
	options: uPlot.Options;
	data: uPlot.AlignedData;
	onDelete?: (chart: uPlot) => void;
	onCreate?: (chart: uPlot) => void;
	resetScales?: boolean;
}

const Uplot = forwardRef<ToggleGraphProps | undefined, UplotProps>(
	(
		{ options, data, onDelete, onCreate, resetScales = true },
		ref,
	): JSX.Element | null => {
		const chartRef = useRef<uPlot | null>(null);
		const propOptionsRef = useRef(options);
		const targetRef = useRef<HTMLDivElement>(null);
		const propDataRef = useRef(data);
		const onCreateRef = useRef(onCreate);
		const onDeleteRef = useRef(onDelete);

		useImperativeHandle(
			ref,
			(): ToggleGraphProps => ({
				toggleGraph(graphIndex: number, isVisible: boolean): void {
					chartRef.current?.setSeries(graphIndex, { show: isVisible });
				},
			}),
		);

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

			// remove chart tooltip on cleanup
			const overlay = document.getElementById('overlay');

			if (overlay) {
				overlay.style.display = 'none';
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

		if (data && data[0] && data[0]?.length === 0) {
			return (
				<div className="uplot-no-data not-found">
					<LineChart size={48} strokeWidth={0.5} />

					<Typography>No Data</Typography>
				</div>
			);
		}

		return (
			<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
				<div className="uplot-graph-container" ref={targetRef}>
					{data && data[0] && data[0]?.length === 0 ? (
						<div className="not-found">
							<Typography>No Data</Typography>
						</div>
					) : null}
				</div>
			</Sentry.ErrorBoundary>
		);
	},
);

Uplot.displayName = 'Uplot';

Uplot.defaultProps = {
	onDelete: undefined,
	onCreate: undefined,
	resetScales: true,
};

export default memo(Uplot);
