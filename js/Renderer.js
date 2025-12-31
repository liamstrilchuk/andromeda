class Renderer {
	constructor(settings) {
		this.settings = settings;
		this.book = null;
		this.position = null;
		this.container = null;
		this.pageContainer = null;
		this.overlay = null;

		this.page = 0;
		this.listeners = [];
		this.overlayTimeout = null;
		this.tooltipTimeout = null;
		this.loading = false;
		this.readerStylesheet = null;
		this.lastPageTime = null;
	}

	async load(book, position) {
		this.book = book;
		this.position = position;
		this.readerStylesheet = reader.util.createElement("style", document.head);
		this.lastPageTime = new Date().getTime();

		const anchor = this.position.anchor || 0;
		await this.loadChapter(this.position.anchor);
		this.page = await this.getPageFromAnchor(anchor);
		this.position.anchor = anchor;
		this.onResize(true);

		this.listeners.push([
			"resize",
			reader.inputManager.addListener(
				"resize",
				this.onResize.bind(this)
			)
		]);
		this.listeners.push([
			"mousemove",
			reader.inputManager.addListener(
				"mousemove",
				this.onMouseMove.bind(this)
			)
		]);
		this.listeners.push([
			null,
			reader.inputManager.onKeys(
				[ "ArrowLeft", "ArrowUp" ],
				this.prevPage.bind(this)
			)
		]);
		this.listeners.push([
			null,
			reader.inputManager.onKeys(
				[ "ArrowRight", "ArrowDown", " " ],
				this.nextPage.bind(this)
			)
		]);

		reader.util.loadElem("#readerOverlayTopText").innerHTML =
			`${this.book.title} &ndash; ${this.book.attributes["Creator"]}`;

		reader.util.loadElem("#overlayProgress").addEventListener(
			"mousemove",
			this.overlayProgressMouseMove.bind(this)
		);
		reader.util.loadElem("#overlayProgress").addEventListener(
			"click",
			this.overlayProgressClick.bind(this)
		);
	}

	async loadChapter(anchor) {
		this.container.clear();
		this.pageContainer = reader.util
			.createElement("div", this.container)
			.setAttributes({ "id": "pageContainer" });
		this.position.anchor = anchor || 0;
		this.page = 0;

		this.loading = true;
		reader.util.loadElem("#readerLoading").show("flex");
		const chapter = this.book.contents[this.position.chapter];
		this.pageContainer.innerHTML = chapter.innerHTML;
		this.loadChapterStyles();
		this.pageContainer.style.opacity = 0;

		this.createChapterMarkers(this.book.chapterPoints);
		await this.onResize(true);

		return new Promise(async (resolve) => {
			await this.onResize(true);
			this.pageContainer.style.opacity = 1;
			reader.util.loadElem("#readerLoading").hide();
			resolve();
			this.loading = false;
		});
	}

	createChapterMarkers(markers) {
		const container = reader.util.loadElem("#overlayProgress");
		markers.forEach(m => {
			reader.util.createElement("div", container)
				.setAttributes({ "class": "chapterMarker" })
				.applyStyles({ "left": `${m.point}%` });
		});
	}

	loadChapterStyles() {
		const stylesheets = this.book.contents[this.position.chapter].stylesheets;

		const css = stylesheets
			.map(s => this.book.stylesheets.find(ss => ss.path === s).data)
			.map(s => {
				let str = "";
				for (let i of s) {
					if (!i.styles.length) {
						continue;
					}
	
					const elems = i.appliesTo.map(e => `#reader ${e}`).join(", ");
					const values = i.styles.map(s => `${s.name}: ${s.value};`).join(" ");
					str += `\n${elems} {\n${values}\n}`;
				}
				return str;
			})
			.join("\n");

		const existing = reader.util.loadElem("#readerStyles")
			|| reader.util
				.createElement("style", document.head, "")
				.setAttributes({ "id": "readerStyles" });
		existing.innerHTML = css;
	}

	async onResize(noTransition) {
		const maxWidth = await reader.store.loadSetting("maxWidth");
		const fontSize = await reader.store.loadSetting("fontSize");
		const lineSpacing = await reader.store.loadSetting("lineSpacing");
		const fontFamily = await reader.store.loadSetting("font");

		this.readerStylesheet.innerHTML = `
			#reader p {
				font-size: ${fontSize}px !important;
				line-height: ${lineSpacing}em !important;
				font-family: ${fontFamily} !important;
			}
		`;

		const width = Math.min(window.innerWidth, maxWidth === "none" ? 5e3 : maxWidth);

		this.container.applyStyles({
			"width": width.toString() + "px",
			"padding": `75px 100px`
		});

		reader.util.loadElem("#readerOverlayTop").applyStyles({
			"width": (width - 180).toString() + "px",
			"left": ((window.innerWidth - width) / 2 + 90).toString() + "px"
		});
		reader.util.loadElem("#readerOverlayBottom").applyStyles({
			"width": (width - 180).toString() + "px",
			"left": ((window.innerWidth - width) / 2 + 90).toString() + "px"
		});

		const left = this.page / this.getColumnCount() * (this.pageContainer.clientWidth + 100);

		if (noTransition) {
			this.pageContainer.applyStyles({
				"transition": "none"
			});

			this.flushCSS(this.pageContainer);
		}

		this.pageContainer.applyStyles({
			"columnCount": this.getColumnCount(),
			"left": `-${left}px`,
			"fontSize": `${fontSize}px`
		});

		this.flushCSS(this.pageContainer);
		this.pageContainer.applyStyles({
			"transition": "0.3s left"
		});

		const percentage = reader.util.getReadPercentage(
			this.book.contents,
			this.position.chapter,
			this.position.anchor
		);

		reader.util.loadElem("#readerOverlaySmall > div").innerHTML =
			`${Math.round(percentage)}%&nbsp;&bull;&nbsp;` + 
			(this.book.contents[this.position.chapter].title || "Untitled chapter");

		reader.util.loadElem("#overlayProgress > #progressMarker").applyStyles({
			"width": `${percentage}%`
		});

		if (noTransition) {
			return;
		}

		this.loading = true;

		return new Promise(resolve => {
			window.setTimeout(() => {
				this.position.anchor = this.getAnchor();
				reader.store.setPosition(
					this.book.title,
					this.position.chapter,
					Math.max(this.position.anchor, 0),
					percentage
				);
				resolve();
				this.loading = false;
			}, 300);
		});
	}

	close() {
		this.listeners.forEach(l => reader.inputManager.removeListener(l[0], l[1]));
		window.clearTimeout(this.overlayTimeout);
		this.listeners = [];
	}

	async prevPage() {
		if (this.loading) {
			return;
		}

		if (this.page <= 0 && this.position.chapter === 0) {
			return;
		}

		if (this.page <= 0) {
			this.position.chapter--;
			await this.loadChapter();
			this.pageContainer.style.opacity = 0;

			this.position.anchor = Math.max(this.pageContainer.querySelectorAll("p").length - 1, 0);
			const percentage = reader.util.getReadPercentage(
				this.book.contents,
				this.position.chapter,
				this.position.anchor
			);
			reader.store.setPosition(
				this.book.title,
				this.position.chapter,
				this.position.anchor,
				percentage
			);

			this.page = await this.getPageFromAnchor(this.position.anchor);
			await this.onResize(true);
			this.pageContainer.style.opacity = 1;

			return;
		}

		this.page -= this.getColumnCount();
		this.onResize();
	}


	async nextPage() {
		if (this.loading) {
			return;
		}

		const columnCount = this.getColumnCount();
		const scrollPos = (this.page + columnCount) / columnCount * (this.pageContainer.clientWidth + 100);
		
		if (scrollPos >= this.pageContainer.scrollWidth - 100) {
			if (this.position.chapter >= this.book.contents.length - 1) {
				return;
			}

			this.position.chapter++;
			await this.loadChapter();
			const percentage = reader.util.getReadPercentage(
				this.book.contents,
				this.position.chapter,
				this.position.anchor
			);
			reader.store.setPosition(
				this.book.title,
				this.position.chapter,
				this.position.anchor,
				percentage
			);
			
			return;
		}

		this.page += columnCount;
		this.onResize();

		reader.store.addReadingTime(Math.min((new Date().getTime() - this.lastPageTime) / 1000, 60));
		this.lastPageTime = new Date().getTime();
	}

	getAnchor() {
		const children = [...this.pageContainer.querySelectorAll("p")];
		const offsets = children
			.map(c => c.offsetLeft + this.pageContainer.offsetLeft)
			.filter(e => e >= 0);
		const min = offsets.sort((a, b) => a - b)[0];

		for (let i = 0; i < children.length; i++) {
			if (children[i].offsetLeft + this.pageContainer.offsetLeft === min) {
				return i;
			}
		}

		return children.length - 1;
	}

	async getPageFromAnchor(anchor) {
		anchor = anchor || 0;
		const elems = [...this.pageContainer.querySelectorAll("p")];
		if (elems.length <= anchor) {
			return 0;
		}
		const child = elems[anchor].offsetLeft;
		let page = 0;
		let left = 0;

		while (left < child) {
			page += this.getColumnCount();
			left = Math.floor(page / this.getColumnCount()) * (this.pageContainer.clientWidth + 100);
		}

		return left > child ? page - this.getColumnCount() : page;
	}

	onMouseMove() {
		reader.util.loadElem("#readerOverlayTop").applyStyles({ "opacity": 1 });
		reader.util.loadElem("#readerOverlayBottom").applyStyles({ "opacity": 1 });

		window.clearTimeout(this.overlayTimeout);
		this.overlayTimeout = window.setTimeout(() => {
			reader.util.loadElem("#readerOverlayTop").applyStyles({ "opacity": 0 });
			reader.util.loadElem("#readerOverlayBottom").applyStyles({ "opacity": 0 });
		}, 1500);
	}

	overlayProgressMouseMove(event) {
		const tooltip = reader.util.loadElem("#overlayTooltip");
		const { offsetX, clientX } = event;
		if (Math.abs(offsetX) < 5) {
			return;
		}
		const percentage = offsetX / reader.util.loadElem("#overlayProgress").clientWidth * 100;
		const chapters = this.book.chapterPoints.filter(p => percentage >= p.point);
		const chapter = chapters[chapters.length - 1];

		const title = chapter.title ? reader.util.capText(chapter.title, 35) : "Untitled chapter";
		tooltip.innerHTML = title;
		tooltip.applyStyles({
			"opacity": 1,
			"left": `${clientX - tooltip.clientWidth / 2}px`
		});

		window.clearTimeout(this.tooltipTimeout);
		this.tooltipTimeout = window.setTimeout(() => {
			tooltip.applyStyles({ "opacity": 0 });
		}, 1000);
	}

	overlayProgressClick(event) {
		if (Math.abs(event.offsetX) < 5) {
			return;
		}
		const percentage = event.offsetX / reader.util.loadElem("#overlayProgress").clientWidth * 100;
		
		for (let i = this.book.chapterPoints.length - 1; i > -1; i--) {
			if (percentage > this.book.chapterPoints[i].point) {
				this.position.chapter = i;
				this.loadChapter();
				return;
			}
		}
	}

	getColumnCount() {
		return this.pageContainer.clientWidth >= 1000 ? 2 : 1;
	}

	flushCSS(elem) {
		elem.offsetHeight;
	}
}