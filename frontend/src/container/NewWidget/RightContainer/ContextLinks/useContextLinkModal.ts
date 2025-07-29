import { useState } from 'react';
import { ContextLinkProps } from 'types/api/dashboard/getAll';

interface ContextLinkModalProps {
	isModalOpen: boolean;
	selectedContextLink: ContextLinkProps | null;
	handleEditContextLink: (contextLink: ContextLinkProps) => void;
	handleAddContextLink: () => void;
	handleCancelModal: () => void;
	handleSaveContextLink: () => void;
}

const useContextLinkModal = (): ContextLinkModalProps => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [
		selectedContextLink,
		setSelectedContextLink,
	] = useState<ContextLinkProps | null>(null);

	const handleEditContextLink = (contextLink: ContextLinkProps): void => {
		setSelectedContextLink(contextLink);
		setIsModalOpen(true);
	};

	const handleAddContextLink = (): void => {
		setSelectedContextLink(null);
		setIsModalOpen(true);
	};

	const handleCancelModal = (): void => {
		setIsModalOpen(false);
		setSelectedContextLink(null);
	};

	const handleSaveContextLink = (): void => {
		// TODO: Implement save functionality
		console.log('Save context link:', selectedContextLink);
		setIsModalOpen(false);
		setSelectedContextLink(null);
	};

	return {
		isModalOpen,
		selectedContextLink,
		handleEditContextLink,
		handleAddContextLink,
		handleCancelModal,
		handleSaveContextLink,
	};
};

export default useContextLinkModal;
