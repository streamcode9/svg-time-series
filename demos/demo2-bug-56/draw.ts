﻿import { scaleLinear, scaleTime } from 'd3-scale'
import { BaseType, event as d3event, selectAll, Selection } from 'd3-selection'
import { timeout as runTimeout } from 'd3-timer'
import { zoom as d3zoom, ZoomTransform } from 'd3-zoom'

import { MyAxis, Orientation } from '../../axis'
import { MyTransform } from '../../MyTransform'
import { IMinMax, SegmentTree } from '../../segmentTree'
import { AR1Basis, AR1, betweenTBasesAR1, bPlaceholder, bUnit } from '../../viewZoomTransform'

function drawProc(f: Function) {
	let requested = false

	return (...params: any[]) => {
		if (!requested) {
			requested = true
			runTimeout((elapsed: number) => {
				requested = false
				f(params)
			})
		}
	}
}

function bindAxisToDom(svg: Selection<BaseType, {}, HTMLElement, any>, axis: any, scale: any) {
	axis.setScale(scale)
	return svg.append('g')
		.attr('class', 'axis')
		.call(axis.axis.bind(axis))
}

export class TimeSeriesChart {
	public zoom: () => void
	private drawNewData: () => void
	private data: Array<[number, number]>

	// updated when a new point is added
	private tree: SegmentTree

	// Updated when a new point is added
	// used to convert indices to dates shown by X axis
	// Date.now() style timestamp
	private timeAtIdx0: number

	// Step by X axis
	// Date.now() style timestamp delta
	private timeStep: number

	// автоморфизм действительных чисел в первой степени
	// преобразование из простраства индексов
	// в пространство времён
	private idxToTime: AR1

	// преобразование добавления точки
	// когда добавляем точку в массиив надо
	// idxToTime.composeWith(idxShift)
	// это автоморфизм пространства индексов
	// то есть преобразование пространства индексов
	// в себя, а не в другое пространство
	private idxShift: AR1

	// две точки - начало и конец массива в пространстве индексов
	// стоит думать о них как об абстрактных точках
	// нарисованных в мире за телевизором на наших графиках
	// а не в терминах их координат
	private bIndexFull: AR1Basis

	private buildSegmentTreeTuple: (index: number, elements: any) => IMinMax
	private zoomHandler: () => void

	constructor(
		svg: Selection<BaseType, {}, HTMLElement, any>,
		startTime: number, timeStep: number,
		data: Array<[number, number]>,
		buildSegmentTreeTuple: (index: number, elements: any) => IMinMax,
		zoomHandler: () => void) {

		// здесь второй базис образован не двумя точками, а
		// эквивалентно точкой и вектором
		// хорошо бы сделать например basisAR1PV()
		// типа смарт-конструктор
		// интересно что есть короткая эквивалентная формулировка
		// this.idxToSpace = new AR1(startTime, timeStep)
		// но она возвращает нас к координатному мышлению
		this.idxToTime = betweenTBasesAR1(bUnit, new AR1Basis(startTime, startTime + timeStep))

		// при добавлении точки первый и второй элемент
		// становятся на место нулевого и первого соответственно
		this.idxShift = betweenTBasesAR1(new AR1Basis(1, 2), bUnit)
		this.buildSegmentTreeTuple = buildSegmentTreeTuple
		this.zoomHandler = zoomHandler
		this.bIndexFull = new AR1Basis(0, data.length - 1)
		this.drawChart(svg, data)
	}

