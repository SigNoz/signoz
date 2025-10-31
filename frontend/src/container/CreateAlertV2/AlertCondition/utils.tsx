import { Button, Flex, Switch, Typography } from 'antd';
import { BaseOptionType, DefaultOptionType, SelectProps } from 'antd/es/select';
import { getInvolvedQueriesInTraceOperator } from 'components/QueryBuilderV2/QueryV2/TraceOperator/utils/utils';
import { Y_AXIS_CATEGORIES } from 'components/YAxisUnitSelector/constants';
import ROUTES from 'constants/routes';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from 'container/CreateAlertV2/context/types';
import { getSelectedQueryOptions } from 'container/FormAlertRules/utils';
import { ArrowRight } from 'lucide-react';
import { IUser } from 'providers/App/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { USER_ROLES } from 'types/roles';

import { ROUTING_POLICIES_ROUTE } from './constants';
import { RoutingPolicyBannerProps } from './types';

export function getQueryNames(currentQuery: Query): BaseOptionType[] {
	const involvedQueriesInTraceOperator = getInvolvedQueriesInTraceOperator(
		currentQuery.builder.queryTraceOperator,
	);
	const queryConfig: Record<EQueryType, () => SelectProps['options']> = {
		[EQueryType.QUERY_BUILDER]: () => [
			...(getSelectedQueryOptions(currentQuery.builder.queryData)?.filter(
				(option) =>
					!involvedQueriesInTraceOperator.includes(option.value as string),
			) || []),
			...(getSelectedQueryOptions(currentQuery.builder.queryFormulas) || []),
			...(getSelectedQueryOptions(currentQuery.builder.queryTraceOperator) || []),
		],
		[EQueryType.PROM]: () => getSelectedQueryOptions(currentQuery.promql),
		[EQueryType.CLICKHOUSE]: () =>
			getSelectedQueryOptions(currentQuery.clickhouse_sql),
	};

	return queryConfig[currentQuery.queryType]?.() || [];
}

export function getCategoryByOptionId(id: string): string | undefined {
	return Y_AXIS_CATEGORIES.find((category) =>
		category.units.some((unit) => unit.id === id),
	)?.name;
}

export function getCategorySelectOptionByName(
	name: string,
): DefaultOptionType[] {
	return (
		Y_AXIS_CATEGORIES.find((category) => category.name === name)?.units.map(
			(unit) => ({
				label: unit.name,
				value: unit.id,
				'data-testid': `threshold-unit-select-option-${unit.id}`,
			}),
		) || []
	);
}

const getOperatorWord = (op: AlertThresholdOperator): string => {
	switch (op) {
		case AlertThresholdOperator.IS_ABOVE:
			return 'exceed';
		case AlertThresholdOperator.IS_BELOW:
			return 'fall below';
		case AlertThresholdOperator.IS_EQUAL_TO:
			return 'equal';
		case AlertThresholdOperator.IS_NOT_EQUAL_TO:
			return 'not equal';
		default:
			return 'exceed';
	}
};

const getThresholdValue = (op: AlertThresholdOperator): number => {
	switch (op) {
		case AlertThresholdOperator.IS_ABOVE:
			return 80;
		case AlertThresholdOperator.IS_BELOW:
			return 50;
		case AlertThresholdOperator.IS_EQUAL_TO:
			return 100;
		case AlertThresholdOperator.IS_NOT_EQUAL_TO:
			return 0;
		default:
			return 80;
	}
};

