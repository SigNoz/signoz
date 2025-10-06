import './ErrorContent.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import ErrorIcon from 'assets/Error';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { BookOpenText, ChevronsDown } from 'lucide-react';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import APIError from 'types/api/error';

interface ErrorContentProps {
	error: APIError;
}

function ErrorContent({ error }: ErrorContentProps): JSX.Element {
	const {
		url: errorUrl,
		errors: errorMessages,
		code: errorCode,
		message: errorMessage,
	} = error?.error?.error || {};
	return (
		<section className="error-content">
			{/* Summary Header */}
			<section className="error-content__summary-section">
				<header className="error-content__summary">
					<div className="error-content__summary-left">
						<div className="error-content__icon-wrapper">
							<ErrorIcon />
						</div>

						<div className="error-content__summary-text">
							<h2 className="error-content__error-code">{errorCode}</h2>
							<p className="error-content__error-message">{errorMessage}</p>
						</div>
					</div>

					{errorUrl && (
						<div className="error-content__summary-right">
							<Button
								type="default"
								className="error-content__docs-button"
								href={errorUrl}
								target="_blank"
								data-testid="error-docs-button"
							>
								<BookOpenText size={14} />
								Open Docs
							</Button>
						</div>
					)}
				</header>

				{errorMessages?.length > 0 && (
					<div className="error-content__message-badge">
						<KeyValueLabel
							badgeKey={
								<div className="error-content__message-badge-label">
									<div className="error-content__message-badge-label-dot" />
									<div className="error-content__message-badge-label-text">MESSAGES</div>
								</div>
							}
							badgeValue={errorMessages.length.toString()}
						/>
						<div className="error-content__message-badge-line" />
					</div>
				)}
			</section>

			{/* Detailed Messages */}
			<section className="error-content__messages-section">
				<div className="error-content__message-list-container">
					<OverlayScrollbar>
						<ul className="error-content__message-list">
							{errorMessages?.map((error) => (
								<li className="error-content__message-item" key={error.message}>
									{error.message}
								</li>
							))}
						</ul>
					</OverlayScrollbar>
					{errorMessages?.length > 10 && (
						<div className="error-content__scroll-hint">
							<ChevronsDown
								size={16}
								color={Color.BG_VANILLA_100}
								className="error-content__scroll-hint-icon"
							/>
							<span className="error-content__scroll-hint-text">Scroll for more</span>
						</div>
					)}
				</div>
			</section>
		</section>
	);
}

export default ErrorContent;
