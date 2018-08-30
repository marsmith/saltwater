// ------------------------------------------------------------------------------
// ----- HRECOS -----------------------------------------------------------------
// ------------------------------------------------------------------------------

// copyright:   2018 Martyn Smith - USGS NY WSC

// authors:  Martyn J. Smith - USGS NY WSC

// purpose:  HABS Data Viewer

// updates:
// 08.07.2018 - MJS - Created

//CSS imports
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.css';
import 'leaflet/dist/leaflet.css';
import 'marker-creator/stylesheets/markers.css';
import 'select2/dist/css/select2.css';
import './styles/main.css';

//ES6 imports
import 'bootstrap/js/dist/util';
import 'bootstrap/js/dist/modal';
import 'bootstrap/js/dist/collapse';
import 'bootstrap/js/dist/tab';
import 'select2';
import moment from 'moment'
import Highcharts from 'highcharts';
import addExporting from "highcharts/modules/exporting";
addExporting(Highcharts)
import { map, control, tileLayer, featureGroup, geoJSON, Icon } from 'leaflet';
import { basemapLayer, dynamicMapLayer } from 'esri-leaflet';

//START user config variables
var MapX = '-73.62'; //set initial map longitude
var MapY = '40.73'; //set initial map latitude
var MapZoom = 10; //set initial map zoom
var sitesURL = './sitesGeoJSON.json';
//END user config variables 

//START global variables
var theMap;
var baseMapLayer, basemaplayerLabels;
var weatherLayer = {};
var sitesLayer;
var featureCollection;

//END global variables

//instantiate map
$(document).ready(function () {
  console.log('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);
  $('#appVersion').html('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);

  Icon.Default.imagePath = './images/';

  //create map
  theMap = map('mapDiv', { zoomControl: false, minZoom: 8, });

  //add zoom control with your options
  control.zoom({ position: 'topright' }).addTo(theMap);
  control.scale().addTo(theMap);

  //basemap
  baseMapLayer = tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  }).addTo(theMap);

  weatherLayer.NexRad = tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png', {opacity : 0.5 });
  weatherLayer.Precip = tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/q2-n1p-900913/{z}/{x}/{y}.png', {opacity : 0.5 });
  weatherLayer.PrecipForecast1hr = dynamicMapLayer({url: 'https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Forecasts_Guidance_Warnings/wpc_qpf/MapServer', layers: [7], opacity : 0.5 });
  weatherLayer.CloudCoverVisible = tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-vis-1km-900913/{z}/{x}/{y}.png', {opacity : 0.5 });
  weatherLayer.Drought = tileLayer.wms('http://ndmc-001.unl.edu:8080/cgi-bin/mapserv.exe?map=/ms4w/apps/usdm/service/usdm_current_wms.map', {layers : 'usdm_current', bboxSR: 102100, imageSR: 102100, format: 'image/png', transparent: true, f: 'image', nocache: Date.now(), opacity : 0.5});

  //set initial view
  theMap.setView([MapY, MapX], MapZoom);

  //define layers
  sitesLayer = featureGroup().addTo(theMap);

  loadSites();



  /*  START EVENT HANDLERS */
  $('.weatherBtn').click(function () {
    $(this).toggleClass('slick-btn-selection');
    var lyrID = this.id.replace('btn', '');
    setWeatherLayer(lyrID);
  });

  $('.basemapBtn').click(function () {
    $('.basemapBtn').removeClass('slick-btn-selection');
    $(this).addClass('slick-btn-selection');
    var baseMap = this.id.replace('btn', '');
    setBasemap(baseMap);
  });

  $('#mobile-main-menu').click(function () {
    $('body').toggleClass('isOpenMenu');
  });

  $('#resetView').click(function () {
    resetView();
  });

  $('#aboutButton').click(function () {
    $('#aboutModal').modal('show');
  });

  $('#showGraph').click(function () {
    getData();
  });

  $('#downloadData').click(function () {
    downloadData();
  });

  sitesLayer.on('click', function (e) {
    console.log('site clicked')
    //openPopup(e);
    //$('#stationSelect').select2('val', id);
    //$('#graphModal').modal('show');
  });

  $('input[type=radio]').change( function() {
   filterSites($(this).val())
 });

  /*  END EVENT HANDLERS */

});

