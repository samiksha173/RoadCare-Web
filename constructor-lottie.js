/* =========================================================
   RoadCare - constructor-lottie.js
   Plays a Lottie animation inside <div id="lottie-box"> on the
   constructor login / registration pages.

   Needs the lottie-web library loaded first:
   <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

   TO USE A DIFFERENT ANIMATION FROM LottieFiles:
   1. On lottiefiles.com pick a free animation -> Download -> "Lottie JSON"
   2. Save it in your project folder, e.g. construction.json
   3. Set CUSTOM_LOTTIE_PATH below to "construction.json"
      (open the site through Live Server / the Node server, not file://)
   ========================================================= */
(function () {
  const CUSTOM_LOTTIE_PATH = ""; // e.g. "construction.json"

  // Built-in animation: two turning gears with a soft pulse ring
  const BUILT_IN = {"v":"5.7.0","fr":60,"ip":0,"op":120,"w":200,"h":200,"nm":"constructor gears","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"small gear","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":1,"k":[{"t":0,"s":[0],"i":{"x":[1],"y":[1]},"o":{"x":[0],"y":[0]}},{"t":120,"s":[-720]}]},"p":{"a":0,"k":[151,74,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"ao":0,"shapes":[{"ty":"gr","nm":"hole","it":[{"ty":"el","d":1,"s":{"a":0,"k":[16,16]},"p":{"a":0,"k":[0,0]}},{"ty":"fl","c":{"a":0,"k":[1.0,1.0,1.0,1]},"o":{"a":0,"k":100},"r":1},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","nm":"body","it":[{"ty":"el","d":1,"s":{"a":0,"k":[50,50]},"p":{"a":0,"k":[0,0]}},{"ty":"fl","c":{"a":0,"k":[1.0,0.7019607843137254,0.0,1]},"o":{"a":0,"k":100},"r":1},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","nm":"teeth","it":[{"ty":"sr","sy":1,"d":1,"nm":"star","pt":{"a":0,"k":6},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"or":{"a":0,"k":30},"os":{"a":0,"k":0},"ir":{"a":0,"k":24},"is":{"a":0,"k":0}},{"ty":"fl","c":{"a":0,"k":[1.0,0.7019607843137254,0.0,1]},"o":{"a":0,"k":100},"r":1},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ip":0,"op":120,"st":0,"bm":0},{"ddd":0,"ind":2,"ty":4,"nm":"big gear","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":1,"k":[{"t":0,"s":[0],"i":{"x":[1],"y":[1]},"o":{"x":[0],"y":[0]}},{"t":120,"s":[360]}]},"p":{"a":0,"k":[85,120,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"ao":0,"shapes":[{"ty":"gr","nm":"hole","it":[{"ty":"el","d":1,"s":{"a":0,"k":[32,32]},"p":{"a":0,"k":[0,0]}},{"ty":"fl","c":{"a":0,"k":[1.0,1.0,1.0,1]},"o":{"a":0,"k":100},"r":1},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","nm":"body","it":[{"ty":"el","d":1,"s":{"a":0,"k":[88,88]},"p":{"a":0,"k":[0,0]}},{"ty":"fl","c":{"a":0,"k":[0.00784313725490196,0.5333333333333333,0.8196078431372549,1]},"o":{"a":0,"k":100},"r":1},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","nm":"teeth","it":[{"ty":"sr","sy":1,"d":1,"nm":"star","pt":{"a":0,"k":10},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"or":{"a":0,"k":52},"os":{"a":0,"k":0},"ir":{"a":0,"k":43},"is":{"a":0,"k":0}},{"ty":"fl","c":{"a":0,"k":[0.00784313725490196,0.5333333333333333,0.8196078431372549,1]},"o":{"a":0,"k":100},"r":1},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ip":0,"op":120,"st":0,"bm":0},{"ddd":0,"ind":3,"ty":4,"nm":"pulse a","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":[70],"i":{"x":[0.2],"y":[1]},"o":{"x":[0.4],"y":[0]}},{"t":60,"s":[0]}]},"r":{"a":0,"k":0},"p":{"a":0,"k":[85,120,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":1,"k":[{"t":0,"s":[40,40,100],"i":{"x":[0.2,0.2,0.2],"y":[1,1,1]},"o":{"x":[0.4,0.4,0.4],"y":[0,0,0]}},{"t":60,"s":[110,110,100]}]}},"ao":0,"shapes":[{"ty":"gr","nm":"ring","it":[{"ty":"el","d":1,"s":{"a":0,"k":[120,120]},"p":{"a":0,"k":[0,0]}},{"ty":"st","c":{"a":0,"k":[0.1607843137254902,0.7137254901960784,0.9647058823529412,1]},"o":{"a":0,"k":100},"w":{"a":0,"k":3},"lc":2,"lj":2},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ip":0,"op":120,"st":0,"bm":0},{"ddd":0,"ind":4,"ty":4,"nm":"pulse b","sr":1,"ks":{"o":{"a":1,"k":[{"t":60,"s":[70],"i":{"x":[0.2],"y":[1]},"o":{"x":[0.4],"y":[0]}},{"t":120,"s":[0]}]},"r":{"a":0,"k":0},"p":{"a":0,"k":[85,120,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":1,"k":[{"t":60,"s":[40,40,100],"i":{"x":[0.2,0.2,0.2],"y":[1,1,1]},"o":{"x":[0.4,0.4,0.4],"y":[0,0,0]}},{"t":120,"s":[110,110,100]}]}},"ao":0,"shapes":[{"ty":"gr","nm":"ring","it":[{"ty":"el","d":1,"s":{"a":0,"k":[120,120]},"p":{"a":0,"k":[0,0]}},{"ty":"st","c":{"a":0,"k":[0.1607843137254902,0.7137254901960784,0.9647058823529412,1]},"o":{"a":0,"k":100},"w":{"a":0,"k":3},"lc":2,"lj":2},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ip":0,"op":120,"st":0,"bm":0}]};

  const box = document.getElementById("lottie-box");
  if (!box) return;

  if (typeof lottie === "undefined") {
    box.style.display = "none"; // library didn't load (offline) - hide quietly
    return;
  }

  const config = { container: box, renderer: "svg", loop: true, autoplay: true };
  if (CUSTOM_LOTTIE_PATH) config.path = CUSTOM_LOTTIE_PATH;
  else config.animationData = BUILT_IN;

  lottie.loadAnimation(config);
})();