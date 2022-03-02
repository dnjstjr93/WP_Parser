let fs = require('fs');
let tj = require('@mapbox/togeojson');
let DOMParser = require('xmldom').DOMParser;

// let wp_file = './Mission/test.txt';
// let wp_file = './Mission/test2.kml';
// let wp_file = './Mission/test2.plan';
// let wp_file = './Mission/test2.waypoints';
// let wp_file = './Mission/test3.waypoints';
// let wp_file = './Mission/test3.txt';
// let wp_file = './Mission/test4.waypoints';
let wp_file = './Mission/test3.kml';
// let wp_file = './Mission/test3.plan';

let wp_contents = null;
let waypoints = null;

let file_arr = wp_file.split('.');
let waypoints_arr = [];

if (file_arr[file_arr.length - 1] === 'waypoints' || file_arr[file_arr.length - 1] === 'txt') {
    try {
        wp_contents = fs.readFileSync(wp_file, 'utf8');
        // console.log(wp_contents);
    } catch (e) {
        console.log('can not find ' + wp_file + ' file');
    }

    waypoints = wp_contents.split('\r\n');
    let version = waypoints[0].split(' ');
    console.log('Waypoints File(.' + file_arr[file_arr.length - 1] + ') v' + version[2] + ' in Mission Planner');
    let home_position = waypoints[1].split('\t');
    let home_lat = home_position[8];
    let home_lon = home_position[9];
    let home_alt = home_position[10];
    console.log('Home Position -', home_lat + ', ' + home_lon + ', Altitude(AMSL) - ' + parseInt(home_alt) + 'm');

    let takeoff_position = waypoints[2].split('\t');
    let takeoff_alt = takeoff_position[10];
    console.log('TAKEOFF -', parseInt(takeoff_alt) + 'm');

    for (let idx = 3; idx < waypoints.length - 2; idx++) {
        // let wp_object = {};
        // wp_object.index = content_arr[0];
        // wp_object.current_wp = content_arr[1];
        // wp_object.coord_frame = content_arr[2];
        // wp_object.command = content_arr[3];
        // wp_object.param1 = content_arr[4];
        // wp_object.param2 = content_arr[5];
        // wp_object.param3 = content_arr[6];
        // wp_object.param4 = content_arr[7];
        // wp_object.lat = content_arr[8];
        // wp_object.lon = content_arr[9];
        // wp_object.alt = content_arr[10];
        // wp_object.autocontinue = content_arr[11];
        // waypoints_arr.push(wp_object);
        let content_arr = waypoints[idx].split('\t');
        let wp_string = parseFloat(content_arr[8]).toFixed(7) + ':' + parseFloat(content_arr[9]).toFixed(7) + ':' + parseInt(content_arr[10]) + ':5:50:10:' + content_arr[3] + ':' + content_arr[4] + ':' + content_arr[5];
        waypoints_arr.push(wp_string);
    }
    // RTL 판단
    let content_arr = waypoints[waypoints.length - 2].split('\t');
    if (parseFloat(content_arr[8]) !== 0.00000000 && parseFloat(content_arr[9]) !== 0.00000000) {
        let wp_string = parseFloat(content_arr[8]).toFixed(7) + ':' + parseFloat(content_arr[9]).toFixed(7) + ':' + parseInt(content_arr[10]) + ':5:50:10:' + content_arr[3] + ':' + content_arr[4] + ':' + content_arr[5];
        waypoints_arr.push(wp_string);
    }

    console.log('WayPoints -', waypoints_arr);
    fs.writeFileSync('WPforGCS.json', JSON.stringify(waypoints_arr, null, 4), 'utf8');
} else if (file_arr[file_arr.length - 1] === 'kml') {
    console.log('Waypoints File(KML) in QGroundControl');
    let kml = new DOMParser().parseFromString(fs.readFileSync(wp_file, 'utf8'));
    let converted = tj.kml(kml);
    let home_alt = 0;
    for (let idx in converted.features) {
        if (converted.features[idx].geometry.type === 'Point') {

            if (converted.features[idx].properties.name === '0 ') {
                let home_lat = converted.features[idx].geometry.coordinates[1];
                let home_lon = converted.features[idx].geometry.coordinates[0];
                home_alt = converted.features[idx].geometry.coordinates[2];
                console.log('Home Position -', home_lat + ', ' + home_lon + ', Altitude(AMSL) - ' + parseInt(home_alt) + 'm');
            } else if (converted.features[idx].properties.name.includes('Takeoff')) {
                let takeoff_alt = converted.features[idx].geometry.coordinates[2] - home_alt;
                console.log('TAKEOFF -', takeoff_alt.toFixed(0) + 'm');
            } else {
                let lat = converted.features[idx].geometry.coordinates[1];
                let lon = converted.features[idx].geometry.coordinates[0];
                let alt = converted.features[idx].geometry.coordinates[2];
                let content_arr = converted.features[idx].properties.description.split('\r\n');
                let relative_alt = content_arr[3].split(' ')[2];
                let wp_string = lat + ':' + lon + ':' + parseInt(relative_alt) + ':5:50:10:16:0.00000000:0.00000000'
                waypoints_arr.push(wp_string);
            }
        }
    }
    console.log('WayPoints -', waypoints_arr);
    fs.writeFileSync('kmlforGCS.json', JSON.stringify(waypoints_arr, null, 4), 'utf8');
} else if (file_arr[file_arr.length - 1] === 'plan') {
    console.log('Waypoints File(plan) in QGroundControl');
    try {
        wp_contents = JSON.parse(fs.readFileSync(wp_file, 'utf8'));
    } catch (e) {
        console.log('can not find ' + wp_file + ' file');
    }

    let home_position = wp_contents.mission.plannedHomePosition;
    let home_lat = parseFloat(home_position[0]).toFixed(7);
    let home_lon = parseFloat(home_position[1]).toFixed(7);
    let home_alt = parseFloat(home_position[2]).toFixed(7);
    console.log('Home Position -', home_lat + ', ' + home_lon + ', Altitude - ' + parseInt(home_alt) + 'm');

    for (let idx in wp_contents.mission.items) {
        if (wp_contents.mission.items[idx].hasOwnProperty('TransectStyleComplexItem')) {
            for (let item in wp_contents.mission.items[idx].TransectStyleComplexItem.Items) {
                if (wp_contents.mission.items[idx].TransectStyleComplexItem.Items[item].command === 16) {
                    let lat = wp_contents.mission.items[idx].TransectStyleComplexItem.Items[item].params[4];
                    let lon = wp_contents.mission.items[idx].TransectStyleComplexItem.Items[item].params[5];
                    let alt = wp_contents.mission.items[idx].TransectStyleComplexItem.Items[item].params[6];
                    let wp_string = parseFloat(lat).toFixed(7) + ':' + parseFloat(lon).toFixed(7) + ':' + parseInt(alt) + ':5:50:10:' + wp_contents.mission.items[idx].TransectStyleComplexItem.Items[item].command + ':0.00000000:0.00000000'
                    waypoints_arr.push(wp_string);
                }
            }
        }
    }
    console.log('WayPoints -', waypoints_arr);
    fs.writeFileSync('planforGCS.json', JSON.stringify(waypoints_arr, null, 4), 'utf8');
}