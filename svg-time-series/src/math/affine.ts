export class AR1 {
  constructor(public m: [number, number]) {}

  composeWith(a2: AR1): AR1 {
    const [a0, b0] = this.m;
    const [a1, b1] = a2.m;
    return new AR1([a0 * a1, b0 * a1 + b1]);
  }

  inverse(): AR1 {
    const [a, b] = this.m;
    if (a === 0) {
      throw new Error("AR1.inverse: zero scale factor");
    }
    return new AR1([1 / a, -b / a]);
  }

  applyToPoint(p: number): number {
    const [a, b] = this.m;
    return a * p + b;
  }
}

export class AR1Basis {
  constructor(
    private p1: number,
    private p2: number,
  ) {}

  toArr(): [number, number] {
    return [this.p1, this.p2];
  }

  transformWith(transform: AR1): AR1Basis {
    return new AR1Basis(
      transform.applyToPoint(this.p1),
      transform.applyToPoint(this.p2),
    );
  }

  getRange(): number {
    return Math.abs(this.p2 - this.p1);
  }
}

export const bUnit = new AR1Basis(0, 1);
export const bPlaceholder = bUnit;

export function betweenBasesAR1(
  b1: [number, number],
  b2: [number, number],
): AR1 {
  const [b11, b12] = b1;
  const [b21, b22] = b2;
  const span = b11 - b12;
  if (span === 0) {
    throw new Error("betweenBasesAR1: zero span basis");
  }
  return new AR1([(b21 - b22) / span, -(b12 * b21 - b11 * b22) / span]);
}

export function betweenTBasesAR1(b1: AR1Basis, b2: AR1Basis): AR1 {
  return betweenBasesAR1(b1.toArr(), b2.toArr());
}

export class DirectProduct {
  constructor(
    public s1: AR1,
    public s2: AR1,
  ) {}

  composeWith(dp2: DirectProduct): DirectProduct {
    return new DirectProduct(
      this.s1.composeWith(dp2.s1),
      this.s2.composeWith(dp2.s2),
    );
  }

  inverse(): DirectProduct {
    return new DirectProduct(this.s1.inverse(), this.s2.inverse());
  }

  applyToPoint(p: [number, number]): [number, number] {
    return [this.s1.applyToPoint(p[0]), this.s2.applyToPoint(p[1])];
  }
}

export class DirectProductBasis {
  private p1: [number, number];
  private p2: [number, number];

  constructor(pp1: [number, number], pp2: [number, number]) {
    this.p1 = pp1;
    this.p2 = pp2;
  }

  x(): AR1Basis {
    const [x1] = this.p1;
    const [x2] = this.p2;
    return new AR1Basis(x1, x2);
  }

  y(): AR1Basis {
    const [, y1] = this.p1;
    const [, y2] = this.p2;
    return new AR1Basis(y1, y2);
  }

  toArr() {
    return [this.x().toArr(), this.y().toArr()];
  }

  transformWith(dp: DirectProduct): DirectProductBasis {
    return new DirectProductBasis(
      dp.applyToPoint(this.p1),
      dp.applyToPoint(this.p2),
    );
  }

  static fromProjections(b1: AR1Basis, b2: AR1Basis): DirectProductBasis {
    const [b1x, b2x] = b1.toArr();
    const [b1y, b2y] = b2.toArr();
    return new DirectProductBasis([b1x, b1y], [b2x, b2y]);
  }
}

export const dpbPlaceholder = new DirectProductBasis([0, 0], [1, 1]);

export function betweenTBasesDirectProduct(
  b1: DirectProductBasis,
  b2: DirectProductBasis,
): DirectProduct {
  return new DirectProduct(
    betweenTBasesAR1(b1.x(), b2.x()),
    betweenTBasesAR1(b1.y(), b2.y()),
  );
}
