import { createContext, ReactNode, useContext, useState } from 'react';

import { ModuleProps, useCases } from '../OnboardingContainer';
import { DataSourceType } from '../Steps/DataSource/DataSource';
import { defaultApplicationDataSource } from '../utils/dataSourceUtils';

export const OnboardingMethods = {
	QUICK_START: 'quickStart',
	RECOMMENDED_STEPS: 'recommendedSteps',
};

interface OnboardingContextData {
	activeStep: any;
	ingestionData: any;
	serviceName: string;
	selectedEnvironment: string;
	selectedFramework: string | null;
	selectedModule: ModuleProps | null;
	selectedMethod: any;
	selectedDataSource: DataSourceType | null;
	errorDetails: string | null;
	updateSelectedModule: (module: ModuleProps) => void;
	updateSelectedDataSource: (module: DataSourceType | null) => void;
	updateServiceName: (newValue: string) => void;
	updateSelectedEnvironment: (environment: any) => void;
	updateSelectedFramework: (framework: any) => void;
	updateSelectedMethod: (method: any) => void;
	updateActiveStep: (step: any) => void;
	updateErrorDetails: (errorDetails: any) => void;
	updateIngestionData: (ingestionData: any) => void;
	resetProgress: () => void;
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
	const [ingestionData, setIngestionData] = useState<string>('');
	const [activeStep, setActiveStep] = useState<any>(null);
	const [selectedModule, setSelectedModule] = useState<ModuleProps | null>(
		useCases.APM,
	);

	const [errorDetails, setErrorDetails] = useState(null);
	const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
	const [selectedFramework, setSelectedFramework] = useState<string | null>(
		null,
	);

	const [selectedMethod, setSelectedMethod] = useState(
		OnboardingMethods.QUICK_START,
	);

	const [
		selectedDataSource,
		setSelectedDataSource,
	] = useState<DataSourceType | null>(defaultApplicationDataSource);

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

	const updateErrorDetails = (errorDetails: any): void => {
		setErrorDetails(errorDetails);
	};

	const updateActiveStep = (step: any): void => {
		setActiveStep(step);
	};

	const updateIngestionData = (ingestionData: any): void => {
		setIngestionData(ingestionData);
	};

	const resetProgress = (): void => {
		updateServiceName('');
		setSelectedModule(useCases.APM);
		setSelectedDataSource(defaultApplicationDataSource);
		setSelectedEnvironment('');
		setSelectedFramework('');
		setSelectedMethod(OnboardingMethods.QUICK_START);
		updateActiveStep(null);
	};

	// eslint-disable-next-line react/jsx-no-constructed-context-values
	const contextValue: OnboardingContextData = {
		activeStep,
		serviceName,
		selectedModule,
		selectedDataSource,
		selectedFramework,
		selectedEnvironment,
		selectedMethod,
		errorDetails,
		ingestionData,
		updateServiceName,
		updateSelectedModule,
		updateSelectedFramework,
		updateSelectedDataSource,
		updateSelectedEnvironment,
		updateSelectedMethod,
		resetProgress,
		updateActiveStep,
		updateErrorDetails,
		updateIngestionData,
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
