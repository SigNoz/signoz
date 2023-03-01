import { QueryBuilderStateT } from 'constants/queryBuilder';
import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

interface QueryBuilderContainerPropsI {
	children: React.ReactElement | React.ReactNode;
}

interface InitialStateI {
	search: string;
}

type HandleChangeReturnT = (value: string) => void;

interface ContextValueI {
	values: InitialStateI;
	handleChangeValue: (type: QueryBuilderStateT) => HandleChangeReturnT;
	handleSubmit: () => void;
}

const initialState: InitialStateI = {
	search: '',
};

const defaultContextValue: ContextValueI = {
	values: initialState,
	handleChangeValue: (): HandleChangeReturnT => (): void => {},
	handleSubmit: () => {},
};

const QueryBuilderContext = createContext<ContextValueI>(defaultContextValue);
const useQueryBuilderContext = (): ContextValueI =>
	useContext(QueryBuilderContext);

function QueryBuilderContainer({
	children,
}: QueryBuilderContainerPropsI): JSX.Element {
	const [values, setValues] = useState<InitialStateI>(initialState);

	const handleChangeValue = useCallback(
		(type: QueryBuilderStateT): HandleChangeReturnT => (value: string): void => {
			setValues((prev) => ({ ...prev, [type]: value }));
		},
		[],
	);

	const handleSubmit = useCallback(() => {
		console.log(values, '----values');
	}, [values]);

	const providerValue = useMemo(
		() => ({
			values,
			handleChangeValue,
			handleSubmit,
		}),
		[handleChangeValue, values, handleSubmit],
	);

	return (
		<QueryBuilderContext.Provider value={providerValue}>
			{children}
		</QueryBuilderContext.Provider>
	);
}

export { QueryBuilderContainer, useQueryBuilderContext };
