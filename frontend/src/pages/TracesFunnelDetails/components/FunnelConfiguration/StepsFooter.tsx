import './StepsFooter.styles.scss';

import { Button } from 'antd';
import { Check, Cone, Play } from 'lucide-react';

function StepsFooter(): JSX.Element {
	return (
		<div className="steps-footer">
			<div className="steps-footer__left">
				<Cone className="funnel-icon" size={14} />
				<span>2 steps</span>
				<span>·</span>
				<span>5 valid traces</span>
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
