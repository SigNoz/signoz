// Imported before ChatInput: speech support was read once, at module load.
Object.defineProperty(window, 'webkitSpeechRecognition', {
	configurable: true,
	value: class SpeechRecognitionStub {},
});
