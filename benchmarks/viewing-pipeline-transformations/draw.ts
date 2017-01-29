declare const require: Function
const d3timer = require('d3-timer')
import VWTransform = require('./ViewWindowTransform')

export class TimeSeriesChart {
    private SVGNode: any
 
    private vwTransform: VWTransform.ViewWindowTransform

    private stepX: number

    constructor(svg: any, minX: number, stepX: number, cities: any, onPath: Function, dataLength: number) {
        this.stepX = stepX

        this.SVGNode = svg.node()
        this.vwTransform = new VWTransform.ViewWindowTransform(this.SVGNode.transform.baseVal)

		const width = svg.node().parentNode.clientWidth,
			height = svg.node().parentNode.clientHeight
		svg.attr('width', width)
        svg.attr('height', height)

        this.vwTransform.setViewPort(width, height)
        this.vwTransform.setViewWindow(minX, dataLength - 1, 8, 81)
		
		const view = svg.append('g')
			.selectAll('.view')
			.data(cities)
			.enter().append('g')
			.attr('class', 'view')

		onPath(view.append('path'))
    }
}




