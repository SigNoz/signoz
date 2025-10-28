import { formattedValueToString, getValueFormat } from '@grafana/data';
import {
	AdditionalLabelsMappingForGrafanaUnits,
	CUSTOM_SCALING_FAMILIES,
	UniversalUnitToGrafanaUnit,
} from 'components/YAxisUnitSelector/constants';
import {
	UnitFamilyConfig,
	UniversalYAxisUnit,
} from 'components/YAxisUnitSelector/types';

const format = (
	formatStr: string,
	value: number,
): ReturnType<ReturnType<typeof getValueFormat>> =>
	getValueFormat(formatStr)(value, undefined, undefined, undefined);

function getUnitLabel(unit: UniversalYAxisUnit): string {
	const grafanaFormat = UniversalUnitToGrafanaUnit[unit];
	if (!grafanaFormat) return '';

	const suffix = format(grafanaFormat, 1).suffix?.trim() || '';

	return AdditionalLabelsMappingForGrafanaUnits[suffix] || suffix;
}

function scaleValue(
	value: number,
	unit: UniversalYAxisUnit,
	family: UniversalYAxisUnit[],
	factor: number,
): { value: number; label: string } {
	let idx = family.indexOf(unit);
	if (idx === -1) return { value, label: getUnitLabel(unit) };

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

	return { value: scaled, label: getUnitLabel(family[idx]) };
}

function findUnitFamily(
	unit: UniversalYAxisUnit,
): UnitFamilyConfig | undefined {
	return CUSTOM_SCALING_FAMILIES.find((family) => family.units.includes(unit));
}

export function formatUniversalUnit(
	value: number,
	unit: UniversalYAxisUnit,
): string {
	// Check if this unit belongs to a family that needs custom scaling
	const family = findUnitFamily(unit);
	if (family) {
		const scaled = scaleValue(value, unit, family.units, family.scaleFactor);
		return `${format('short', scaled.value).text} ${scaled.label}`;
	}

	// Use Grafana formatting with custom label mappings
	const grafanaFormat = UniversalUnitToGrafanaUnit[unit];
	if (grafanaFormat) {
		const formatted = format(grafanaFormat, value);
		const suffix = formatted.suffix?.trim() || '';
		const customLabel = AdditionalLabelsMappingForGrafanaUnits[suffix];

		return customLabel
			? `${formatted.text} ${customLabel}`
			: formattedValueToString(formatted);
	}

	// Fallback to short format for other units
	return `${format('short', value).text} ${unit}`;
}
