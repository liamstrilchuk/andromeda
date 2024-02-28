const defaultSettings = {
	fontSize: 20,
	theme: "dark",
	maxWidth: 1500,
	lineSpacing: 1.15,
	font: "serif"
};

class Store {
	async loadSetting(setting) {
		const settings = await this.get("settings");

		return settings[setting] || null;
	}

	async updateSetting(setting, value) {
		const settings = await this.get("settings");

		settings[setting] = value;

		await this.set("settings", settings);
	}

	async loadLibrary() {
		return await this.get("library");
	}

	async loadBook(title) {
		const book = await this.get("library-" + title.replaceAll(/[^\w]/g, ""));

		const library = await this.get("library");
		for (const item of library) {
			if (item.title === title) {
				item.lastOpened = Date.now();
				break;
			}
		}
		this.set("library", library);

		return book;
	}

	async saveBook(book) {
		const library = await this.get("library");

		library.push({
			title: book.title,
			size: book.size,
			cover: book.cover,
			attributes: book.attributes,
			lastOpened: Date.now()
		});

		await this.set("library", library);
		await this.set("library-" + book.title.replaceAll(/[^\w]/g, ""), book);
	}

	async removeFromLibrary(title) {
		const library = await this.get("library");

		const newLibrary = library.filter(book => book.title !== title);

		await this.set("library", newLibrary);
		await this.set("library-" + title.replaceAll(/[^\w]/g, ""), null);
	}

	async loadPosition(title) {
		const positions = await this.get("positions");

		return positions[title] || { chapter: 0, anchor: 0, percentage: 0 };
	}

	async setPosition(title, chapter, anchor, percentage) {
		const positions = await this.get("positions");

		positions[title] = { chapter, anchor, percentage };

		await this.set("positions", positions);
	}

	async initializeStore() {
		if (!(await this.get("settings"))) {
			await this.set("settings", defaultSettings);
		}

		if (!(await this.get("library"))) {
			await this.set("library", []);
		}

		if (!(await this.get("positions"))) {
			await this.set("positions", {});
		}

		if (!(await this.get("readingStats"))) {
			await this.set("readingStats", {
				days: {},
				goal: 300
			});
		}

		for (const setting in defaultSettings) {
			if ((await this.loadSetting(setting)) === null) {
				await this.updateSetting(setting, defaultSettings[setting]);
			}
		}
	}

	async addReadingTime(time) {
		const readingStats = await this.get("readingStats");

		const today = reader.util.getDateString(new Date());

		if (!readingStats.days[today]) {
			readingStats.days[today] = 0;
		}

		readingStats.days[today] += time;

		await this.set("readingStats", readingStats);
	}

	async getReadingStats() {
		return await this.get("readingStats");
	}

	async get(item) {
		const promise = new Promise((resolve, _reject) => {
			chrome.storage.local.get(item, (result) => {
				resolve(result[item]);
			});
		});

		return promise;
	}

	async set(item, value) {
		const promise = new Promise((resolve, _reject) => {
			chrome.storage.local.set({ [item]: value }, () => {
				resolve();
			});
		});

		return promise;
	}
}