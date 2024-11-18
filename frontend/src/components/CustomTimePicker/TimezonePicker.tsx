import './TimezonePicker.styles.scss';

import { Color } from '@signozhq/design-tokens';
import cx from 'classnames';
import { TimezonePickerShortcuts } from 'constants/shortcuts/TimezonePickerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { Check, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { TIMEZONE_DATA } from './timezoneUtils';

interface Timezone {
	name: string;
	offset: string;
	hasDivider?: boolean;
}

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
}

interface TimezoneItemProps {
	timezone: Timezone;
	isSelected?: boolean;
	onClick?: () => void;
}

const ICON_SIZE = 14;

function SearchBar({ value, onChange }: SearchBarProps): JSX.Element {
	return (
		<div className="timezone-picker__search">
			<div className="timezone-picker__input-container">
				<Search color={Color.BG_VANILLA_400} height={ICON_SIZE} width={ICON_SIZE} />
				<input
					type="text"
					className="timezone-picker__input"
					placeholder="Search timezones..."
					value={value}
					onChange={(e): void => onChange(e.target.value)}
				/>
			</div>
			<kbd className="timezone-picker__esc-key">esc</kbd>
		</div>
	);
}

function TimezoneItem({
	timezone,
	isSelected = false,
	onClick,
}: TimezoneItemProps): JSX.Element {
	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events
		<div
			className={cx('timezone-picker__item', {
				selected: isSelected,
				'has-divider': timezone.hasDivider,
			})}
			onClick={onClick}
			role="button"
			tabIndex={0}
		>
			<div className="timezone-name-wrapper">
				<div className="timezone-name-wrapper__selected-icon">
					{isSelected && (
						<Check
							color={Color.BG_VANILLA_100}
							height={ICON_SIZE}
							width={ICON_SIZE}
						/>
					)}
				</div>
				<div className="timezone-picker__name">{timezone.name}</div>
			</div>
			<div className="timezone-picker__offset">{timezone.offset}</div>
		</div>
	);
}

TimezoneItem.defaultProps = {
	isSelected: false,
	onClick: undefined,
};

interface TimezonePickerProps {
	setActiveView: (view: 'datetime' | 'timezone') => void;
}

function TimezonePicker({ setActiveView }: TimezonePickerProps): JSX.Element {
	const [search, setSearch] = useState('');
	// TODO(shaheer): get this from user's selected time zone
	const [selectedTimezone, setSelectedTimezone] = useState<string>(
		TIMEZONE_DATA[0].name,
	);

	const getFilteredTimezones = useCallback((searchTerm: string): Timezone[] => {
		const normalizedSearch = searchTerm.toLowerCase();
		return TIMEZONE_DATA.filter((tz) =>
			tz.name.toLowerCase().includes(normalizedSearch),
		);
	}, []);

	const handleTimezoneSelect = useCallback((timezone: Timezone) => {
		setSelectedTimezone(timezone.name);
	}, []);

	// Register keyboard shortcuts
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const handleCloseTimezonePicker = useCallback(() => {
		setActiveView('datetime');
	}, [setActiveView]);

	useEffect(() => {
		registerShortcut(
			TimezonePickerShortcuts.CloseTimezonePicker,
			handleCloseTimezonePicker,
		);

		return (): void => {
			deregisterShortcut(TimezonePickerShortcuts.CloseTimezonePicker);
		};
	}, [deregisterShortcut, handleCloseTimezonePicker, registerShortcut]);

	return (
		<div className="timezone-picker">
			<SearchBar value={search} onChange={setSearch} />
			<div className="timezone-picker__list">
				{getFilteredTimezones(search).map((timezone) => (
					<TimezoneItem
						key={timezone.name}
						timezone={timezone}
						isSelected={timezone.name === selectedTimezone}
						onClick={(): void => handleTimezoneSelect(timezone)}
					/>
				))}
			</div>
		</div>
	);
}

export default TimezonePicker;
