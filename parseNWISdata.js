const request = require('request');
const fs = require('fs');
const moment = require('moment');

var qwDataURL = 'https://nwis.waterdata.usgs.gov/ny/nwis/qwdata?county_cd=36059&site_tp_cd=GW&multiple_parameter_cds=00940,72019,52683,70290,91001,99117,99220&param_cd_operator=OR&group_key=NONE&sitefile_output_format=html_table&column_name=agency_cd&column_name=site_no&column_name=station_nm&inventory_output=0&rdb_inventory_output=value&TZoutput=0&pm_cd_compare=Greater%20than&radio_parm_cds=previous_parm_cds&qw_attributes=0&format=rdb&qw_sample_wide=wide&rdb_qw_attributes=0&date_format=YYYY-MM-DD&rdb_compression=value&list_of_search_criteria=county_cd%2Csite_tp_cd%2Cmultiple_parameter_cds';

var sitefileDataURL = 'https://nwis.waterdata.usgs.gov/ny/nwis/qwdata?county_cd=36059&site_tp_cd=GW&multiple_parameter_cds=00940,72019,52683,70290,91001,99117,99220&param_cd_operator=OR&group_key=NONE&format=sitefile_output&sitefile_output_format=rdb&column_name=agency_cd&column_name=site_no&column_name=station_nm&column_name=nat_aqfr_cd&column_name=aqfr_cd&column_name=aqfr_type_cd&column_name=well_depth_va&column_name=site_tp_cd&column_name=dec_lat_va&column_name=dec_long_va&column_name=agency_use_cd&inventory_output=0&rdb_inventory_output=value&TZoutput=0&pm_cd_compare=Greater%20than&radio_parm_cds=previous_parm_cds&qw_attributes=0&qw_sample_wide=wide&rdb_qw_attributes=0&date_format=YYYY-MM-DD&rdb_compression=value&list_of_search_criteria=county_cd%2Csite_tp_cd%2Cmultiple_parameter_cds';