String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g, '');
}


function openGraphingModule() {
  $('#graphModal').modal('show');
}

function downloadData() {
  
  if (seriesData) {
    $(seriesData).each(function (i, data) {
      
      if (data) {
  
        // start CSV file
        var csvData = [];
        csvData.push('Site Name,"' + data.siteName + '"');
        csvData.push('Site ID,"' + data.siteID + '"');
        csvData.push('Description,"' + data.variableDescription + '"');
        csvData.push('');

        csvData.push('Time,Value');

        $(data.values).each(function (i, value) {
            csvData.push(value.dateTime + ',' + value.value);
        });
    
        //console.log(csvData);
        
        csvData = csvData.join('\n');
    
        var filename = data.siteCode.replace(':','_') + '.csv';
        downloadFile(csvData,filename);
      }
    
      else {
        alert('No data to export');
      }
    });

  }
  else {
    alert('No data to export');
  }

}

function downloadFile(data,filename) {
	var blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, filename);
	} else {
		var link = document.createElement('a');
		var url = URL.createObjectURL(blob);
		if (link.download !== undefined) { // feature detection
			// Browsers that support HTML5 download attribute
			link.setAttribute('href', url);
			link.setAttribute('download', filename);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
		else {
			window.open(url);
		}
	}
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function showGraph(startTime,seriesData) {
  console.log('seriesData',startTime,seriesData);

  //clear out graphContainer
  $('#graphContainer').html('');

  //if there is some data, show the div
  $('#graphModal').modal('show');

	Highcharts.setOptions({
		global: { useUTC: false },
		lang: { thousandsSep: ','}
  });
  
  //chart init object
  var chartSetup = {
		chart: {
			type: 'line',
			spacingTop: 20,
			spacingLeft: 0,
			spacingBottom: 0,
    },
    plotOptions: {
      series: {
        pointStart: startTime,
        pointInterval: 900000 //15 minutes
      }
    },
		title:{
			text:''
		},
		credits: {
			enabled: false
    },
    tooltip: {
      shared: true
    },
		xAxis: {
			type: "datetime",
			labels: {
				formatter: function () {
					return Highcharts.dateFormat('%m/%d %H%P', this.value);
				},
				//rotation: 90,
				align: 'center',
				tickInterval: 172800 * 1000
			}
    },
		yAxis: [],
		series: []
  };


  //loop over series data so we can match up the axis and series indexes
  $(seriesData).each(function (i, obj) {
    var yaxis =   {
      title: { 
        text: obj.unit,
        style: {
          color: obj.color
        }
      },
      labels: {
        style: {
            color: obj.color
        }
      },
      //put odd items on opposite axis
      opposite: isOdd(i)
    };


    //need another loop to check if this series unit aleady has yaxis
    //NOT WORKING RIGHT

    //LOOP OVER ALLDATA TO GET MAX AND MIN TO SET YAXIS
    // https://www.highcharts.com/demo/combo-regression

    var exists = false;
    $(chartSetup.yAxis).each(function (i, data) { 
      if (data.title.text == obj.unit) exists = true;
    });

    if (!exists) { 
      obj.yAxis = i;
      chartSetup.yAxis.push(yaxis);
    }

    // obj.yAxis = i;
    // chartSetup.yAxis.push(yaxis);
    //console.log('here',obj)
    
    chartSetup.series.push(obj);
    
  });

	var chart = Highcharts.chart('graphContainer', chartSetup);
  
  // update colors
  // https://www.highcharts.com/demo/combo-multi-axes
  // https://stackoverflow.com/questions/12419758/changing-series-color-in-highcharts-dynamically
  // https://stackoverflow.com/questions/17837340/highcharts-dynamically-change-axis-title-color

  $('#graph-loading').hide();

}

function addToLegend(properties, classString) {

  $("#legend > tbody").append('<tr class="site"><td><div><icon class="siteIcon ' + classString + '" /></div></td><td class="siteData" data-sitename="' + properties.station_nm +'" data-id="' + properties.site_id + '" data-siteid="' + properties.site_id + '" ><span class="siteName">' + properties.station_nm + '</span><span class="ml-2 badge badge-success">Get Data</span></td></tr>');

  $('#legend .siteIcon').attr('style', 'margin-top: -6px !important; margin-left: 3px !important');

}

function filterSites(decade) {

  sitesLayer.clearLayers();

  var selector = 'chloride' + decade + 'yearMax';

  var geoJSONlayer = geoJSON(featureCollection, {
    pointToLayer: function (feature, latlng) {

      if (feature.properties[selector]) {

        //considtional classString
        var classString = 'wmm-pin wmm-mutedblue wmm-icon-circle wmm-icon-white wmm-size-25';
        if (feature.properties[selector] < 5) classString = 'wmm-pin wmm-orange wmm-icon-circle wmm-icon-white wmm-size-25';
        if (feature.properties[selector]>= 5 && feature.properties[selector]< 10) classString = 'wmm-pin wmm-purple wmm-icon-circle wmm-icon-white wmm-size-25';
        if (feature.properties[selector] > 10 && feature.properties[selector] < 50) classString = 'wmm-pin wmm-altblue wmm-icon-circle wmm-icon-white wmm-size-25';
  
        addToLegend(feature.properties, classString);
  
        var icon = L.divIcon({ className: classString });
        return L.marker(latlng, { icon: icon });
      }

    },
    onEachFeature: function(feature, layer) {
      var popupContent = '<a href="https://waterdata.usgs.gov/nwis/uv/?site_no=' + feature.properties.site_no + '" target="_blank">' + feature.properties.site_no + ' ' + feature.properties.station_nm + '</a><br>';

      popupContent += '<b>Chloride (mg/l) past ' + decade + ' year max: </b>' + feature.properties[selector] + '<br>';


      layer.bindPopup(popupContent);
    }
  });

  sitesLayer.addLayer(geoJSONlayer);
}

function loadSites() {

  $.ajax({
    url: sitesURL,
    dataType: 'json',
    success: function (data) {

      $('#loading').hide();
      console.log('data',data)

      featureCollection = data;

      filterSites('10');
    }
  });
}

function setWeatherLayer(layer) {

  var layerName = weatherLayer[layer];
  
  //first check if weve added this already
  if(theMap.hasLayer(layerName)) theMap.removeLayer(layerName)
  else theMap.addLayer(layerName);
}

function setBasemap(baseMap) {

  switch (baseMap) {
    case 'Streets': baseMap = 'Streets'; break;
    case 'Satellite': baseMap = 'Imagery'; break;
    case 'Clarity': baseMap = 'ImageryClarity'; break;
    case 'Topo': baseMap = 'Topographic'; break;
    case 'Terrain': baseMap = 'Terrain'; break;
    case 'Gray': baseMap = 'Gray'; break;
    case 'DarkGray': baseMap = 'DarkGray'; break;
    case 'NatGeo': baseMap = 'NationalGeographic'; break;
  }

  if (baseMapLayer) theMap.removeLayer(baseMapLayer);
  baseMapLayer = basemapLayer(baseMap);
  theMap.addLayer(baseMapLayer);
  if (basemaplayerLabels) theMap.removeLayer(basemaplayerLabels);
  if (baseMap === 'Gray' || baseMap === 'DarkGray' || baseMap === 'Imagery' || baseMap === 'Terrain') {
    basemaplayerLabels = basemapLayer(baseMap + 'Labels');
    theMap.addLayer(basemaplayerLabels);
  }
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
    return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, '');
}

function isOdd(n) {
  return !!(n % 2);
}