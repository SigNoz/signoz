import { render } from 'tests/test-utils';

import Severity from './AlertStatus';

describe('Severity component', () => {
	it('should render UnProcessed tag for severity "unprocessed"', () => {
		const { getByText } = render(<Severity severity="unprocessed" />);
		const tagElement = getByText('UnProcessed');

		expect(tagElement).toBeInTheDocument();
		expect(tagElement).toHaveClass('ant-tag-green');
	});

	it('should render Firing tag for severity "active"', () => {
		const { getByText } = render(<Severity severity="active" />);
		const tagElement = getByText('Firing');

		expect(tagElement).toBeInTheDocument();
		expect(tagElement).toHaveClass('ant-tag-red');
	});

	it('should render Suppressed tag for severity "suppressed"', () => {
		const { getByText } = render(<Severity severity="suppressed" />);
		const tagElement = getByText('Suppressed');

		expect(tagElement).toBeInTheDocument();
		expect(tagElement).toHaveClass('ant-tag-red');
	});

	it('should render Unknown Status tag for unknown severity', () => {
		const { getByText } = render(<Severity severity="unknown" />);
		const tagElement = getByText('Unknown Status');

		expect(tagElement).toBeInTheDocument();
		expect(tagElement).toHaveClass('ant-tag-default');
	});
});
