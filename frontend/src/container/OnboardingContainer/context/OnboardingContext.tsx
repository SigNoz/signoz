import { createContext, ReactNode, useContext, useState } from 'react';

import { ModuleProps, useCases } from '../OnboardingContainer';
import { DataSourceType } from '../Steps/DataSource/DataSource';

export const OnboardingMethods = {
	QUICK_START: 'QUICK_START',
	RECOMMENDED_STEPS: 'RECOMMENDED_STEPS',
};

interface OnboardingContextData {
	serviceName: string;
	selectedEnvironment: string;
	selectedFramework: string;
	selectedModule: ModuleProps | null;
	selectedMethod: any;
	selectedDataSource: DataSourceType | null;
	updateSelectedModule: (module: ModuleProps) => void;
	updateSelectedDataSource: (module: DataSourceType | null) => void;
	updateServiceName: (newValue: string) => void;
	updateSelectedEnvironment: (environment: any) => void;
	updateSelectedFramework: (framework: any) => void;
	updateSelectedMethod: (method: any) => void;
	resetProgress: () => void;
}

const OnboardingContext = createContext<OnboardingContextData | undefined>(
	undefined,
);

interface OnboardingContextProviderProps {
	children: ReactNode;
}

const defaultDataSource = {
	name: 'java',
	id: 'java',
};

function OnboardingContextProvider({
	children,
}: OnboardingContextProviderProps): any {
	const [serviceName, setServiceName] = useState<string>('');
	const [selectedModule, setSelectedModule] = useState<ModuleProps | null>(
		useCases.APM,
	);
	const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
	const [selectedFramework, setSelectedFramework] = useState<string>('');

	const [selectedMethod, setSelectedMethod] = useState(
		OnboardingMethods.RECOMMENDED_STEPS,
	);

	const [
		selectedDataSource,
		setSelectedDataSource,
	] = useState<DataSourceType | null>(defaultDataSource);

	const updateServiceName = (newValue: string): void => {
		setServiceName(newValue);
	};

	const updateSelectedModule = (module: ModuleProps): void => {
		setSelectedModule(module);
	};

	const updateSelectedDataSource = (dataSource: DataSourceType | null): void => {
		setSelectedDataSource(dataSource);
	};

	const updateSelectedEnvironment = (environment: any): void => {
		setSelectedEnvironment(environment);
	};

	const updateSelectedFramework = (framework: any): void => {
		setSelectedFramework(framework);
	};

	const updateSelectedMethod = (method: any): void => {
		setSelectedMethod(method);
	};

	const resetProgress = (): void => {
		updateServiceName('');
		setSelectedModule(useCases.APM);
		setSelectedDataSource(defaultDataSource);
		setSelectedEnvironment('');
		setSelectedFramework('');
		setSelectedMethod(OnboardingMethods.RECOMMENDED_STEPS);
	};

	// eslint-disable-next-line react/jsx-no-constructed-context-values
	const contextValue: OnboardingContextData = {
		serviceName,
		selectedModule,
		selectedDataSource,
		selectedFramework,
		selectedEnvironment,
		selectedMethod,
		updateServiceName,
		updateSelectedModule,
		updateSelectedFramework,
		updateSelectedDataSource,
		updateSelectedEnvironment,
		updateSelectedMethod,
		resetProgress,
	};

	return (
		<OnboardingContext.Provider value={contextValue}>
			{children}
		</OnboardingContext.Provider>
	);
}

const useOnboardingContext = (): OnboardingContextData => {
	const context = useContext(OnboardingContext);
	if (!context) {
		throw new Error(
			'useOnboardingContext must be used within a OnboardingContextProvider',
		);
	}
	return context;
};

export { OnboardingContextProvider, useOnboardingContext };
