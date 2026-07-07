/* eslint-disable sonarjs/cognitive-complexity */
import { formattedValueToString, getValueFormat } from '@grafana/data';
import * as Sentry from '@sentry/react';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { isUniversalUnit } from 'components/YAxisUnitSelector/utils';
import { isNaN } from 'lodash-es';

import { formatUniversalUnit } from '../YAxisUnitSelector/formatter';
import {
	DEFAULT_SIGNIFICANT_DIGITS,
	PrecisionOption,
	PrecisionOptionsEnum,
} from './types';
import { formatDecimalWithLeadingZeros } from './utils';

/**
 * Formats a Y-axis value based on a given format string.
 *
 * @param value The string value from the axis.
 * @param format The format identifier (e.g. 'none', 'ms', 'bytes', 'short').
 * @returns A formatted string ready for display.
 */
export const getYAxisFormattedValue = (
	value: string,
	format: string,
	precision: PrecisionOption = 2, // default precision requested
): string => {
	const numValue = parseFloat(value);

	// Handle non-numeric or special values first.
	if (isNaN(numValue)) {
		return 'NaN';
	}
	if (numValue === Infinity) {
		return '∞';
	}
	if (numValue === -Infinity) {
		return '-∞';
	}

	// For all other standard formats, delegate to grafana/data's built-in formatter.
	const computeDecimals = (): number | undefined => {
		if (precision === PrecisionOptionsEnum.FULL) {
			return DEFAULT_SIGNIFICANT_DIGITS;
		}
		return precision;
	};

	const fallbackFormat = (): string => {
		if (precision === PrecisionOptionsEnum.FULL) {
			return numValue.toString();
		}
		if (precision === 0) {
			return Math.round(numValue).toString();
		}
		return precision !== undefined
			? numValue
					.toFixed(precision)
					.replace(/(\.[0-9]*[1-9])0+$/, '$1') // trimming zeros
					.replace(/\.$/, '')
			: numValue.toString();
	};

	try {
		// Use custom formatter for the 'none' format honoring precision
		if (format === 'none') {
			return formatDecimalWithLeadingZeros(numValue, precision);
		}

		// Separate logic for universal units// Separate logic for universal units
		if (format && isUniversalUnit(format)) {
			const decimals = computeDecimals();
			return formatUniversalUnit(
				numValue,
				format as UniversalYAxisUnit,
				precision,
				decimals,
			);
		}

		const formatter = getValueFormat(format);
		const formattedValue = formatter(numValue, computeDecimals(), undefined);
		if (formattedValue.text && formattedValue.text.includes('.')) {
			formattedValue.text = formatDecimalWithLeadingZeros(
				parseFloat(formattedValue.text),
				precision,
			);
		}

		return formattedValueToString(formattedValue);
	} catch (error) {
		Sentry.captureEvent({
			message: `Error applying formatter: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			level: 'error',
		});
		return fallbackFormat();
	}
};

export const getToolTipValue = (
	value: string | number,
	format?: string,
	precision?: PrecisionOption,
): string =>
	getYAxisFormattedValue(value?.toString(), format || 'none', precision);
