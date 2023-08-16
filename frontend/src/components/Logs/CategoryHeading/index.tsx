import { ReactNode } from 'react';

import { CategoryHeadingText } from './styles';

interface ICategoryHeadingProps {
	children: ReactNode;
}
function CategoryHeading({ children }: ICategoryHeadingProps): JSX.Element {
	return <CategoryHeadingText type="secondary">{children}</CategoryHeadingText>;
}

export default CategoryHeading;
