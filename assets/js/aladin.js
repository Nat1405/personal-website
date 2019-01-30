
function othername() {
    var input = document.getElementById("userInput").value;
    alert(input);
}

// Get siderealtime
var timezone = -4;
var longitude = -123.36;
var milli_of_J2000 = 946727935000; // milliseconds from epoch to jan 1st 2000 12:00pm UTC
var milliseconds_in_day = 86400000;
var days_since_epoch = (Date.now() - milli_of_J2000) / milliseconds_in_day;
var GMST = 6.697374558 + 0.06570982441908*days_since_epoch; // GMST in hours; formula taken from https://aa.usno.navy.mil/faq/docs/GAST.php
GMST = GMST % 24;
GMST = GMST*360/24; // Convert hours to degrees
GMST = GMST + longitude;// + (timezone*360/24)// Add longitude and time zone (converted to degrees) past UTC midnight
var d = new Date();
var n = d.getUTCHours();
GMST = GMST + (n*360/24); // Add current time since midnight
//alert(GMST);

var myArray = [];
$.getJSON('/assets/json/safezone.json', function(jd) {
  $.each(jd.safeZone, function(i, obj) {
    jd.safeZone[i][0]+=GMST;
    jd.safeZone[i][0]= jd.safeZone[i][0] % 360;
    /*if (jd.safeZone[i][0] < 0) {
      jd.safeZone[i][0] = 365 - jd.safeZone[i][0];
    }*/
    myArray.push(jd.safeZone[i]);
  });
});
var aladin = A.aladin('#aladin-lite-div', {target: GMST+" +55", fov: 150});
aladin.addCatalog(A.catalogFromVizieR('VII/118', GMST+" +55", 100, {onClick: 'showTable'}));

var overlay = A.graphicOverlay({color: '#ee2345', lineWidth: 3});
aladin.addOverlay(overlay);
overlay.addFootprints([A.polygon(myArray)]);
//overlay.add(A.polyline(myArray));

/*var cat = A.catalog({name: 'Some markers', sourceSize: 18});
//A.addCatalog(cat);
for(var i=0;i++;i<myArray.length){
  cat.addSources([A.marker(myArray[i][0],myArray[i][1])]);
}*/

//overlay.add(A.circle(Number(siderealtime), 55.0, 45, {color: 'cyan'})); // radius in degrees
