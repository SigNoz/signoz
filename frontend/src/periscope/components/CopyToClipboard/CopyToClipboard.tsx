import './CopyToClipboard.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { CircleCheck, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

function CopyToClipboard({ textToCopy }: { textToCopy: string }): JSX.Element {
	const [state, copyToClipboard] = useCopyToClipboard();
	const [success, setSuccess] = useState(false);
	const isDarkMode = useIsDarkMode();

	useEffect(() => {
		let timer: string | number | NodeJS.Timeout | undefined;
		if (state.value) {
			setSuccess(true);
			timer = setTimeout(() => setSuccess(false), 1000);
		}

		return (): void => clearTimeout(timer);
	}, [state]);

	if (success) {
		return (
			<Button
				type="text"
				icon={<CircleCheck size={16} color={Color.BG_FOREST_400} />}
				className="copy-to-clipboard copy-to-clipboard--success"
			>
				Copied
			</Button>
		);
	}

	return (
		<Button
			type="text"
			icon={
				<Link2
					size={16}
					color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
				/>
			}
			onClick={(): void => copyToClipboard(textToCopy)}
			className="copy-to-clipboard"
		>
			Copy link
		</Button>
	);
}

export default CopyToClipboard;
