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
		this.container.applyStyles({
			"height": "100%"
		});
		this.container.clear();
		this.container.innerHTML = `
			<input style="display: none" type="file" accept=".epub" id="fileInput">
			<div class="mainHolder">
				<div class="navigationBar">
					<div class="navigationBarTitle">
						<img src="assets/logo.png" draggable="false">
						<span>Andromeda</span>
					</div>
					<div
						class="navigationBarItem ${this.currentView === "library" ? "currentNavItem" : ""}"
						id="navLibrary">Your Library</div>
					<div
						class="navigationBarItem ${this.currentView === "goals" ? "currentNavItem" : ""}"
						id="navGoals">Reading Goals</div>
					<div
						class="navigationBarItem ${this.currentView === "gutenberg" ? "currentNavItem" : ""}"
						id="navGutenberg">Project Gutenberg</div>
					<div
						class="navigationBarItem ${this.currentView === "settings" ? "currentNavItem" : ""}"
						id="navSettings">Settings</div>
					<div
						class="navigationBarItem ${this.currentView === "about" ? "currentNavItem" : ""}"
						id="navAbout">About</div>
				</div>
				<div class="container"></div>
			</div>
		`;

		reader.util.loadElem("#navLibrary").addEventListener("click", () => {
			if (this.currentView !== "library") {
				this.createLibrary();
			}
		});

		reader.util.loadElem("#navGoals").addEventListener("click", () => {
			if (this.currentView !== "goals") {
				this.createGoals();
			}
		});

		reader.util.loadElem("#navGutenberg").addEventListener("click", () => {
			if (this.currentView !== "gutenberg") {
				this.createGutenberg();
			}
		});

		reader.util.loadElem("#navSettings").addEventListener("click", () => {
			if (this.currentView !== "settings") {
				this.createSettings();
			}
		});

		reader.util.loadElem("#navAbout").addEventListener("click", () => {
			if (this.currentView !== "about") {
				this.createAbout();
			}
		});
	}

	async createLibrary() {
		this.currentView = "library";
		reader.renderer.close();
		reader.util.setTitle("Your Library – Andromeda");

		this.resetContainer();
		this.libraryFormat = await reader.store.loadSetting("libraryFormat");

		const container = reader.util.loadElem(".container");
		container.innerHTML = `
			<h1 class="sectionHeading">Your Library</h1>
			<div class="libraryControlsHolder">
				<div class="libraryControlsSection">
					<div class="librarySearchInputHolder">
						<img src="assets/browse.png" class="librarySearchInputIcon" draggable="false">
						<input class="librarySearchInput" placeholder="Search by title or author...">
					</div>
				</div>
				<div class="libraryControlsSection">
					<button class="buttonIcon" id="libraryLayoutButton">
						<img
							src="assets/${this.libraryFormat === "grid" ? "list" : "grid"}.png"
							class="buttonIconImage">
					</button>
					<button id="addButton">
						<img src="assets/plus.png" class="buttonIconImage">
						&nbsp;&nbsp;Add book
					</button>
				</div>
			</div>
			<div class="libraryBooksHolder"></div>
		`;

		const searchInput = reader.util.loadElem(".librarySearchInput");
		searchInput.addEventListener("input", () => {
			this.librarySearchTerm = searchInput.value;
			this.renderBooks();
		});

		reader.util.loadElem("#libraryLayoutButton").addEventListener("click", async () => {
			this.libraryFormat = this.libraryFormat === "list" ? "grid" : "list";
			await reader.store.updateSetting("libraryFormat", this.libraryFormat);
			this.createLibrary();
		});

		const fileInput = reader.util.loadElem("#fileInput");
		fileInput.addEventListener("change", () => this.addBook(fileInput));

		const addButton = reader.util.loadElem("#addButton");
		addButton.addEventListener("click", () => fileInput.click());

		await this.renderBooks();
	}

	async createGoals() {
		this.currentView = "goals";
		reader.util.setTitle("Reading Goals – Andromeda");

		this.resetContainer();
		const container = reader.util.loadElem(".container");
		container.innerHTML = `
			<h1 class="sectionHeading">Reading Goals</h1>
			<h2 class="settingsSectionTitle">Time Read by Day</h2>
			<div id="calendar">
				<div id="calendarTop">
					<div id="calendarLeft" title="Show previous month">
						<img src="assets/back.png" class="buttonIconImage">
					</div>
					<div id="calendarMonthName"></div>
					<div id="calendarRight" title="Show next month">
						<img src="assets/back.png" class="buttonIconImage">
					</div>
				</div>
				<div id="calendarContainer"></div>
				<div id="calendarTotalTime"></div>
			</div>
			<h2 class="settingsSectionTitle">Change Reading Goal</h2>
			<div id="readingGoalButtons">
				<div id="rgbLeft" title="Decrease reading goal">
					<img src="assets/minus.png" class="buttonIconImage">
				</div>
				<div id="rgbValue"></div>
				<div id="rgbRight" title="Increase reading goal">
					<img src="assets/plus2.png" class="buttonIconImage">
				</div>
			</div>
		`;

		const data = await reader.store.getReadingStats();
		let goal = data.goal;
		const possibleGoals = [60, 300, 600, 900, 1800, 2700, 3600, 5400, 7200, 10800];

		const calendarContainer = reader.util.loadElem("#calendarContainer");
		const calendarMonthName = reader.util.loadElem("#calendarMonthName");
		const calendarTotalTime = reader.util.loadElem("#calendarTotalTime");
		const calendarLeft = reader.util.loadElem("#calendarLeft");
		const calendarRight = reader.util.loadElem("#calendarRight");
		const rgbValue = reader.util.loadElem("#rgbValue");

		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		const currentDate = new Date();

		const showNewMonth = (month) => {
			calendarMonthName.innerHTML = `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
			calendarContainer.innerHTML = "";

			for (let row = 0; row < 6; row++) {
				calendarContainer.innerHTML += `
					<div class="calendarRow"></div>
				`;

				for (let col = 0; col < 7; col++) {
					calendarContainer.children[calendarContainer.children.length - 1].innerHTML += `
						<div class="calendarElem"></div>
					`;
				}
			}

			const calendarRows = reader.util.loadAllElems(".calendarRow");

			let dayCount = 0;
			let currentRow = 0;
			let totalTime = 0;
			let next;
			while (true) {
				next = new Date(month.getFullYear(), month.getMonth(), month.getDate() + dayCount++);

				if (next.getMonth() !== month.getMonth()) {
					break;
				}

				const elem = calendarRows[currentRow].children[next.getDay()];
				elem.classList.add("active");

				if (reader.util.getDateString(currentDate) === reader.util.getDateString(next)) {
					elem.classList.add("current");
				}

				if (next.getDay() === 6) {
					currentRow++;
				}

				const dateString = reader.util.getDateString(next);
				const timeSpent = data.days[dateString] || 0;
				const percentage = timeSpent / goal;
				const degrees = Math.min(360, Math.round(360 * percentage));
				const minutes = Math.round(timeSpent / 60);
				totalTime += timeSpent;

				elem.innerHTML += `
					<div class="calendarProgressOuter"></div>
					<div class="calendarProgressInner"></div>
					<div class="calendarProgressTooltip">
						${monthNames[next.getMonth()]} ${next.getDate()}, ${next.getFullYear()}:<br>
						${minutes} minute${minutes === 1 ? "" : "s"} read
					</div>
				`;

				elem.children[0].applyStyles({
					"background": `conic-gradient(#f800a6 ${degrees}deg, var(--background5) 0deg)`
				});

				elem.children[1].innerHTML += `${next.getDate()}`;
			}

			const hours = Math.floor(totalTime / 3600);
			const minutes = Math.floor(totalTime / 60) % 60;
			const seconds = Math.floor(totalTime) % 60;
			calendarTotalTime.innerHTML = `
				Total time spent reading:
				<span style="color: #8e00ff;">${hours} hour${hours === 1 ? "" : "s"}</span>,
				<span style="color: #f800a6;">${minutes} minute${minutes === 1 ? "" : "s"}</span>,
				<span style="color: #f50083;">${seconds} second${seconds === 1 ? "" : "s"}</span>
			`;

			calendarRows
				.filter((_, i) => i > currentRow || (i === currentRow && next.getDay() === 0))
				.forEach(e => e.remove());
		}

		let currentlyShown = new Date(currentDate.getFullYear(), currentDate.getMonth());
		showNewMonth(currentlyShown);

		calendarLeft.addEventListener("click", () => {
			const newDate = new Date(currentlyShown.getFullYear(), currentlyShown.getMonth() - 1);

			if (newDate < new Date(2020, 0)) {
				return;
			}
			currentlyShown = newDate;
			showNewMonth(currentlyShown);
		});

		calendarRight.addEventListener("click", () => {
			const newDate = new Date(currentlyShown.getFullYear(), currentlyShown.getMonth() + 1);

			if (newDate > new Date()) {
				return;
			}
			currentlyShown = newDate;
			showNewMonth(currentlyShown);
		});

		const changeGoal = async (indexAdj) => {
			const possibleIndexes = possibleGoals
				.filter(e => goal <= e)
				.map(e => possibleGoals.indexOf(e));

			const currentIndex = possibleIndexes.length ? possibleIndexes[0] : 0;

			if (currentIndex + indexAdj >= possibleGoals.length || currentIndex + indexAdj < 0) {
				return;
			}

			goal = possibleGoals[currentIndex + indexAdj];
			await reader.store.setReadingGoal(goal);
			const minutes = Math.floor(goal / 60);
			rgbValue.innerHTML = `${minutes} minute${minutes === 1 ? "" : "s"}`;
			showNewMonth(currentlyShown);
		}

		reader.util.loadElem("#rgbLeft").addEventListener("click", () => changeGoal(-1));
		reader.util.loadElem("#rgbRight").addEventListener("click", () => changeGoal(1));
		changeGoal(0);
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
				const lastOpened = item.lastOpened
					? new Date(item.lastOpened)
						.toLocaleDateString(
							"en-US",
							{ year: "numeric", month: "long", day: "numeric" }
						)
					: "&mdash;";

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
						<div
							class="libraryProgressBarInside"
							style="width: ${Math.round(percentage * 100) / 100}%;"></div>
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
						<div
							class="libraryProgressBarInside"
							style="width: ${Math.round(percentage * 100) / 100}%;"></div>
					</div>
				`;
			}

			allHTML += `
				<div class="${bookElemClass} libaryElement" title="${item.title}">
					${itemHTML}
				</div>
			`;
		}

		if (library.length === 0) {
			allHTML = `
				<div class="libraryItem libraryEmpty">
					<div class="libraryEmptyText">
						${this.librarySearchTerm.length === 0
							? "Your library is empty. Add a book to get started."
							: "There are no results for that search term."}
					</div>
				</div>
			`;
		}

		if (this.libraryFormat === "list") {
			allHTML = `
				<div class="libraryItem libraryHeader">
					<div class="libraryImage"></div>
					<div class="libraryTitle">Title
						<img
							src="assets/up-arrow.png"
							class="librarySortIcon icon${this.libraryDescending} ${this.libraryFilter === "title" ? "current" : ""}">
					</div>
					<div class="libraryAuthor">Author
						<img
							src="assets/up-arrow.png"
							class="librarySortIcon icon${this.libraryDescending} ${this.libraryFilter === "author" ? "current" : ""}">
					</div>
					<div class="librarySize">Size
						<img
							src="assets/up-arrow.png"
							class="librarySortIcon icon${this.libraryDescending} ${this.libraryFilter === "size" ? "current" : ""}">
					</div>
					<div class="libraryProgress">Progress</div>
					<div class="libraryOpened">Last Opened
						<img
							src="assets/up-arrow.png"
							class="librarySortIcon icon${this.libraryDescending} ${this.libraryFilter === "last-opened" ? "current" : ""}">
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
		const searchTerms = this.librarySearchTerm.toLowerCase().split(" ");

		return books.filter(book => {
			return searchTerms.every(term => {
				return `${book.title} ${book.attributes["Creator"] || ""}`
					.toLowerCase()
					.includes(term);
			});
		});
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
				books.sort((a, b) => this.libraryDescending
					? b.title.localeCompare(a.title)
					: a.title.localeCompare(b.title));
				break;
			case "author":
				books.sort((a, b) => {
					const authorA = a.attributes["Creator"] || "Unknown";
					const authorB = b.attributes["Creator"] || "Unknown";
					return this.libraryDescending
						? authorB.localeCompare(authorA)
						: authorA.localeCompare(authorB);
				});
				break;
			case "size":
				books.sort((a, b) => this.libraryDescending
					? b.size - a.size
					: a.size - b.size);
				break;
		}

		return books;
	}

	async createGutenberg(search="") {
		this.currentView = "gutenberg";
		this.resetContainer();
		reader.util.setTitle("Project Gutenberg – Andromeda");

		const container = reader.util.loadElem(".container");

		container.innerHTML = `
			<h1 class="sectionHeading">Project Gutenberg</h1>
			<div class="libraryControlsHolder">
				<div class="libraryControlsSection">
					<div class="librarySearchInputHolder">
						<img src="assets/browse.png" class="librarySearchInputIcon" draggable="false">
						<input
							class="librarySearchInput"
							placeholder="Search for title or author..."
							value="${search}">
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
					${this.libraryFilter === "title"
						? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">`
						: ""}
				</div>
				<div class="libraryAuthor">Author
					${this.libraryFilter === "author"
						? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">`
						: ""}
				</div>
				<div class="librarySize">Downloads
					${this.libraryFilter === "size"
						? `<img src="assets/up-arrow.png" class="librarySortIcon icon${this.libraryDescending}">`
						: ""}
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
					<a href="${item.url}" target="_blank">
						<button class="gutenbergDownload">Download</button>
					</a>
				</div>
			`;
		}
	}

	async createSettings(container, isSmall=false) {
		const isReader = this.currentView === "reader";
		if (!container) {
			this.currentView = "settings";
			this.resetContainer();
			reader.util.setTitle("Settings – Andromeda");
			container = reader.util.loadElem(".container");
		}

		const fontSize = await reader.store.loadSetting("fontSize");
		const lineHeight = await reader.store.loadSetting("lineSpacing");
		const maxWidth = await reader.store.loadSetting("maxWidth");
		const scrollingMode = await reader.store.loadSetting("scrollingMode");
		const font = await reader.store.loadSetting("font");

		container.innerHTML = `
			${isSmall ? "" : `<h1 class="sectionHeading">Settings</h1>`}
			<div class="settingsContainer">
				<div class="settingsSection">
					<div class="settingsSectionTitle">Theme</div>
					<div class="settingsSectionFlex">
						<div
							class="settingsTheme ${isReader ? "settingsThemeSmall" : ""}"
							id="settingsTheme-light">Light</div>
						<div
							class="settingsTheme ${isReader ? "settingsThemeSmall" : ""}"
							id="settingsTheme-sepia">Sepia</div>
						<div
							class="settingsTheme ${isReader ? "settingsThemeSmall" : ""}"
							id="settingsTheme-dark">Dark</div>
						<div
							class="settingsTheme ${isReader ? "settingsThemeSmall" : ""}"
							id="settingsTheme-night">Night</div>
						<div
							class="settingsTheme ${isReader ? "settingsThemeSmall" : ""}"
							id="settingsTheme-aurora">Aurora</div>
					</div>
				</div>
				<div class="settingsSection">
					<div class="settingsSectionTitle">Scrolling Mode</div>
					<div class="settingsSectionFlex">
						<div class="settingsTextOption scrollingModeOption">
							Paginated
							${scrollingMode === "paginated" ? `<img class="buttonIconImage" src="assets/check.png">` : ""}
						</div>
						<div class="settingsTextOption scrollingModeOption">
							Continuous
							${scrollingMode === "continuous" ? `<img class="buttonIconImage" src="assets/check.png">` : ""}
						</div>
					</div>
				</div>
				<div class="settingsSection">
					<div class="settingsSectionTitle">Font</div>
					<div class="settingsSectionFlex">
						<div class="settingsTextOption fontOption">
							Sans-serif
							${font === "sans-serif" ? `<img class="buttonIconImage" src="assets/check.png">` : ""}
						</div>
						<div class="settingsTextOption fontOption">
							Serif
							${font === "serif" ? `<img class="buttonIconImage" src="assets/check.png">` : ""}
						</div>
						<div class="settingsTextOption fontOption">
							Monospace
							${font === "monospace" ? `<img class="buttonIconImage" src="assets/check.png">` : ""}
						</div>
					</div>
				</div>
				<div class="settingsSection">
					<div class="settingsSectionTitle">Font Size</div>
					<input
						type="range"
						min="15"
						max="25"
						value="${fontSize}"
						step="1"
						class="settingsSlider"
						id="settingsFontSize">
					<div class="sliderTicks" id="fontSizeTicks"></div>
					<p id="fontSizeSample" style="font-size: ${fontSize}px;">
						The quick brown fox jumps over the lazy dog.
					</p>
				</div>
				<div class="settingsSection">
					<div class="settingsSectionTitle">Line Height</div>
					<input
						type="range"
						min="1.05"
						max="1.95"
						value="${lineHeight}"
						step="0.1"
						class="settingsSlider"
						id="settingsLineHeight">
					<div class="sliderTicks" id="lineHeightTicks"></div>
					<p style="line-height: ${lineHeight}em; max-width: 600px;" id="lineHeightSample">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin vestibulum velit et pellentesque finibus.
						Sed volutpat purus pulvinar, molestie sem non, mattis nulla. Pellentesque fringilla condimentum tortor at consequat.
						Vivamus vitae sem ultricies, viverra leo a, congue nisi.
					</p>
				</div>
				<div class="settingsSection">
					<div class="settingsSectionTitle">Maximum Reader Width</div>
					<input
						type="range"
						min="1000"
						max="2000"
						value="${maxWidth}"
						step="100"
						class="settingsSlider"
						id="settingsMaxWidth">
					<div class="sliderTicks" id="maxWidthTicks"></div>
					<p id="maxWidthNum">${maxWidth} pixels</p>
				</div>
			</div>
		`;

		const fontSizeTicks = reader.util.loadElem("#fontSizeTicks");
		for (let i = 15; i <= 25; i++) {
			reader.util.createElement("span", fontSizeTicks).setAttributes({ value: i });
		}

		const lineHeightTicks = reader.util.loadElem("#lineHeightTicks");
		for (let i = 1.05; i < 2.05; i += 0.1) {
			reader.util.createElement("span", lineHeightTicks).setAttributes({ value: i });
		}

		const maxWidthTicks = reader.util.loadElem("#maxWidthTicks");
		for (let i = 1000; i <= 2000; i += 100) {
			reader.util.createElement("span", maxWidthTicks).setAttributes({ value: i });
		}

		const themeElems = reader.util.loadAllElems(".settingsTheme");
		themeElems.forEach(elem => elem.addEventListener("click", async () => {
			await reader.store.updateSetting("theme", elem.id.split("-")[1]);
			this.loadTheme(elem.id.split("-")[1]);
		}));

		const fontSizeSlider = reader.util.loadElem("#settingsFontSize");
		fontSizeSlider.addEventListener("input", async () => {
			await reader.store.updateSetting("fontSize", fontSizeSlider.value);
			reader.util.loadElem("#fontSizeSample").style.fontSize = `${fontSizeSlider.value}px`;

			if (isReader) {
				reader.renderer.onResize(true);
			}
		});

		const lineHeightSlider = reader.util.loadElem("#settingsLineHeight");
		lineHeightSlider.addEventListener("input", async () => {
			await reader.store.updateSetting("lineSpacing", lineHeightSlider.value);
			reader.util.loadElem("#lineHeightSample").style.lineHeight = lineHeightSlider.value;

			if (isReader) {
				reader.renderer.onResize(true);
			}
		});

		const maxWidthSlider = reader.util.loadElem("#settingsMaxWidth");
		maxWidthSlider.addEventListener("input", async () => {
			await reader.store.updateSetting("maxWidth", maxWidthSlider.value);
			reader.util.loadElem("#maxWidthNum").innerText = `${maxWidthSlider.value} pixels`;

			if (isReader) {
				reader.renderer.onResize(true);
			}
		});

		reader.util.loadAllElems(".scrollingModeOption").forEach(elem => {
			elem.addEventListener("click", async () => {
				await reader.store.updateSetting("scrollingMode", elem.innerText.toLowerCase());
				this.createSettings(container, isSmall);
				
				if (isReader) {
					reader.renderer.onResize(true);
				}
			});
		});

		reader.util.loadAllElems(".fontOption").forEach(elem => {
			elem.addEventListener("click", async () => {
				await reader.store.updateSetting("font", elem.innerText.toLowerCase());
				this.createSettings(container, isSmall);
				
				if (isReader) {
					reader.renderer.onResize(true);
				}
			});
		});
	}

	createAbout() {
		this.currentView = "about";
		this.resetContainer();
		reader.util.setTitle("About – Andromeda");

		const container = reader.util.loadElem(".container");

		container.innerHTML = `
			<div class="aboutContainer">
				<img src="assets/logo.png" class="aboutLogo" draggable="false">
				<div class="aboutTitle">Andromeda: EPUB Reader for Chrome</div>
				<div class="aboutSubTitle">Version ${reader.version}</div>
				<div class="aboutText">
					A completely free, <a href="https://github.com/liamstrilchuk/andromeda" target="_blank">open-source</a>
					ebook library for Chrome.
				</div>
				<div class="aboutText">
					Questions, comments, or suggestions? Add an issue on
					<a href="https://github.com/liamstrilchuk/andromeda/issues" target="_blank">this project's GitHub page</a>.
				</div>
				<div class="aboutText">Created by Liam Strilchuk</div>
			</div>
		`;
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
					<button class="overlayButton" id="overlayButtonBack" title="Back to library">
						<img src="assets/back.png">
					</button>
				</div>
				<div id="readerOverlayTopText"></div>
				<div id="readerOverlayTopRight">
					<button class="overlayButton" id="overlayButtonBookmarks" title="Bookmarks">
						<img src="assets/bookmarks.png">
					</button>
					<button class="overlayButton" id="overlayButtonTOC" title="Table of contents">
						<img src="assets/list.png">
					</button>
					<button class="overlayButton" id="overlayButtonInfo" title="Book information">
						<img src="assets/info2.png">
					</button>
					<button class="overlayButton" id="overlayButtonSettings" title="Settings">
						<img src="assets/text-font.png">
					</button>
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
			<div id="readerOverlayLeft"></div>
			<div id="readerOverlayRight"></div>
		`;

		reader.util.loadElem("#overlayButtonBack").addEventListener(
			"click",
			() => this.createLibrary()
		);
		reader.util.loadElem("#overlayButtonInfo").addEventListener(
			"click",
			() => this.openInfoBox(reader.renderer.book.title)
		);
		reader.util.loadElem("#overlayButtonSettings").addEventListener(
			"click",
			() => this.openSettingsBox()
		);
		reader.util.loadElem("#overlayButtonTOC").addEventListener(
			"click",
			() => this.openTOCBox(reader.renderer.book.tableOfContents)
		);
		reader.util.loadElem("#overlayButtonBookmarks").addEventListener(
			"click",
			() => this.openBookmarks()
		);

		return {
			reader: readerElem,
			overlay: readerOverlay
		};
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
		reader.util.loadAllElems("#infoBoxContainer")
			.forEach(elem => elem.remove());

		const infoBoxContainer = reader.util
			.createElement("div", this.container)
			.setAttributes({ id: "infoBoxContainer" });

		const infoBox = reader.util
			.createElement("div", infoBoxContainer)
			.setAttributes({ id: "infoBox" });

		infoBox.innerHTML = `
			${title ? `<div class="infoBoxItem">
				<span class="infoBoxItemTitle">${title}</span>
				<span id="infoBoxButtonClose"><img src="assets/close.png" draggable="false"></span>
			</div>` : ""}${html}
		`;

		if (title) {
			infoBox.querySelector("#infoBoxButtonClose").addEventListener(
				"click",
				() => infoBoxContainer.remove()
			);
		}
	}

	async openBookmarks() {
		const title = reader.renderer.book.title;
		const bookmarks = await reader.store.loadBookmarks(title);

		this.createInfoBox("", "Bookmarks");
	}

	async openInfoBox(title) {
		const book = await reader.store.loadBook(title);

		let html = `
			<div class="infoBoxItem">
				<span class="infoBoxItemTitle small">Title</span>
				<span>${title}</span>
			</div>
		`;

		for (const [key, value] of Object.entries(book.attributes)) {
			html += `
				<div class="infoBoxItem">
					<span class="infoBoxItemTitle small">${key}</span>
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

		reader.util.loadAllElems(".tocElem").forEach(elem => {
			elem.addEventListener("click", event => {
				const chapter = reader.renderer.book.contents
					.find(item => item.filename === event.target.dataset.filename);

				if (chapter) {
					reader.renderer.position.chapter = reader.renderer.book.contents.indexOf(chapter);
					reader.renderer.loadChapter();
					reader.util.loadElem("#infoBoxContainer").remove();
				}
			});
		});
	}

	openSettingsBox() {
		this.createInfoBox(`
			<div id="settingsInfoBox"></div>
		`, "Settings");

		this.createSettings(reader.util.loadElem("#settingsInfoBox"), true);
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

		reader.util.loadElem("#cancelDeleteButton").addEventListener(
			"click",
			() => reader.util.loadElem("#infoBoxContainer").remove()
		);
	}
}