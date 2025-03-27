import './StepsFooter.styles.scss';

import { SyncOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import cx from 'classnames';
import { Check, Cone, Play } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useState } from 'react';

import AddFunnelDescriptionModal from './AddFunnelDescriptionModal';

interface StepsFooterProps {
	stepsCount: number;
	funnelId: string;
	funnelDescription: string;
}

function StepsFooter({
	stepsCount,
	funnelId,
	funnelDescription,
}: StepsFooterProps): JSX.Element {
	const {
		validTracesCount,
		handleRunFunnel,
		isValidateStepsLoading,
	} = useFunnelContext();
	const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

	return (
		<div className="steps-footer">
			<div className="steps-footer__left">
				<Cone className="funnel-icon" size={14} />
				<span>{stepsCount} steps</span>
				<span>·</span>
				{isValidateStepsLoading ? (
					<Skeleton.Button size="small" />
				) : (
					<span
						className={cx('steps-footer__valid-traces', {
							'steps-footer__valid-traces--none': validTracesCount === 0,
						})}
					>
						{validTracesCount} valid traces
					</span>
				)}
			</div>
			<div className="steps-footer__right">
				{funnelDescription ? (
					<Button
						type="primary"
						disabled={validTracesCount === 0}
						onClick={handleRunFunnel}
						icon={<SyncOutlined />}
					/>
				) : (
					<>
						<Button
							type="default"
							className="steps-footer__button steps-footer__button--save"
							icon={<Check size={16} />}
							onClick={(): void => setIsDescriptionModalOpen(true)}
						>
							Save funnel
						</Button>
						<Button
							disabled={validTracesCount === 0}
							onClick={handleRunFunnel}
							type="primary"
							className="steps-footer__button steps-footer__button--run"
							icon={<Play size={16} />}
						>
							Run funnel
						</Button>
					</>
				)}
			</div>
			<AddFunnelDescriptionModal
				isOpen={isDescriptionModalOpen}
				onClose={(): void => setIsDescriptionModalOpen(false)}
				funnelId={funnelId}
			/>
		</div>
	);
}

export default StepsFooter;
