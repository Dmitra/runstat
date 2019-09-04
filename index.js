import d3 from 'd3'
import _ from 'lodash'
import './index.css'

var TimeLib = require('plusjs/src/time/Time')
var Radial = require('plusjs/src/layout/Radial')
var rayDraw = require('plusjs/src/svg/radial/ray')
var circleDraw = require('plusjs/src/svg/circle')
var arcDraw = require('plusjs/src/svg/radial/arc')
var radialLabel = require('plusjs/src/svg/radial/label')

var width = 800, height = 800;
var container = d3.select('#chart>svg')
            .attr('width', width)
            .attr('height', height)

//Data
d3.csv('data/runstat.csv', function (data) {
  var start = new Date(data[0].date)
  var end = new Date(_.last(data).date);

  //Config
  //---------------------------------------------------------------------------------
  var config = {
    target: container,
    rotate: 0,
    size: [width, height],
  }
  var configDistance = _.extend({}, config, {
    name: 'DISTANCE',
    position: function (d) { return TimeLib.daysPassed(start, new Date(d.date)) },
    positionRange: [0, 365],
    value: function (d) { return +d.distance },
    domain: [0, 20], //km
    range: [240, 500], //px
    dashed: 0.9, //'10,5',
  })
  var configPace = _.extend({}, config, {
    name: 'PACE',
    position: function (d) { return TimeLib.daysPassed(start, new Date(d.date)) },
    positionRange: [0, 365],
    value: function (d) {
      //baseRadius + (run velocity - baseLine) * factor
      return d.distance / TimeLib.decimalMinutes(d.time)
    },
    domain: [0.142, 0.2], //km/min
    range: [230, 206], //pixels from center
  })
  var config30MinDistance = _.extend({}, config, {
    name: 'MIN_MARK_30',
    position: function (d) {
      return TimeLib.daysPassed(start, new Date(d.date))
    },
    range: [0,365],
    radius: function (d) {
      return 240 + d.distance/TimeLib.decimalMinutes(d.time) * 30 * 14
    },
  })
  var config30MinDistanceCircle = _.extend({}, config30MinDistance, {
    size: 3,
  })
  var configMonthLabel = _.extend({}, config, {
    name: 'Months',
    coordinateSystem: 'polar',
    position: function (d) { return d.position },
    range: undefined,
    rotate: 6,
    radius: 160,
  })
  var configLabel = _.extend({}, config, {
    name: 'Labels',
    coordinateSystem: 'polar',
    range: [0,365],
    position: function (d) { return d.position },
    radius: function (d) { return d.radius },
  })

  //Prepare data
  //---------------------------------------------------------------------------------
  var dates = data.map(function(d) {
    return d3.time.format('%d %b %Y').parse(d.date);
  });
  var t = d3.time.scale()
      .domain(d3.extent(dates))
  var ticks = t.ticks(d3.time.months, 1)
  var monthLabels = [];
  ticks.forEach(function (d, i) {
    monthLabels.push({ position: i*2, label: d3.time.format('%b %y')(d) })
    monthLabels.push({ position: i*2+1, label: '   |' })
  })
  var labels = [
    {
      position: 104,
      radius: 340,
      label: 'INJURY\n LVIV',
    },
    {
      position: 231,
      radius: 400,
      label: 'HALFMARATHON 21.1 KM\n 01:38:35\n PARIS FRANCE',
    },
  ]

  // Create charts
  //---------------------------------------------------------------------------------
  rayDraw(configDistance, data)
  rayDraw(configPace, data)
  Radial(config30MinDistance)(data)
  circleDraw(config30MinDistanceCircle, data)
  ////Draw months names on the circumference of specified radius according to the date
  radialLabel(configMonthLabel, monthLabels)
  radialLabel(configLabel, labels)
  //container.append('circle')
    //.attr('cx', 400)
    //.attr('cy', 400)
    //.attr('r', 240)
    //.attr('class', 'belt')

  //Load second set of data
  //---------------------------------------------------------------------------------
  d3.csv('data/weather.csv', function (_data) {
    var weatherTimeFormatter = d3.time.format('%d/%m/%Y')
    //Color settings
    var tempRange = d3.extent(_data.map(function (d) { return +d.tave }))
    var weatherTempPainter = d3.scale.linear()
      .domain([tempRange[0], 0, tempRange[1]])
      .range([d3.rgb(117, 179, 216), '#ffffff',  d3.rgb(244, 153, 21)])
    var configWeather = _.extend({}, config, {
      name: 'Weather',
      coordinateSystem: 'polar',
      position: function (d) {
        return TimeLib.daysPassed(start, weatherTimeFormatter.parse(d.date))
      },
      innerRadius: 100,
      radius: 40,
      color: function (d) { return weatherTempPainter(+d.tave) },
    })

    arcDraw(configWeather, _data)
  })

  interactive()
})

function interactive () {
  function showLegend(d) {
    document.querySelector('#legend>#distance').innerHTML = d.distance + ' km'
    document.querySelector('#legend>#pace').innerHTML = (TimeLib.decimalMinutes(d.time) / d.distance).toFixed(2) + ' min/km'
    document.querySelector('#legend>#date').innerHTML = d.date
  }
  document.querySelector('.barGroup.DISTANCE ').addEventListener('mouseover', function (e) {
    showLegend(e.target.__data__)
  })
  document.querySelector('.barGroup.PACE').addEventListener('mouseover', function (e) {
    showLegend(e.target.__data__)
  })
}
