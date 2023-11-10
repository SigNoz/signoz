import { DataSourceType } from '../common/DataSource/DataSource';
import { ModulesMap } from '../OnboardingContainer';

const supportedLanguages = [
	{
		name: 'java',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'python',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'javascript',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'go',
		imgURL: `Logos/java.png`,
	},
];

const supportedFrameworks = [
	{
		name: 'java',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'python',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'javascript',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'go',
		imgURL: `Logos/java.png`,
	},
];

export const getDataSources = (module: string): DataSourceType[] => {
	if (module === ModulesMap.APM) {
		return supportedLanguages;
	}
	if (module === ModulesMap.InfrastructureMonitoring) {
		return supportedLanguages;
	}
	return supportedLanguages;
};

export const getFrameworks = () => {};
