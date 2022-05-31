import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import AppLayout from 'container/AppLayout';
import React, { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import PrivateRoute from './Private';
import routes from './routes';

function App(): JSX.Element {
	return (
		<BrowserRouter basename="/">
			<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
				<PrivateRoute>
					<AppLayout>
						<Routes>
							{routes.map(({ path, element, caseSensitive }) => {
								return (
									<Route
										key={`${path}`}
										caseSensitive={caseSensitive}
										path={path || ''}
										element={element}
									/>
								);
							})}

							<Route path="*" element={NotFound} />
						</Routes>
					</AppLayout>
				</PrivateRoute>
			</Suspense>
		</BrowserRouter>
	);
}

export default App;
