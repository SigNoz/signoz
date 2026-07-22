import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { CircleAlert } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import type { PanelThreshold } from '../../../../types/threshold';
import { resolveActiveThreshold } from '../../../../utils/evaluateThresholds';

import { parseFormattedValue } from '../../../../utils/parseFormattedValue';
import styles from './ValueDisplay.module.scss';
import { useResponsiveFontSize } from '../../../../hooks/useResponsiveFontSize';
import ValueUnit from '../ValueUnit/ValueUnit';

interface ValueDisplayProps {
	/** The pre-formatted value string (may include a unit label). */
	value: string;
	/** The raw numeric value, used for threshold evaluation. */
	rawValue: number;
	thresholds: PanelThreshold[];
	/** The panel's unit, used to convert threshold units before comparison. */
	unit?: string;
}

/**
 * Renders a single large scalar with optional prefix/suffix units and threshold
 * recoloring (text or background). V2-native replacement for the V1 `ValueGraph`.
 */
function ValueDisplay({
	value,
	rawValue,
	thresholds,
	unit,
}: ValueDisplayProps): JSX.Element {
	const { t } = useTranslation(['valueGraph']);
	const { containerRef, fontSize } = useResponsiveFontSize();

	const { numericValue, prefixUnit, suffixUnit } = useMemo(
		() => parseFormattedValue(value),
		[value],
	);

	const { threshold, isConflicting } = useMemo(
		() => resolveActiveThreshold(thresholds, rawValue, unit),
		[thresholds, rawValue, unit],
	);

	const isBackground = threshold?.format === 'background';
	const textColor = threshold?.format === 'text' ? threshold.color : undefined;
	const backgroundColor = isBackground ? threshold?.color : undefined;

	return (
		<div
			ref={containerRef}
			className={styles.container}
			style={{ backgroundColor }}
		>
			<div className={styles.textContainer}>
				{prefixUnit && (
					<ValueUnit
						type="prefix"
						unit={prefixUnit}
						color={textColor}
						fontSize={fontSize}
					/>
				)}
				<Typography.Text
					className={styles.valueText}
					data-testid="number-panel-value"
					style={{ color: textColor, fontSize }}
				>
					{numericValue}
				</Typography.Text>
				{suffixUnit && (
					<ValueUnit
						type="suffix"
						unit={suffixUnit}
						color={textColor}
						fontSize={fontSize}
					/>
				)}
			</div>
			{isConflicting && (
				<div
					className={isBackground ? styles.conflictBackground : styles.conflictText}
				>
					<Tooltip title={t('this_value_satisfies_multiple_thresholds')}>
						<CircleAlert
							className={styles.conflictIcon}
							data-testid="conflicting-thresholds"
							size="md"
						/>
					</Tooltip>
				</div>
			)}
		</div>
	);
}

export default ValueDisplay;
