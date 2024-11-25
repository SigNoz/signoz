import './TimezoneAdaptation.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Switch } from 'antd';
import { Delete } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { useMemo, useState } from 'react';

function TimezoneAdaptation(): JSX.Element {
	const { timezone, browserTimezone, updateTimezone } = useTimezone();

	const isTimezoneOverridden = useMemo(
		() => timezone?.offset !== browserTimezone.offset,
		[timezone, browserTimezone],
	);

	const [isAdaptationEnabled, setIsAdaptationEnabled] = useState(true);

	const getSwitchStyles = (): React.CSSProperties => ({
		backgroundColor:
			isAdaptationEnabled && isTimezoneOverridden ? Color.BG_AMBER_400 : undefined,
	});

	const handleOverrideClear = (): void => {
		updateTimezone(browserTimezone);
	};

	return (
		<div className="timezone-adaption">
			<div className="timezone-adaption__header">
				<h2 className="timezone-adaption__title">Adapt to my timezone</h2>
				<Switch
					checked={isAdaptationEnabled}
					onChange={setIsAdaptationEnabled}
					style={getSwitchStyles()}
				/>
			</div>

			<p className="timezone-adaption__description">
				Adapt the timestamps shown in the SigNoz console to my active timezone.
			</p>

			<div className="timezone-adaption__note">
				<div className="timezone-adaption__note-text-container">
					<span className="timezone-adaption__bullet">•</span>
					<span className="timezone-adaption__note-text">
						{isTimezoneOverridden ? (
							<>
								Your current timezone is overridden to
								<span className="timezone-adaption__note-text-overridden">
									{timezone?.offset}
								</span>
							</>
						) : (
							<>
								You can override the timezone adaption for any view with the time
								picker.
							</>
						)}
					</span>
				</div>

				{!!isTimezoneOverridden && (
					<button
						type="button"
						className="timezone-adaption__clear-override"
						onClick={handleOverrideClear}
					>
						<Delete height={12} width={12} color={Color.BG_ROBIN_300} />
						Clear override
					</button>
				)}
			</div>
		</div>
	);
}

export default TimezoneAdaptation;