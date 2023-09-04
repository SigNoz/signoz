import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

function MockQueryClientProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

export default MockQueryClientProvider;
