class Interface {
	constructor(container, inputManager) {
		this.container = container;
		this.currentlyRendering = false;

		this.librarySearchTerm = "";
		this.libraryFormat = "grid";
		this.libraryFilter = "last-opened";
		this.libraryDescending = true;

		this.currentView = "library";
		
		inputManager.addListener("mousedown", this.onMouseDown.bind(this));
	}

	resetContainer() {
		this.container.clear();
		this.container.innerHTML = `
			<input style="display: none" type="file" accept=".epub" id="fileInput">
			<div class="mainHolder">
				<div class="navigationBar">
					<div class="navigationBarTitle"><img src="assets/logo.png" draggable="false"><span>Andromeda</span></div>
					<div class="navigationBarItem ${this.currentView === "library" ? "currentNavItem" : ""}" id="navLibrary">Your Library</div>
					<div class="navigationBarItem ${this.currentView === "gutenberg" ? "currentNavItem" : ""}" id="navGutenberg">Project Gutenberg</div>
					<div class="navigationBarItem ${this.currentView === "about" ? "currentNavItem" : ""}" id="navAbout">About</div>
				</div>
				<div class="container"></div>
			</div>
		`;

		reader.util.loadElem("#navLibrary").addEventListener("click", () => {
			if (this.currentView !== "library") {
				this.createLibrary();
			}
		});
		reader.util.loadElem("#navGutenberg").addEventListener("click", () => {
			if (this.currentView !== "gutenberg") {
				this.createGutenberg();
			}
		});
	}

	async createLibrary() {
		this.currentView = "library";
		reader.util.setTitle("EPUB Library");
		reader.renderer.close();

		this.resetContainer();

		const container = reader.util.loadElem(".container");
		container.innerHTML = `
			<div class="libraryControlsHolder">
				<div class="libraryControlsSection">
					<div class="librarySearchInputHolder">
						<img src="assets/browse.png" class="librarySearchInputIcon" draggable="false">
						<input class="librarySearchInput" placeholder="Search for books...">
					</div>
				</div>
				<div class="libraryControlsSection">
					<button class="buttonIcon" id="libraryLayoutButton"><img src="assets/${this.libraryFormat === "grid" ? "list" : "grid"}.png" class="buttonIconImage"></button>
					<button id="addButton"><img src="assets/plus.png" class="buttonIconImage">&nbsp;&nbsp;Add book</button>
				</div>
			</div>
			<div class="libraryBooksHolder"></div>
		`;

		const searchInput = reader.util.loadElem(".librarySearchInput");
		searchInput.addEventListener("input", () => {
			this.librarySearchTerm = searchInput.value;
			this.renderBooks();
		});

		reader.util.loadElem("#libraryLayoutButton").addEventListener("click", () => {
			this.libraryFormat = this.libraryFormat === "list" ? "grid" : "list";
			this.createLibrary();
		});

		const fileInput = reader.util.loadElem("#fileInput");
		fileInput.addEventListener("change", () => this.addBook(fileInput));

		const addButton = reader.util.loadElem("#addButton");
		addButton.addEventListener("click", () => fileInput.click());

		await this.renderBooks();
	}

