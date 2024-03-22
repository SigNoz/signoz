import { useEffect, useState } from 'react';

import ExplorerOptions, { ExplorerOptionsProps } from './ExplorerOptions';
import { getExplorerToolBarVisibility } from './utils';

type ExplorerOptionsWrapperProps = Omit<
	ExplorerOptionsProps,
	'isExplorerOptionDrop'
>;

function ExplorerOptionWrapper({
	disabled,
	query,
	isLoading,
	onExport,
	sourcepage,
}: ExplorerOptionsWrapperProps): JSX.Element {
	const [isExplorerOptionHidden, setIsExplorerOptionHidden] = useState(false);

	useEffect(() => {
		const toolbarVisibility = getExplorerToolBarVisibility(sourcepage);
		setIsExplorerOptionHidden(!toolbarVisibility);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<ExplorerOptions
			disabled={disabled}
			query={query}
			isLoading={isLoading}
			onExport={onExport}
			sourcepage={sourcepage}
			isExplorerOptionHidden={isExplorerOptionHidden}
			setIsExplorerOptionHidden={setIsExplorerOptionHidden}
		/>
	);
}

export default ExplorerOptionWrapper;
