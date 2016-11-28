function buidMinMaxTuple(fst: [number, number], snd: [number, number]): [number, number] {
	return [Math.min(fst[0], snd[0]), Math.max(fst[1], snd[1])]
}

export class SegmentTree {
	size: number
	tree: [number, number][]

	constructor(data: number[]) {
		this.size = data.length
		this.tree = new Array(this.size * 4)

		let build = function (tree: [number, number][], values: number[], i: number, tl: number, tr: number) {
			if (tl == tr) tree[i] = [values[tl], values[tl]]
			else {
				let tm = Math.floor((tl + tr) / 2)
				build(tree, values, 2 * i, tl, tm)
				build(tree, values, 2 * i + 1, tm + 1, tr)
				tree[i] = buidMinMaxTuple(tree[2 * i], tree[2 * i + 1])
			}
		}
		build(this.tree, data, 1, 0, this.size - 1)
	}

	getMinMax(l: number, r: number) {
		let min = function (tree: [number, number][], i: number, tl: number, tr: number, l: number, r: number): [number, number] {
			if (l > r) return [Infinity, -Infinity]

			if (l == tl && r == tr) return tree[i]

			let tm = Math.floor((tl + tr) / 2)
			return buidMinMaxTuple(
				min(tree, i * 2, tl, tm, l, Math.min(r, tm)),
				min(tree, i * 2 + 1, tm + 1, tr, Math.max(l, tm + 1), r))
		}
		return min(this.tree, 1, 0, this.size - 1, l, r)
	}

	update(position: number, newValue: [number, number]) {
		let update = function(tree: [number, number][], i: number, tl: number, tr: number, pos: number, newTuple: [number, number]) {
			if (tl == tr) {
				tree[i] = newTuple
				return
			}

			let tm = Math.floor((tl + tr) / 2)
			if (pos <= tm) update (tree, i * 2, tl, tm, pos, newTuple)
			else update (tree, i * 2 + 1, tm + 1, tr, pos, newTuple)
			tree[i] = buidMinMaxTuple(tree[i * 2], tree[i * 2 + 1])
		}
		update(this.tree, 1, 0, this.size - 1, position, newValue)
	}
}