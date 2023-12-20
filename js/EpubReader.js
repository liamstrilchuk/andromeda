class EpubReader {
	constructor(container) {
		this.container = container;

		this.inputManager = new InputManager();
		this.store = new Store();
		this.util = new Util();
		this.renderer = new Renderer({});
		this.loader = new Loader({});
		this.interface = new Interface(this.container);
		this.gutenberg = new Gutenberg();
	}

	async init() {
		this.interface.loadTheme(await this.store.loadSetting("theme"));
		this.interface.createLibrary();
	}

	async fileLoaded(file) {
		this.bookLoaded(await this.loader.load(file));
	}

	async bookLoaded(book) {
		const position = await this.store.loadPosition(book.title);
		this.util.setTitle(book.title);
		
		const elements = this.interface.createReader();
		this.renderer.container = elements.reader;
		this.renderer.overlay = elements.overlay;
		this.renderer.load(book, position);
	}
}