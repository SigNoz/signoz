import './LegendColors.styles.scss';

import { Button, Collapse, ColorPicker, Tooltip, Typography } from 'antd';
import { themeColors } from 'constants/theme';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { Palette } from 'lucide-react';
import {
	Dispatch,
	SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

// Component for legend text with conditional tooltip
function LegendText({ label }: { label: string }): JSX.Element {
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const checkOverflow = (): void => {
			if (textRef.current) {
				const isTextOverflowing =
					textRef.current.scrollWidth > textRef.current.clientWidth;
				setIsOverflowing(isTextOverflowing);
			}
		};

		checkOverflow();
		// Check on window resize
		window.addEventListener('resize', checkOverflow);
		return (): void => window.removeEventListener('resize', checkOverflow);
	}, [label]);

	return (
		<Tooltip title={label} open={isOverflowing ? undefined : false}>
			<span ref={textRef} className="legend-label-text">
				{label}
			</span>
		</Tooltip>
	);
}

interface LegendColorsProps {
	customLegendColors: Record<string, string>;
	setCustomLegendColors: Dispatch<SetStateAction<Record<string, string>>>;
	queryResponse?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
}

function LegendColors({
	customLegendColors,
	setCustomLegendColors,
	queryResponse = null as any,
}: LegendColorsProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const isDarkMode = useIsDarkMode();

	// Get legend labels from query response or current query
	const legendLabels = useMemo(() => {
		if (queryResponse?.data?.payload?.data?.result) {
			return queryResponse.data.payload.data.result.map((item: any) =>
				getLegend(
					item,
					currentQuery,
					getLabelName(item.metric || {}, item.queryName || '', item.legend || ''),
				),
			);
		}

		// Fallback to query data if no response available
		return currentQuery.builder.queryData.map((query) =>
			getLabelName({}, query.queryName || '', query.legend || ''),
		);
	}, [queryResponse, currentQuery]);

	// Get current or default color for a legend
	const getColorForLegend = (label: string): string => {
		if (customLegendColors[label]) {
			return customLegendColors[label];
		}
		return generateColor(
			label,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		);
	};

	// Handle color change
	const handleColorChange = (label: string, color: string): void => {
		setCustomLegendColors((prev) => ({
			...prev,
			[label]: color,
		}));
	};

	// Reset to default color
	const resetToDefault = (label: string): void => {
		setCustomLegendColors((prev) => {
			const updated = { ...prev };
			delete updated[label];
			return updated;
		});
	};

	// Reset all colors to default
	const resetAllColors = (): void => {
		setCustomLegendColors({});
	};

	const items = [
		{
			key: 'legend-colors',
			label: (
				<section className="legend-colors-header">
					<Palette size={16} />
					<Typography.Text className="typography">Legend Colors</Typography.Text>
				</section>
			),
			children: (
				<div className="legend-colors-content">
					{legendLabels.length === 0 ? (
						<Typography.Text type="secondary">
							No legends available. Run a query to see legend options.
						</Typography.Text>
					) : (
						<>
							<div className="legend-colors-header">
								<Button
									size="small"
									type="text"
									onClick={resetAllColors}
									disabled={Object.keys(customLegendColors).length === 0}
								>
									Reset All
								</Button>
							</div>
							<div className="legend-items">
								{legendLabels.map((label: string) => (
									<div key={label} className="legend-item-wrapper">
										<ColorPicker
											value={getColorForLegend(label)}
											onChange={(color): void =>
												handleColorChange(label, color.toHexString())
											}
											size="small"
											showText={false}
											trigger="click"
										>
											<div className="legend-item">
												<div className="legend-info">
													<div
														className="legend-marker"
														style={{ backgroundColor: getColorForLegend(label) }}
													/>
													<LegendText label={label} />
												</div>
												{customLegendColors[label] && (
													<div className="legend-actions">
														<Typography.Link
															className="reset-link"
															onClick={(e): void => {
																e.stopPropagation();
																resetToDefault(label);
															}}
														>
															Reset
														</Typography.Link>
													</div>
												)}
											</div>
										</ColorPicker>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			),
		},
	];

	return (
		<div className="legend-colors-container">
			<Collapse
				items={items}
				ghost
				size="small"
				expandIconPosition="end"
				className="legend-colors-collapse"
				accordion
			/>
		</div>
	);
}

LegendColors.defaultProps = {
	queryResponse: null,
};

export default LegendColors;
