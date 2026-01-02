class Util {
	constructor() {}

	createElement(type, parent, className) {
		const elem = document.createElement(type);
		if (className) {
			elem.className = className;
		}
		parent.appendChild(elem);
		return elem;
	}

	loadElem(query) {
		return document.querySelector(query);
	}

	loadAllElems(query, element) {
		return [...(element || document).querySelectorAll(query)];
	}

	loadStylesheet(url) {
		const current = this.loadAllElems("link");

		if (current.find(link => link.href === url)) {
			return;
		}

		const link = document.createElement("link");
		link.href = url;
		link.rel = "stylesheet";
		document.head.appendChild(link);
	}

	removeStylesheet(url) {
		this.loadAllElems("link")
			.filter(link => link.href.endsWith(url))
			.forEach(link => link.remove());
	}

	setTitle(title) {
		document.title = title;
	}

	getReadPercentage(data, chapter, anchor) {
		const total = data.reduce((acc, val) => acc + val.textLength, 0);
		let read = 0;

		for (let i = 0; i < data.length; i++) {
			if (i < chapter) {
				read += data[i].textLength;
				continue;
			}

			const elem = document.createElement("div");
			elem.innerHTML = data[i].innerHTML;
			const children = [...elem.querySelectorAll("p")];
			for (let j = 0; j < children.length; j++) {
				if (j <= anchor) {
					read += children[j].innerText.length;
				}
			}
			break;
		}

		return read / total * 100;
	}

	copyToClipboard(text) {
		if (!navigator.clipboard) {
			return;
		}

		navigator.clipboard.writeText(text);
	}

	capText(text, length) {
		if (text.length > length) {
			return text.substring(0, length) + "...";
		}

		return text;
	}

	getRelativePath(originalFilePath, targetFilePath) {
		const originalSegments = originalFilePath.split("/");
		const targetSegments = targetFilePath.split("/");

		originalSegments.pop();

		while (originalSegments.length > 0 && targetSegments[0] === "..") {
			originalSegments.pop();
			targetSegments.shift();
		}

		const finalSegments = originalSegments.concat(targetSegments);

		return finalSegments.join("/");
	}

	getDateString(date) {
		return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
	}

	async sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	sanitizeText(text) {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
}

HTMLElement.prototype.setAttributes = function(attributes) {
	for (const attribute in attributes) {
		this.setAttribute(attribute, attributes[attribute]);
	}

	return this;
}

HTMLElement.prototype.applyStyles = function(styles) {
	for (const style in styles) {
		this.style[style] = styles[style];
	}

	return this;
}

HTMLElement.prototype.clear = function() {
	this.innerHTML = "";
}

HTMLElement.prototype.show = function(style) {
	this.style.display = style || "block";
}

HTMLElement.prototype.hide = function() {
	this.style.display = "none";
}