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

		const build = (tree: IMinMax[], values: any, i: number, left: number, right: number) => {
			if (left == right) tree[i] = this.buidTuple(left, values)
			else {
				const middle = Math.floor((left + right) / 2);
				build(tree, values, 2 * i, left, middle)
				build(tree, values, 2 * i + 1, middle + 1, right)
				tree[i] = buidMinMax(tree[2 * i], tree[2 * i + 1])
			}
		}
		build(this.tree, data, 1, 0, this.size - 1)
	}

	getMinMax(fromPosition: number, toPosition: number) {
		const getMinMax = (tree: IMinMax[], i: number, left: number, right: number, from: number, to: number): IMinMax => {
			if (from > to) return { min: Infinity, max: -Infinity }

			if (from == left && to == right) return tree[i]

			const middle = Math.floor((left + right) / 2);
			return buidMinMax(
				getMinMax(tree, i * 2, left, middle, from, Math.min(to, middle)),
				getMinMax(tree, i * 2 + 1, middle + 1, right, Math.max(from, middle + 1), to))
		}
		return getMinMax(this.tree, 1, 0, this.size - 1, fromPosition, toPosition)
	}

	update(positionToUpdate: number, newValue: IMinMax) {
		const update = (tree: IMinMax[], i: number, left: number, right: number, position: number, newTuple: IMinMax) => {
			if (left == right) {
				tree[i] = newTuple
				return
			}

			const middle = Math.floor((left + right) / 2);
			if (position <= middle) update(tree, i * 2, left, middle, position, newTuple)
			else update(tree, i * 2 + 1, middle + 1, right, position, newTuple)
			tree[i] = buidMinMax(tree[i * 2], tree[i * 2 + 1])
		}
		update(this.tree, 1, 0, this.size - 1, positionToUpdate, newValue)
	}
}
