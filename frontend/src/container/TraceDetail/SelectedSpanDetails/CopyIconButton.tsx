import { Tooltip } from "antd";
import { useCopyToClipboard } from "hooks/useCopyToClipboard";
import { Copy, Check } from "lucide-react";

interface CopyIconButtonProps {
	text: string;
	copyId: string;
	label?: string;
}

function CopyIconButton({ text, copyId, label = "Copy" }: CopyIconButtonProps): JSX.Element {
	const { copyToClipboard, isCopied, id: copiedId } = useCopyToClipboard();
	const isThisCopied = isCopied && copiedId === copyId;

	return (
		<Tooltip title={isThisCopied ? "Copied!" : label}>
			<span
				className="copy-icon-button"
				role="button"
				tabIndex={0}
				onClick={(): void => copyToClipboard(text, copyId)}
				onKeyDown={(e): void => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						copyToClipboard(text, copyId);
					}
				}}
			>
				{isThisCopied ? <Check size={12} /> : <Copy size={12} />}
			</span>
		</Tooltip>
	);
}

export default CopyIconButton;
