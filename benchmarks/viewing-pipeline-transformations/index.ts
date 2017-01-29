declare const require: Function
const d3request = require('d3-request')
const d3shape = require('d3-shape')
const d3selection = require('d3-selection')
import measureFPS = require('../../measure')
import draw = require('./draw')
import drawModelCS = require('./drawModelCS')

const startDate = new Date()
d3request
	.csv('ny-vs-sf.csv')
	.row((d: any) => [
		parseFloat(d.NY.split(';')[0]),
		parseFloat(d.SF.split(';')[0])
	])
	.get((error: any, data: any[]) => {
		if (error != null)
		{
			alert('Data can\'t be downloaded or parsed')
			return
		}

		const onPath = (path: any) => {
			 path.attr('d', (cityIdx: number) =>
				d3shape.line()
                     .defined((d: number[]) => d[cityIdx])
                     .x((d: number[], i: number) => i)
					.y((d: number[]) => d[cityIdx])
					.call(null, data)
			)
		}

        const onPathModel = (path: any) => {
            path.attr('d', (cityIdx: number) =>
                d3shape.line()
                    .defined((d: number[]) => d[cityIdx])
                    .x((d: number[], i: number) => calcDate(i, startDate, 86400000))
                    .y((d: number[]) => d[cityIdx])
                    .call(null, data)
            )
        }

        d3selection.selectAll('svg#default').select(function () {
            new draw.TimeSeriesChart(d3selection.select(this), 0, 1, [0, 1], onPath, data.length)
		})
        d3selection.selectAll('svg#model').select(function () {
            new drawModelCS.TimeSeriesChartModelCS(d3selection.select(this), startDate, 86400000, [0, 1], onPathModel, data.length)
        })
    })

function calcDate(index: number, offset: Date, step: number) {
    const d = new Date(index * step + offset.getTime()).getTime()
    return d
}



