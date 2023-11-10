import { createContext, ReactNode, useContext, useState } from 'react';

import { DataSourceType } from './common/DataSource/DataSource';
import { ModuleProps } from './OnboardingContainer';

// Define the shape of your context data
interface OnboardingContextData {
	serviceName: string;
	updateServiceName: (newValue: string) => void;
	selectedModule: ModuleProps | null;
	selectedDataSource: DataSourceType | null;
	updateSelectedModule: (module: ModuleProps) => void;
	updateSelectedDataSource: (module: DataSourceType) => void;
}

// Create the context with an initial state
const OnboardingContext = createContext<OnboardingContextData | undefined>(
	undefined,
);

// Create a provider component to wrap your app with
interface OnboardingContextProviderProps {
	children: ReactNode;
}

function OnboardingContextProvider({
	children,
}: OnboardingContextProviderProps): any {
	const [serviceName, setServiceName] = useState<string>('Service Name');
	const [selectedModule, setSelectedModule] = useState<ModuleProps | null>(null);
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

	// Provide the context value to the wrapped components
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

// Create a custom hook to use the context in functional components
const useOnboardingContext = (): OnboardingContextData => {
	const context = useContext(OnboardingContext);
	if (!context) {
		throw new Error(
			'useMyContext must be used within a OnboardingContextProvider',
		);
	}
	return context;
};

export { OnboardingContextProvider, useOnboardingContext };
