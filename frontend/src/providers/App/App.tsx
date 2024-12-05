import useActiveLicenseV3 from 'hooks/useActiveLicenseV3/useActiveLicenseV3';
import { defaultTo } from 'lodash-es';
import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { LicenseV3ResModel } from 'types/api/licensesV3/getActive';

interface IAppContext {
	activeLicenseV3: LicenseV3ResModel | null;
	isFetchingActiveLicenseV3: boolean;
}

const AppContext = createContext<IAppContext | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren): JSX.Element {
	const [activeLicenseV3, setActiveLicenseV3] = useState<LicenseV3ResModel>();

	const { data, isFetching } = useActiveLicenseV3();

	useEffect(() => {
		if (!isFetching && data?.payload) {
			setActiveLicenseV3(data.payload);
		}
	}, [data, isFetching]);

	const value: IAppContext = useMemo(
		() => ({
			activeLicenseV3: defaultTo(activeLicenseV3, null),
			isFetchingActiveLicenseV3: isFetching,
		}),
		[activeLicenseV3, isFetching],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = (): IAppContext => {
	const context = useContext(AppContext);
	if (context === undefined) {
		throw new Error('useAppContext must be used within an AppProvider');
	}
	return context;
};