	private drawChart(svg: Selection<BaseType, {}, HTMLElement, any>, data: Array<[number, number]>) {
		this.data = data

		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		svg.attr('width', width)
		svg.attr('height', height)

		const view = svg.select('g.view')

		// тут наши перевернутые базисы которые мы
		// cтеснительно запрятали в onViewPortResize
		// таки вылезли

		// на видимую область можно смотреть абстрактно
		// как на отдельное пространство

		// ось Y перевернута - что выглядит на языке
		// базисов как перевернутый базис
		//
		// а на языке векторов как разность точек, которая
		// у X положительна а у Y отрицательна
		// ну и наоборот если перевернем первый базис
		// то второй тоже перевернется но переворачивание
		// по-прежнему выглядит как умножение разности на -1
		//	
		// короче неважно какой из них считать первичным
		// в любом случае один перевернут по отношению к другому
		const bScreenXVisible = new AR1Basis(0, width)
		const bScreenYVisible = new AR1Basis(height, 0)

		// интерфейс с лигаси-кодом. Некоторая многословость простительна
		const x = scaleTime().range(bScreenXVisible.toArr())
		const y = scaleLinear().range(bScreenYVisible.toArr())
		const viewNode: SVGGElement = view.node() as SVGGElement
		const pathTransform = new MyTransform(svg.node() as SVGSVGElement, viewNode)

		// bIndexVisible is the visible ends of model
		// affine space at chart edges.
		// They are updated by zoom and pan or animation
		// but unaffected by arrival of new data
		const updateScales = (bIndexVisible: AR1Basis) => {
			// рассчитается деревом отрезков, но все равно долго
			// так что нужно сохранить чтобы
			// два раза не перевычислять для линий графиков и для осей
			const bTemperatureVisible = this.bTemperatureVisible(bIndexVisible)
			// референсное окно имеет достаточно странный вид
			// по горизонтали у нас полный диапазон
			// а по вертикали только видимый
			// надеюсь это исправится при переходе от отдельных
			// пространств по Х и Y к единому пространству
			// являющeмся их прямым произведением
			pathTransform.onReferenceViewWindowResize(this.bIndexFull, bTemperatureVisible)

			const bTimeVisible = bIndexVisible.transformWith(this.idxToTime)
			x.domain(bTimeVisible.toArr())
			y.domain(bTemperatureVisible.toArr())
		}

		this.tree = new SegmentTree(this.data, this.data.length, this.buildSegmentTreeTuple)

		// в референсном окне видны все данные, поэтому
		// передаем bIndexFull в качестее bIndexVisible
		updateScales(this.bIndexFull)

		const xAxis = new MyAxis(Orientation.Bottom, x)
			.ticks(4)
			// изменять размер тиков надо при изменении
			// размеров окна
			.setTickSize(height)
			.setTickPadding(8 - height)

		const yAxis = new MyAxis(Orientation.Right, y)
			.ticks(4)
			.setTickSize(width)
			.setTickPadding(2 - width)

		const gX = bindAxisToDom(svg, xAxis, x)
		const gY = bindAxisToDom(svg, yAxis, y)

		// it's important that we have only 1 instance
		// of drawProc and not one per event
		// вызывается из zoom и drawNewData
		const scheduleRefresh = drawProc(() => {
			const bIndexVisible = pathTransform.fromScreenToModelBasisX(bScreenXVisible)
			updateScales(bIndexVisible)
			pathTransform.updateViewNode()

			xAxis.axisUp(gX)
			yAxis.axisUp(gY)
		})
		pathTransform.onViewPortResize(bScreenXVisible, bScreenYVisible)
		pathTransform.onReferenceViewWindowResize(this.bIndexFull, bPlaceholder)
		svg.append('rect')
			.attr('class', 'zoom')
			.attr('width', width)
			.attr('height', height)
			.call(d3zoom()
				.scaleExtent([1, 40])
				// в перспективе взять экстент из bScreenVisible
				// хотя хез как быть с другим порядком
				.translateExtent([[0, 0], [width, height]])
				.on('zoom', this.zoomHandler.bind(this)))

		// публичный метод, используется для ретрансляции
		// зум-события нескольким графикам
		this.zoom = () => {
			pathTransform.onZoomPan(d3event.transform)
			scheduleRefresh()
		}
	}

	private bTemperatureVisible(bIndexVisible: AR1Basis) : AR1Basis {
		// просто функция между базисами
		const [minIdxX, maxIdxX] = bIndexVisible.toArr()
		const { min, max } = this.tree.getMinMax(minIdxX, maxIdxX)
		return new AR1Basis(min, max)
	}
}