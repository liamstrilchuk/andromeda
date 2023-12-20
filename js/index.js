window.addEventListener("load", () => {
	window.reader = new EpubReader(document.getElementById("container"));
	reader.init();
});