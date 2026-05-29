import { useEffect, useMemo, useState } from 'react';
import { BellOff, Check, Info } from '@signozhq/icons';
import { Button, DatePicker, Drawer, Form, Input, Select } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import {
	recurrenceOptions,
	recurrenceOptionWithSubmenu,
	recurrenceWeeklyOptions,
} from 'container/PlannedDowntime/PlannedDowntimeutils';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ALL_TIME_ZONES } from 'utils/timeZoneUtil';

import type { MutePayload } from './useMuteAlertRule';

import './MuteSchedulerDrawer.styles.scss';

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_FORMAT = DATE_TIME_FORMATS.ORDINAL_DATETIME;

const TZ_OPTIONS: DefaultOptionType[] = ALL_TIME_ZONES.map((tz) => ({
	label: tz,
	value: tz,
	key: tz,
}));

const DURATION_UNIT_OPTIONS = [
	{ label: 'Mins', value: 'm' },
	{ label: 'Hours', value: 'h' },
];

type MuteSchedulerFormData = {
	name: string;
	startTime: dayjs.Dayjs | null;
	endTime: dayjs.Dayjs | null;
	repeatType: string;
	repeatOn?: string[];
	duration?: number;
	timezone: string;
};

interface MuteSchedulerDrawerProps {
	open: boolean;
	onClose: () => void;
	ruleName: string | undefined;
	isLoading: boolean;
	onSubmit: (payload: MutePayload) => Promise<void> | void;
}

