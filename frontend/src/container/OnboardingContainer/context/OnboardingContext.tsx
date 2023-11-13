import { createContext, ReactNode, useContext, useState } from 'react';

import { ModuleProps, useCases } from '../OnboardingContainer';
import { DataSourceType } from '../Steps/DataSource/DataSource';

interface OnboardingContextData {
	serviceName: string;
	updateServiceName: (newValue: string) => void;
	selectedModule: ModuleProps | null;
	selectedDataSource: DataSourceType | null;
	updateSelectedModule: (module: ModuleProps) => void;
	updateSelectedDataSource: (module: DataSourceType) => void;
}

const OnboardingContext = createContext<OnboardingContextData | undefined>(
	undefined,
);

interface OnboardingContextProviderProps {
	children: ReactNode;
}

function OnboardingContextProvider({
	children,
}: OnboardingContextProviderProps): any {
	const [serviceName, setServiceName] = useState<string>('');
	const [selectedModule, setSelectedModule] = useState<ModuleProps | null>(
		useCases.APM,
	);
	const [
		selectedDataSource,
		setSelectedDataSource,
	] = useState<DataSourceType | null>(null);

	const updateServiceName = (newValue: string): void => {
		setServiceName(newValue);
	};

	const updateSelectedModule = (module: ModuleProps): void => {
		setSelectedModule(module);
	};

	const updateSelectedDataSource = (dataSource: DataSourceType): void => {
		setSelectedDataSource(dataSource);
	};

	// eslint-disable-next-line react/jsx-no-constructed-context-values
	const contextValue: OnboardingContextData = {
		serviceName,
		updateServiceName,
		selectedModule,
		selectedDataSource,
		updateSelectedModule,
		updateSelectedDataSource,
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
