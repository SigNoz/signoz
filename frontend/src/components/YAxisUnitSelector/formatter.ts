import { formattedValueToString, getValueFormat } from '@grafana/data';
import {
	AdditionalLabelsMappingForGrafanaUnits,
	CUSTOM_SCALING_FAMILIES,
	UniversalUnitToGrafanaUnit,
} from 'components/YAxisUnitSelector/constants';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

const format = (
	formatStr: string,
	value: number,
): ReturnType<ReturnType<typeof getValueFormat>> =>
	getValueFormat(formatStr)(value, undefined, undefined, undefined);

function scaleValue(
	value: number,
	unit: UniversalYAxisUnit,
	family: UniversalYAxisUnit[],
	factor: number,
): { value: number; label: string } {
	let idx = family.indexOf(unit);
	// If the unit is not in the family, return the unit with the additional label
	if (idx === -1) {
		return { value, label: AdditionalLabelsMappingForGrafanaUnits[unit] || '' };
	}

	// Scale the value up or down to the nearest unit in the family
	let scaled = value;
	// Scale up
	while (scaled >= factor && idx < family.length - 1) {
		scaled /= factor;
		idx += 1;
	}
	// Scale down
	while (scaled < 1 && idx > 0) {
		scaled *= factor;
		idx -= 1;
	}

	// Return the scaled value and the label of the nearest unit in the family
	return {
		value: scaled,
		label: AdditionalLabelsMappingForGrafanaUnits[family[idx]] || '',
	};
}

export function formatUniversalUnit(
	value: number,
	unit: UniversalYAxisUnit,
): string {
	// Check if this unit belongs to a family that needs custom scaling
	const family = CUSTOM_SCALING_FAMILIES.find((family) =>
		family.units.includes(unit),
	);
	if (family) {
		const scaled = scaleValue(value, unit, family.units, family.scaleFactor);
		const formatted = format('none', scaled.value);
		return `${formatted.text} ${scaled.label}`;
	}

	// Use Grafana formatting with custom label mappings
	const grafanaFormat = UniversalUnitToGrafanaUnit[unit];
	if (grafanaFormat) {
		const formatted = format(grafanaFormat, value);
		return formattedValueToString(formatted);
	}

	// Fallback to short format for other units
	return `${format('short', value).text} ${unit}`;
}
