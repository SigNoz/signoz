import {
	createContext,
	PropsWithChildren,
	useContext,
	useMemo,
	useState,
} from 'react';

interface IDashboardContext {
	isDashboardSliderOpen: boolean;
	handleToggleDashboardSlider: (value: boolean) => void;
}

const DashboardContext = createContext<IDashboardContext>({
	isDashboardSliderOpen: false,
	handleToggleDashboardSlider: () => {},
});

export function DashboardProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [isDashboardSliderOpen, setIsDashboardSlider] = useState<boolean>(false);

	const handleToggleDashboardSlider = (value: boolean): void => {
		setIsDashboardSlider(value);
	};

	const value = useMemo(
		() => ({
			isDashboardSliderOpen,
			handleToggleDashboardSlider,
		}),
		[isDashboardSliderOpen],
	);

	return (
		<DashboardContext.Provider value={value}>
			{children}
		</DashboardContext.Provider>
	);
}

export const useDashboard = (): IDashboardContext => {
	const context = useContext(DashboardContext);

	if (!context) {
		throw new Error('Should be used inside the context');
	}

	return context;
};
