import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import { Calendar } from '@signozhq/ui/calendar';
import { Calendar as CalendarIcon, Check, X } from '@signozhq/icons';
import dayjs from 'dayjs';

import {
	OFFSET_PRESETS,
	CUSTOM_OFFSET_VALUE,
	AroundTimeContainerProps,
} from './AroundTimeContainer.types';
import { isValidOffset } from './aroundTimeUtils';
import { useAroundTimeCallbacks } from './useAroundTimeCallbacks';
import TimeInput from './TimeInput';
import styles from './AroundTimeContainer.module.scss';

const DATE_DISPLAY_FORMAT = 'MMM D, YYYY';

function AroundTimeContainer({
	onApply,
	onCancel,
	initialFrom,
	initialTo,
}: AroundTimeContainerProps): JSX.Element {
	const {
		state,
		onSelectDate,
		onHourChange,
		onMinuteChange,
		onSecondChange,
		onOffsetChange,
		onApply: handleApply,
		canApply,
	} = useAroundTimeCallbacks(onApply, initialFrom, initialTo);

	const isPresetOffset = OFFSET_PRESETS.some((p) => p.value === state.offset);
	const [selectValue, setSelectValue] = useState<string>(
		isPresetOffset ? state.offset : CUSTOM_OFFSET_VALUE,
	);

	const handleOffsetSelectChange = (value: string): void => {
		setSelectValue(value);
		if (value !== CUSTOM_OFFSET_VALUE) {
			onOffsetChange(value);
		}
	};

	const offsetValid = isValidOffset(state.offset);

	return (
		<div className={styles.container}>
			<div className={styles.calendarHeader}>
				<CalendarIcon size={12} />
				<span className={styles.calendarHeaderTitle}>
					{state.centerDate
						? dayjs(state.centerDate).format(DATE_DISPLAY_FORMAT)
						: 'Pick a center date'}
				</span>
			</div>

			<div className={styles.calendarBody}>
				<Calendar
					mode="single"
					selected={state.centerDate}
					onSelect={(date): void => onSelectDate(date)}
					disabled={{ after: dayjs().toDate() }}
				/>

				<div className={styles.controls}>
					<span className={styles.controlLabel}>Time</span>
					<TimeInput
						hour={state.centerHour}
						minute={state.centerMinute}
						second={state.centerSecond}
						onHourChange={onHourChange}
						onMinuteChange={onMinuteChange}
						onSecondChange={onSecondChange}
						date={state.centerDate}
						testIdPrefix="around"
					/>

					<span className={styles.controlLabel}>± Offset</span>
					<div className={styles.offsetRow}>
						<Select
							value={selectValue}
							onChange={handleOffsetSelectChange}
							data-testid="around-time-offset-select"
							popupMatchSelectWidth={false}
							className={styles.offsetSelect}
							options={[
								...OFFSET_PRESETS.map((p) => ({ label: p.label, value: p.value })),
								{ label: 'Custom…', value: CUSTOM_OFFSET_VALUE },
							]}
						/>
						{selectValue === CUSTOM_OFFSET_VALUE && (
							<Input
								className={styles.offsetCustomInput}
								value={state.offset}
								placeholder="e.g. 45m"
								status={state.offset && !offsetValid ? 'error' : undefined}
								data-testid="around-time-offset-input"
								onChange={(e): void => onOffsetChange(e.target.value)}
							/>
						)}
					</div>

					{selectValue === CUSTOM_OFFSET_VALUE && state.offset && !offsetValid && (
						<>
							<span />
							<span className={styles.offsetHint}>Use format: 5m, 1h, 3h, 1d</span>
						</>
					)}
				</div>

				<div className={styles.actions}>
					<Button
						type="primary"
						className="periscope-btn secondary"
						onClick={onCancel}
						icon={<X size={12} />}
						data-testid="around-time-cancel"
					>
						Cancel
					</Button>
					<Button
						type="primary"
						className="periscope-btn primary"
						disabled={!canApply}
						onClick={handleApply}
						icon={<Check size={12} />}
						data-testid="around-time-apply"
					>
						Apply
					</Button>
				</div>
			</div>
		</div>
	);
}

export default AroundTimeContainer;
