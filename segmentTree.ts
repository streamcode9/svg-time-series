function buidMinMaxTuple(fst: [number, number], snd: [number, number]): [number, number] {
	return [Math.min(fst[0], snd[0]), Math.max(fst[1], snd[1])]
}

export class SegmentTree {
	size: number
	tree: any[]
	buidTupleFunc: (element: any) => [number, number]

	constructor(data: number[], buidTupleFunction: (element: any) => [number, number]) {
		this.size = data.length
		this.tree = new Array(this.size * 4)
		this.buidTupleFunc = buidTupleFunction
		
		const build = (tree: [number, number][], values: any[], i: number, tl: number, tr: number) => {
			if (tl == tr) tree[i] = this.buidTupleFunc(values[tl])
			else {
				const tm = Math.floor((tl + tr) / 2);
				build(tree, values, 2 * i, tl, tm)
				build(tree, values, 2 * i + 1, tm + 1, tr)
				tree[i] = buidMinMaxTuple(tree[2 * i], tree[2 * i + 1])
			}
		}
		build(this.tree, data, 1, 0, this.size - 1)
	}

	getMinMax(from: number, to: number) {
		const min = (tree: [number, number][], i: number, tl: number, tr: number, l: number, r: number): [number, number] => {
			if (l > r) return [Infinity, -Infinity]

			if (l == tl && r == tr) return tree[i]

			const tm = Math.floor((tl + tr) / 2);
			return buidMinMaxTuple(
				min(tree, i * 2, tl, tm, l, Math.min(r, tm)),
				min(tree, i * 2 + 1, tm + 1, tr, Math.max(l, tm + 1), r))
		}
		return min(this.tree, 1, 0, this.size - 1, from, to)
	}

	update(position: number, newValue: [number, number]) {
		const update = (tree: [number, number][], i: number, tl: number, tr: number, pos: number, newTuple: [number, number]) => {
			if (tl == tr) {
				tree[i] = newTuple
				return
			}

			const tm = Math.floor((tl + tr) / 2);
			if (pos <= tm) update(tree, i * 2, tl, tm, pos, newTuple)
			else update(tree, i * 2 + 1, tm + 1, tr, pos, newTuple)
			tree[i] = buidMinMaxTuple(tree[i * 2], tree[i * 2 + 1])
		}
		update(this.tree, 1, 0, this.size - 1, position, newValue)
	}
}