	async renderBooks() {
		if (this.currentlyRendering) {
			return;
		}
		this.currentlyRendering = true;
		const container = reader.util.loadElem(".libraryBooksHolder");

		if (this.libraryFormat === "grid") {
			container.classList.add("libraryGridBooksHolder");
		}

		const books = await reader.store.loadLibrary();
		const library = this.sortBooks(this.filterBooks(books));
		let allHTML = "";

		for (const item of library) {
			const position = await reader.store.loadPosition(item.title);
			const percentage = position.percentage;

			const author = item.attributes["Creator"] || "Unknown";
			let bookElemClass = this.libraryFormat === "list" ? "libraryItem" : "libraryGridItem";
			let itemHTML = "";

			if (this.libraryFormat === "list") {
				const lastOpened = item.lastOpened ? new Date(item.lastOpened)
					.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "&mdash;";

				itemHTML = `
					<div class="libraryImage">
						<img src="${item.cover}" draggable="false">
					</div>
					<div class="libraryTitle"><span>${item.title}</span></div>
					<div class="libraryAuthor"><span>${author}</span></div>
					<div class="librarySize">${this.getLength(item.size)}</div>
					<div class="libraryProgress">${Math.round(percentage)}%</div>
					<div class="libraryOpened"><span>${lastOpened}</span></div>
					<div class="libraryProgressBar">
						<div class="libraryProgressBarInside" style="width: ${Math.round(percentage * 100) / 100}%;"></div>
					</div>
				`;
			} else {
				itemHTML = `
					<div class="libraryGridImage">
						<img src="${item.cover}" draggable="false">
					</div>
					<div class="libraryGridTitle"><span>${item.title}</span></div>
					<div class="libraryGridAuthor"><span>${author}</span></div>
					<div class="libraryGridProgress"><span>${Math.round(percentage)}% complete</span></div>
					<div class="libraryProgressBar">
						<div class="libraryProgressBarInside" style="width: ${Math.round(percentage * 100) / 100}%;"></div>
					</div>
				`;
			}

			allHTML += `
				<div class="${bookElemClass} libaryElement" title="${item.title}">
					${itemHTML}
				</div>
			`;
		}

		if (this.libraryFormat === "list") {
			allHTML = `
				<div class="libraryItem libraryHeader">
					<div class="libraryImage"></div>
					<div class="libraryTitle">Title
						${this.libraryFilter === "title" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
					</div>
					<div class="libraryAuthor">Author
						${this.libraryFilter === "author" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
					</div>
					<div class="librarySize">Size
						${this.libraryFilter === "size" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
					</div>
					<div class="libraryProgress">Progress</div>
					<div class="libraryOpened">Last Opened
						${this.libraryFilter === "last-opened" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
					</div>
				</div>
			` + allHTML;
		}

		container.innerHTML = allHTML;

		reader.util.loadAllElems(".libaryElement").forEach(elem => {
			elem.addEventListener("click", () => this.loadBook(elem.title));
			elem.addEventListener("contextmenu", event => {
				event.preventDefault();
				this.openBookContextMenu(event, elem.title);
			});
		});

		if (this.libraryFormat === "list") {
			reader.util.loadElem(".libraryTitle").addEventListener("click", () => {
				this.libraryDescending = this.libraryFilter === "title" ? !this.libraryDescending : true;
				this.libraryFilter = "title";
				this.renderBooks();
			});

			reader.util.loadElem(".libraryAuthor").addEventListener("click", () => {
				this.libraryDescending = this.libraryFilter === "author" ? !this.libraryDescending : true;
				this.libraryFilter = "author";
				this.renderBooks();
			});

			reader.util.loadElem(".librarySize").addEventListener("click", () => {
				this.libraryDescending = this.libraryFilter === "size" ? !this.libraryDescending : true;
				this.libraryFilter = "size";
				this.renderBooks();
			});

			reader.util.loadElem(".libraryOpened").addEventListener("click", () => {
				this.libraryDescending = this.libraryFilter === "last-opened" ? !this.libraryDescending : true;
				this.libraryFilter = "last-opened";
				this.renderBooks();
			});
		}

		this.currentlyRendering = false;
	}

	openBookContextMenu(event, title) {
		reader.util.loadAllElems(".contextMenu").forEach(elem => elem.remove());
		const contextMenu = reader.util.createElement("div", this.container, "contextMenu");

		contextMenu.innerHTML = `
			<div class="contextMenuTitle">${title}</div>
			<div class="contextMenuItem" id="contextMenuOpen">Open</div>
			<div class="contextMenuItem" id="contextMenuDetails">Details</div>
			<div class="contextMenuItem contextMenuDelete" id="contextMenuDelete">Delete</div>
		`;

		contextMenu.style.left = `${event.clientX}px`;
		if (event.clientY + contextMenu.clientHeight > window.innerHeight) {
			contextMenu.style.top = `${event.clientY - contextMenu.clientHeight}px`;
		} else {
			contextMenu.style.top = `${event.clientY}px`;
		}

		contextMenu.addEventListener("click", event => {
			if (!event.target.classList.contains("contextMenuItem")) {
				return;
			}

			if (event.target.id === "contextMenuOpen") {
				this.loadBook(title);
			}

			if (event.target.id === "contextMenuDetails") {
				this.openInfoBox(title);
			}

			if (event.target.id === "contextMenuDelete") {
				this.openDeleteDialog(title);
			}

			contextMenu.remove();
		});
	}

