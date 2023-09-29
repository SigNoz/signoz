import './CategoryHeading.styles.scss';

import { Typography } from 'antd';

import { ICategoryHeadingProps } from './CategoryHeading.types';

function CategoryHeading({ children }: ICategoryHeadingProps): JSX.Element {
	return (
		<Typography.Text type="secondary" className="container--text-size">
			{children}
		</Typography.Text>
	);
}

export default CategoryHeading;
