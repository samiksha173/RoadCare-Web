// Default location: Sambhajinagar
let map = L.map("map").setView(
    [19.8762, 75.3433],
    13
);

// OpenStreetMap
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// Current location marker
let userMarker = null;


// Find user's current location
function findMyLocation() {

    if (!navigator.geolocation) {
        alert("Location is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(position) {

            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;

            console.log("Latitude:", latitude);
            console.log("Longitude:", longitude);

            map.setView(
                [latitude, longitude],
                16
            );

            // Remove previous marker
            if (userMarker !== null) {
                map.removeLayer(userMarker);
            }

            // Add new marker
            userMarker = L.marker([
                latitude,
                longitude
            ]).addTo(map);

            userMarker.bindPopup(
                "<b>You are here</b><br>" +
                "Latitude: " + latitude.toFixed(5) +
                "<br>Longitude: " + longitude.toFixed(5)
            ).openPopup();

        },

        function(error) {

            if (error.code === 1) {
                alert("Please allow location permission.");
            }

            else if (error.code === 2) {
                alert("Location unavailable.");
            }

            else if (error.code === 3) {
                alert("Location request timed out.");
            }

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


// Find nearby police stations
function findPoliceStations() {

    if (!navigator.geolocation) {
        alert("Location not supported.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {

            let lat = position.coords.latitude;
            let lon = position.coords.longitude;

            // Open Google Maps nearby search
            let url =
                "https://www.google.com/maps/search/police+station/@"
                + lat + "," + lon + ",14z";

            window.open(url, "_blank");
        },

        function() {
            alert("Unable to get your location.");
        }
    );
}


// Find nearby hospitals
function findHospitals() {

    if (!navigator.geolocation) {
        alert("Location not supported.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {

            let lat = position.coords.latitude;
            let lon = position.coords.longitude;

            let url =
                "https://www.google.com/maps/search/hospital/@"
                + lat + "," + lon + ",14z";

            window.open(url, "_blank");
        },

        function() {
            alert("Unable to get your location.");
        }
    );
}


// Back button
function goBack() {
    window.history.back();
}