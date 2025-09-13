import { Button, Modal, Select, Typography, Card, Space, Tag } from 'antd';
import { Calendar, Clock, Globe } from 'lucide-react';
import { useState } from 'react';

import TimeInput from './TimeInput';
import { TIMEZONE_DATA } from './utils';

interface CustomScheduleModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (schedule: any) => void;
	currentSchedule?: any;
}

const FREQUENCY_OPTIONS = [
	{ label: 'Daily', value: 'daily', icon: <Clock size={16} /> },
	{ label: 'Weekly', value: 'weekly', icon: <Calendar size={16} /> },
	{ label: 'Monthly', value: 'monthly', icon: <Calendar size={16} /> },
];

const WEEKDAYS = [
	{ label: 'Mon', value: 'monday' },
	{ label: 'Tue', value: 'tuesday' },
	{ label: 'Wed', value: 'wednesday' },
	{ label: 'Thu', value: 'thursday' },
	{ label: 'Fri', value: 'friday' },
	{ label: 'Sat', value: 'saturday' },
	{ label: 'Sun', value: 'sunday' },
];

function CustomScheduleModal({ open, onClose, onSave, currentSchedule }: CustomScheduleModalProps): JSX.Element {
	const [frequency, setFrequency] = useState<string>('daily');
	const [selectedDays, setSelectedDays] = useState<string[]>([]);
	const [selectedDates, setSelectedDates] = useState<number[]>([]);
	const [time, setTime] = useState<string>('09:00:00');
	const [timezone, setTimezone] = useState<string>(TIMEZONE_DATA[0].value);

	const handleFrequencyChange = (value: string): void => {
		setFrequency(value);
		setSelectedDays([]);
		setSelectedDates([]);
	};

	const handleDayToggle = (day: string): void => {
		setSelectedDays(prev => 
			prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
		);
	};

	const handleDateToggle = (date: number): void => {
		setSelectedDates(prev => 
			prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
		);
	};

	const handleSave = (): void => {
		const schedule = {
			frequency,
			selectedDays,
			selectedDates,
			time,
			timezone,
		};
		onSave(schedule);
		onClose();
	};

	const getPreviewText = (): string => {
		if (frequency === 'daily') {
			return `Every day at ${time}`;
		}
		if (frequency === 'weekly') {
			if (selectedDays.length === 0) return 'Select days';
			const dayNames = selectedDays.map(day => WEEKDAYS.find(w => w.value === day)?.label).join(', ');
			return `Every ${dayNames} at ${time}`;
		}
		if (frequency === 'monthly') {
			if (selectedDates.length === 0) return 'Select dates';
			const dateStr = selectedDates.sort((a, b) => a - b).join(', ');
			return `On day ${dateStr} of every month at ${time}`;
		}
		return '';
	};

	return (
		<Modal
			title="Custom Schedule"
			open={open}
			onCancel={onClose}
			footer={[
				<Button key="cancel" onClick={onClose}>
					Cancel
				</Button>,
				<Button key="save" type="primary" onClick={handleSave}>
					Save Schedule
				</Button>,
			]}
			width={600}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
				{/* Frequency Selection */}
				<div>
					<Typography.Text strong style={{ display: 'block', marginBottom: '12px' }}>
						How often?
					</Typography.Text>
					<Space size="small">
						{FREQUENCY_OPTIONS.map(option => (
							<Card
								key={option.value}
								size="small"
								className={frequency === option.value ? 'selected-card' : 'selectable-card'}
								onClick={() => handleFrequencyChange(option.value)}
								style={{
									cursor: 'pointer',
									border: frequency === option.value ? '2px solid #1890ff' : '1px solid #d9d9d9',
									minWidth: '100px',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
									{option.icon}
									<Typography.Text>{option.label}</Typography.Text>
								</div>
							</Card>
						))}
					</Space>
				</div>

				{/* Day/Date Selection */}
				{frequency === 'weekly' && (
					<div>
						<Typography.Text strong style={{ display: 'block', marginBottom: '12px' }}>
							Which days?
						</Typography.Text>
						<Space size="small" wrap>
							{WEEKDAYS.map(day => (
								<Tag.CheckableTag
									key={day.value}
									checked={selectedDays.includes(day.value)}
									onChange={() => handleDayToggle(day.value)}
									style={{ padding: '4px 12px' }}
								>
									{day.label}
								</Tag.CheckableTag>
							))}
						</Space>
					</div>
				)}

				{frequency === 'monthly' && (
					<div>
						<Typography.Text strong style={{ display: 'block', marginBottom: '12px' }}>
							Which dates?
						</Typography.Text>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', maxWidth: '300px' }}>
							{Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
								<Tag.CheckableTag
									key={date}
									checked={selectedDates.includes(date)}
									onChange={() => handleDateToggle(date)}
									style={{ textAlign: 'center', padding: '4px 8px' }}
								>
									{date}
								</Tag.CheckableTag>
							))}
						</div>
					</div>
				)}

				{/* Time Selection */}
				<div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
					<div style={{ flex: 1 }}>
						<Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
							<Clock size={16} style={{ marginRight: '4px' }} />
							What time?
						</Typography.Text>
						<TimeInput
							value={time}
							onChange={setTime}
							style={{ width: '120px' }}
						/>
					</div>
					<div style={{ flex: 1 }}>
						<Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
							<Globe size={16} style={{ marginRight: '4px' }} />
							Timezone
						</Typography.Text>
						<Select
							options={TIMEZONE_DATA}
							value={timezone}
							onChange={setTimezone}
							style={{ width: '100%' }}
							showSearch
							placeholder="Select timezone"
						/>
					</div>
				</div>

				{/* Preview */}
				<div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
					<Typography.Text strong style={{ display: 'block', marginBottom: '4px' }}>
						Preview:
					</Typography.Text>
					<Typography.Text type="secondary">
						{getPreviewText()} ({timezone})
					</Typography.Text>
				</div>
			</div>
		</Modal>
	);
}

export default CustomScheduleModal;