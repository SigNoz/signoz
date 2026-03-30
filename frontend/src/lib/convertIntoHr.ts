import { SettingPeriod } from 'container/GeneralSettings';

const converIntoHr = (value: number, period: SettingPeriod): number => {
	if (period === 'day') {
		return value * 24;
	}

	if (period === 'hr') {
		return value;
	}

	return value * 720;
};

export default converIntoHr;
