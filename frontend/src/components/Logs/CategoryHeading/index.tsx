import React from 'react';

import { CategoryHeadingText } from './styles';

interface ICategoryHeadingProps {
	children: React.ReactNode;
}
function CategoryHeading({ children }: ICategoryHeadingProps): JSX.Element {
	return <CategoryHeadingText type="secondary">{children}</CategoryHeadingText>;
}

export default CategoryHeading;
