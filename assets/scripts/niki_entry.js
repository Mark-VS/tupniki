function addRows() {
	document.querySelectorAll(".grid-el").forEach(cell => {
		cell.addEventListener("mouseenter", () => {
			let allCells = document.querySelectorAll(".grid-el");
			let index = Array.from(allCells).indexOf(cell);
			// allCells[index].style.backgroundColor = "black";
			let rowStart = Math.floor(index/5)*5;	// здесь мы получаем номер строки
			for (let i= rowStart; i<rowStart + 5; i++) {
				allCells[i].style.backgroundColor = "blanchedalmond";
			}
		});
		cell.addEventListener("mouseleave", () => {
			let allCells = document.querySelectorAll(".grid-el");
			let index = Array.from(allCells).indexOf(cell);
			let rowStart = Math.floor(index/5)*5;
			for (let i= rowStart; i<rowStart + 5; i++) {
				allCells[i].style.backgroundColor = "";
			}
		});
	});
}