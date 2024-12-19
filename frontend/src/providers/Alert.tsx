import React, { createContext, useContext, useState } from 'react';

interface AlertRuleContextType {
	alertRuleState: string | undefined;
	setAlertRuleState: React.Dispatch<React.SetStateAction<string | undefined>>;
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

	const value = React.useMemo(
		() => ({
			alertRuleState,
			setAlertRuleState,
		}),
		[alertRuleState],
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

export default AlertRuleProvider;
