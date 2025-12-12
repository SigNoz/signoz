import React, {
	createContext,
	ReactNode,
	useContext,
	useMemo,
	useState,
} from 'react';

type CmdKContextType = {
	open: boolean;
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
	openCmdK: () => void;
	closeCmdK: () => void;
};

const CmdKContext = createContext<CmdKContextType | null>(null);

export function CmdKProvider({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	const [open, setOpen] = useState<boolean>(false);

	function openCmdK(): void {
		setOpen(true);
	}

	function closeCmdK(): void {
		setOpen(false);
	}

	const value = useMemo<CmdKContextType>(
		() => ({
			open,
			setOpen,
			openCmdK,
			closeCmdK,
		}),
		[open],
	);

	return <CmdKContext.Provider value={value}>{children}</CmdKContext.Provider>;
}

export function useCmdK(): CmdKContextType {
	const ctx = useContext(CmdKContext);
	if (!ctx) throw new Error('useCmdK must be used inside CmdKProvider');
	return ctx;
}
