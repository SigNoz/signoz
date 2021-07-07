import React, { useContext, createContext, ReactNode, Dispatch } from 'react';
import ROUTES from 'Src/constants/routes';

type State = {
	[key: string]: {
		route: string;
		isLoaded: boolean;
	};
};

enum ActionTypes {
	UPDATE_IS_LOADED = 'ROUTE_IS_LOADED',
}

type Action = {
	type: ActionTypes;
	payload: string;
};

interface ContextType {
	state: State;
	dispatch: Dispatch<Action>;
}

const RouteContext = createContext<ContextType | null>(null);

interface RouteProviderProps {
	children: ReactNode;
}
interface RouteObj {
	[key: string]: {
		route: string;
		isLoaded: boolean;
	};
}

const updateLocation = (state: State, action: Action): State => {
	if (action.type === ActionTypes.UPDATE_IS_LOADED) {
		/*
			Update the isLoaded property in routes obj
			if the route matches the current pathname

			Why: Checkout this issue https://github.com/SigNoz/signoz/issues/110
			To avoid calling the api's twice for Date picker,
			We will only call once the route is changed
		*/
		Object.keys(ROUTES).map((items) => {
			state[items].isLoaded = state[items].route === action.payload;
		});
		return {
			...state,
		};
	}
	return {
		...state,
	};
};

const getInitialState = () => {
	const routes: RouteObj = {};
	Object.keys(ROUTES).map((items) => {
		routes[items] = {
			route: `${ROUTES[items]}`,
			isLoaded: false,
		};
	});
	return routes;
};

const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
	const [state, dispatch] = React.useReducer(updateLocation, getInitialState());
	const value = { state, dispatch };
	return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

const useRoute = (): ContextType => {
	const context = useContext(RouteContext);
	if (context === undefined) {
		throw new Error('useRoute must be used within a RouteProvider');
	}
	return context as ContextType;
};
export { RouteProvider, useRoute };
