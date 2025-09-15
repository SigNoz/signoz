import DecorativeImage from 'components/DecorativeImage/DecorativeImage';

function NotFound(): JSX.Element {
	return <DecorativeImage style={{ maxHeight: '480px', maxWidth: '480px' }} src="/Images/notFound404.png" className="not-found-image" />;
}

export default NotFound;
