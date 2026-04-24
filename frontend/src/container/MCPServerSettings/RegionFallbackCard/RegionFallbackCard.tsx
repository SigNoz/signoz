import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@signozhq/ui';
import { TriangleAlert } from 'lucide-react';

import './RegionFallbackCard.styles.scss';

interface RegionFallbackCardProps {
	manualRegion: string;
	onRegionChange: (value: string) => void;
	onIngestionLinkClick: () => void;
}

function RegionFallbackCard({
	manualRegion,
	onRegionChange,
	onIngestionLinkClick,
}: RegionFallbackCardProps): JSX.Element {
	const { t } = useTranslation('mcpServer');

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => onRegionChange(e.target.value),
		[onRegionChange],
	);

	return (
		<div className="mcp-region-card">
			<div className="mcp-region-card__warning">
				<TriangleAlert size={14} />
				<span>
					{t('region_warning_prefix')}
					<Button
						variant="link"
						size="sm"
						onClick={onIngestionLinkClick}
					>
						{t('region_warning_link')}
					</Button>
					{t('region_warning_suffix')}
				</span>
			</div>
			<label
				className="mcp-region-card__label"
				htmlFor="mcp-region-input"
			>
				{t('region_input_label')}
			</label>
			<Input
				id="mcp-region-input"
				value={manualRegion}
				placeholder={t('region_input_placeholder')}
				aria-label={t('region_input_label')}
				onChange={handleChange}
			/>
		</div>
	);
}

export default RegionFallbackCard;
