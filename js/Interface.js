class Interface {
	constructor(container) {
		this.container = container;
		this.canClick = true;

		this.librarySearchTerm = "";
		this.libraryFormat = "list";
		this.libraryFilter = "last-opened";
		this.libraryDescending = true;
	}

	resetContainer() {
		this.container.clear();
	}

	async createLibrary() {
		reader.util.setTitle("EPUB Library");
		reader.renderer.close();

		this.resetContainer();

		this.container.innerHTML += `
			<input style="display: none" type="file" accept=".epub" id="fileInput">
			<div class="mainHolder">
				<div class="navigationBar">
					<div class="navigationBarTitle">EPUB Library</div>
					<div class="navigationBarItem currentNavItem">Your Library</div>
					<div class="navigationBarItem">Project Gutenberg</div>
					<div class="navigationBarItem">About</div>
				</div>
				<div class="container"></div>
			</div>
		`;

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
					<button class="buttonIcon"><img src="assets/grid.png" class="buttonIconImage"></button>
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

		await this.renderBooks();
	}

	async renderBooks() {
		const container = reader.util.loadElem(".libraryBooksHolder");

		container.innerHTML = `
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
		`;

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

		const books = await reader.store.loadLibrary();
		const library = this.sortBooks(this.filterBooks(books));

		for (const item of library) {
			const bookElem = reader.util.createElement("div", container, "libraryItem").setAttributes({
				title: item.title
			});

			const position = await reader.store.loadPosition(item.title);
			const percentage = position.percentage;

			const author = item.attributes["Creator"] || "Unknown";

			const lastOpened = item.lastOpened ? new Date(item.lastOpened)
				.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "&mdash;";

			bookElem.innerHTML += `
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

			bookElem.addEventListener("click", () => {
				if (this.canClick) {
					this.loadBook(bookElem.title);
				}
			});

			// bookElem.querySelector(".libraryElemInfo").addEventListener("click", event => {
			// 	event.stopPropagation();
			// 	this.openInfoBox(item.title);
			// });

			// bookElem.querySelector(".libraryElemDelete").addEventListener("click", event => {
			// 	event.stopPropagation();
			// 	this.openDeleteDialog(item.title);
			// });
		}

		const fileInput = reader.util.loadElem("#fileInput");
		fileInput.addEventListener("change", () => this.addBook(fileInput));

		const addButton = reader.util.loadElem("#addButton");
		addButton.addEventListener("click", () => fileInput.click());
	}

	filterBooks(books) {
		const searchTerm = this.librarySearchTerm.toLowerCase();
		return books.filter(book => book.title.toLowerCase().includes(searchTerm));
	}

	sortBooks(books) {
		switch (this.libraryFilter) {
			case "last-opened":
				books.sort((a, b) => this.libraryDescending ? b.lastOpened - a.lastOpened : a.lastOpened - b.lastOpened);
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

	async createGutenberg() {
		this.resetContainer();
		reader.util.loadElem("#toolbarBrowse").classList.add("ltsActive");

		this.container.innerHTML += `
			<div id="libraryContainer"></div>
		`;

		const libraryContainer = reader.util.loadElem("#libraryContainer");

		const gutenbergControls = reader.util.createElement("div", libraryContainer, "libraryControls")
			.setAttributes({ id: "libraryDiscover" });

		gutenbergControls.innerHTML = `
			<div class="libraryControlsLeft">
				<h1 class="libraryHeading">Discover Project Gutenberg</h1>
			</div>
			<div class="libraryControlsRight">
				<button class="librarySort"><img src="assets/sort.png">Most Downloaded</button>
				<button class="libraryBack"><img src="assets/back.png"></button>
				<button class="libraryForward"><img src="assets/back.png"></button>
			</div>
		`;

		const gutenburgLibrary = reader.util.createElement("div", libraryContainer, "library");
		this.dragToScrollHandler(gutenburgLibrary);

		const gutenberg = await reader.gutenberg.loadBooks();

		for (const item of gutenberg) {
			const bookElem = reader.util.createElement("div", gutenburgLibrary, "libraryElemContainer").setAttributes({
				title: item.title
			});

			const author = item.author || "Unknown";
			
			bookElem.innerHTML = `
				<img src="${item.cover}" draggable="false">
				<div class="libraryElem">
					<div class="libraryElemTitle">${item.title}</div>
					<div class="libraryElemSubtitle">${author}</div>
					<div class="libraryElemSubtitle"><img src="assets/download.png" class="libraryDownloadImage">&nbsp;${item.downloads}</div>
				</div>
			`;

			bookElem.onclick = () => {
				if (this.canClick) {
					window.open(item.url, "_blank");
				}
			}
		}
	}

	async createReadingGoals() {
		this.resetContainer();
		reader.util.loadElem("#toolbarReadingGoals").classList.add("ltsActive");

		this.container.innerHTML += `
			<div id="libraryContainer"></div>
		`;

		const libraryContainer = reader.util.loadElem("#libraryContainer");
		const data = await reader.store.getReadingStats();

		libraryContainer.innerHTML += `
			<div id="libraryReadingGoals">
				<div id="circleProgressBarContainer"></div>
			</div>
		`;

		const current = data.days[reader.util.getDateString(new Date())] || 0;

		new ProgressBar.Circle("#circleProgressBarContainer", {
			strokeWidth: 12,
			easing: "easeInOut",
			duration: 1000,
			color: "#fc0",
			trailColor: "#666",
			trailWidth: 12
		}).animate(Math.min(current / data.goal, 1));
	}

	createReader() {
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

	dragToScrollHandler(element) {
		let dragging = false;
		let lastX = 0;
		let totalMoved = 0;
		let prevButton, nextButton;

		const mouseOff = (leftVal) => {
			dragging = false;
			totalMoved = 0;
			window.setTimeout(() => { this.canClick = true }, 20);
			let index = 0;

			const currentLeft = typeof leftVal === "number" ? leftVal : (element.style.left ? Number(element.style.left.split("px")[0]) : 0);

			const first = reader.util.loadAllElems(".libraryElemContainer", element)
				.map(elem => [Math.abs(elem.offsetLeft + currentLeft), elem.offsetLeft, index++])
				.sort((a, b) => a[0] - b[0]);

			element.style.transition = "left 0.2s";
			const newLeft = -first[0][1] + 50;
			const chosenLeft = -Math.max(Math.min(-newLeft, element.scrollWidth - window.innerWidth), -50) - 40;

			element.style.left = chosenLeft + "px";
			window.setTimeout(() => element.style.transition = "", 200);

			prevButton.disabled = chosenLeft > -50 && prevButton;
			nextButton.disabled = -chosenLeft > element.scrollWidth - window.innerWidth && nextButton;
		}


		if (element.previousElementSibling.className === "libraryControls") {
			prevButton = element.previousElementSibling.querySelector(".libraryBack");
			nextButton = element.previousElementSibling.querySelector(".libraryForward");

			prevButton.addEventListener("click", () => {
				mouseOff(element.style.left ? Number(element.style.left.split("px")[0]) + 446 : 446);
			});

			nextButton.addEventListener("click", () => {
				mouseOff(element.style.left ? Number(element.style.left.split("px")[0]) - 446 : -446);
			});
		}

		element.addEventListener("mousedown", event => {
			dragging = true;
			lastX = event.clientX;
		});

		element.addEventListener("mousemove", event => {
			if (dragging) {
				const deltaX = event.clientX - lastX;
				lastX = event.clientX;
				totalMoved += Math.abs(deltaX);
				if (totalMoved > 20) {
					this.canClick = false;
				}
				const newLeft = element.style.left ? Number(element.style.left.split("px")[0]) + deltaX : deltaX;
				element.style.left = -Math.max(Math.min(-newLeft, element.scrollWidth - window.innerWidth + 80), -50) + "px";
			}
		});

		element.addEventListener("mouseup", mouseOff);
		element.addEventListener("mouseleave", () => {
			if (dragging) {
				mouseOff();
			}
		});
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
					<button id="deleteBookButton">Delete</button>
					<button id="cancelDeleteButton">Cancel</button>
				</div>
			</div>
		`);

		reader.util.loadElem("#deleteBookButton").addEventListener("click", async () => {
			await reader.store.removeFromLibrary(title);
			this.createLibrary();
		});

		reader.util.loadElem("#cancelDeleteButton").addEventListener("click", () => reader.util.loadElem("#infoBoxContainer").remove());
	}

	changeOverlayState(text, percentage) {
		// reader.util.loadElem("#libraryOverlay").applyStyles({
		// 	background: "rgba(0, 0, 0, 0.4)",
		// 	display: "flex"
		// });

		// if (text) {
		// 	reader.util.loadElem("#libraryOverlayText").innerHTML = text;
		// }

		// if (percentage) {
		// 	reader.util.loadElem("#libraryOverlayProgressBar").style.width = `${percentage}%`;
		// }
	}
}