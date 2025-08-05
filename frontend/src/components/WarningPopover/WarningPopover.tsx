/* eslint-disable react/jsx-props-no-spreading */
import './WarningPopover.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover, PopoverProps } from 'antd';
import ErrorIcon from 'assets/Error';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { BookOpenText, ChevronsDown } from 'lucide-react';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { ReactNode } from 'react';
import { Warning } from 'types/api';

interface WarningContentProps {
	warning: Warning;
}

export function WarningContent({ warning }: WarningContentProps): JSX.Element {
	const {
		url: warningUrl,
		warnings: warningMessages,
		code: warningCode,
		message: warningMessage,
	} = warning || {};
	return (
		<section className="warning-content">
			{/* Summary Header */}
			<section className="warning-content__summary-section">
				<header className="warning-content__summary">
					<div className="warning-content__summary-left">
						<div className="warning-content__icon-wrapper">
							<ErrorIcon />
						</div>

						<div className="warning-content__summary-text">
							<h2 className="warning-content__warning-code">{warningCode}</h2>
							<p className="warning-content__warning-message">{warningMessage}</p>
						</div>
					</div>

					{warningUrl && (
						<div className="warning-content__summary-right">
							<Button
								type="default"
								className="warning-content__docs-button"
								href={warningUrl}
								target="_blank"
								data-testid="warning-docs-button"
							>
								<BookOpenText size={14} />
								Open Docs
							</Button>
						</div>
					)}
				</header>

				{warningMessages?.length > 0 && (
					<div className="warning-content__message-badge">
						<KeyValueLabel
							badgeKey={
								<div className="warning-content__message-badge-label">
									<div className="warning-content__message-badge-label-dot" />
									<div className="warning-content__message-badge-label-text">
										MESSAGES
									</div>
								</div>
							}
							badgeValue={warningMessages.length.toString()}
						/>
						<div className="warning-content__message-badge-line" />
					</div>
				)}
			</section>

			{/* Detailed Messages */}
			<section className="warning-content__messages-section">
				<div className="warning-content__message-list-container">
					<OverlayScrollbar>
						<ul className="warning-content__message-list">
							{warningMessages?.map((warning) => (
								<li className="warning-content__message-item" key={warning.message}>
									{warning.message}
								</li>
							))}
						</ul>
					</OverlayScrollbar>
					{warningMessages?.length > 10 && (
						<div className="warning-content__scroll-hint">
							<ChevronsDown
								size={16}
								color={Color.BG_VANILLA_100}
								className="warning-content__scroll-hint-icon"
							/>
							<span className="warning-content__scroll-hint-text">
								Scroll for more
							</span>
						</div>
					)}
				</div>
			</section>
		</section>
	);
}

interface WarningPopoverProps extends Omit<PopoverProps, 'content'> {
	/** Content to display in the popover */
	content: ReactNode;
	/** Element that triggers the popover */
	children: ReactNode;
}

function WarningPopover({
	content,
	children,
	...popoverProps
}: WarningPopoverProps): JSX.Element {
	return (
		<Popover content={content} {...popoverProps}>
			{children}
		</Popover>
	);
}

export default WarningPopover;