(function () {
    var siteFileData;
    var qwData;

    var geoJSON = {
      'type': 'FeatureCollection',
      'features': []
    };

    request(sitefileDataURL, (err, res, siteFileBody) => {
      if (err) { return console.log(err); }
      //console.log(siteFileBody)
      siteFileData = parseRDB(siteFileBody);

      request(qwDataURL, (err, res, qwBody) => {
        if (err) { return console.log(err); }
        //console.log(qwBody)
        qwData = parseRDB(qwBody);

        var aqList = {} ;

        for (var i = 0; i < siteFileData.length; i++) { 

          var feature = {
            'type': 'Feature',
            'geometry': {
              'type': 'Point',
              'coordinates': [parseFloat(siteFileData[i].dec_long_va), parseFloat(siteFileData[i].dec_lat_va)]
            },
            'properties': {}
          };

          for (var key in siteFileData[i]) { 
            feature.properties[key] = siteFileData[i][key];

            //do aquifer grouping
            if (key === 'aqfr_cd') {

              //log codes and counts; if we dont have it yet add it with value of 1
              if (!(siteFileData[i][key] in aqList)) aqList[siteFileData[i][key]] = 1;
              //otherwise increment
              else aqList[siteFileData[i][key]] = aqList[siteFileData[i][key]] +=1;

              if (siteFileData[i][key] === '112NTSR' || siteFileData[i][key] === '112PGQF' || siteFileData[i][key] === '211LLYD') {
                feature.properties.aqGroup = 'group1';
              }
              else if (siteFileData[i][key] === '211MAGT' || siteFileData[i][key] === '112JMCO') {
                feature.properties.aqGroup = 'group2';
              }
            }
          }

          //loop over QW measurements
          for (var j = 0; j < qwData.length; j++) { 
            //check for site number match
            if (siteFileData[i].site_no === qwData[j].site_no) {
                
              //chloride value is one or the other of these params
              var chlorideVal;
              if (qwData[j]['p00940'].length > 0) chlorideVal = parseFloat(qwData[j]['p00940']);
              if (qwData[j]['p99117'].length > 0) chlorideVal = parseFloat(qwData[j]['p99117']);

              //make sure there is a value for chloride
              if (chlorideVal)  {

                //need to bin measurements by decade
                var fromNow = moment(qwData[j].sample_dt).fromNow();
                //console.log(qwData[j].site_no, '| Measurement date:', qwData[j].sample_dt, '|', fromNow, '| chloride (mg/l):', chlorideVal);

                if (fromNow.indexOf('years ago') !== -1) {
                  var years = parseInt(fromNow.split(' years ago')[0]);

                  //console.log('checking measurement date:', qwData[j].sample_dt, '|', years);
                  if (years < 10) {
                    console.log(qwData[j].site_no, '| Measurement date:', qwData[j].sample_dt, '|', fromNow, '| chloride (mg/l):', chlorideVal);
    
                    //if value already exists, compare and take larger
                    if (feature.properties.chloride10yearMax && chlorideVal > feature.properties.chloride10yearMax ) feature.properties.chloride10yearMax = chlorideVal;
                    //otherwise just write it out
                    else feature.properties.chloride10yearMax = chlorideVal;
                  }
                  if (years >= 10 && years < 20) {
                    if (feature.properties.chloride20yearMax && chlorideVal > feature.properties.chloride20yearMax ) feature.properties.chloride20yearMax = chlorideVal;
                    else feature.properties.chloride20yearMax = chlorideVal;
                  }
                  if (years >= 20 && years < 30) {
                    if (feature.properties.chloride30yearMax && chlorideVal > feature.properties.chloride30yearMax ) feature.properties.chloride30yearMax = chlorideVal;
                    else feature.properties.chloride30yearMax = chlorideVal;
                  }
                  if (years >= 30 && years < 40) {
                    if (feature.properties.chloride40yearMax && chlorideVal > feature.properties.chloride40yearMax ) feature.properties.chloride40yearMax = chlorideVal;
                    else feature.properties.chloride40yearMax = chlorideVal;
                  }
                  if (years >= 40 && years < 50) {
                    if (feature.properties.chloride50yearMax && chlorideVal > feature.properties.chloride50yearMax ) feature.properties.chloride50yearMax = chlorideVal;
                    else feature.properties.chloride50yearMax = chlorideVal;
                  }
                  if (years >= 50 && years < 60) {
                    if (feature.properties.chloride60yearMax && chlorideVal > feature.properties.chloride60yearMax ) feature.properties.chloride60yearMax = chlorideVal;
                    else feature.properties.chloride60yearMax = chlorideVal;
                  }
                  if (years >= 60 && years < 70) {
                    if (feature.properties.chloride70yearMax && chlorideVal > feature.properties.chloride70yearMax ) feature.properties.chloride70yearMax = chlorideVal;
                    else feature.properties.chloride70yearMax = chlorideVal;
                  }
                  if (years >= 70 && years < 80) {
                    if (feature.properties.chloride80yearMax && chlorideVal > feature.properties.chloride80yearMax ) feature.properties.chloride80yearMax = chlorideVal;
                    else feature.properties.chloride80yearMax = chlorideVal;
                  }
                  if (years >= 80 && years < 90) {
                    if (feature.properties.chloride90yearMax && chlorideVal > feature.properties.chloride90yearMax ) feature.properties.chloride90yearMax = chlorideVal;
                    else feature.properties.chloride90yearMax = chlorideVal;
                  }

                }
                //otherwise assume <10 year bin
                else {
                  //console.log('OTHER:', qwData[j].sample_dt, '|', fromNow);

                  if (feature.properties.chloride10yearMax && chlorideVal > feature.properties.chloride10yearMax ) feature.properties.chloride10yearMax = chlorideVal;
                  else feature.properties.chloride10yearMax = chlorideVal;
                }
              }
            }
          }

          //if (JSON.stringify(feature.properties) !== '{}') console.log(feature.properties.site_no, feature.properties)

          //only write out if its been assigned an aqGroup
          if (feature.properties.aqGroup) geoJSON.features.push(feature);
        }

        //console.log(aqList)

        fs.writeFileSync('NWISdata.json', JSON.stringify(geoJSON));
      });
    });
})();


function parseRDB(data) {

    var comments = true;
    var definitions = true;
    data = data.split(/\r?\n/);
    var results = [];
    var headers;
    for (var i = 0; i < data.length; i++) {
  
      //make sure there is something on the line
      if (data[i].length > 0) {
  
        //skip comment rows
        if (data[i].charAt(0) === '#') {
          continue;
        }
        //next row is column headings
        else if (comments && data[i].charAt(0) !== '#') {
          comments = false;
          var RDBheaders = data[i].split('\t');
          headers = [];
  
          //look up better header
          RDBheaders.forEach(function (item, index) {
            headers.push(item);
          });
        }
        //next row are unneeded data definitions
        else if (!comments && definitions) {
          definitions = false;
        }
        //finally we are at the data rows
        else if (!comments && !definitions) {
          var row = data[i].split('\t');
  
          var obj = {};
          headers.forEach(function (item, i) {
            obj[item] = row[i];
          });
          results.push(obj);
        }
      }
    }
    return results;
  }