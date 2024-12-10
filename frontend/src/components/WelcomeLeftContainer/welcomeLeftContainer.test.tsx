import { render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

import WelcomeLeftContainer from './index';

jest.mock('react-i18next', () => ({
	useTranslation: jest.fn().mockReturnValue({ t: (key: string) => key }),
}));

const version = '1.0.0';

type RenderWelcomeContainer = () => ReturnType<typeof render>;

const renderWelcomeContainer: RenderWelcomeContainer = () =>
	render(
		<WelcomeLeftContainer version={version}>
			Children Content
		</WelcomeLeftContainer>,
	);

describe('Tests for component/WelcomeLeftContainer', () => {
	it('Should renders the logo, title, and version', () => {
		renderWelcomeContainer();
		const { t } = useTranslation();

		const logo = screen.getByAltText('logo');
		expect(logo).toBeInTheDocument();

		const title = screen.getByText('SigNoz');
		expect(title).toBeInTheDocument();

		const versionText = screen.getByText(`SigNoz ${version}`);
		expect(versionText).toBeInTheDocument();

		const translatedText = screen.getByText(t('monitor_signup'));
		expect(translatedText).toBeInTheDocument();
	});

	it('Should render children content', () => {
		renderWelcomeContainer();

		const childrenContent = screen.getByText('Children Content');
		expect(childrenContent).toBeInTheDocument();
	});
});