	onMouseDown(event) {
		if (this.currentView !== "library") {
			return;
		}

		if (!event.target.className.includes("contextMenu")) {
			reader.util.loadAllElems(".contextMenu").forEach(elem => elem.remove());
		}
	}

	filterBooks(books) {
		const searchTerm = this.librarySearchTerm.toLowerCase();
		return books.filter(book => book.title.toLowerCase().includes(searchTerm));
	}

	sortBooks(books) {
		switch (this.libraryFilter) {
			case "last-opened":
				books.sort((a, b) => {
					const openedA = a.lastOpened || 0;
					const openedB = b.lastOpened || 0;
					return this.libraryDescending ? openedB - openedA : openedA - openedB;
				});
				break;
			case "title":
				books.sort((a, b) => this.libraryDescending ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
				break;
			case "author":
				books.sort((a, b) => {
					const authorA = a.attributes["Creator"] || "Unknown";
					const authorB = b.attributes["Creator"] || "Unknown";
					return this.libraryDescending ? authorB.localeCompare(authorA) : authorA.localeCompare(authorB);
				});
				break;
			case "size":
				books.sort((a, b) => this.libraryDescending ? b.size - a.size : a.size - b.size);
				break;
		}

		return books;
	}

	async createGutenberg(search="") {
		this.currentView = "gutenberg";
		this.resetContainer();

		const container = reader.util.loadElem(".container");

		container.innerHTML = `
			<div class="libraryControlsHolder">
				<div class="libraryControlsSection">
					<div class="librarySearchInputHolder">
						<img src="assets/browse.png" class="librarySearchInputIcon" draggable="false">
						<input class="librarySearchInput" placeholder="Search for title or author..." value="${search}">
					</div>
					<button id="gutenbergSearchButton">Search</button>
				</div>
			</div>
			<div class="libraryBooksHolder"></div>
		`;

		const searchButton = reader.util.loadElem("#gutenbergSearchButton");
		const searchInput = reader.util.loadElem(".librarySearchInput");

		searchButton.addEventListener("click", () => this.createGutenberg(searchInput.value));

		const booksHolder = reader.util.loadElem(".libraryBooksHolder");
		booksHolder.innerHTML = `
			<div class="libraryItem libraryHeader">
				<div class="libraryImage"></div>
				<div class="libraryTitle">Title
					${this.libraryFilter === "title" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
				</div>
				<div class="libraryAuthor">Author
					${this.libraryFilter === "author" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
				</div>
				<div class="librarySize">Downloads
					${this.libraryFilter === "size" ? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">` : ""}
				</div>
			</div>
		`;

		const gutenberg = await reader.gutenberg.loadBooks("popular", search);

		for (const item of gutenberg) {
			const bookElem = reader.util.createElement("div", booksHolder, "libraryItem").setAttributes({
				title: item.title
			});

			const author = item.author || "Unknown";

			bookElem.innerHTML += `
				<div class="libraryImage">
					<img src="${item.cover}" draggable="false">
				</div>
				<div class="libraryTitle"><span>${item.title}</span></div>
				<div class="libraryAuthor"><span>${author}</span></div>
				<div class="librarySize">${item.downloads}</div>
				<div class="librarySize"></div>
				<div class="libraryOpened gutenbergDownloadHolder">
					<a href="${item.url}" target="_blank"><button class="gutenbergDownload">Download</button></a>
				</div>
			`;
		}
	}

	createReader() {
		this.currentView = "reader";
		if (reader.renderer.readerStylesheet) {
			reader.renderer.readerStylesheet.remove();
		}
		this.container.clear();

		const readerElem = reader.util.createElement("div", this.container).setAttributes({ id: "reader" });

		const readerOverlay = reader.util.createElement("div", this.container).setAttributes({ id: "readerOverlay" });

		readerOverlay.innerHTML = `
			<div id="readerOverlayTop">
				<div id="readerOverlayTopLeft">
					<button class="overlayButton" id="overlayButtonBack" title="Back to library"><img src="assets/back.png"></button>
				</div>
				<div id="readerOverlayTopText"></div>
				<div id="readerOverlayTopRight">
					<button class="overlayButton" id="overlayButtonTOC" title="Table of contents"><img src="assets/list.png"></button>
					<button class="overlayButton" id="overlayButtonInfo" title="Book information"><img src="assets/info2.png"></button>
					<button class="overlayButton" id="overlayButtonSettings" title="Settings"><img src="assets/text-font.png"></button>
				</div>
			</div>
			<div id="readerOverlayBottom">
				<div id="overlayProgress">
					<div id="progressMarker"></div>
				</div>
			</div>
			<div id="readerOverlaySmall">
				<div></div>
			</div>
			<div id="readerLoading">
				<div id="loadingAnimation"></div>
			</div>
			<div id="overlayTooltip"></div>
		`;

		reader.util.loadElem("#overlayButtonBack").addEventListener("click", () => this.createLibrary());
		reader.util.loadElem("#overlayButtonInfo").addEventListener("click", () => this.openInfoBox(reader.renderer.book.title));
		reader.util.loadElem("#overlayButtonSettings").addEventListener("click", () => this.openSettingsBox());
		reader.util.loadElem("#overlayButtonTOC").addEventListener("click", () => this.openTOCBox(reader.renderer.book.tableOfContents));

		return { reader: readerElem, overlay: readerOverlay };
	}

	loadTheme(theme) {
		// remove all existing theme stylesheets
		reader.util.loadAllElems("link")
			.filter(elem => /css\/theme-\w+?.css/.test(elem.href))
			.forEach(elem => elem.remove());

		reader.util.loadStylesheet(`css/theme-${theme}.css`);
	}

	getLength(count) {
		const kilobytes = Math.ceil(count / 1000);
		
		if (kilobytes >= 1000) {
			const megabytes = kilobytes / 1000;
			return `${Math.round(megabytes * 10) / 10} MB`;
		}

		return `${kilobytes} KB`;
	}

	async loadBook(title) {
		reader.bookLoaded(await reader.store.loadBook(title));
	}

	addBook(input) {
		reader.fileLoaded(input.files[0]);
	}

	createInfoBox(html, title) {
		reader.util.loadAllElems("#infoBoxContainer").forEach(elem => elem.remove());
		const infoBoxContainer = reader.util.createElement("div", this.container).setAttributes({ id: "infoBoxContainer" });
		const infoBox = reader.util.createElement("div", infoBoxContainer).setAttributes({
			id: "infoBox"
		});

		infoBox.innerHTML = `
			${title ? `<div class="infoBoxItem">
				<span class="infoBoxItemTitle">${title}</span>
				<span id="infoBoxButtonClose"><img src="assets/close.png" draggable="false"></span>
			</div>` : ""}${html}
		`;

		if (title) {
			infoBox.querySelector("#infoBoxButtonClose").addEventListener("click", () => infoBoxContainer.remove());
		}
	}

	async openInfoBox(title) {
		const book = await reader.store.loadBook(title);

		let html = `
			<div class="infoBoxItem">
				<span class="infoBoxItemTitle">Title</span>
				<span>${title}</span>
			</div>
		`;

		for (const [key, value] of Object.entries(book.attributes)) {
			html += `
				<div class="infoBoxItem">
					<span class="infoBoxItemTitle">${key}</span>
					<span>${value}</span>
				</div>
			`;
		}

		this.createInfoBox(html, "Book information");
	}

	openTOCBox(toc) {
		const html = toc.length ? toc.map(item => `
			<div class="infoBoxItem tocElem" data-filename="${item.content}">
				<span style="margin-left: ${item.indentation * 20}px; pointer-events: none;">${item.title}</span>
			</div>
		`).join("") : `<div class="infoBoxItem">This book does not have a table of contents.</div>`;

		this.createInfoBox(html, "Table of contents");

		reader.util.loadAllElems(".tocElem").forEach(elem => elem.addEventListener("click", event => {
			const chapter = reader.renderer.book.contents.find(item => item.filename === event.target.dataset.filename);
			if (chapter) {
				reader.renderer.position.chapter = reader.renderer.book.contents.indexOf(chapter);
				reader.renderer.loadChapter();
				reader.util.loadElem("#infoBoxContainer").remove();
			}
		}));
	}

	openSettingsBox() {
		this.createInfoBox(`
			<div class="settingsItem">
				<span>Theme</span>
				<div id="settingsTheme">
					<div id="settingsTheme-light">Light</div>
					<div id="settingsTheme-dark">Dark</div>
				</div>
			</div>
			<div class="settingsItem">
				<span>Font size</span>
				<div id="settingsSize">
					<div id="settingsSize-18">18</div>
					<div id="settingsSize-19">19</div>
					<div id="settingsSize-20">20</div>
					<div id="settingsSize-21">21</div>
					<div id="settingsSize-22">22</div>
					<div id="settingsSize-23">23</div>
				</div>
			</div>
			<div class="settingsItem">
				<span>Line height</span>
				<div id="settingsHeight">
					<div id="settingsHeight-1.0">1.0</div>
					<div id="settingsHeight-1.1">1.1</div>
					<div id="settingsHeight-1.2">1.2</div>
					<div id="settingsHeight-1.3">1.3</div>
					<div id="settingsHeight-1.4">1.4</div>
					<div id="settingsHeight-1.5">1.5</div>
				</div>
			</div>
			<div class="settingsItem">
				<span>Maximum reader width</span>
				<div id="settingsWidth">
					<div id="settingsWidth-1100">1100</div>
					<div id="settingsWidth-1200">1200</div>
					<div id="settingsWidth-1300">1300</div>
					<div id="settingsWidth-1400">1400</div>
					<div id="settingsWidth-1500">1500</div>
					<div id="settingsWidth-1600">1600</div>
					<div id="settingsWidth-none">None</div>
				</div>
			</div>
			<div class="settingsItem">
				<span>Font</span>
				<div id="settingsFont">
					<div id="settingsFont-arial" style="font-family: arial;">Sans-serif</div>
					<div id="settingsFont-serif" style="font-family: serif;">Serif</div>
					<div id="settingsFont-monospace" style="font-family: monospace;">Monospace</div>
				</div>
			</div>
		`, "Settings");

		const themeElems = reader.util.loadAllElems("div", reader.util.loadElem("#settingsTheme"));
		themeElems.forEach(elem => elem.addEventListener("click", async () => {
			await reader.store.updateSetting("theme", elem.id.split("-")[1]);
			this.loadTheme(elem.id.split("-")[1]);

			themeElems.forEach(elem => elem.classList.remove("settingsSelected"));
			elem.classList.add("settingsSelected");
		}));

		const sizeElems = reader.util.loadAllElems("div", reader.util.loadElem("#settingsSize"));
		sizeElems.forEach(elem => elem.addEventListener("click", async () => {
			await reader.store.updateSetting("fontSize", elem.id.split("-")[1]);
			reader.renderer.onResize();

			sizeElems.forEach(elem => elem.classList.remove("settingsSelected"));
			elem.classList.add("settingsSelected");
		}));

		const heightElems = reader.util.loadAllElems("div", reader.util.loadElem("#settingsHeight"));
		heightElems.forEach(elem => elem.addEventListener("click", async () => {
			await reader.store.updateSetting("lineSpacing", elem.id.split("-")[1]);
			reader.renderer.onResize();

			heightElems.forEach(elem => elem.classList.remove("settingsSelected"));
			elem.classList.add("settingsSelected");
		}));

		const widthElems = reader.util.loadAllElems("div", reader.util.loadElem("#settingsWidth"));
		widthElems.forEach(elem => elem.addEventListener("click", async () => {
			await reader.store.updateSetting("maxWidth", elem.id.split("-")[1]);
			reader.renderer.onResize();

			widthElems.forEach(elem => elem.classList.remove("settingsSelected"));
			elem.classList.add("settingsSelected");
		}));

		const fontElems = reader.util.loadAllElems("div", reader.util.loadElem("#settingsFont"));
		fontElems.forEach(elem => elem.addEventListener("click", async () => {
			await reader.store.updateSetting("font", elem.id.split("-")[1]);
			reader.renderer.onResize();

			fontElems.forEach(elem => elem.classList.remove("settingsSelected"));
			elem.classList.add("settingsSelected");
		}));
	}

	openDeleteDialog(title) {
		this.createInfoBox(`
			<div id="deleteDialog">
				<div id="deleteText">Are you sure you want to delete <i>${title}</i>?</div>
				<div id="deleteButtons">
					<button id="cancelDeleteButton">Cancel</button>
					<button id="deleteBookButton">Delete</button>
				</div>
			</div>
		`);

		reader.util.loadElem("#deleteBookButton").addEventListener("click", async () => {
			await reader.store.removeFromLibrary(title);
			this.createLibrary();
		});

		reader.util.loadElem("#cancelDeleteButton").addEventListener("click", () => reader.util.loadElem("#infoBoxContainer").remove());
	}
}