const getDataPoints = (
	matchType: AlertThresholdMatchType,
	op: AlertThresholdOperator,
): number[] => {
	const dataPointMap: Record<
		AlertThresholdMatchType,
		Record<AlertThresholdOperator, number[]>
	> = {
		[AlertThresholdMatchType.AT_LEAST_ONCE]: {
			[AlertThresholdOperator.IS_BELOW]: [60, 45, 40, 55, 35],
			[AlertThresholdOperator.IS_EQUAL_TO]: [95, 100, 105, 90, 100],
			[AlertThresholdOperator.IS_NOT_EQUAL_TO]: [5, 0, 10, 15, 0],
			[AlertThresholdOperator.IS_ABOVE]: [75, 85, 90, 78, 95],
			[AlertThresholdOperator.ABOVE_BELOW]: [75, 85, 90, 78, 95],
		},
		[AlertThresholdMatchType.ALL_THE_TIME]: {
			[AlertThresholdOperator.IS_BELOW]: [45, 40, 35, 42, 38],
			[AlertThresholdOperator.IS_EQUAL_TO]: [100, 100, 100, 100, 100],
			[AlertThresholdOperator.IS_NOT_EQUAL_TO]: [5, 10, 15, 8, 12],
			[AlertThresholdOperator.IS_ABOVE]: [85, 87, 90, 88, 95],
			[AlertThresholdOperator.ABOVE_BELOW]: [85, 87, 90, 88, 95],
		},
		[AlertThresholdMatchType.ON_AVERAGE]: {
			[AlertThresholdOperator.IS_BELOW]: [60, 40, 45, 35, 45],
			[AlertThresholdOperator.IS_EQUAL_TO]: [95, 105, 100, 95, 105],
			[AlertThresholdOperator.IS_NOT_EQUAL_TO]: [5, 10, 15, 8, 12],
			[AlertThresholdOperator.IS_ABOVE]: [75, 85, 90, 78, 95],
			[AlertThresholdOperator.ABOVE_BELOW]: [75, 85, 90, 78, 95],
		},
		[AlertThresholdMatchType.IN_TOTAL]: {
			[AlertThresholdOperator.IS_BELOW]: [8, 5, 10, 12, 8],
			[AlertThresholdOperator.IS_EQUAL_TO]: [20, 20, 20, 20, 20],
			[AlertThresholdOperator.IS_NOT_EQUAL_TO]: [10, 15, 25, 5, 30],
			[AlertThresholdOperator.IS_ABOVE]: [10, 15, 25, 5, 30],
			[AlertThresholdOperator.ABOVE_BELOW]: [10, 15, 25, 5, 30],
		},
		[AlertThresholdMatchType.LAST]: {
			[AlertThresholdOperator.IS_BELOW]: [75, 85, 90, 78, 45],
			[AlertThresholdOperator.IS_EQUAL_TO]: [75, 85, 90, 78, 100],
			[AlertThresholdOperator.IS_NOT_EQUAL_TO]: [75, 85, 90, 78, 25],
			[AlertThresholdOperator.IS_ABOVE]: [75, 85, 90, 78, 95],
			[AlertThresholdOperator.ABOVE_BELOW]: [75, 85, 90, 78, 95],
		},
	};

	return dataPointMap[matchType]?.[op] || [75, 85, 90, 78, 95];
};

const getTooltipOperatorSymbol = (op: AlertThresholdOperator): string => {
	const symbolMap: Record<AlertThresholdOperator, string> = {
		[AlertThresholdOperator.IS_ABOVE]: '>',
		[AlertThresholdOperator.IS_BELOW]: '<',
		[AlertThresholdOperator.IS_EQUAL_TO]: '=',
		[AlertThresholdOperator.IS_NOT_EQUAL_TO]: '!=',
		[AlertThresholdOperator.ABOVE_BELOW]: '>',
	};
	return symbolMap[op] || '>';
};

const handleTooltipClick = (
	e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
): void => {
	e.stopPropagation();
};

function TooltipContent({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handleTooltipClick}
			onKeyDown={(e): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					handleTooltipClick(e);
				}
			}}
			className="tooltip-content"
		>
			{children}
		</div>
	);
}

function TooltipExample({
	children,
	dataPoints,
	operatorSymbol,
	thresholdValue,
	matchType,
}: {
	children: React.ReactNode;
	dataPoints: number[];
	operatorSymbol: string;
	thresholdValue: number;
	matchType: AlertThresholdMatchType;
}): JSX.Element {
	return (
		<div className="tooltip-example">
			<strong>Example:</strong>
			<br />
			Say, For a 5-minute window (configured in Evaluation settings), 1 min
			aggregation interval (set up in query) → 5{' '}
			{matchType === AlertThresholdMatchType.IN_TOTAL
				? 'error counts'
				: 'data points'}
			: [{dataPoints.join(', ')}]<br />
			With threshold {operatorSymbol} {thresholdValue}: {children}
		</div>
	);
}

function TooltipLink(): JSX.Element {
	return (
		<div className="tooltip-link">
			<a
				href="https://signoz.io/docs"
				target="_blank"
				rel="noopener noreferrer"
				className="tooltip-link-text"
			>
				Learn more
			</a>
		</div>
	);
}

