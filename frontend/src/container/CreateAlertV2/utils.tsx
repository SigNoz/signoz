import { createPortal } from 'react-dom';
import { Color } from '@signozhq/design-tokens';
import { Spin } from 'antd';
import { TIMEZONE_DATA } from 'components/CustomTimePicker/timezoneUtils';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { getRandomColor } from 'container/ExplorerOptions/utils';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';
import { v4 } from 'uuid';

import { useCreateAlertState } from './context';
import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from './context/constants';
import {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdMatchType,
	AlertThresholdOperator,
	AlertThresholdState,
	CreateAlertState,
	EvaluationWindowState,
	NotificationSettingsState,
} from './context/types';
import { EVALUATION_WINDOW_TIMEFRAME } from './EvaluationSettings/constants';

export function Spinner(): JSX.Element | null {
	const { isCreatingAlertRule, isUpdatingAlertRule } = useCreateAlertState();

	if (!isCreatingAlertRule && !isUpdatingAlertRule) {
		return null;
	}

	return createPortal(
		<div className="sticky-page-spinner">
			<Spin size="large" spinning />
		</div>,
		document.body,
	);
}

export function getColorForThreshold(thresholdLabel: string): string {
	if (thresholdLabel === 'critical') {
		return Color.BG_SAKURA_500;
	}
	if (thresholdLabel === 'warning') {
		return Color.BG_AMBER_500;
	}
	if (thresholdLabel === 'info') {
		return Color.BG_ROBIN_500;
	}
	return getRandomColor();
}

