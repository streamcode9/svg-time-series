// По задумке этот модуль содержит различные аффинные пространства
// A - аффинное пространство над векторным пространством над
// R - множеством действительных чисел
// 1 - в первой степени (числовая прямая)

// автоморфизмы числовой прямой
export class AR1 {
  // коэффициенты автоморфизма x' = x * m[0] + m[1]
  public m: [number, number];

  constructor(mm: [number, number]) {
    this.m = mm;
  }

  public composeWith(a2: AR1): AR1 {
    const [a0, b0] = this.m;
    const [a1, b1] = a2.m;

    return new AR1([a0 * a1, b0 * a1 + b1]);
  }

  // x1 = a * x + b; x = x1 / a - b / a
  public inverse(): AR1 {
    const [a, b] = this.m;
    return new AR1([1 / a, -b / a]);
  }

  public applyToPoint(p: number): number {
    const [a, b] = this.m;
    return a * p + b;
  }

  public applyToMatrixX(sm: SVGMatrix): SVGMatrix {
    const [a, b] = this.m;
    return sm.translate(b, 0).scaleNonUniform(a, 1);
  }

  public applyToMatrixY(sm: SVGMatrix): SVGMatrix {
    const [a, b] = this.m;
    return sm.translate(0, b).scaleNonUniform(1, a);
  }
}

// У N-мерного аффинного пространства базис N+1 точек
// дополнительная точка даёт по сравнению с векторами
// дополнительную возможность описывать параллельный
// перенос (вектора - только повороты, растяжения,
// перекосы и их комбинации)
//
// Преобразование однозначно определяется парой базисов.
// На бытовом языке - два массива точек, притом первая точка
// первого массива переходит в первую точку второго.
//
// Пространство AR1 одномерное, и точек в базисе две.
//
// Например, для аффинного преобразованияз цельсия в фаренгейт нужно
// знать что в фаренгейте вода замерзает при 32 а кипит при 212
// а в цельсии соответственно 0 и 100
//
// betweenBasesAR1([32, 212], [0, 100]) нам даст преобразование
// из фаренгейта в цельсий. Не важно какая точка "меньше" -
// betweenBasesAR1([212, 32], [100, 0]) это то же самое.
//
// Можно betweenBasesAR1([212, 32], [0, 100]) писать - это будет
// перевод из фаренгейта в "обратный" цельсий, где вода
// кипит при нуле, а замерзает при +100.
// Интересно, что одно и то же преобразование получается из
// бесконечно большого количества пар базисов - это и понятно,
// перевод из цельсия в фаренгейты можно определить, зафиксировав
// температуры плавления стали и горения бумаги и т п.
//
//
//
//		 b21 - b22        b12 b21 - b11 b22
// [[a = ---------, b = - -----------------]]
//  	 b11 - b12            b11 - b12
export function betweenBasesAR1(b1: Array<number>, b2: Array<number>): AR1 {
  const [b11, b12] = b1;
  const [b21, b22] = b2;
  return new AR1([
    (b21 - b22) / (b11 - b12),
    -(b12 * b21 - b11 * b22) / (b11 - b12),
  ]);
}

export class AR1Basis {
  private p1: number;
  private p2: number;

  constructor(pp1: number, pp2: number) {
    this.p1 = pp1;
    this.p2 = pp2;
  }

  public toArr(): Array<number> {
    return [this.p1, this.p2];
  }

  public transformWith(transform: AR1): AR1Basis {
    return new AR1Basis(
      transform.applyToPoint(this.p1),
      transform.applyToPoint(this.p2),
    );
  }

  public getRange() {
    return Math.abs(this.p2 - this.p1);
  }
}

// единичный базис
export const bUnit = new AR1Basis(0, 1);

// часто нужен хоть какой-то базис
export const bPlaceholder = bUnit;

// between typed bases
export function betweenTBasesAR1(b1: AR1Basis, b2: AR1Basis): AR1 {
  return betweenBasesAR1(b1.toArr(), b2.toArr());
}

// пока это произведение конкретны[ пространств AR1 и AR1
// но код обобщается на произвольные
// при прямом произведении у нас трансформации в перемножаемых
// пространствах независимые
// на координатном языке это означает что трансформация по
// оси Х не меняет координату Y
// любопытно, что произведение пространств не влияет на количество
// точек для определения трансформации. То есть наше пространство
// переносов по двум осям как аффинное пространство - по-прежнему
// одномерно, и точек по-прежнему две.
// Только теперь точки "двойные".
export class DirectProduct {
  // multiplied spaces 1 and 2
  private s1: AR1;
  private s2: AR1;

  constructor(ss1: AR1, ss2: AR1) {
    this.s1 = ss1;
    this.s2 = ss2;
  }

  public applyToMatrix(sm: SVGMatrix): SVGMatrix {
    return this.s2.applyToMatrixY(this.s1.applyToMatrixX(sm));
  }
}

export class DirectProductBasis {
  private p1: [number, number];
  private p2: [number, number];

  constructor(pp1: [number, number], pp2: [number, number]) {
    this.p1 = pp1;
    this.p2 = pp2;
  }

  public x() {
    const [x1, y1] = this.p1;
    const [x2, y2] = this.p2;
    return new AR1Basis(x1, x2);
  }

  public y() {
    const [x1, y1] = this.p1;
    const [x2, y2] = this.p2;
    return new AR1Basis(y1, y2);
  }

  public toArr() {
    return [this.x().toArr(), this.y().toArr()];
  }

  // здест по сути транспонирование матрицы 2х2
  // непонятно как делать
  public static fromProjections(
    b1: AR1Basis,
    b2: AR1Basis,
  ): DirectProductBasis {
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
