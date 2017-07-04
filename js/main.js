/**
 * Created by khuen on 03-Jul-17.
 */

/** This file contains essential functionality of the composition viewer **/

// Select the annotated page content template
var page_content = jQuery("#content-template").html();
// Compile the template to process annotations
var template = Handlebars.compile(page_content);

/** Declare necessary API information **/
var station_url = 'https://rata.digitraffic.fi/api/v1/metadata/stations';
var train_url = 'https://rata.digitraffic.fi/api/v1/live-trains';
var compositions_url = 'https://rata.digitraffic.fi/api/v1/compositions/';

// Get station parameter
var urlParams = new URLSearchParams(window.location.search);
var requestedStation = urlParams.get("station");

/**
 * Request composition data for each train
 * @param train_data
 * @param callback
 */
function requestCompositionData(train_data, callback) {
    var results = [];
    var requests = [];
    jQuery.each(train_data, function (idx, train) {
        results.push({
            train_id: train.trainType + train.trainNumber,
            running: train.runningCurrently,
            cancelled: train.cancelled,
            panel_type: 'panel-info'
        });
        requests.push(jQuery.ajax({
            url: compositions_url + train.trainNumber,
            data: {departure_date: train.departureDate},
            fail: function (error) {
                console.log(error);
            }
        }));
    });

    jQuery.when.apply(jQuery, requests).then(function () {
        jQuery.each(arguments, function (idx, res_obj) {
            var journey = res_obj[0].journeySections;
            if (typeof(journey) === 'object') {
                results[idx].route = journey[0].beginTimeTableRow.stationShortCode + '-' + journey['0'].endTimeTableRow.stationShortCode;
                results[idx].departure = journey[0].beginTimeTableRow.stationShortCode;
                results[idx].arrival = journey['0'].endTimeTableRow.stationShortCode;
                results[idx].train_cat = res_obj[0].trainCategory;
                results[idx].locomotive = journey[0].locomotives[0].locomotiveType;
                results[idx].power_type = journey[0].locomotives[0].powerType;
                results[idx].wagons = journey[0].wagons;
                results[idx].max_speed = journey[0].maximumSpeed;
                results[idx].departure_date = res_obj[0].departureDate;
            } else {
                if(typeof(results[idx].cancelled) !== undefined && results[idx].cancelled) {
                    results[idx].message = 'This train has been cancelled!';
                    results[idx].panel_type = 'panel-default';
                } else {
                    results[idx].message = 'Composition for this train is currently unavailable!';
                    results[idx].panel_type = 'panel-warning';
                }
            }
        });
        callback(results);
    });
}

/**
 * Request train data from the provided API
 * @param station
 * @param callback
 * @returns {Array}
 */
function requestTrainData(station, callback) {
    // Assign default station if station parameter is undefined
    if (typeof(station) === 'undefined' || station === null) {
        location.href = '?station=HKI';
    }

    jQuery.ajax({
        url: train_url,
        data: {station: station},
        success: function (train_data) {
            requestCompositionData(train_data, callback);
        },
        fail: function (error) {
            console.log(error)
        }
    });
}

/**
 * Render the page content
 * @param train_info
 */
function renderPage(train_info) {
    // Get list of stations
    jQuery.when(jQuery.ajax({
        url: station_url
    })).then(function(stations) {
        // Define data that is used in the page
        var data = {
            header_title: "Train Composition Viewer",
            train_compositions: train_info,
            stations: stations,
            copyright_year: new Date().getFullYear()
        };
        jQuery('#wrapper').append(template(data));
        jQuery('#stations').val(requestedStation);
        jQuery('.running').marquee();
    });
}

/**
 * Helper function to stringify the wagons
 */
Handlebars.registerHelper('listWagonTypes', function (wagons) {
    var wagonTypes = '';
    var totalLengths = 0;
    var counter = 0;
    console.log(wagons);
    jQuery.each(wagons, function (idx, wagon) {
        counter++;
        wagonTypes += typeof(wagon.wagonType) !== 'undefined' ? wagon.wagonType : '';
        if (typeof(wagon.wagonType) !== 'undefined' && counter < wagons.length) {
            wagonTypes += ', ';
        }
        totalLengths += wagon.length / 100;
    });
    return wagonTypes + ' (' + Math.round(totalLengths) + ' meters)';
});

/**
 * Change current station
 * @param element
 */
function changeStation(element) {
    location.href = '?station=' + jQuery(element).val();
}

/**
 * Request train data from the API
 */
requestTrainData(requestedStation, renderPage);
