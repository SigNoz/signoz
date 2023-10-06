import './CategoryHeading.styles.scss';

import { Typography } from 'antd';

import { CategoryHeadingProps } from './CategoryHeading.types';

function CategoryHeading({ children }: CategoryHeadingProps): JSX.Element {
	return (
		<Typography.Text type="secondary" className="categoryheading--text-size">
			{children}
		</Typography.Text>
	);
}

export default CategoryHeading;
