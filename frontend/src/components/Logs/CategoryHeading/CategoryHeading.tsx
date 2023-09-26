import './CategoryHeading.styles.scss';

import { Typography } from 'antd';
import { ReactNode } from 'react';

interface ICategoryHeadingProps {
	children: ReactNode;
}
function CategoryHeading({ children }: ICategoryHeadingProps): JSX.Element {
	return (
		<Typography.Text type="secondary" className="category-heading-text">
			{children}
		</Typography.Text>
	);
}

export default CategoryHeading;
