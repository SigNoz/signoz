import {
	getBrowserTimezone,
	getTimezoneObjectByTimezoneString,
	Timezone,
	UTC_TIMEZONE,
} from 'components/CustomTimePicker/timezoneUtils';
import { LOCALSTORAGE } from 'constants/localStorage';
import useTimezoneFormatter, {
	TimestampInput,
} from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import React, {
	createContext,
	Dispatch,
	SetStateAction,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

interface TimezoneContextType {
	timezone: Timezone;
	browserTimezone: Timezone;
	updateTimezone: (timezone: Timezone) => void;
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string;
	isAdaptationEnabled: boolean;
	setIsAdaptationEnabled: Dispatch<SetStateAction<boolean>>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(
	undefined,
);

function TimezoneProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const getStoredTimezoneValue = (): Timezone | null => {
		try {
			const timezoneValue = localStorage.getItem(LOCALSTORAGE.PREFERRED_TIMEZONE);
			if (timezoneValue) {
				return getTimezoneObjectByTimezoneString(timezoneValue);
			}
		} catch (error) {
			console.error('Error reading timezone from localStorage:', error);
		}
		return null;
	};

	const setStoredTimezoneValue = (value: string): void => {
		try {
			localStorage.setItem(LOCALSTORAGE.PREFERRED_TIMEZONE, value);
		} catch (error) {
			console.error('Error saving timezone to localStorage:', error);
		}
	};

	const browserTimezone = useMemo(() => getBrowserTimezone(), []);

	const [timezone, setTimezone] = useState<Timezone>(
		getStoredTimezoneValue() ?? browserTimezone,
	);

	const [isAdaptationEnabled, setIsAdaptationEnabled] = useState(true);

	const updateTimezone = useCallback((timezone: Timezone): void => {
		if (!timezone.value) return;

		// TODO(shaheer): replace this with user preferences API
		setStoredTimezoneValue(timezone.value);
		setTimezone(timezone);
		// Enable adaptation when a new timezone is set
		setIsAdaptationEnabled(true);
	}, []);

	const { formatTimezoneAdjustedTimestamp } = useTimezoneFormatter({
		userTimezone: timezone,
	});

	const value = React.useMemo(
		() => ({
			timezone: isAdaptationEnabled ? timezone : UTC_TIMEZONE,
			browserTimezone,
			updateTimezone,
			formatTimezoneAdjustedTimestamp,
			isAdaptationEnabled,
			setIsAdaptationEnabled,
		}),
		[
			timezone,
			browserTimezone,
			updateTimezone,
			formatTimezoneAdjustedTimestamp,
			isAdaptationEnabled,
		],
	);

	return (
		<TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
	);
}

export const useTimezone = (): TimezoneContextType => {
	const context = useContext(TimezoneContext);
	if (context === undefined) {
		throw new Error('useTimezone must be used within a TimezoneProvider');
	}
	return context;
};

export default TimezoneProvider;
