import './TimezonePicker.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Input } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { TimezonePickerShortcuts } from 'constants/shortcuts/TimezonePickerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { Check, Search } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';

import { Timezone, TIMEZONE_DATA } from './timezoneUtils';

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	setActiveView: Dispatch<SetStateAction<'datetime' | 'timezone'>>;
	isOpenedFromFooter: boolean;
}

interface TimezoneItemProps {
	timezone: Timezone;
	isSelected?: boolean;
	onClick?: () => void;
}

const ICON_SIZE = 14;

function SearchBar({
	value,
	onChange,
	setIsOpen,
	setActiveView,
	isOpenedFromFooter = false,
}: SearchBarProps): JSX.Element {
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent): void => {
			if (e.key === 'Escape') {
				if (isOpenedFromFooter) {
					setActiveView('datetime');
				} else {
					setIsOpen(false);
				}
			}
		},
		[setActiveView, setIsOpen, isOpenedFromFooter],
	);

	return (
		<div className="timezone-picker__search">
			<div className="timezone-picker__input-container">
				<Search
					color={Color.BG_VANILLA_400}
					className="search-icon"
					height={ICON_SIZE}
					width={ICON_SIZE}
				/>
				<Input
					type="text"
					className="timezone-picker__input"
					placeholder="Search timezones..."
					value={value}
					onChange={(e): void => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					tabIndex={0}
					autoFocus
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
		<button
			type="button"
			className={cx('timezone-picker__item', {
				selected: isSelected,
				'has-divider': timezone.hasDivider,
			})}
			onClick={onClick}
		>
			<div className="timezone-name-wrapper">
				<div className="timezone-name-wrapper__selected-icon">
					{isSelected && (
						<Check
							className="check-icon"
							color={Color.BG_VANILLA_100}
							height={ICON_SIZE}
							width={ICON_SIZE}
						/>
					)}
				</div>
				<div className="timezone-picker__name">{timezone.name}</div>
			</div>
			<div className="timezone-picker__offset">{timezone.offset}</div>
		</button>
	);
}

TimezoneItem.defaultProps = {
	isSelected: false,
	onClick: undefined,
};

interface TimezonePickerProps {
	setActiveView: Dispatch<SetStateAction<'datetime' | 'timezone'>>;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	isOpenedFromFooter: boolean;
}

function TimezonePicker({
	setActiveView,
	setIsOpen,
	isOpenedFromFooter,
}: TimezonePickerProps): JSX.Element {
	const [searchTerm, setSearchTerm] = useState('');
	const { timezone, updateTimezone } = useTimezone();
	const [selectedTimezone, setSelectedTimezone] = useState<string>(
		timezone.name ?? TIMEZONE_DATA[0].name,
	);

	const getFilteredTimezones = useCallback((searchTerm: string): Timezone[] => {
		const normalizedSearch = searchTerm.toLowerCase();
		return TIMEZONE_DATA.filter(
			(tz) =>
				tz.name.toLowerCase().includes(normalizedSearch) ||
				tz.offset.toLowerCase().includes(normalizedSearch) ||
				tz.searchIndex.toLowerCase().includes(normalizedSearch),
		);
	}, []);

	const handleCloseTimezonePicker = useCallback(() => {
		if (isOpenedFromFooter) {
			setActiveView('datetime');
		} else {
			setIsOpen(false);
		}
	}, [isOpenedFromFooter, setActiveView, setIsOpen]);

	const handleTimezoneSelect = useCallback(
		(timezone: Timezone) => {
			setSelectedTimezone(timezone.name);
			updateTimezone(timezone);
			handleCloseTimezonePicker();
			setIsOpen(false);
			logEvent('DateTimePicker: New Timezone Selected', {
				timezone: {
					name: timezone.name,
					offset: timezone.offset,
				},
			});
		},
		[handleCloseTimezonePicker, setIsOpen, updateTimezone],
	);

	// Register keyboard shortcuts
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

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
			<SearchBar
				value={searchTerm}
				onChange={setSearchTerm}
				setIsOpen={setIsOpen}
				setActiveView={setActiveView}
				isOpenedFromFooter={isOpenedFromFooter}
			/>
			<div className="timezone-picker__list">
				{getFilteredTimezones(searchTerm).map((timezone) => (
					<TimezoneItem
						key={timezone.value}
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
