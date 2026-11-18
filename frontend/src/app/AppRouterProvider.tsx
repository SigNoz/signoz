import { type DataRouter, RouterProvider } from 'react-router';

interface AppRouterProviderProps {
	router: DataRouter;
}

/**
 * Transitions are off on purpose: under one React keeps the previous screen up
 * instead of committing the Suspense fallback, so a route whose chunk is not
 * cached yet renders no loader at all. Pending UI under transitions needs
 * route `lazy` and `useNavigation()`.
 */
export function AppRouterProvider({
	router,
}: AppRouterProviderProps): JSX.Element {
	return <RouterProvider router={router} useTransitions={false} />;
}
