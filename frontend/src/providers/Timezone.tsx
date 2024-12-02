import {
	getBrowserTimezone,
	getTimezoneObjectByTimezoneString,
	Timezone,
} from 'components/CustomTimePicker/timezoneUtils';
import { LOCALSTORAGE } from 'constants/localStorage';
import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

interface TimezoneContextType {
	timezone: Timezone | undefined;
	browserTimezone: Timezone;
	updateTimezone: (timezone: Timezone) => void;
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

	const [timezone, setTimezone] = useState<Timezone | undefined>(
		getStoredTimezoneValue() ?? browserTimezone,
	);

	const updateTimezone = useCallback((timezone: Timezone): void => {
		if (!timezone.value) return;

		// TODO(shaheer): replace this with user preferences API
		setStoredTimezoneValue(timezone.value);
		setTimezone(timezone);
	}, []);

	const value = React.useMemo(
		() => ({
			timezone,
			browserTimezone,
			updateTimezone,
		}),
		[timezone, browserTimezone, updateTimezone],
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