export function parseGoTime(input: string): {
	time: number;
	unit: UniversalYAxisUnit;
} {
	const regex = /(\d+)([hms])/g;
	const matches = [...input.matchAll(regex)];

	const nonZero = matches.find(([, value]) => parseInt(value, 10) > 0);
	if (!nonZero) {
		return { time: 1, unit: UniversalYAxisUnit.MINUTES };
	}

	const time = parseInt(nonZero[1], 10);
	const unitMap: Record<string, UniversalYAxisUnit> = {
		h: UniversalYAxisUnit.HOURS,
		m: UniversalYAxisUnit.MINUTES,
		s: UniversalYAxisUnit.SECONDS,
	};

	return { time, unit: unitMap[nonZero[2]] };
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function getEvaluationWindowStateFromAlertDef(
	alertDef: PostableAlertRuleV2,
): EvaluationWindowState {
	const windowType = alertDef.evaluation?.kind as 'rolling' | 'cumulative';

	function getRollingWindowTimeframe(): string {
		if (
			// Default values for rolling window
			EVALUATION_WINDOW_TIMEFRAME.rolling
				.map((option) => option.value)
				.includes(alertDef.evaluation?.spec?.evalWindow || '')
		) {
			return alertDef.evaluation?.spec?.evalWindow || '';
		}
		return 'custom';
	}

	function getCumulativeWindowTimeframe(): string {
		switch (alertDef.evaluation?.spec?.schedule?.type) {
			case 'hourly':
				return 'currentHour';
			case 'daily':
				return 'currentDay';
			case 'monthly':
				return 'currentMonth';
			default:
				return 'currentHour';
		}
	}

	function convertApiFieldToTime(hour: number, minute: number): string {
		return `${hour.toString().padStart(2, '0')}:${minute
			.toString()
			.padStart(2, '0')}:00`;
	}

	function getCumulativeWindowStartingAt(): EvaluationWindowState['startingAt'] {
		const timeframe = getCumulativeWindowTimeframe();
		if (timeframe === 'currentHour') {
			return {
				...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
				number: alertDef.evaluation?.spec?.schedule?.minute?.toString() || '0',
			};
		}
		if (timeframe === 'currentDay') {
			return {
				...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
				time: convertApiFieldToTime(
					alertDef.evaluation?.spec?.schedule?.hour || 0,
					alertDef.evaluation?.spec?.schedule?.minute || 0,
				),
				timezone: alertDef.evaluation?.spec?.timezone || TIMEZONE_DATA[0].value,
			};
		}
		if (timeframe === 'currentMonth') {
			return {
				...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
				number: alertDef.evaluation?.spec?.schedule?.day?.toString() || '0',
				timezone: alertDef.evaluation?.spec?.timezone || TIMEZONE_DATA[0].value,
				time: convertApiFieldToTime(
					alertDef.evaluation?.spec?.schedule?.hour || 0,
					alertDef.evaluation?.spec?.schedule?.minute || 0,
				),
			};
		}
		return INITIAL_EVALUATION_WINDOW_STATE.startingAt;
	}

	if (windowType === 'rolling') {
		const timeframe = getRollingWindowTimeframe();
		if (timeframe === 'custom') {
			return {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType,
				timeframe,
				startingAt: {
					...INITIAL_EVALUATION_WINDOW_STATE.startingAt,
					number: parseGoTime(
						alertDef.evaluation?.spec?.evalWindow || '1m',
					).time.toString(),
					unit: parseGoTime(alertDef.evaluation?.spec?.evalWindow || '1m').unit,
				},
			};
		}
		return {
			...INITIAL_EVALUATION_WINDOW_STATE,
			windowType,
			timeframe,
		};
	}

	return {
		...INITIAL_EVALUATION_WINDOW_STATE,
		windowType,
		timeframe: getCumulativeWindowTimeframe(),
		startingAt: getCumulativeWindowStartingAt(),
	};
}

export function getNotificationSettingsStateFromAlertDef(
	alertDef: PostableAlertRuleV2,
): NotificationSettingsState {
	const description = alertDef.annotations?.description || '';
	const multipleNotifications = alertDef.notificationSettings?.groupBy || [];
	const routingPolicies = alertDef.notificationSettings?.usePolicy || false;

	const reNotificationEnabled =
		alertDef.notificationSettings?.renotify?.enabled || false;
	const reNotificationConditions =
		alertDef.notificationSettings?.renotify?.alertStates?.map(
			(state) => state as 'firing' | 'nodata',
		) || [];
	const reNotificationValue = alertDef.notificationSettings?.renotify
		? parseGoTime(alertDef.notificationSettings.renotify.interval || '30m').time
		: 30;
	const reNotificationUnit = alertDef.notificationSettings?.renotify
		? parseGoTime(alertDef.notificationSettings.renotify.interval || '30m').unit
		: UniversalYAxisUnit.MINUTES;

	return {
		...INITIAL_NOTIFICATION_SETTINGS_STATE,
		description,
		multipleNotifications,
		routingPolicies,
		reNotification: {
			enabled: reNotificationEnabled,
			conditions: reNotificationConditions,
			value: reNotificationValue,
			unit: reNotificationUnit,
		},
	};
}

export function getAdvancedOptionsStateFromAlertDef(
	alertDef: PostableAlertRuleV2,
): AdvancedOptionsState {
	return {
		...INITIAL_ADVANCED_OPTIONS_STATE,
		sendNotificationIfDataIsMissing: {
			...INITIAL_ADVANCED_OPTIONS_STATE.sendNotificationIfDataIsMissing,
			toleranceLimit: alertDef.condition.absentFor || 0,
			enabled: alertDef.condition.alertOnAbsent || false,
		},
		enforceMinimumDatapoints: {
			...INITIAL_ADVANCED_OPTIONS_STATE.enforceMinimumDatapoints,
			minimumDatapoints: alertDef.condition.requiredNumPoints || 0,
			enabled: alertDef.condition.requireMinPoints || false,
		},
		evaluationCadence: {
			...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
			mode: 'default',
			default: {
				...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence.default,
				value: parseGoTime(alertDef.evaluation?.spec?.frequency || '1m').time,
				timeUnit: parseGoTime(alertDef.evaluation?.spec?.frequency || '1m').unit,
			},
		},
	};
}

// Mirrors the backend's CompareOperator.Normalize() in
// pkg/types/ruletypes/compare.go. Maps any accepted alias to the enum value
// the dropdown understands. Returns undefined for aliases the UI does not
// expose (e.g. above_or_equal, below_or_equal) so callers can keep the raw
// value on screen instead of silently rewriting it.
export function normalizeOperator(
	raw: string | undefined,
): AlertThresholdOperator | undefined {
	switch (raw) {
		case '1':
		case 'above':
		case '>':
			return AlertThresholdOperator.IS_ABOVE;
		case '2':
		case 'below':
		case '<':
			return AlertThresholdOperator.IS_BELOW;
		case '3':
		case 'equal':
		case 'eq':
		case '=':
			return AlertThresholdOperator.IS_EQUAL_TO;
		case '4':
		case 'not_equal':
		case 'not_eq':
		case '!=':
			return AlertThresholdOperator.IS_NOT_EQUAL_TO;
		case '7':
		case 'outside_bounds':
			return AlertThresholdOperator.ABOVE_BELOW;
		default:
			return undefined;
	}
}

// Mirrors the backend's MatchType.Normalize() in pkg/types/ruletypes/match.go.
export function normalizeMatchType(
	raw: string | undefined,
): AlertThresholdMatchType | undefined {
	switch (raw) {
		case '1':
		case 'at_least_once':
			return AlertThresholdMatchType.AT_LEAST_ONCE;
		case '2':
		case 'all_the_times':
			return AlertThresholdMatchType.ALL_THE_TIME;
		case '3':
		case 'on_average':
		case 'avg':
			return AlertThresholdMatchType.ON_AVERAGE;
		case '4':
		case 'in_total':
		case 'sum':
			return AlertThresholdMatchType.IN_TOTAL;
		case '5':
		case 'last':
			return AlertThresholdMatchType.LAST;
		default:
			return undefined;
	}
}

export function getThresholdStateFromAlertDef(
	alertDef: PostableAlertRuleV2,
): AlertThresholdState {
	return {
		...INITIAL_ALERT_THRESHOLD_STATE,
		thresholds:
			alertDef.condition.thresholds?.spec.map((threshold) => ({
				id: v4(),
				label: threshold.name,
				thresholdValue: threshold.target,
				recoveryThresholdValue: null,
				unit: threshold.targetUnit,
				color: getColorForThreshold(threshold.name),
				channels: threshold.channels,
			})) || [],
		selectedQuery: alertDef.condition.selectedQueryName || '',
		operator:
			alertDef.condition.thresholds?.spec[0].op || AlertThresholdOperator.IS_ABOVE,
		matchType:
			alertDef.condition.thresholds?.spec[0].matchType ||
			AlertThresholdMatchType.AT_LEAST_ONCE,
	};
}

export function getCreateAlertLocalStateFromAlertDef(
	alertDef: PostableAlertRuleV2 | undefined,
): CreateAlertState {
	if (!alertDef) {
		return {
			basic: INITIAL_ALERT_STATE,
			threshold: INITIAL_ALERT_THRESHOLD_STATE,
			advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
			evaluationWindow: INITIAL_EVALUATION_WINDOW_STATE,
			notificationSettings: INITIAL_NOTIFICATION_SETTINGS_STATE,
		};
	}
	// Basic alert state
	const basicAlertState: AlertState = {
		...INITIAL_ALERT_STATE,
		name: alertDef.alert,
		labels: alertDef.labels || {},
		yAxisUnit: alertDef.condition.compositeQuery.unit,
	};

	const thresholdState = getThresholdStateFromAlertDef(alertDef);

	const advancedOptionsState = getAdvancedOptionsStateFromAlertDef(alertDef);

	const evaluationWindowState = getEvaluationWindowStateFromAlertDef(alertDef);

	const notificationSettingsState =
		getNotificationSettingsStateFromAlertDef(alertDef);

	return {
		basic: basicAlertState,
		threshold: thresholdState,
		advancedOptions: advancedOptionsState,
		evaluationWindow: evaluationWindowState,
		notificationSettings: notificationSettingsState,
	};
}
