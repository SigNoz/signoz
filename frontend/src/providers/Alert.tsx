import React, {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useState,
} from 'react';

interface AlertRuleContextType {
	alertRuleState: string | undefined;
	setAlertRuleState: React.Dispatch<React.SetStateAction<string | undefined>>;
	alertRuleName: string | undefined;
	setAlertRuleName: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const AlertRuleContext = createContext<AlertRuleContextType | undefined>(
	undefined,
);

function AlertRuleProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const [alertRuleState, setAlertRuleState] = useState<string | undefined>(
		undefined,
	);
	const [alertRuleName, setAlertRuleName] = useState<string | undefined>(
		undefined,
	);

	const value = React.useMemo(
		() => ({
			alertRuleState,
			setAlertRuleState,
			alertRuleName,
			setAlertRuleName,
		}),
		[alertRuleState, alertRuleName],
	);

	return (
		<AlertRuleContext.Provider value={value}>
			{children}
		</AlertRuleContext.Provider>
	);
}

export const useAlertRule = (): AlertRuleContextType => {
	const context = useContext(AlertRuleContext);
	if (context === undefined) {
		throw new Error('useAlertRule must be used within an AlertRuleProvider');
	}
	return context;
};

export const useAlertRuleOptional = (): AlertRuleContextType | undefined =>
	useContext(AlertRuleContext);

export default AlertRuleProvider;
