import {
	getBrowserTimezone,
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
	const getTimezoneFromLocalStorage = (): Timezone | undefined => {
		try {
			return JSON.parse(
				localStorage.getItem(LOCALSTORAGE.PREFERRED_TIMEZONE) || '{}',
			);
		} catch (error) {
			console.error('Error parsing timezone from localStorage:', error);
			return undefined;
		}
	};

	const browserTimezone = useMemo(() => getBrowserTimezone(), []);

	const [timezone, setTimezone] = useState<Timezone | undefined>(
		getTimezoneFromLocalStorage() ?? browserTimezone,
	);

	const updateTimezone = useCallback((timezone: Timezone): void => {
		// TODO(shaheer): replace this with user preferences API
		localStorage.setItem(
			LOCALSTORAGE.PREFERRED_TIMEZONE,
			JSON.stringify(timezone),
		);
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

// Helper function to update timezone
export const setPreferredTimezone = (timezone: Timezone): void => {
	try {
		localStorage.setItem(
			LOCALSTORAGE.PREFERRED_TIMEZONE,
			JSON.stringify(timezone),
		);
	} catch (error) {
		console.error('Error saving timezone to localStorage:', error);
	}
};

export default TimezoneProvider;
