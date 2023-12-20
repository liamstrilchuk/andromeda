class Interface {
	constructor(container) {
		this.container = container;
		this.canClick = true;
	}

	resetContainer() {
		this.container.clear();

		this.createToolbar();
	}

	async createLibrary() {
		reader.util.setTitle("eBook Reader");
		reader.renderer.close();

		const library = await reader.store.loadLibrary();

		this.resetContainer();
		reader.util.loadElem("#toolbarLibrary").classList.add("ltsActive");

		this.container.innerHTML += `
			<div id="libraryContainer">
				<div class="libraryControls">
					<div class="libraryControlsLeft">
						<h1 class="libraryHeading">My Library</h1>
					</div>
					<div class="libraryControlsRight">
						<button class="librarySort"><img src="assets/sort.png">Last Opened</button>
						<input style="display: none" type="file" accept=".epub" id="fileInput">
						<button class="libraryAdd"><label for="fileInput"><img src="assets/plus.png">Add Book</label></button>
						<button class="libraryBack"><img src="assets/back.png"></button>
						<button class="libraryForward"><img src="assets/back.png"></button>
					</div>
				</div>
			</div>
			<div id="libraryOverlay">
				<div id="libraryOverlayProgress">
					<div id="libraryOverlayText"></div>
					<div id="libraryOverlayProgressBar"></div>
				</div>
			</div>
		`;

		this.createToolbarEvents();

		const libraryContainer = reader.util.loadElem("#libraryContainer");

		const libraryElem = reader.util.createElement("div", libraryContainer, "library");
		this.dragToScrollHandler(libraryElem);

		for (const item of library) {
			const bookElem = reader.util.createElement("div", libraryElem, "libraryElemContainer").setAttributes({
				title: item.title
			});

			const position = await reader.store.loadPosition(item.title);
			const percentage = position.percentage;

			const author = item.attributes["Creator"] || "Unknown";
			const year = new Date(item.attributes["Date"]).getUTCFullYear() || "";

			bookElem.innerHTML = `
				<img src="${item.cover}" draggable="false">
				<div class="libraryElem">
					<div class="libraryElemTitle">${item.title}</div>
					<div class="libraryElemSubtitle">${author}${year ? ", " : ""}${year}</div>
					<div class="libraryElemSubtitle">${this.getLength(item.size)}&nbsp;&bull;&nbsp;${Math.round(percentage)}% read</div>
					<img src="assets/trash.png" class="libraryElemDelete" title="Delete from library" draggable="false">
					<img src="assets/info.png" class="libraryElemInfo" title="Book information" draggable="false">
				</div>
				<div class="libraryElemProgress">
					<div style="width: ${percentage}%"></div>
				</div>
			`;

			bookElem.addEventListener("click", () => {
				if (this.canClick) {
					this.loadBook(bookElem.title);
				}
			});

			bookElem.querySelector(".libraryElemInfo").addEventListener("click", event => {
				event.stopPropagation();
				this.openInfoBox(item.title);
			});

			bookElem.querySelector(".libraryElemDelete").addEventListener("click", event => {
				event.stopPropagation();
				this.openDeleteDialog(item.title);
			});
		}

		const total = library.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		const totalElem = reader.util.createElement("div", this.container, "libraryTotal");
		totalElem.innerHTML = `
			Total of ${library.length} books, using ${this.getLength(total)} of storage&nbsp;&bull;&nbsp;
			<a href="https://github.com/gullyn" target="_blank">GitHub</a>
		`;

		fileInput.addEventListener("change", () => this.addBook(fileInput));
	}

	async createGutenberg() {
		this.resetContainer();
		reader.util.loadElem("#toolbarBrowse").classList.add("ltsActive");

		this.container.innerHTML += `
			<div id="libraryContainer"></div>
		`;

		this.createToolbarEvents();

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

		this.createToolbarEvents();

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

	createToolbar() {
		this.container.innerHTML += `
			<div id="libraryToolbar">
				<div class="libraryToolbarSection" id="toolbarLibrary">
					<img src="assets/library.png" draggable="false">
					<span>library</span>
				</div>
				<div class="libraryToolbarSection" id="toolbarBrowse">
					<img src="assets/browse.png" draggable="false">
					<span>browse</span>
				</div>
				<div class="libraryToolbarSection" id="toolbarBookmarks">
					<img src="assets/bookmarks.png" draggable="false">
					<span>bookmarks</span>
				</div>
				<div class="libraryToolbarSection" id="toolbarReadingGoals">
					<img src="assets/readinggoals.png" draggable="false">
					<span>reading goals</span>
				</div>
			</div>
		`;
	}

	createToolbarEvents() {
		reader.util.loadElem("#toolbarLibrary").addEventListener("click", this.createLibrary.bind(this));
		reader.util.loadElem("#toolbarBrowse").addEventListener("click", this.createGutenberg.bind(this));
		reader.util.loadElem("#toolbarReadingGoals").addEventListener("click", this.createReadingGoals.bind(this));
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
		reader.util.loadElem("#libraryOverlay").applyStyles({
			background: "rgba(0, 0, 0, 0.4)",
			display: "flex"
		});

		if (text) {
			reader.util.loadElem("#libraryOverlayText").innerHTML = text;
		}

		if (percentage) {
			reader.util.loadElem("#libraryOverlayProgressBar").style.width = `${percentage}%`;
		}
	}
}