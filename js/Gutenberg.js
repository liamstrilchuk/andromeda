class Gutenberg {
	constructor() {
		this.apiUrl = "https://gutendex.com/books/";
	}

	async query(parameters) {
		const url = new URL(this.apiUrl);
		Object.keys(parameters).forEach(key => url.searchParams.append(key, parameters[key]));
		return await (await fetch(url)).json();
	}

	async loadBooks(sort, search) {
		const response = await this.query({
			sort: sort || "popular",
			search: encodeURIComponent(search) || "",
			mime_type: "application/epub"
		});
		const books = [];

		for (const element of response.results) {
			if (!element.formats["application/epub+zip"]) {
				continue;
			}

			books.push({
				title: element.title,
				author: element.authors.map(author => author.name).join(", "),
				cover: element.formats["image/jpeg"] || null,
				url: element.formats["application/epub+zip"],
				downloads: element.download_count
			});
		}

		return books;
	}
}