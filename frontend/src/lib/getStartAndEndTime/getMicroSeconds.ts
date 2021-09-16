const getMicroSeconds = ({ time }: getMicroSecondsProps): string => {
	return (time / 1000).toString();
};

interface getMicroSecondsProps {
	time: number;
}

export default getMicroSeconds;
