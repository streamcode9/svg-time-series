import { expect, test } from 'vitest'
import { SegmentTree, IMinMax } from './segmentTree.ts'
import { SegmentTreeHalf } from './segmentTreeHalf.ts'

test('SegmentTree operations', () => {
    const data = [1, 3, 2, 5, 4];
    const buildTuple = (index: number, elements: number[]): IMinMax => ({
        min: elements[index],
        max: elements[index]
    });

    const tree = new SegmentTree(data, data.length, buildTuple);

    // Test initial state
    expect(tree.getMinMax(0, 4)).toEqual({ min: 1, max: 5 });
    expect(tree.getMinMax(1, 3)).toEqual({ min: 2, max: 5 });

    // Test update
    tree.update(2, { min: 6, max: 6 });
    expect(tree.getMinMax(0, 4)).toEqual({ min: 1, max: 6 });
    expect(tree.getMinMax(2, 4)).toEqual({ min: 4, max: 6 });

    // Test invalid range
    expect(() => tree.getMinMax(-1, 5)).toThrow("Range is not valid");
    expect(() => tree.getMinMax(3, 2)).toThrow("Range is not valid");

    // Test invalid update position
    expect(() => tree.update(-1, { min: 0, max: 0 })).toThrow("Position is not valid");
    expect(() => tree.update(5, { min: 0, max: 0 })).toThrow("Position is not valid");
});

test('SegmentTreeHalf edge cases', () => {
    const data = [1, 2, 3, 4, 5]
    const sumOp = (a: number, b: number) => a + b
    const tree = new SegmentTreeHalf(data, sumOp, 0)

    // query single elements on boundaries
    expect(tree.query(0, 0)).toBe(1)
    expect(tree.query(data.length - 1, data.length - 1)).toBe(5)

    // update boundary elements and verify queries
    tree.update(0, 10)
    tree.update(data.length - 1, 20)
    expect(tree.query(0, 0)).toBe(10)
    expect(tree.query(data.length - 1, data.length - 1)).toBe(20)
    expect(tree.query(0, data.length - 1)).toBe(10 + 2 + 3 + 4 + 20)

    // invalid range returns identity value
    expect(tree.query(3, 2)).toBe(0)
})

test('SegmentTree with IMinMax', () => {
    const data = [
        { min: 1, max: 2 },
        { min: 3, max: 4 },
        { min: 2, max: 5 },
        { min: 5, max: 6 },
        { min: 4, max: 7 }
    ];
    const buildTuple = (index: number, elements: IMinMax[]): IMinMax => elements[index];

    const tree = new SegmentTree(data, data.length, buildTuple);

    // Test initial state
    expect(tree.getMinMax(0, 4)).toEqual({ min: 1, max: 7 });
    expect(tree.getMinMax(1, 3)).toEqual({ min: 2, max: 6 });

    // Test update
    tree.update(2, { min: 0, max: 8 });
    expect(tree.getMinMax(0, 4)).toEqual({ min: 0, max: 8 });
    expect(tree.getMinMax(2, 4)).toEqual({ min: 0, max: 8 });
});
