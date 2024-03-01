class Loader {
	constructor(settings) {
		this.settings = settings;
	}

	load(file) {
		const promise = new Promise((resolve, _reject) => {
			const zip = new JSZip();

			zip.loadAsync(file).then(async zip => {
				resolve(await this.parse(zip));
			}, error => {
				console.error("Error loading file: " + error);
			});
		});

		return promise;
	}

	async parse(zip) {
		const [ opfPath, opfName ] = this.getOpfPath(zip);

		const opf = await zip.file(opfPath + opfName).async("text");
		const parser = new DOMParser();
		const opfDoc = parser.parseFromString(opf, "application/xml");

		const manifest = opfDoc.querySelector("manifest");
		const manifestItems = {};

		const stylesheets = await this.getStylesheets(zip);

		for (const item of [...manifest.children]) {
			manifestItems[item.id] = {
				href: opfPath + item.getAttribute("href"),
				type: item.getAttribute("media-type")
			};
		}

		let tableOfContents = [];
		let ncxHref = "";

		if (manifestItems["ncx"] || manifestItems["ncxtoc"] || manifestItems["toc"]) {
			ncxHref = (manifestItems["ncx"] || manifestItems["ncxtoc"] || manifestItems["toc"]).href;
			const toc = await zip.file(ncxHref).async("string");
			tableOfContents = this.parseTableOfContents(parser.parseFromString(toc, "application/xhtml+xml"), opfPath);
		}
		ncxHref = ncxHref.includes("/") ? ncxHref.split("/")[0] + "/" : "";

		const spine = opfDoc.querySelector("spine");
		const chapters = [];
		const coverImage = opfDoc.querySelector("meta[name=cover]");
		let cover = null;
		if (coverImage) {
			const url = opfDoc.querySelector("#" + coverImage.getAttribute("content").replace(".", "\\.")).getAttribute("href");
			cover = "data:image/png;base64," + (await zip.file(opfPath + url).async("base64"));
		}

		for (const item of [...spine.children]) {
			const id = item.getAttribute("idref");
			const chapter = manifestItems[id];

			if (chapter) {
				chapters.push(chapter);
			}
		}

		const metadata = opfDoc.querySelector("metadata");
		const attributes = {};
		const toSave = { "dc:language": "Language", "dc:publisher": "Publisher", "dc:creator": "Creator", "dc:rights": "Rights", "dc:date": "Date" };
		let title = "";

		[...metadata.children].forEach(item => {
			if (toSave[item.tagName] && !attributes[toSave[item.tagName]]) {
				attributes[toSave[item.tagName]] = item.textContent;
			}

			if (item.tagName === "dc:title" && !title) {
				title = item.textContent;
			}
		});

		// check if book is already in library
		const library = await reader.store.loadLibrary();
		for (const elem of library) {
			if (elem.title === title) {
				return elem;
			}
		}

		const bookData = [];
		for (let i = 0; i < chapters.length; i++) {
			const chapterData = await zip.file(chapters[i].href).async("string");
			let chapterTitle = "";
			for (let x = 0; x < tableOfContents.length; x++) {
				const split = tableOfContents[x].content.split("#")[0];
				if (ncxHref + split === chapters[i].href || split === chapters[i].href) {
					chapterTitle = tableOfContents[x].title;
				}
			}
			bookData.push(await this.parseChapter(chapterData, chapterTitle, chapters[i].href, zip));
		}

		const book = {
			title: title,
			contents: bookData,
			attributes: attributes,
			tableOfContents: tableOfContents,
			stylesheets: stylesheets,
			chapterPoints: this.getChapterPoints(bookData),
			cover: await this.loadCover(cover),
			size: bookData.reduce((acc, chapter) => acc + chapter.totalLength, 0)
		};

		await reader.store.saveBook(book);
		return book;
	}

	getChapterPoints(chapters) {
		const totalLength = chapters.reduce((acc, chapter) => acc + chapter.textLength, 0);
		const points = [];
		let cur = 0;

		for (const chapter of chapters) {
			points.push({
				title: chapter.title,
				point: Math.floor(cur / totalLength * 10000) / 100
			});
			cur += chapter.textLength;
		}

		return points;
	}

	getOpfPath(zip) {
		const opfPath = Object.keys(zip.files).find(path => /\/?[^\/]+\.opf$/.test(path));

		if (!opfPath) {
			throw new Error("No OPF file found in archive");
		}

		const split = opfPath.split("/");
		const opfName = split.pop();

		return [ split.join("/") + (split.length ? "/" : ""), opfName ];
	}

	async getStylesheets(zip) {
		const stylesheets = Object.keys(zip.files).filter(path => /\/?[^\/]+\.css$/.test(path));
		const styleData = [];

		for (const path of stylesheets) {
			const data = await zip.file(path).async("string");
			styleData.push({ path: path, data: this.parseStylesheet(data) });
		}

		return styleData;
	}

	parseTableOfContents(toc, opfPath) {
		opfPath = opfPath.replace(/\/$/, "");
		const navMap = toc.querySelector("navMap");
		if (!navMap) {
			return [];
		}
		const points = [];

		for (let child of [...navMap.children]) {
			if (child.tagName === "navPoint") {
				for (let p of this.parseNavPoint(child, 0, opfPath)) {
					points.push(p);
				}
			}
		}

		return points;
	}

	parseNavPoint(point, indentation, opfPath) {
		const points = [{ title: "", content: "", indentation: indentation }];

		for (let elem of [...point.children]) {
			switch (elem.tagName) {
				case "navLabel":
					points[0].title = elem.children[0].innerHTML;
					break;
				case "content":
					points[0].content = reader.util.getRelativePath(opfPath, elem.attributes["src"].value.split("#")[0]);
					break;
				case "navPoint":
					for (let p of this.parseNavPoint(elem, indentation + 1, opfPath)) {
						points.push(p);
					}
					break;
			}
		}

		return points;
	}

	async parseChapter(chapter, title, filename, zip) {
		const parser = new DOMParser();
		const chapterDoc = parser.parseFromString(chapter, "application/xhtml+xml");

		const stylesheets = [...chapterDoc.querySelectorAll("link[rel=stylesheet]")]
			.map(link => link.getAttribute("href"))
			.filter(href => href && href.endsWith(".css"))
			.map(href => reader.util.getRelativePath(filename, href));
		
		const body = chapterDoc.querySelector("body");
		
		await Promise.allSettled([...body.querySelectorAll("img"), ...body.querySelectorAll("image")].map(async (child) => {
			return new Promise(async (resolve, reject) => {
				const attrName = child.hasAttribute("src") ? "src" : (child.hasAttribute("xlink:href") ? "xlink:href" : null);
				if (attrName) {
					try {
						const imgFilename = reader.util.getRelativePath(filename, child.getAttribute(attrName));
						const imgData = "data:image/png;base64," + (await zip.file(imgFilename).async("base64"));

						child.setAttribute(attrName, imgData);
						resolve();
					} catch (err) {
						console.log("Error while loading image: " + err);
						reject(err);
					}
				}
			});
		}));

		return {
			title: title,
			stylesheets: stylesheets,
			innerHTML: body.innerHTML,
			filename: filename,
			textLength: body.innerText.length,
			totalLength: body.innerHTML.length
		};
	}

	parseStylesheet(contents) {
		// remove comments from css
		contents = contents.replace(/\/\*[\s\S]*?\*\//g, "");
		const matches = [...contents.matchAll(/([\w.#\-, \[\]]+?)(?:\s+?)?{(.+?)}/gms)];
		const rules = [];
		
		for (const match of matches) {
			const appliesTo = match[1].split(",").map(s => s.trim());
			const styles = [...match[2].matchAll(/(?:\s+?)?(([-\w]+):(?:\s+)?([\w\d.]+));/gms)].map(m => {
				return { name: m[2], value: m[3] };
			});

			rules.push({ appliesTo, styles });
		}

		return rules;
	}

	async loadCover(dataurl) {
		if (!dataurl) {
			return null;
		}
		const ctx = document.createElement("canvas").getContext("2d");
		ctx.canvas.width = 195;
		ctx.canvas.height = 195 * 1.5;
		const img = new Image();
		img.src = dataurl;

		await new Promise(resolve => {
			img.onload = () => {
				ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
				resolve();
			};
		});

		return ctx.canvas.toDataURL();
	}
}