import './ShowCaseValue.styles.scss';

import { ShowCaseValueProps } from './types';

function ShowCaseValue({ width, value }: ShowCaseValueProps): JSX.Element {
	return (
		<div className="show-case-container" style={{ minWidth: width }}>
			{value}
		</div>
	);
}

export default ShowCaseValue;
