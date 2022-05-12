import { SettingPeriod } from 'container/GeneralSettings';

const getSettingsPeroid = (hr: number): PayloadProps => {
	if (hr <= 0) {
		return {
			peroid: 'hr',
			value: 0,
		};
	}

	if (hr < 24) {
		return {
			peroid: 'hr',
			value: hr,
		};
	}

	if (hr < 720) {
		return {
			peroid: 'day',
			value: hr / 24,
		};
	}

	return {
		peroid: 'month',
		value: hr / 720,
	};
};

interface PayloadProps {
	value: number;
	peroid: SettingPeriod;
}

export default getSettingsPeroid;
