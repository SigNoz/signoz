import { useEffect, useState } from 'react';
import { BellOff, Calendar, X } from '@signozhq/icons';
import { Input, Popover } from 'antd';
import classNames from 'classnames';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import type { MutePayload } from './useMuteAlertRule';

import './MutePopover.styles.scss';

dayjs.extend(utc);
dayjs.extend(timezone);

type QuickDuration = {
	label: string;
	value: string;
	minutes: number | null; // null = forever
};

export const QUICK_DURATIONS: QuickDuration[] = [
	{ label: '15 min', value: '15m', minutes: 15 },
	{ label: '1 hour', value: '1h', minutes: 60 },
	{ label: '4 hours', value: '4h', minutes: 240 },
	{ label: '1 day', value: '1d', minutes: 60 * 24 },
	{ label: '1 week', value: '1w', minutes: 60 * 24 * 7 },
	{ label: 'Forever', value: 'forever', minutes: null },
];

const DEFAULT_DURATION_VALUE = '4h';

const FAR_FUTURE_END = (): string => dayjs().add(10, 'year').toISOString();

export const buildMutePayloadFromQuickDuration = (
	durationValue: string,
	name: string,
): MutePayload | null => {
	const duration = QUICK_DURATIONS.find((d) => d.value === durationValue);
	if (!duration) {
		return null;
	}
	const now = dayjs();
	const startTime = now.toISOString();
	const endTime =
		duration.minutes === null
			? FAR_FUTURE_END()
			: now.add(duration.minutes, 'minute').toISOString();
	return {
		name,
		startTime,
		endTime,
		timezone: dayjs.tz.guess?.() || 'UTC',
	};
};

const getDefaultMuteName = (ruleName: string | undefined): string =>
	ruleName ? `Muted: ${ruleName}` : 'Muted alert';

interface MutePopoverProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	anchor: React.ReactNode;
	ruleName: string | undefined;
	isLoading: boolean;
	onSubmit: (payload: MutePayload) => Promise<void> | void;
	onOpenCustomWindow: () => void;
}

function MutePopover(props: MutePopoverProps): JSX.Element {
	const {
		open,
		onOpenChange,
		anchor,
		ruleName,
		isLoading,
		onSubmit,
		onOpenCustomWindow,
	} = props;

	const [selected, setSelected] = useState<string>(DEFAULT_DURATION_VALUE);
	const [name, setName] = useState<string>(getDefaultMuteName(ruleName));

	useEffect(() => {
		if (open) {
			setSelected(DEFAULT_DURATION_VALUE);
			setName(getDefaultMuteName(ruleName));
		}
	}, [open, ruleName]);

	// Close on outside click / Escape. We use trigger={[]} on the Popover so
	// antd doesn't handle these — without this hook, the popover only closes
	// via Cancel / × / Mute submit.
	useEffect(() => {
		if (!open) {
			return undefined;
		}

		const handleMouseDown = (e: MouseEvent): void => {
			const target = e.target as HTMLElement | null;
			if (target?.closest('.mute-popover-overlay')) {
				return;
			}
			onOpenChange(false);
		};
		const handleKey = (e: KeyboardEvent): void => {
			if (e.key === 'Escape') {
				onOpenChange(false);
			}
		};

		// Defer attaching listeners until after the click that opened the
		// popover has finished bubbling — otherwise it counts as an outside
		// click and we close immediately.
		const timer = window.setTimeout(() => {
			document.addEventListener('mousedown', handleMouseDown);
			document.addEventListener('keydown', handleKey);
		}, 0);

		return (): void => {
			window.clearTimeout(timer);
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKey);
		};
	}, [open, onOpenChange]);

	const selectedDuration = QUICK_DURATIONS.find((d) => d.value === selected);
	const primaryLabel =
		selectedDuration?.minutes === null
			? 'Mute indefinitely'
			: `Mute for ${selectedDuration?.label.toLowerCase() ?? '4 hours'}`;

	const handleSubmit = async (): Promise<void> => {
		const payload = buildMutePayloadFromQuickDuration(selected, name.trim());
		if (!payload || !payload.name) {
			return;
		}
		await onSubmit(payload);
	};

	const content = (
		<div
			className="mute-popover"
			onKeyDown={(e): void => {
				if (e.key === 'Escape') {
					onOpenChange(false);
				}
			}}
		>
			<div className="mute-popover__header">
				<div className="mute-popover__title">
					<BellOff size={14} />
					<span>Mute notifications</span>
				</div>
				<button
					type="button"
					aria-label="Close"
					className="mute-popover__close"
					onClick={(): void => onOpenChange(false)}
				>
					<X size={14} />
				</button>
			</div>

			<p className="mute-popover__hint">
				Rule keeps evaluating in the background. You&apos;ll still see fires in{' '}
				<strong>History</strong> — just no pages, Slack, or email.
			</p>

			<div className="mute-popover__grid">
				{QUICK_DURATIONS.map((d) => (
					<button
						type="button"
						key={d.value}
						className={classNames('mute-popover__cell', {
							'mute-popover__cell--selected': selected === d.value,
						})}
						onClick={(): void => setSelected(d.value)}
					>
						{d.label}
					</button>
				))}
			</div>

			<button
				type="button"
				className="mute-popover__custom"
				onClick={(): void => {
					onOpenChange(false);
					onOpenCustomWindow();
				}}
			>
				<Calendar size={14} />
				Custom window…
			</button>

			<div className="mute-popover__divider" />

			<label className="mute-popover__label" htmlFor="mute-popover-name">
				Name
			</label>
			<Input
				id="mute-popover-name"
				className="mute-popover__input"
				placeholder="e.g. Deployment window"
				value={name}
				onChange={(e): void => setName(e.target.value)}
				maxLength={120}
			/>

			<div className="mute-popover__footer">
				<button
					type="button"
					className="mute-popover__btn mute-popover__btn--ghost"
					onClick={(): void => onOpenChange(false)}
					disabled={isLoading}
				>
					Cancel
				</button>
				<button
					type="button"
					className="mute-popover__btn mute-popover__btn--primary"
					onClick={handleSubmit}
					disabled={isLoading || !name.trim()}
				>
					<BellOff size={12} />
					{primaryLabel}
				</button>
			</div>
		</div>
	);

	return (
		<Popover
			open={open}
			onOpenChange={onOpenChange}
			trigger={[]}
			placement="bottomRight"
			arrow={false}
			destroyTooltipOnHide
			overlayClassName="mute-popover-overlay"
			content={content}
		>
			{anchor}
		</Popover>
	);
}

export default MutePopover;
