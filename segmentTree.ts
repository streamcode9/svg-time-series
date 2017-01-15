export interface IMinMax {
	min: number
	max: number
}

function buidMinMax(fst: IMinMax, snd: IMinMax): IMinMax {
	return { min: Math.min(fst.min, snd.min), max: Math.max(fst.max, snd.max) }
}

export class SegmentTree {
	size: number
	tree: IMinMax[]
	buidTuple: (elementIndex: number, elements: any) => IMinMax

	constructor(data: any, dataSize: number, buidTuple: (elementIndex: number, elements: any) => IMinMax) {
		this.size = dataSize
		this.tree = new Array(this.size * 4)
		this.buidTuple = buidTuple
		
		const build = (tree: IMinMax[], values: any, i: number, tl: number, tr: number) => {
			if (tl == tr) tree[i] = this.buidTuple(tl, values)
			else {
				const tm = Math.floor((tl + tr) / 2);
				build(tree, values, 2 * i, tl, tm)
				build(tree, values, 2 * i + 1, tm + 1, tr)
				tree[i] = buidMinMax(tree[2 * i], tree[2 * i + 1])
			}
		}
		build(this.tree, data, 1, 0, this.size - 1)
	}

	getMinMax(from: number, to: number) {
		const minMax = (tree: IMinMax[], i: number, tl: number, tr: number, l: number, r: number): IMinMax => {
			if (l > r) return { min: Infinity, max: -Infinity }

			if (l == tl && r == tr) return tree[i]

			const tm = Math.floor((tl + tr) / 2);
			return buidMinMax(
				minMax(tree, i * 2, tl, tm, l, Math.min(r, tm)),
				minMax(tree, i * 2 + 1, tm + 1, tr, Math.max(l, tm + 1), r))
		}
		return minMax(this.tree, 1, 0, this.size - 1, from, to)
	}

	update(position: number, newValue: IMinMax) {
		const update = (tree: IMinMax[], i: number, tl: number, tr: number, pos: number, newTuple: IMinMax) => {
			if (tl == tr) {
				tree[i] = newTuple
				return
			}

			const tm = Math.floor((tl + tr) / 2);
			if (pos <= tm) update(tree, i * 2, tl, tm, pos, newTuple)
			else update(tree, i * 2 + 1, tm + 1, tr, pos, newTuple)
			tree[i] = buidMinMax(tree[i * 2], tree[i * 2 + 1])
		}
		update(this.tree, 1, 0, this.size - 1, position, newValue)
	}
}
