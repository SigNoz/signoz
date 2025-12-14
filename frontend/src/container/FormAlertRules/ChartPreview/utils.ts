import { Color } from '@signozhq/design-tokens';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Threshold } from 'container/CreateAlertV2/context/types';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import {
	BooleanFormats,
	DataFormats,
	DataRateFormats,
	MiscellaneousFormats,
	ThroughputFormats,
	TimeFormats,
} from 'container/NewWidget/RightContainer/types';
import { TFunction } from 'i18next';

import {
	dataFormatConfig,
	dataRateUnitsConfig,
	miscUnitsConfig,
	throughputConfig,
	timeUnitsConfig,
} from './config';

export function covertIntoDataFormats({
	value,
	sourceUnit,
	targetUnit,
}: IUnit): number {
	if (sourceUnit === undefined || targetUnit === undefined) {
		return value;
	}

	if (Object.values(BooleanFormats).includes(sourceUnit as BooleanFormats)) {
		return 1;
	}

	const sourceMultiplier =
		dataFormatConfig[sourceUnit as DataFormats] ||
		timeUnitsConfig[sourceUnit as TimeFormats] ||
		dataRateUnitsConfig[sourceUnit as DataRateFormats] ||
		miscUnitsConfig[sourceUnit as MiscellaneousFormats] ||
		throughputConfig[sourceUnit as ThroughputFormats];

	const targetDivider =
		dataFormatConfig[targetUnit as DataFormats] ||
		timeUnitsConfig[targetUnit as TimeFormats] ||
		dataRateUnitsConfig[targetUnit as DataRateFormats] ||
		miscUnitsConfig[targetUnit as MiscellaneousFormats] ||
		throughputConfig[sourceUnit as ThroughputFormats];

	const intermediateValue = value * sourceMultiplier;

	const roundedValue = Math.round(intermediateValue * 1000000) / 1000000;

	const result = roundedValue / targetDivider;

	return Number.isNaN(result) ? 0 : result;
}

export const getThresholdLabel = (
	optionName: string,
	value: number,
	unit?: string,
	yAxisUnit?: string,
): string => {
	if (
		unit === MiscellaneousFormats.PercentUnit ||
		yAxisUnit === MiscellaneousFormats.PercentUnit
	) {
		if (unit === MiscellaneousFormats.Percent) {
			return `${value}%`;
		}
		return `${value * 100}%`;
	}
	if (
		unit === MiscellaneousFormats.Percent ||
		yAxisUnit === MiscellaneousFormats.Percent
	) {
		if (unit === MiscellaneousFormats.PercentUnit) {
			return `${value * 100}%`;
		}
		return `${value}%`;
	}
	return `${value} ${optionName}`;
};

interface IUnit {
	value: number;
	sourceUnit?: string;
	targetUnit?: string;
}

export const getThresholds = (
	thresholds: Threshold[],
	t: TFunction,
	optionName: string,
	yAxisUnit: string,
): ThresholdProps[] => {
	const thresholdsToReturn = new Array<ThresholdProps>();

	thresholds.forEach((threshold, index) => {
		// Push main threshold
		const mainThreshold = {
			index: index.toString(),
			keyIndex: index,
			moveThreshold: (): void => {},
			selectedGraph: PANEL_TYPES.TIME_SERIES,
			thresholdValue: threshold.thresholdValue,
			thresholdLabel:
				threshold.label ||
				`${t('preview_chart_threshold_label')} (y=${getThresholdLabel(
					optionName,
					threshold.thresholdValue,
					threshold.unit,
					yAxisUnit,
				)})`,
			thresholdUnit: threshold.unit,
			thresholdColor: threshold.color || Color.TEXT_SAKURA_500,
		};
		thresholdsToReturn.push(mainThreshold);

		// Push recovery threshold
		if (threshold.recoveryThresholdValue) {
			const recoveryThreshold = {
				index: (thresholds.length + index).toString(),
				keyIndex: thresholds.length + index,
				moveThreshold: (): void => {},
				selectedGraph: PANEL_TYPES.TIME_SERIES, // no impact
				thresholdValue: threshold.recoveryThresholdValue,
				thresholdLabel: threshold.label
					? `${threshold.label} (Recovery)`
					: `${t('preview_chart_threshold_label')} (y=${getThresholdLabel(
							optionName,
							threshold.thresholdValue,
							threshold.unit,
							yAxisUnit,
					  )})`,
				thresholdUnit: threshold.unit,
				thresholdColor: threshold.color || Color.TEXT_SAKURA_500,
			};
			thresholdsToReturn.push(recoveryThreshold);
		}
	});
	return thresholdsToReturn;
};
