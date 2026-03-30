import { SettingPeriod } from 'container/GeneralSettings';

const getSettingsPeroid = (hr: number): PayloadProps => {
	if (hr <= 0) {
		return {
			period: 'hr',
			value: 0,
		};
	}

	if (hr < 24) {
		return {
			period: 'hr',
			value: hr,
		};
	}

	if (hr < 720) {
		return {
			period: 'day',
			value: hr / 24,
		};
	}

	return {
		period: 'month',
		value: hr / 720,
	};
};

interface PayloadProps {
	value: number;
	period: SettingPeriod;
}

export default getSettingsPeroid;
