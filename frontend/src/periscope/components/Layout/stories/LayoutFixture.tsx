import type { ComponentType } from 'react';

import type {
	ContentProps,
	FooterProps,
	HeaderProps,
	LayoutProps,
} from '../types';
import styles from './LayoutComparison.module.scss';
import { layoutPartTestId } from './layoutTestIds';

export interface LayoutParts {
	Layout: ComponentType<LayoutProps>;
	Header: ComponentType<HeaderProps>;
	Content: ComponentType<ContentProps>;
	Footer: ComponentType<FooterProps>;
}

export interface LayoutFixtureOptions {
	hasSider?: boolean;
	showHeader: boolean;
	showFooter: boolean;
	contentLines: number;
}

interface LayoutFixtureProps extends LayoutFixtureOptions {
	parts: LayoutParts;
	testIdPrefix: string;
}

/** A page shell built from one `Layout` implementation. */
function LayoutFixture({
	parts: { Layout, Header, Content, Footer },
	testIdPrefix,
	hasSider,
	showHeader,
	showFooter,
	contentLines,
}: LayoutFixtureProps): JSX.Element {
	const testId = (part: string): string => layoutPartTestId(testIdPrefix, part);
	const lines = Array.from({ length: contentLines }, (_, index) => (
		// Lines are positional fixtures with no identity of their own.
		// eslint-disable-next-line react/no-array-index-key
		<p key={index}>Content line {index + 1}</p>
	));

	return (
		<Layout data-testid={testId('root')} hasSider={hasSider}>
			{hasSider && <div className={styles.aside} data-testid={testId('aside')} />}
			<Layout data-testid={testId('inner')}>
				{showHeader && (
					<Header data-testid={testId('header')}>
						Header <a href="#layout-header">link</a>
					</Header>
				)}
				<Content data-testid={testId('content')}>
					<a href="#layout-content">link</a>
					{lines}
				</Content>
				{showFooter && (
					<Footer data-testid={testId('footer')}>
						Footer <a href="#layout-footer">link</a>
					</Footer>
				)}
			</Layout>
			{hasSider && <Content data-testid={testId('side-content')}>Side</Content>}
		</Layout>
	);
}

export default LayoutFixture;
