// =========================================
// HOME PAGE - LIVE MAP TEASER
//
// - Shows the SAME Google Map as map.html
// - Clicking the card / map opens map.html
// - Live counters from the saved reports
// - Quick service search (hospital, police...)
// - "Find issues near me" button
// =========================================

(function () {

    "use strict";


    // =========================================
    // SETTINGS
    // =========================================

    // Page that opens when the user clicks the teaser
    const MAP_PAGE = "map.html";

    // Same storage key that reports.js uses
    const REPORTS_KEY = "roadcare_reports";

    // Radius used for "within 5 km"
    const NEAR_RADIUS_KM = 5;

    // Same default location as map.html
    const DEFAULT_LOCATION = {
        lat: 19.876118020949388,
        lng: 75.33674705282539
    };


    // =========================================
    // ELEMENTS
    // =========================================

    const teaser = document.getElementById("map-teaser");

    if (!teaser) return;


    // =========================================
    // CLICK ANYWHERE ON THE CARD -> MAP PAGE
    // (links and buttons keep their own behaviour)
    // =========================================

    teaser.addEventListener("click", function (event) {

        if (event.target.closest("a, button")) return;

        window.location.href = MAP_PAGE;
    });


    const googleMap = document.getElementById("home-googleMap");
    const totalEl = document.getElementById("mt-total");
    const highEl = document.getElementById("mt-high");
    const nearEl = document.getElementById("mt-near");
    const nearBtn = document.getElementById("mt-near-btn");
    const nearResult = document.getElementById("mt-near-result");
    const emptyEl = document.getElementById("mt-empty");
    const captionEl = document.getElementById("mt-caption");
    const chips = teaser.querySelectorAll(".map-chip");

    let userLocation = null;


    // =========================================
    // READ SAVED REPORTS (same data as reports.js)
    // =========================================

    function getReports() {

        try {

            const data = JSON.parse(localStorage.getItem(REPORTS_KEY));

            return Array.isArray(data) ? data : [];

        } catch (e) {

            return [];
        }
    }


    function reportCoords(report) {

        if (!report || !report.coords) return null;

        const lat = parseFloat(report.coords.lat);
        const lng = parseFloat(report.coords.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return { lat: lat, lng: lng };
    }


    // =========================================
    // DISTANCE (km)
    // =========================================

    function distanceKm(lat1, lng1, lat2, lng2) {

        const R = 6371;
        const toRad = function (d) { return d * Math.PI / 180; };

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }


    function countNear(reports) {

        if (!userLocation) return null;

        return reports.filter(function (r) {

            const c = reportCoords(r);

            return c && distanceKm(userLocation.lat, userLocation.lng, c.lat, c.lng) <= NEAR_RADIUS_KM;

        }).length;
    }


    // =========================================
    // COUNTER ANIMATION
    // =========================================

    function setNumber(el, target) {

        if (!el) return;

        const start = parseInt(el.textContent, 10) || 0;
        const begin = performance.now();
        const duration = 600;

        function step(now) {

            const p = Math.min((now - begin) / duration, 1);

            el.textContent = Math.round(start + (target - start) * p);

            if (p < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }


    // =========================================
    // UPDATE COUNTERS
    // =========================================

    function updateStats() {

        const reports = getReports();

        const high = reports.filter(function (r) {
            return String(r.severity || "").toLowerCase() === "high";
        }).length;

        setNumber(totalEl, reports.length);
        setNumber(highEl, high);

        const near = countNear(reports);

        if (near === null) {
            nearEl.textContent = "--";
        } else {
            setNumber(nearEl, near);
        }

        if (emptyEl) emptyEl.hidden = reports.length > 0;

        return { reports: reports, near: near };
    }


    // =========================================
    // MAP HELPERS (same URLs as map.html)
    // =========================================

    function setCaption(text) {

        if (captionEl) captionEl.textContent = text;
    }


    function showLocationOnMap(lat, lng) {

        googleMap.src =
            "https://www.google.com/maps" +
            "?q=" + lat + "," + lng +
            "&z=15" +
            "&output=embed";
    }


    function searchNearby(type, label) {

        const base = userLocation || DEFAULT_LOCATION;

        const query = type + " near " + base.lat + "," + base.lng;

        googleMap.src =
            "https://www.google.com/maps" +
            "?q=" + encodeURIComponent(query) +
            "&ll=" + base.lat + "," + base.lng +
            "&z=14" +
            "&output=embed";

        setCaption(label + (userLocation ? " near you" : " near default location"));
    }


    // =========================================
    // QUICK SERVICE BUTTONS
    // =========================================

    chips.forEach(function (chip) {

        chip.addEventListener("click", function (event) {

            event.stopPropagation();

            chips.forEach(function (c) { c.classList.remove("active"); });

            chip.classList.add("active");

            searchNearby(chip.getAttribute("data-service"), chip.textContent.trim());
        });
    });


    // =========================================
    // FIND MY LOCATION
    // auto = true  -> silent (no messages / popups)
    // =========================================

    function locate(auto) {

        if (!navigator.geolocation) {

            if (!auto) nearResult.textContent = "Location is not supported on this browser.";

            return;
        }

        const originalText = nearBtn.textContent;

        if (!auto) {

            nearBtn.disabled = true;
            nearBtn.textContent = "Locating...";
            nearResult.textContent = "";
        }


        navigator.geolocation.getCurrentPosition(

            function (position) {

                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                chips.forEach(function (c) { c.classList.remove("active"); });

                showLocationOnMap(userLocation.lat, userLocation.lng);

                setCaption("📍 Your current location");

                const result = updateStats();

                nearResult.textContent = result.near > 0
                    ? result.near + " reported issue" + (result.near === 1 ? "" : "s") + " within " + NEAR_RADIUS_KM + " km of you."
                    : "No reported issues within " + NEAR_RADIUS_KM + " km of you.";

                nearBtn.disabled = false;
                nearBtn.textContent = originalText;
            },

            function (error) {

                if (!auto) {

                    nearResult.textContent = error.code === 1
                        ? "Location permission was denied. Please allow location access and try again."
                        : "Could not find your location. Please try again.";
                }

                nearBtn.disabled = false;
                nearBtn.textContent = originalText;
            },

            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }


    if (nearBtn) {

        nearBtn.addEventListener("click", function (event) {

            event.stopPropagation();

            locate(false);
        });
    }


    // =========================================
    // START
    // =========================================

    updateStats();

    // Update counters if reports change in another tab
    window.addEventListener("storage", updateStats);

    // If the user already allowed location earlier,
    // show their location automatically (no popup)
    if (navigator.permissions && navigator.permissions.query) {

        navigator.permissions.query({ name: "geolocation" }).then(function (result) {

            if (result.state === "granted") locate(true);

        }).catch(function () {});
    }

})();