export const getMatchTypeTooltip = (
	matchType: AlertThresholdMatchType,
	operator: AlertThresholdOperator,
): React.ReactNode => {
	const operatorSymbol = getTooltipOperatorSymbol(operator);
	const operatorWord = getOperatorWord(operator);
	const thresholdValue = getThresholdValue(operator);
	const dataPoints = getDataPoints(matchType, operator);
	const getMatchingPointsCount = (): number =>
		dataPoints.filter((p) => {
			switch (operator) {
				case AlertThresholdOperator.IS_ABOVE:
					return p > thresholdValue;
				case AlertThresholdOperator.IS_BELOW:
					return p < thresholdValue;
				case AlertThresholdOperator.IS_EQUAL_TO:
					return p === thresholdValue;
				case AlertThresholdOperator.IS_NOT_EQUAL_TO:
					return p !== thresholdValue;
				default:
					return p > thresholdValue;
			}
		}).length;

	switch (matchType) {
		case AlertThresholdMatchType.AT_LEAST_ONCE:
			return (
				<TooltipContent>
					<div className="tooltip-description">
						Data is aggregated at each interval within your evaluation window,
						creating multiple data points. This option triggers if <span>ANY</span> of
						those aggregated data points crosses the threshold.
					</div>
					<TooltipExample
						dataPoints={dataPoints}
						operatorSymbol={operatorSymbol}
						thresholdValue={thresholdValue}
						matchType={matchType}
					>
						Alert triggers ({getMatchingPointsCount()} points {operatorWord}{' '}
						{thresholdValue})
					</TooltipExample>
					<TooltipLink />
				</TooltipContent>
			);

		case AlertThresholdMatchType.ALL_THE_TIME:
			return (
				<TooltipContent>
					<div className="tooltip-description">
						Data is aggregated at each interval within your evaluation window,
						creating multiple data points. This option triggers if <span>ALL</span>{' '}
						aggregated data points cross the threshold.
					</div>
					<TooltipExample
						dataPoints={dataPoints}
						operatorSymbol={operatorSymbol}
						thresholdValue={thresholdValue}
						matchType={matchType}
					>
						Alert triggers (all points {operatorWord} {thresholdValue})<br />
						If any point was {thresholdValue}, no alert would fire
					</TooltipExample>
					<TooltipLink />
				</TooltipContent>
			);

		case AlertThresholdMatchType.ON_AVERAGE: {
			const average = (
				dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length
			).toFixed(1);
			return (
				<TooltipContent>
					<div className="tooltip-description">
						Data is aggregated at each interval within your evaluation window,
						creating multiple data points. This option triggers if the{' '}
						<span>AVERAGE</span> of all aggregated data points crosses the threshold.
					</div>
					<TooltipExample
						dataPoints={dataPoints}
						operatorSymbol={operatorSymbol}
						thresholdValue={thresholdValue}
						matchType={matchType}
					>
						Alert triggers (average = {average})
					</TooltipExample>
					<TooltipLink />
				</TooltipContent>
			);
		}

		case AlertThresholdMatchType.IN_TOTAL: {
			const total = dataPoints.reduce((a, b) => a + b, 0);
			return (
				<TooltipContent>
					<div className="tooltip-description">
						Data is aggregated at each interval within your evaluation window,
						creating multiple data points. This option triggers if the{' '}
						<span>SUM</span> of all aggregated data points crosses the threshold.
					</div>
					<TooltipExample
						dataPoints={dataPoints}
						operatorSymbol={operatorSymbol}
						thresholdValue={thresholdValue}
						matchType={matchType}
					>
						Alert triggers (total = {total})
					</TooltipExample>
					<TooltipLink />
				</TooltipContent>
			);
		}

		case AlertThresholdMatchType.LAST: {
			const lastPoint = dataPoints[dataPoints.length - 1];
			return (
				<TooltipContent>
					<div className="tooltip-description">
						Data is aggregated at each interval within your evaluation window,
						creating multiple data points. This option triggers based on the{' '}
						<span>MOST RECENT</span> aggregated data point only.
					</div>
					<TooltipExample
						dataPoints={dataPoints}
						operatorSymbol={operatorSymbol}
						thresholdValue={thresholdValue}
						matchType={matchType}
					>
						Alert triggers (last point = {lastPoint})
					</TooltipExample>
					<TooltipLink />
				</TooltipContent>
			);
		}

		default:
			return '';
	}
};

export function NotificationChannelsNotFoundContent({
	user,
	refreshChannels,
}: {
	user: IUser;
	refreshChannels: () => void;
}): JSX.Element {
	return (
		<Flex justify="space-between">
			<Flex gap={4} align="center">
				<Typography.Text>No channels yet.</Typography.Text>
				{user?.role === USER_ROLES.ADMIN ? (
					<Typography.Text>
						Create one
						<Button
							style={{ padding: '0 4px' }}
							type="link"
							onClick={(): void => {
								window.open(ROUTES.CHANNELS_NEW, '_blank');
							}}
						>
							here.
						</Button>
					</Typography.Text>
				) : (
					<Typography.Text>Please ask your admin to create one.</Typography.Text>
				)}
			</Flex>
			<Button type="text" onClick={refreshChannels}>
				Refresh
			</Button>
		</Flex>
	);
}

export function RoutingPolicyBanner({
	notificationSettings,
	setNotificationSettings,
}: RoutingPolicyBannerProps): JSX.Element {
	return (
		<div className="routing-policies-info-banner">
			<Typography.Text>
				Use <strong>Routing Policies</strong> for dynamic routing
			</Typography.Text>
			<div className="routing-policies-info-banner-right">
				<Switch
					checked={notificationSettings.routingPolicies}
					data-testid="routing-policies-switch"
					onChange={(value): void => {
						setNotificationSettings({
							type: 'SET_ROUTING_POLICIES',
							payload: value,
						});
					}}
				/>
				<Button
					href={ROUTING_POLICIES_ROUTE}
					type="link"
					className="view-routing-policies-button"
					data-testid="view-routing-policies-button"
				>
					View Routing Policies
					<ArrowRight size={14} />
				</Button>
			</div>
		</div>
	);
}
