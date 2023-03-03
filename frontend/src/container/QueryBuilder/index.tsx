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

type VoidFunction = (value: string) => void;

interface ContextValueI {
	values: InitialStateI;
	onChangeHandler: (type: QueryBuilderStateT) => VoidFunction;
	onSubmitHandler: () => void;
}

const initialState: InitialStateI = {
	search: '',
};

const defaultContextValue: ContextValueI = {
	values: initialState,
	onChangeHandler: (): VoidFunction => (): void => {},
	onSubmitHandler: (): void => {},
};

const QueryBuilderContext = createContext<ContextValueI>(defaultContextValue);
const useQueryBuilderContext = (): ContextValueI =>
	useContext(QueryBuilderContext);

function QueryBuilderContainer({
	children,
}: QueryBuilderContainerPropsI): JSX.Element {
	const [values, setValues] = useState<InitialStateI>(initialState);

	const onChangeHandler = useCallback(
		(type: QueryBuilderStateT): VoidFunction => (value: string): void => {
			setValues((prev) => ({ ...prev, [type]: value }));
		},
		[],
	);

	const onSubmitHandler = useCallback(() => {
		console.log(values, '----values');
	}, [values]);

	const providerValue = useMemo(
		() => ({
			values,
			onChangeHandler,
			onSubmitHandler,
		}),
		[onChangeHandler, values, onSubmitHandler],
	);

	return (
		<QueryBuilderContext.Provider value={providerValue}>
			{children}
		</QueryBuilderContext.Provider>
	);
}

export { QueryBuilderContainer, useQueryBuilderContext };
