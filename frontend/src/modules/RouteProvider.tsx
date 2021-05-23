import React, { useContext, createContext, ReactNode, Dispatch } from "react";

type State = {
	[key: string]: {
		route: string;
		isLoaded: boolean;
	};
};

type Action = {
	type: "UPDATE";
	payload: State;
};

interface ContextType {
	state: State;
	dispatch: Dispatch<Action>;
}

const RouteContext = createContext<ContextType | null>(null);

interface RouteProviderProps {
	children: ReactNode;
}

const updateLocation = (state: State, action: Action): State => {
	if (action.type === "UPDATE") {
		return {
			...state,
			...action.payload,
		};
	}
	return {
		...state,
	};
};

const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
	const [state, dispatch] = React.useReducer(updateLocation, {});
	const value = { state, dispatch };
	return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

const useRoute = (): ContextType => {
	const context = useContext(RouteContext);
	if (context === undefined) {
		throw new Error("useRoute must be used within a RouteProvider");
	}
	return context as ContextType;
};
export { RouteProvider, useRoute };
