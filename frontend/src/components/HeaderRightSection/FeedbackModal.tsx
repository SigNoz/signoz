import { toast } from '@signozhq/sonner';
import { Button, Input, Radio, RadioChangeEvent, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { handleContactSupport } from 'pages/Integrations/utils';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function FeedbackModal({ onClose }: { onClose: () => void }): JSX.Element {
	const [activeTab, setActiveTab] = useState('feedback');
	const [feedback, setFeedback] = useState('');
	const location = useLocation();
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (): Promise<void> => {
		setIsLoading(true);

		let entityName = 'Feedback';
		if (activeTab === 'reportBug') {
			entityName = 'Bug report';
		} else if (activeTab === 'featureRequest') {
			entityName = 'Feature request';
		}

		logEvent('Feedback: Submitted', {
			data: feedback,
			type: activeTab,
			page: location.pathname,
		})
			.then(() => {
				onClose();

				toast.success(`${entityName} submitted successfully`, {
					position: 'top-right',
				});
			})
			.catch(() => {
				console.error(`Failed to submit ${entityName}`);
				toast.error(`Failed to submit ${entityName}`, {
					position: 'top-right',
				});
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	useEffect(
		() => (): void => {
			setFeedback('');
			setActiveTab('feedback');
		},
		[],
	);

	const items = [
		{
			label: (
				<div className="feedback-modal-tab-label">
					<div className="tab-icon dot feedback-tab" />
					Feedback
				</div>
			),
			key: 'feedback',
			value: 'feedback',
		},
		{
			label: (
				<div className="feedback-modal-tab-label">
					<div className="tab-icon dot bug-tab" />
					Report a bug
				</div>
			),
			key: 'reportBug',
			value: 'reportBug',
		},
		{
			label: (
				<div className="feedback-modal-tab-label">
					<div className="tab-icon dot feature-tab" />
					Feature request
				</div>
			),
			key: 'featureRequest',
			value: 'featureRequest',
		},
	];

	const handleFeedbackChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>,
	): void => {
		setFeedback(e.target.value);
	};

	const handleContactSupportClick = useCallback((): void => {
		handleContactSupport(isCloudUserVal);
	}, [isCloudUserVal]);

	return (
		<div className="feedback-modal-container">
			<div className="feedback-modal-header">
				<Radio.Group
					value={activeTab}
					defaultValue={activeTab}
					optionType="button"
					className="feedback-modal-tabs"
					options={items}
					onChange={(e: RadioChangeEvent): void => setActiveTab(e.target.value)}
				/>
			</div>
			<div className="feedback-modal-content">
				<div className="feedback-modal-content-header">
					<Input.TextArea
						placeholder="Write your feedback here..."
						rows={6}
						required
						className="feedback-input"
						value={feedback}
						onChange={handleFeedbackChange}
					/>
				</div>
			</div>

			<div className="feedback-modal-content-footer">
				<Button
					className="periscope-btn primary"
					type="primary"
					onClick={handleSubmit}
					loading={isLoading}
					disabled={feedback.length === 0}
				>
					Submit
				</Button>
				<div className="feedback-modal-content-footer-info-text">
					<Typography.Text>
						Have a specific issue?{' '}
						<Typography.Link
							className="contact-support-link"
							onClick={handleContactSupportClick}
						>
							Contact Support{' '}
						</Typography.Link>
						or{' '}
						<a
							href="https://signoz.io/docs/introduction/"
							target="_blank"
							rel="noreferrer"
							className="read-docs-link"
						>
							Read our docs
						</a>
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default FeedbackModal;
