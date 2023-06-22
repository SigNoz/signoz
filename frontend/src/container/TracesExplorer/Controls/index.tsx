import Controls from 'container/Controls';
import { memo } from 'react';

import { Container } from './styles';

function TraceExplorerControls(): JSX.Element | null {
	const handleCountItemsPerPageChange = (): void => {};
	const handleNavigatePrevious = (): void => {};
	const handleNavigateNext = (): void => {};

	return (
		<Container>
			<Controls
				isLoading={false}
				count={0}
				countPerPage={0}
				handleNavigatePrevious={handleNavigatePrevious}
				handleNavigateNext={handleNavigateNext}
				handleCountItemsPerPageChange={handleCountItemsPerPageChange}
			/>
		</Container>
	);
}

export default memo(TraceExplorerControls);
