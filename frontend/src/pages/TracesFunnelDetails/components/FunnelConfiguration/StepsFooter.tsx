import './StepsFooter.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import { Check, Cone, Play } from 'lucide-react';

interface StepsFooterProps {
	stepsCount: number;
	validTracesCount: number;
}

function StepsFooter({
	stepsCount,
	validTracesCount,
}: StepsFooterProps): JSX.Element {
	return (
		<div className="steps-footer">
			<div className="steps-footer__left">
				<Cone className="funnel-icon" size={14} />
				<span>{stepsCount} steps</span>
				<span>·</span>
				<span
					className={cx('steps-footer__valid-traces', {
						'steps-footer__valid-traces--none': validTracesCount === 0,
					})}
				>
					{validTracesCount} valid traces
				</span>
			</div>
			<div className="steps-footer__right">
				<Button
					type="default"
					className="steps-footer__button steps-footer__button--save"
					icon={<Check size={16} />}
				>
					Save funnel
				</Button>
				<Button
					type="primary"
					className="steps-footer__button steps-footer__button--run"
					icon={<Play size={16} />}
				>
					Run funnel
				</Button>
			</div>
		</div>
	);
}

export default StepsFooter;