function MuteSchedulerDrawer(props: MuteSchedulerDrawerProps): JSX.Element {
	const { open, onClose, ruleName, isLoading, onSubmit } = props;
	const [form] = Form.useForm<MuteSchedulerFormData>();
	const [recurrenceType, setRecurrenceType] = useState<string>(
		recurrenceOptions.doesNotRepeat.value,
	);
	const [durationUnit, setDurationUnit] = useState<string>('m');

	const defaultName = useMemo(
		() => (ruleName ? `Muted: ${ruleName}` : 'Muted alert'),
		[ruleName],
	);

	useEffect(() => {
		if (open) {
			const guess = (dayjs as any).tz?.guess?.() || 'UTC';
			form.setFieldsValue({
				name: defaultName,
				startTime: dayjs(),
				endTime: dayjs().add(1, 'hour'),
				repeatType: recurrenceOptions.doesNotRepeat.value,
				timezone: guess,
			});
			setRecurrenceType(recurrenceOptions.doesNotRepeat.value);
			setDurationUnit('m');
		}
	}, [open, defaultName, form]);

	const handleFinish = async (values: MuteSchedulerFormData): Promise<void> => {
		const isRecurring =
			values.repeatType &&
			values.repeatType !== recurrenceOptions.doesNotRepeat.value;

		// Reinterpret the picked wall-clock time in the selected timezone (keep
		// local time, swap the offset) so the formatted ISO offset matches the
		// `timezone` field. The backend ignores the offset and re-attaches the
		// timezone to the raw time, so the two must agree (mirrors
		// PlannedDowntimeForm's handleFormData).
		const { timezone: tz } = values;
		const startTime = (values.startTime || dayjs()).tz(tz, true).format();
		const endTime = values.endTime ? values.endTime.tz(tz, true).format() : null;

		const payload: MutePayload = {
			name: values.name.trim(),
			startTime,
			endTime,
			timezone: tz,
			recurrence: isRecurring
				? {
						duration: values.duration ? `${values.duration}${durationUnit}` : '',
						repeatOn: values.repeatOn as any,
						repeatType: values.repeatType as any,
						startTime,
						endTime: endTime ?? undefined,
					}
				: undefined,
		};

		await onSubmit(payload);
	};

	const requiredRule = [{ required: true }];

	return (
		<Drawer
			width={460}
			open={open}
			onClose={onClose}
			placement="right"
			closable={false}
			destroyOnClose
			className="mute-scheduler-drawer"
			rootClassName="mute-scheduler-drawer-root"
		>
			<div className="mute-scheduler-drawer__header">
				<div className="mute-scheduler-drawer__title">
					<BellOff size={18} color="var(--bg-amber-500)" />
					<span>Mute this alert rule</span>
				</div>
				<button
					type="button"
					className="mute-scheduler-drawer__close"
					aria-label="Close"
					onClick={onClose}
				>
					×
				</button>
			</div>
			<p className="mute-scheduler-drawer__subtitle">
				Creates a planned silence for <strong>{ruleName || 'this rule'}</strong> —
				rule continues to evaluate; notifications are suppressed for the window
				below.
			</p>
			<div className="mute-scheduler-drawer__divider" />

			<Form<MuteSchedulerFormData>
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				onValuesChange={(_, all): void => {
					if (all.repeatType !== recurrenceType) {
						setRecurrenceType(all.repeatType);
					}
				}}
				className="mute-scheduler-drawer__form"
				autoComplete="off"
			>
				<Form.Item label="Name" name="name" rules={requiredRule}>
					<Input placeholder="e.g. Deployment window" maxLength={120} />
				</Form.Item>

				<Form.Item label="Starts" name="startTime" rules={requiredRule}>
					<DatePicker
						className="mute-scheduler-drawer__date"
						showTime
						showNow={false}
						format={(date): string => date.format(DATE_FORMAT)}
					/>
				</Form.Item>

				<Form.Item
					label="Ends"
					name="endTime"
					required={recurrenceType === recurrenceOptions.doesNotRepeat.value}
					rules={[
						{
							required: recurrenceType === recurrenceOptions.doesNotRepeat.value,
						},
					]}
				>
					<DatePicker
						className="mute-scheduler-drawer__date"
						showTime
						showNow={false}
						format={(date): string => date.format(DATE_FORMAT)}
					/>
				</Form.Item>

				<div className="mute-scheduler-drawer__row">
					<Form.Item label="Repeats every" name="repeatType" rules={requiredRule}>
						<Select placeholder="Select" options={recurrenceOptionWithSubmenu} />
					</Form.Item>
					<Form.Item label="Timezone" name="timezone" rules={requiredRule}>
						<Select placeholder="Select timezone" showSearch options={TZ_OPTIONS} />
					</Form.Item>
				</div>

				{recurrenceType === recurrenceOptions.weekly.value && (
					<Form.Item label="Weekly occurrence" name="repeatOn" rules={requiredRule}>
						<Select
							placeholder="Select days"
							mode="multiple"
							options={Object.values(recurrenceWeeklyOptions)}
						/>
					</Form.Item>
				)}

				{recurrenceType &&
					recurrenceType !== recurrenceOptions.doesNotRepeat.value && (
						<Form.Item label="Duration" name="duration" rules={requiredRule}>
							<Input
								type="number"
								min={1}
								placeholder="Enter duration"
								addonAfter={
									<Select
										value={durationUnit}
										onChange={(v): void => setDurationUnit(v)}
										options={DURATION_UNIT_OPTIONS}
									/>
								}
								onWheel={(e): void => e.currentTarget.blur()}
							/>
						</Form.Item>
					)}

				<div className="mute-scheduler-drawer__callout">
					<Info size={14} color="var(--bg-aqua-500)" />
					<p>
						The rule will <strong>keep evaluating</strong> and firing alerts to the
						History tab. Only notifications (Slack, PagerDuty, email) are silenced.
					</p>
				</div>

				<div className="mute-scheduler-drawer__footer">
					<Button type="text" onClick={onClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						type="primary"
						htmlType="submit"
						loading={isLoading}
						icon={<Check size={14} />}
					>
						Mute alert
					</Button>
				</div>
			</Form>
		</Drawer>
	);
}

export default MuteSchedulerDrawer;
