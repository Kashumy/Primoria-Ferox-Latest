/*
  _____      _                      _       
 |  __ \    (_)                    (_)      
 | |__) | __ _ _ __ ___   ___  _ __ _  __ _ 
 |  ___/ '__| | '_ ` _ \ / _ \| '__| |/ _` |
 | |   | |  | | | | | | | (_) | |  | | (_| |
 |_|   |_|  |_|_| |_| |_|\___/|_|  |_|\__,_|
        ______                              
       |  ____|                             
       | |__  ___   _ __   ___  __  __      
       |  __ / _ \ | '__  / _ \ \ \/ /      
       | |  |  __/ | |   | (_) | >  <       
       |_|   \___  |_|    \___/ /_/\_\      
      Copyright©  Kashumy Krystian 2024     
*/
function getIndexedDBSize(dbNames, callback) {
 let totalSize = 0;
 let processed = 0;
 dbNames.forEach(dbName => {
  let req = indexedDB.open(dbName);
  req.onsuccess = function() {
   let db = req.result;
   if (db.objectStoreNames.length === 0) {
    processed++;
    if (processed === dbNames.length) callback(totalSize);
    return;
   }
   let countSize = 0;
   let objStores = Array.from(db.objectStoreNames);
   let storeProcessed = 0;
   objStores.forEach(storeName => {
    let transaction = db.transaction(storeName, 'readonly');
    let store = transaction.objectStore(storeName);
    let getAllReq = store.getAll();
    getAllReq.onsuccess = function() {
     getAllReq.result.forEach(item => {
      if (typeof item === 'string') countSize += item.length * 2;
      else countSize += JSON.stringify(item).length * 2;
     });
     storeProcessed++;
     if (storeProcessed === objStores.length) {
      totalSize += countSize;
      processed++;
      if (processed === dbNames.length) callback(totalSize);
     }
    }
   });
  }
  req.onerror = function() {
   processed++;
   if (processed === dbNames.length) callback(totalSize);
  }
 });
}
function updateStorageBars() {
  let localUsed = 0;
  for (let key in localStorage) {
   if (localStorage.hasOwnProperty(key)) localUsed += (localStorage[key].length + key.length) * 2;
  }
  let localMax = 5 * 1024 * 1024;
  let localPercent = Math.min(localUsed / localMax * 100, 100);
  let localBar = document.getElementById('localStorageBar');
  localBar.style.width = localPercent + '%';
  
  getIndexedDBSize(['packcsDB', 'GameSaveDB'], function(size) {
   let indexedMax = 50 * 1024 * 1024;
   let indexedPercent = Math.min(size / indexedMax * 100, 100);
   let indexedBar = document.getElementById('indexedDBBar');
   indexedBar.style.width = indexedPercent + '%';
   
   if (indexedPercent < localPercent) {
    indexedBar.style.zIndex = 2;
    localBar.style.zIndex = 1;
   } else {
    localBar.style.zIndex = 2;
    indexedBar.style.zIndex = 1;
   }
  });
}
 
setTimeout(updateStorageBars, 5000);

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const mediaDest = audioCtx.createMediaStreamDestination();
const htmlAudio = document.createElement("audio");
htmlAudio.srcObject = mediaDest.stream;
htmlAudio.autoplay = true;
document.documentElement.appendChild(htmlAudio);
let audioIdCounter = 0;
const GLOBAL_AUDIO_CTX = new (window.AudioContext || window.webkitAudioContext)();
const AudioInstances = {};
function getAudio(index, src, loopDelay = 0) {
    if (AudioInstances[index]) return AudioInstances[index];
    const audio = new Audio2(src, loopDelay);
    AudioInstances[index] = audio;
    return audio;
}
async function fetchv20(src) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", src, true);
		xhr.responseType = "arraybuffer";
		xhr.onload = function() {
			if (xhr.status === 200 || xhr.status === 0) {
				resolve({
					arrayBuffer: () => Promise.resolve(xhr.response)
				});
			} else {
				reject(new Error("Failed to load " + src + ", status: " + xhr.status));
			}
		};
		xhr.onerror = function() {
			reject(new Error("Network error while fetching " + src));
		};
		xhr.send();
	});
}
class Audio2 {
    constructor(src, loopDelay = 0) {
        this.audioCtx = GLOBAL_AUDIO_CTX;
        this.buffer = null;
        this.source = null;
        this.gainNode = this.audioCtx.createGain();
        this.panner = this.audioCtx.createStereoPanner();
        this.gainNode.connect(this.panner);
        this.panner.connect(this.audioCtx.destination);
        this._src = src;
        this._loop = false;
        this._offset = 0;
        this._startTime = 0;
        this._volume = 1;
        this._pan = 0;
        this._playing = false;
        this.loopDelay = loopDelay / 1000; 
    }
    async load(src) {
        if (this.buffer) return;
        this._src = src;
        const response = await fetchv20(src);
        const arrayBuffer = await response.arrayBuffer();
        this.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    }
    _createSource(offset = 0) {
        if (!this.buffer) return;
        if (this.source) {
            this.source.stop();
            this.source.disconnect();
        }
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.gainNode);
        src.loop = false;
        src.start(0, offset);
        this._startTime = this.audioCtx.currentTime - offset;
        src.onended = () => {
            if (!this._loop) {
              	setTimeout(() => {
                this._playing = false;
                this._offset = 0;
              	},100);
            } else {
                this._offset = 0;
                if (this._playing) {
                    setTimeout(() => {
                        this._createSource(0);
                    }, this.loopDelay * 1000);
                }
            }
        };
        this.source = src;
        this._playing = true;
    }
    async play() {
    	   this.gainNode.gain.value = this._volume* inoptions["sfxvolume"];
        if (this._playing) return;
        if (!this.buffer) await this.load(this._src);
        if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
        this._createSource(this._offset);
    }
    pause() {
        if (!this.source) return;
        this._offset = this.currentTime;
        this.source.stop();
        this.source.disconnect();
        this.source = null;
        this._playing = false;
    }
    stop() {
        if (!this.source) return;
        this.source.stop();
        this.source.disconnect();
        this.source = null;
        this._offset = 0;
        this._playing = false;
    }
    get paused() {
        return !this._playing;
    }
    get currentTime() {
        if (!this.buffer) return 0;
        return this._playing ? this.audioCtx.currentTime - this._startTime : this._offset;
    }
    set currentTime(v) {
        if (!this.buffer) return;
        this._offset = Math.max(0, Math.min(v, this.buffer.duration));
        if (this._playing) {
            this.pause();
            this.play();
        }
    }
    get duration() {
        return this.buffer ? this.buffer.duration : 0;
    }
    set loop(v) {
        this._loop = v;
    }
    get loop() {
        return this._loop;
    }
    set volume(v) {
        this._volume = Math.max(0, Math.min(v, 1));
        this.gainNode.gain.value =inoptions["sfxvolume"]==0?0: this._volume * inoptions["sfxvolume"]
    }
    get volume() {
        return this._volume;
    }
    set pan(v) {
        this._pan = Math.max(-1, Math.min(v, 1));
        this.panner.pan.value = this._pan;
    }
    get pan() {
        return this._pan;
    }
    set src(url) {
        this._src = url;
        this.buffer = null;
        this._offset = 0;
        this._playing = false;
    }
    get src() {
        return this._src;
    }
}
    function setBase64Image(imgElement, key, rsrc) {
      if (typeof rsrc !== "undefined" && rsrc[key]) {imgElement.src = "data:image/png;base64," + rsrc[key];} else {console.warn(`err: ${key}`);}}
    function getBase64Image(key, rsrc) {
      if (typeof rsrc !== "undefined" && rsrc[key]) {return "data:image/png;base64," + rsrc[key];} else {console.warn(`err: ${key}`);}}
       function POPUP(x, y, title, content, framecolor = "#000080") {
	const win = document.createElement("div");
	Object.assign(win.style, {
		position: "absolute",
		left: x + "px",
		top: y + "px",
		width: "300px",
		height: "150px",
		border: `2px solid ${framecolor}`,
		background: "#e0e0e0",
		resize: "both",
		overflow: "hidden",
		boxShadow: "5px 5px 10px rgba(0,0,0,0.5)",
		minWidth: "200px",
		minHeight: "100px",
		zIndex: ++topZ,
		fontWeight: "200",
		fontFamily: "sans-serif"
	});
	const titlebar = document.createElement("div");
	Object.assign(titlebar.style, {
		background: framecolor,
		color: "#fff",
		padding: "2px 5px",
		cursor: "grab",
		display: "flex",
		fontWeight: "200",
		fontFamily: "sans-serif",
		justifyContent: "space-between",
		alignItems: "center",
		userSelect: "none"
	});
	const titleText = document.createElement("span");
	titleText.textContent = title;
	const buttons = document.createElement("div");
	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.className = "no-drag";
	closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><line x1="4" y1="4" x2="20" y2="20" stroke="white" stroke-width="2"/><line x1="20" y1="4" x2="4" y2="20" stroke="white" stroke-width="2"/></svg>`;
	Object.assign(closeBtn.style, {
		background: "red",
		border: "none",
		cursor: "pointer",
		width: "24px",
		height: "24px",
		padding: "0",
		display: "flex",
		justifyContent: "center",
		alignItems: "center"
	});
	closeBtn.addEventListener("mousedown", e => e.stopPropagation());
	closeBtn.addEventListener("touchstart", e => { e.stopPropagation(); }, { passive: false });
	closeBtn.addEventListener("click", () => win.remove());
	buttons.appendChild(closeBtn);
	titlebar.appendChild(titleText);
	titlebar.appendChild(buttons);
	const contentDiv = document.createElement("div");
	Object.assign(contentDiv.style, {
		padding: "10px",
		height: "calc(100% - 26px)",
		overflow: "auto"
	});
	contentDiv.innerHTML = content;
	win.appendChild(titlebar);
	win.appendChild(contentDiv);
	document.body.appendChild(win);
	let isDragging = false, offsetX = 0, offsetY = 0;
	function startDrag(e) {
		const target = e.target;
		if (target && target.closest && target.closest('.no-drag')) return;
		isDragging = true;
		const evt = e.touches ? e.touches[0] : e;
		offsetX = evt.clientX - win.offsetLeft;
		offsetY = evt.clientY - win.offsetTop;
		titlebar.style.cursor = "grabbing";
		document.body.style.overflow = "hidden";
		e.preventDefault();
	}
	function drag(e) {
		if (!isDragging) return;
		const evt = e.touches ? e.touches[0] : e;
		let newX = evt.clientX - offsetX;
		let newY = evt.clientY - offsetY;
		newX = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, newX));
		newY = Math.max(0, Math.min(document.body.scrollHeight - win.offsetHeight, newY));
		win.style.left = newX + "px";
		win.style.top = newY + "px";
	}
	function endDrag() {
		isDragging = false;
		titlebar.style.cursor = "grab";
		document.body.style.overflow = "";
	}
	titlebar.addEventListener("mousedown", startDrag);
	document.addEventListener("mousemove", drag);
	document.addEventListener("mouseup", endDrag);
	titlebar.addEventListener("touchstart", startDrag, { passive: false });
	document.addEventListener("touchmove", drag, { passive: false });
	document.addEventListener("touchend", endDrag);
	win.addEventListener("mousedown", () => win.style.zIndex = ++topZ);
	win.addEventListener("touchstart", () => win.style.zIndex = ++topZ);
}
var gameversion = "v1.5.8.5"
var APKversion=false;
if (window.location.protocol === 'file:') {
  console.log(' (file://). protocol Aplikacja w Natywnym kodzie lub pliku');
  APKversion=true;
} else {
  console.log('Aplikacja jest uruchomiona w przeglądarce.');
  APKversion=false;
}
let experimentalmultiplayer=0;
let gametest=0;
    var yourItems = []; 
    function steps(value, step) {
	return ((value % step) + step) % step
}
function clamp(value, min, max) {
  return (min != null && min !== "")
    ? (max != null && max !== "" 
        ? Math.min(Math.max(value, min), max) 
        : Math.max(value, min))               
    : (max != null && max !== "" 
        ? Math.min(value, max)                
        : value);                             
}
var cancontinue=0
var isPlayingGame=0
function playseed(){
  showTextInput("Type game seed . warning seeds arent great : ",
    async function(text) {
      seed=text
   isPlayingGame=1;
   updateTextMenuLoading()
   splashrandomize()
   document.getElementById('loadingMenu').style.display = 'flex';
   setTimeout(function (){
     abletostart=1;
   document.getElementById('loadingMenu').style.display='none' ;
   document.getElementById('MainMenu').style.display='none' ;
   if(paused==1){document.getElementById('advanced').style.display='block';}
   isUpdating=0
   update()
   playRandomMusic();
   paused = 1
  setTimeout(function(){paused=0; update() },1500);
  options.autopause = 1;setTimeout(function() {
    closeInventory()
    document.getElementById('advanced').style.display = 'none';}, 2000)},2500);
    })
    document.querySelectorAll('button[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
document.querySelectorAll('div[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
}
 function playgamenew(){
   isPlayingGame=1;
   updateTextMenuLoading()
   splashrandomize()
   document.getElementById('loadingMenu').style.display = 'flex';
   setTimeout(function (){
     abletostart=1;
   document.getElementById('loadingMenu').style.display='none' ;
   document.getElementById('MainMenu').style.display='none' ;
   if(paused==1){document.getElementById('advanced').style.display='block';}
   isUpdating=0
   update()
   paused = 1
  setTimeout(function(){paused=0; update() },1500);
  options.autopause = 1;
setTimeout(function() {
    closeInventory()
    document.getElementById('advanced').style.display = 'none';
}, 2000)
   },2500);
   document.querySelectorAll('button[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
document.querySelectorAll('div[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
 }
 setTimeout(function (){
     if(gametest==1){
         playgamenew()
         document.getElementById("loader").style.display="none";
     }
 },100)
 function playgameslot(slot) {
  splashrandomize()
  slot=(slot)||"";
  loadGameState3(slot)
  isPlayingGame=1
   
  document.getElementById('loadingMenu').style.display = 'flex';
  document.getElementById('loadingMenu').innerHTML=""
  updateTextMenuLoading()
  abletostart = 1;
  setTimeout(function() {
    document.getElementById('savename').value=slot
    document.getElementById('MainMenu').style.display = 'none';
    document.getElementById('loadingMenu').style.display = 'none';
    if(paused==1){ }
   isUpdating=0
   update()
   paused = 1
  setTimeout(function(){paused=0; update() },1500);
   },2500);
 }
  let dat=""
  var saveNames=[]
async function upadtegameslots(){
document.getElementById('slotgames').innerHTML=" "
saveNames = []
dat=""
document.getElementById('loadingMenu').innerHTML="is loading please wait ..."
 splashrandomize()
try {
  const db = await initDB(); 
  const transaction = db.transaction("gameStates", "readonly"); 
  const store = transaction.objectStore("gameStates");
  const allSavesRequest = store.getAll(); 
  allSavesRequest.onsuccess = function(event) {
    document.getElementById('slotgames').innerHTML=" "
    const gameStates = event.target.result;
    gameStates.forEach(gameState => {
      const slot = gameState.slot;
      if (slot !== undefined) {
        saveNames.push(slot);
dat += `<div onclick="playgameslot('${slot}');" style="position:relative; width:80%; height:20px; margin-top:5px; background:rgb(50,50,50); color:white; padding:0 5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
  <span><ste data-lang="continue">Continue ?</ste> : Slot "${slot}"</span>
<div style="position:absolute; top:50%; transform:translateY(-50%); right:4px; width:16px; height:16px; background:#c11; color:#fff; text-align:center; line-height:15px; font-size:13px;  " onclick="event.stopPropagation(); removeSaveFile('${slot}');">x</div>
</div>`;
document.getElementById('slotgames').innerHTML=dat
      }
    });
  };
  allSavesRequest.onerror = function(error) {
    console.log("Failed to fetch saved games from IndexedDB", error);
  };
} catch (error) {
}
}
  const config = [
    {
      type: "group", 
      style: { opacity: "0.5" },
      children: [
        { class: "bg0_0", style: { top: "35%", animation: "30s clouds linear infinite" } },
        { class: "bg0_0", style: { top: "30%", animation: "40s clouds linear infinite", left: "10px" } },
        { class: "bg0_0", style: { top: "10%", animation: "80s clouds linear infinite", left: "30px" } },
        { class: "bg0_0", style: { top: "20%", animation: "60s clouds linear infinite", left: "3px" } },
        { class: "bg0_0", style: { top: "15%", animation: "45s clouds linear infinite", left: "30px" } },
      ]
    },
    { class: "bg4_4" },
    { class: "bg5_6", style: { left: "-100px", width: "350px", height: "330px" } },
    { class: "bg5_7" },
    { class: "bg5_6" },
    { id: "bg1_1" },
    {
      type: "group", 
      style: { opacity: "0.5" },
      children: [
        { class: "bg2_2", style: { top: "35%", animation: "30s clouds linear infinite" } },
        { class: "bg2_2", style: { top: "30%", animation: "40s clouds linear infinite" } },
        { class: "bg2_3", style: { top: "65%", animation: "80s clouds linear infinite", width: "150px", height: "120px" } },
        { class: "bg2_3", style: { top: "10%", animation: "74s clouds linear infinite", width: "80px", height: "60px" } },
        { class: "bg2_3", style: { top: "25%", animation: "24s clouds linear infinite" } },
        { class: "bg2_3", style: { top: "40%", animation: "46s clouds linear infinite" } },
        { class: "bg2_2", style: { top: "20%", animation: "28s clouds linear infinite" } },
        { class: "bg2_3", style: { top: "60%", animation: "60s clouds linear infinite" } },
        { class: "bg2_3", style: { top: "10%", animation: "64s clouds linear infinite" } },
        { class: "bg2_3", style: { top: "60%", animation: "70s clouds linear infinite" } },
      ]
    }
  ];
  function applyStyles(el, styles = {}) {
    for (const [key, val] of Object.entries(styles)) {
      el.style[key] = val;
    }
  }
  function renderConfig(cfg, container) {
    cfg.forEach(item => {
      if (item.type === "group") {
        const group = document.createElement("div");
        applyStyles(group, item.style);
        renderConfig(item.children, group);
        container.appendChild(group);
      } else {
        const el = document.createElement("obb");
        if (item.class) el.className = item.class;
        if (item.id) el.id = item.id;
        applyStyles(el, item.style);
        container.appendChild(el);
      }
    });
  }
  const scene = document.getElementById("scene");
  renderConfig(config, scene);
  const now = new Date();
  const hours = now.getHours();
  const mainMenu = document.getElementById("MainMenu");
  const bg1_1 = document.getElementById("bg1_1");
  function removeByClass(cls) {
    document.querySelectorAll(cls).forEach(el => el.remove());
  }
  if(hours >= 18) {
    mainMenu.style.background = "url('./forestskybox.png')";
    mainMenu.style.backgroundSize = "100% 100%";
    removeByClass(".bg5_5");
    removeByClass(".bg5_6");
    removeByClass(".bg5_7");
    if(bg1_1) {
      bg1_1.style.background = "url('./Fground1.png')";
      bg1_1.style.backgroundSize = "300px 300px";
      bg1_1.style.animation = "40s slidebg infinite linear"; 
      bg1_1.style.height = '300px'
    }
    const Fground2 = document.createElement("div");
    Fground2.id = "bg1_2_new";
    Object.assign(Fground2.style, {
      position: "absolute",
      width: "100%",
      height: "280px",
      bottom: "0px",
      background: "url('./Fground2.png')",
      backgroundSize: "280px 280px",
      backgroundRepeat: "repeat-x",
      imageRendering: "pixelated",
      zIndex: "-1",
      filter: "brightness(0.9)",
      animation: "120s slidebg infinite linear",
    });
    scene.appendChild(Fground2);
  }else if (Math.random() < 0.4) {
	mainMenu.style.background = "url('./beachbg.png')";
	mainMenu.style.backgroundSize = "100% 100%";
	removeByClass(".bg5_5");
	removeByClass(".bg5_6");
	removeByClass(".bg5_7");
	if (bg1_1) {
		bg1_1.style.background = "url('./paralaxbeach.png')";
		bg1_1.style.backgroundSize = "600px 200px";
		bg1_1.style.animation = "20s slidebg2 infinite linear";
	}
	const Fground2 = document.createElement("div");
	Fground2.id = "birds";
	Object.assign(Fground2.style, {
		position: "absolute",
		width: "100%",
		height: "180px",
		top: "0px",
		background: "url('./birdsbg.gif')",
		backgroundSize: "280px 180px",
		backgroundRepeat: "no-repeat",
		imageRendering: "pixelated",
		zIndex: "-1",
		filter: "brightness(0.9)",
		animation: "120s slidebg infinite linear",
	});
	scene.appendChild(Fground2);
	const Fground3 = document.createElement("div");
	Fground3.id = "birds2";
	Object.assign(Fground3.style, {
		position: "absolute",
		width: "100%",
		height: "180px",
		top: "90px",
		background: "url('./birdsbg.gif')",
		backgroundSize: "280px 180px",
		backgroundRepeat: "no-repeat",
		imageRendering: "pixelated",
		zIndex: "-1",
		filter: "brightness(0.9)",
		animation: "120s slidebg infinite linear",
		animationDelay: "-90s",
	});
	scene.appendChild(Fground3);
}  else if (Math.random() < 0.4) {
	mainMenu.style.background = "url('./canyonbg.png')";
	mainMenu.style.backgroundSize = "100% 100%";
	removeByClass(".bg5_5");
	removeByClass(".bg5_6");
	removeByClass(".bg5_7");
	if (bg1_1) {
		bg1_1.style.background = "url('./canyonground.png')";
		bg1_1.style.backgroundSize = "600px 200px";
		bg1_1.style.animation = "20s slidebg2 infinite linear";
	}
	const Fground2 = document.createElement("div");
	Fground2.id = "birds";
	Object.assign(Fground2.style, {
		position: "absolute",
		width: "100%",
		height: "180px",
		top: "0px",
		background: "url('./birdsbg.gif')",
		backgroundSize: "280px 180px",
		backgroundRepeat: "no-repeat",
		imageRendering: "pixelated",
		zIndex: "-1",
		filter: "brightness(0.9)",
		animation: "120s slidebg infinite linear",
	});
	scene.appendChild(Fground2);
	const Fground3 = document.createElement("div");
	Fground3.id = "birds2";
	Object.assign(Fground3.style, {
		position: "absolute",
		width: "100%",
		height: "180px",
		top: "90px",
		background: "url('./birdsbg.gif')",
		backgroundSize: "280px 180px",
		backgroundRepeat: "no-repeat",
		imageRendering: "pixelated",
		zIndex: "-1",
		filter: "brightness(0.9)",
		animation: "120s slidebg infinite linear",
		animationDelay: "-90s",
	});
	scene.appendChild(Fground3);
	const Fground4 = document.createElement("div");
Fground4.id = "hills";
Object.assign(Fground4.style, {
	position: "absolute",
	width: "100%",
	height: "100vh",
	bottom: "-10px",
	background: "url('./canyonhills.png')",
	backgroundSize: "600px 100vh",
	backgroundRepeat: "repeat-x",
	imageRendering: "pixelated",
	zIndex: "-1",
	filter: "brightness(0.9)",
	animation: "100s slidebg infinite linear",
});
scene.appendChild(Fground4);
}
function loadPFD() {
        document.getElementById('fileInput').click(); 
 }
 function randomizeCloudsAnimation() {
    const clouds = document.querySelectorAll('.bg2_3, .bg2_2');
    clouds.forEach(cloud => {
        const duration = parseFloat(getComputedStyle(cloud).animationDuration);
        if (!isNaN(duration) && duration > 0) {
            const randomOffset = Math.random() * duration;
            cloud.style.animationDelay = `-${randomOffset}s`;
        }
    });
}
window.onload = randomizeCloudsAnimation;


let importedPacks = {}
let dbPromise=openDB()
let confirmResolve=null
function showPopup(msg){
  let popup=document.getElementById('popup')
  popup.textContent=msg
  popup.style.display='block'
  setTimeout(()=>popup.style.display='none',2000)
}
function showConfirm(msg){
  return new Promise(resolve=>{
    confirmResolve=resolve
    document.getElementById('confirmMessage').textContent=msg
    document.getElementById('confirmModal213').style.display='flex'
  })
}
document.getElementById('confirmYes').onclick=()=>{
  document.getElementById('confirmModal213').style.display='none'
  if(confirmResolve)confirmResolve(true)
}
document.getElementById('confirmNo').onclick=()=>{
  document.getElementById('confirmModal213').style.display='none'
  if(confirmResolve)confirmResolve(false)
}
function openDB(){
  return new Promise((resolve,reject)=>{
    let request=indexedDB.open("packsDB",1)
    request.onupgradeneeded=e=>{
      let db=e.target.result
      if(!db.objectStoreNames.contains("packs")){
        db.createObjectStore("packs",{keyPath:"id"})
      }
    }
    request.onsuccess=e=>resolve(e.target.result)
    request.onerror=e=>reject(e)
  })
}
async function savePackToDB(pack){
  let db=await dbPromise
  return new Promise((resolve,reject)=>{
    let tx=db.transaction("packs","readwrite")
    tx.objectStore("packs").put(pack)
    tx.oncomplete=()=>resolve()
    tx.onerror=e=>reject(e)
  })
}
async function deletePackFromDB(id){
  let db=await dbPromise
  return new Promise((resolve,reject)=>{
    let tx=db.transaction("packs","readwrite")
    tx.objectStore("packs").delete(id)
    tx.oncomplete=()=>resolve()
    tx.onerror=e=>reject(e)
  })
}
async function loadPacksFromDB(){
  let db=await dbPromise
  return new Promise((resolve,reject)=>{
    let tx=db.transaction("packs","readonly")
    let req=tx.objectStore("packs").getAll()
    req.onsuccess=e=>resolve(e.target.result)
    req.onerror=e=>reject(e)
  })
}
function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    let reader=new FileReader()
    reader.onload=()=>resolve(reader.result)
    reader.onerror=e=>reject(e)
    reader.readAsDataURL(blob)
  })
}function renderPack(pack){
  if(importedPacks[pack.id]){
    importedPacks[pack.id].remove()
  }
  let container=document.createElement('div')
  container.style.position='relative'
  container.style.background='#222'
  container.style.padding='8px'
  container.style.display='flex'
  container.style.gap='10px'
  container.style.width="calc(100% - 20px)"
  container.style.height="70px"
  container.style.marginBottom="2px"
  container.style.overflow="hidden"
  container.dataset.packId=pack.id
  let del=document.createElement('button')
  del.textContent='×'
  del.style.position='absolute'
  del.style.top='5px'
  del.style.right='5px'
  del.style.background='rgba(200,0,0,1)'
  del.style.color='white'
  del.style.border='none'
  del.style.width='18px'
  del.style.height='18px'
  let img=document.createElement('img')
  img.src=pack.icon
  img.style.width='64px'
  img.style.height='64px'
  img.style.objectFit='cover'
  img.style.flexShrink='0'
  let textBox=document.createElement('div')
  textBox.style.display='flex'
  textBox.style.flexDirection='column'
  textBox.style.wordBreak='break-all'
  let title=document.createElement('div')
  title.textContent=pack.name
  title.style.fontSize='15px'
  title.style.overflow='hidden'
  title.style.textOverflow='ellipsis'
  title.style.wordBreak='break-all'
  textBox.appendChild(title)
  if(pack.author){
    let author=document.createElement('div')
    author.textContent=pack.author
    author.style.fontSize='10px'
    author.style.color='#aaa'
    author.style.overflow='hidden'
    author.style.display='-webkit-box'
    author.style.webkitBoxOrient='vertical'
    author.style.webkitLineClamp='3'
    author.style.textOverflow='ellipsis'
    textBox.appendChild(author)
  }
  container.appendChild(del)
  container.appendChild(img)
  container.appendChild(textBox)
  del.onclick=async e=>{
    e.stopPropagation()
    let ok=await showConfirm(`Delete pack "${pack.name}"?`)
    if(ok){
      container.remove()
      delete importedPacks[pack.id]
      await deletePackFromDB(pack.id)
      showPopup("Pack deleted")
    }
  }
  container.onclick=()=>{
    let parent=container.parentElement.id
    if(parent==="packsList"){
      document.querySelector("#activatedPacks .pack-grid").appendChild(container)
      del.style.display='none' 
      showPopup(`Activated: ${pack.name}`)
      activatePack(pack)
      ensureContainer2()
    }else{
      document.querySelector("#packsList").appendChild(container)
      del.style.display='block' 
      showPopup(`Deactivated: ${pack.name}`)
      deactivatePack(pack)
      ensureContainer2()
    }
  }
  if(activePacks.some(p=>p.id===pack.id)){
    document.querySelector("#activatedPacks .pack-grid").appendChild(container)
    del.style.display='none'
  }else{
    document.getElementById('packsList').appendChild(container)
    del.style.display='block'
  }
  importedPacks[pack.id]=container
  ensureContainer2()
}
function ensureContainer2() {
	let packsList = document.getElementById('packsList')
	let container2 = document.getElementById('container2')
	if (!container2) {
		container2 = document.createElement('div')
		container2.id = 'container2'
		container2.style.position = 'relative'
		container2.style.background = '#222'
		container2.style.padding = '8px'
		container2.style.display = 'flex'
		container2.style.gap = '10px'
		container2.style.width = "calc(100% - 20px)"
		container2.style.height = "70px"
		container2.style.marginBottom = "2px"
		container2.style.opacity = 0
		packsList.appendChild(container2) 
	} else {
		if (packsList.lastElementChild !== container2) {
			packsList.appendChild(container2)
		}
	}
}
async function importPfp(file){
  if(!file)return
  if(!file.name.toLowerCase().endsWith('.pfp')){
    showPopup('Unknown format')
    return
  }
  try{
    let zip=await JSZip.loadAsync(file)
    let configFile=Object.values(zip.files).find(f=>f.name.endsWith('pack_config.txt'))
    let packIconFile=Object.values(zip.files).find(f=>f.name.endsWith('pack_icon.png'))
    if(!configFile||!packIconFile){
      showPopup('Unknown format')
      return
    }
    let configContent=(await configFile.async('text')).trim().split(',')
    let name=configContent.find(l=>l.includes('Name:'))?.split('Name:')[1]?.trim()||""
    let desc=configContent.find(l=>l.includes('Description:'))?.split('Description:')[1]?.trim()||""
    let id=configContent.find(l=>l.includes('Id:'))?.split('Id:')[1]?.trim()||""
    let iconBlob=await packIconFile.async('blob')
    let iconBase64=await blobToBase64(iconBlob)
    if(!id||!name){
      showPopup('Unknown format')
      return
    }
    let arrayBuffer=await file.arrayBuffer()
    let pack={id,name,author:desc,icon:iconBase64,zipData:arrayBuffer}
    await savePackToDB(pack)
    renderPack(pack)
    showPopup(`Imported: ${name}`)
  }catch(e){
    console.error(e)
    showPopup('Unknown format')
  }
}
loadPacksFromDB().then(packs=>packs.forEach(p=>renderPack(p)))
 let connections={}
const resources = {}
const injectedStyles = []
let activePacks = []
let mergedAudio = {}
const originalSounds = new Map()
const originalMusic = new Map()
const originalImages = new Map()
const originalBackgrounds = new Map()
async function injectBackgroundCSS(zip){
  const bgFiles=Object.values(zip.files).filter(f=>
    f.name.startsWith('assets/backgrounds/') &&
    (f.name.toLowerCase().endsWith('.png')||
     f.name.toLowerCase().endsWith('.jpg')||
     f.name.toLowerCase().endsWith('.jpeg')) &&
    !f.dir
  )
  const styleTag=document.createElement('style')
  let cssText=':root{'
  for(const f of bgFiles){
    const blob=await f.async('blob')
    const base64=await blobToBase64(blob)
    const fileName=f.name.split('/').pop()
    const varName='--image-'+fileName.replace(/\./g,'-')
    cssText+=`${varName}:url("${base64}");`
  }
  cssText+='}'
  styleTag.textContent=cssText
  document.head.appendChild(styleTag)
}
async function applyMenuBackgrounds(zip){
  const menusFile=Object.values(zip.files).find(f=>f.name==='assets/menus/menus.json')
  if(!menusFile) return
  try{
    const jsonText=await menusFile.async('text')
    const configs=JSON.parse(jsonText.replace(/^\uFEFF/, '').trim())
    const now=new Date()
    const hhmm=now.getHours()*100+now.getMinutes()
    let picked=null
    for(const cfg of configs){
      const start=cfg.hours[0]
      const end=cfg.hours[1]
      if(hhmm>=start&&hhmm<=end){
        const chance=parseFloat(cfg.chance)/100
        if(Math.random()<=chance){
          picked=cfg.bg
          break
        }
      }
    }
    if(!picked){
      const defaults=configs.filter(c=>c.hours[0]<=hhmm&&hhmm<=c.hours[1])
      if(defaults.length){
        picked=defaults[Math.floor(Math.random()*defaults.length)].bg
      }
    }
    if(picked){
      const file=Object.values(zip.files).find(f=>f.name==='assets/menus/'+picked)
      if(file){
        const blob=await file.async('blob')
        const url=URL.createObjectURL(blob)
        setMenuBackgroundVideo(url)
      }
    }
  }catch(e){
    console.warn('Invalid menus.json',e)
  }
}
function setMenuBackgroundVideo(url){
  const container=document.getElementById('menu-bg-video')
  if(!container)return
  container.style.display='block'
  container.innerHTML=''
  const video=document.createElement('video')
  video.src=url
  video.autoplay=true
  video.loop=true
  video.muted=true
  video.playsInline=true
  video.poster="" 
  video.setAttribute("preload","auto")
  video.setAttribute("playsinline","")
  video.setAttribute("webkit-playsinline","")
  video.style.position='absolute'
  video.style.top='50%'
  video.style.left='50%'
  video.style.transform='translate(-50%,-50%)'
  video.style.width='calc(100% + 4px);'
  video.style.height='calc(100% + 4px)'
  video.style.objectFit='cover'
  video.style.background='transparent'
  video.style.zIndex='1'
  video.style.opacity='0'
  video.addEventListener('canplay',()=>{
    video.style.opacity='1'
    video.play().catch(()=>{})
  })
  container.appendChild(video)
}
function applyMusicJson(jsonData, mergedMusic) {
  for (const item of jsonData) {
    const { type, mode, songs } = item;
    if (!musicLists[type]) continue;
    switch (mode) {
      case 'add':
        songs.forEach(song => {
          const s = song
          if (!musicLists[type].includes(s)) {
            musicLists[type].push(s);
            const audioSrc = mergedMusic[s] || s;
            const newAudio = new Audio(audioSrc);
            if (type === 'ovwday') audioInstances.push(newAudio);
            if (type === 'ovwnight') audioInstances3.push(newAudio);
            if (type === 'ether') etherInstances.push(newAudio);
            if (type === 'cave') caveInstances.push(newAudio);
          }
        });
        break;
      case 'remove':
        songs.forEach(song => {
          const s = song.startsWith('./') ? song : './' + song;
          const idx = musicLists[type].indexOf(s);
          if (idx !== -1) musicLists[type].splice(idx, 1);
          if (type === 'ovwday') audioInstances.splice(idx, 1);
          if (type === 'ovwnight') audioInstances3.splice(idx, 1);
          if (type === 'ether') etherInstances.splice(idx, 1);
          if (type === 'cave') caveInstances.splice(idx, 1);
        });
        break;
      case 'set':
        musicLists[type] = songs
        const arr = [];
         
        musicLists[type].forEach(s => {
          const audioSrc = mergedMusic[s] || s;
          arr.push(new Audio(audioSrc));
        });
        if (type === 'ovwday') audioInstances = arr;
        if (type === 'ovwnight') audioInstances3 = arr;
        if (type === 'ether') etherInstances = arr;
        if (type === 'cave') caveInstances = arr;
        break;
    }
  }
}
function restoreOriginalMusic() {
  audioInstances = [...originalAudioInstances.ovwday];
  audioInstances3 = [...originalAudioInstances.ovwnight];
  etherInstances = [...originalAudioInstances.ether];
  caveInstances = [...originalAudioInstances.cave];
  musicLists.ovwday = audioInstances.map(a => a.src);
  musicLists.ovwnight = audioInstances3.map(a => a.src);
  musicLists.ether = etherInstances.map(a => a.src);
  musicLists.cave = caveInstances.map(a => a.src);
}
function replaceMusicTracksFromLists() {
  function updateInstance(instanceArray, trackArray) {
    instanceArray.forEach((a, i) => {
      if (!originalMusic.has(a)) originalMusic.set(a, a.src)
      if (trackArray[i]) a.src = mergedAudio[trackArray[i]] || trackArray[i]
    })
  }
  updateInstance(audioInstances, musicLists.ovwday)
  updateInstance(audioInstances2, musicLists.ovwday)
  updateInstance(audioInstances3, musicLists.ovwnight)
  updateInstance(etherInstances, musicLists.ether)
  updateInstance(etherInstances, musicLists.cave)
}
let blockVariants={}
async function applyActivePacks() {
  for (const pack of activePacks) {
    const zip = await JSZip.loadAsync(pack.zipData)
    const mergedAssets = {}
    const assetsFolder = Object.values(zip.files).filter(f => f.name.startsWith('assets/') && !f.dir)
    for (const f of assetsFolder) {
      const name = f.name.split('/').pop()
      mergedAssets[name] = await blobToBase64(await f.async('blob'))
    }
await injectBackgroundCSS(zip)
await applyMenuBackgrounds(zip)
    const texturesFolder = Object.values(zip.files).filter(f => f.name.startsWith('assets/') && !f.dir)
    for (const f of texturesFolder) {
      const name = f.name.split('/').pop()
      const base64 = mergedAssets[name] || await blobToBase64(await f.async('blob'))
      document.querySelectorAll(`img[src$="${name}"]`).forEach(img => {
        if (!originalImages.has(img)) originalImages.set(img, img.src)
        img.src = base64
      })
      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el)
        if (style.backgroundImage.includes(name)) {
          if (!originalBackgrounds.has(el)) originalBackgrounds.set(el, style.backgroundImage)
          el.style.backgroundImage = `url("${base64}")`
        }
      })
    }
    const audioFolder = Object.values(zip.files).filter(f => f.name.startsWith('audio/') && !f.dir)
    for (const f of audioFolder) {
      const name = f.name.split('/').pop()
      const blob = await f.async('blob')
      const url = URL.createObjectURL(blob)
      if (name.toLowerCase().endsWith('.mp3') || name.toLowerCase().endsWith('.ogg')) mergedAudio[name] = url
    }
    if (Object.keys(mergedAudio).length) replaceSoundEffects(mergedAudio)
    const musicJsonFile = Object.values(zip.files).find(f => f.name === 'audio/music.json')
    if (musicJsonFile) {
      const jsonText = await musicJsonFile.async('text')
      let jsonData
      try {
        jsonData = JSON.parse(jsonText.replace(/^\uFEFF/, '').trim())
        applyMusicJson(jsonData, mergedAudio)
      } catch (e) {
        console.warn('Invalid music.json in pack', pack.name, e)
      }
    }
    replaceMusicTracksFromLists()
    const styleFile = Object.values(zip.files).find(f => f.name === 'assets/styles.css')
    if (styleFile) {
      const cssText = await styleFile.async('text')
      const styleTag = document.createElement('style')
      styleTag.dataset.pack = pack.name
      styleTag.textContent = cssText
      document.head.appendChild(styleTag)
      injectedStyles.push(styleTag)
    }
    const jsonFiles = Object.values(zip.files).filter(f => f.name.endsWith('.json') && !f.dir)
    for (const f of jsonFiles) {
      const jsonTextRaw = await f.async('text')
      const jsonText = jsonTextRaw.replace(/^\uFEFF/, '').trim()
      const jsonData = JSON.parse(jsonText)
      const key = f.name.split('/').pop().replace('.json', '')
      for (const item of jsonData) {
        if (item.type === 'animation') {
          const frames = item.data.animate.map(name => {
            const img = new Image()
            img.src = mergedAssets[name] || getBase64Image(name, assets)
            return img
          })
          animatedTextures[key] = { frames, speed: item.data.speed, currentFrame: 0, lastFrameTime: 0 }
        } else if (item.type === 'connection') {
          const texKey = f.name.split('/').pop().replace('.json', '')
          if (!connections[texKey]) connections[texKey] = []
          const getBase64Texture = name => mergedAssets[name] || name
          const convertToBase64 = obj => {
            if (obj.t) obj.t = getBase64Texture(obj.t)
            return obj
          }
          const resultBase64 = getBase64Texture(item.data.result)
          const conditionBase64 = item.data.condition.map(c => typeof c === 'object' ? convertToBase64(c) : c)
          connections[texKey].push({ result: resultBase64, condition: conditionBase64 })
        }else if (item.type === 'variants') {
										const baseName = f.name.split('/').pop().replace('.json', '');
										blockVariants[baseName] = item.data.variants.map(v => ({
										t: mergedAssets[v.t] || v.t,
										chance: parseFloat(v.chance) || 0
										}));
								}
      }
    }
for (const [key, animData] of Object.entries(animatedTexturesOld)) {
 const newFrames = animData.frames.map(src => {
  const fileName = src.replace('./', '')
  const img = new Image()
  img.src = mergedAssets[fileName] || getBase64Image(removeDotSlash(src), assets)
  return img
 })
 animatedTextures[key] = {
  frames: newFrames,
  speed: animData.speed,
  currentFrame: 0,
  lastFrameTime: 0
 }
}
    for (const [key, src] of Object.entries(textureSources)) {
      const fileName = src.replace('./', '')
      textures[key].src = mergedAssets[fileName] || getBase64Image(removeDotSlash(defaultTextureSources[key]), assets)
    }
    for (const [key, src] of Object.entries(defaultAllItems)) {
      const fileName = src.replace('./', '')
      if (allItems[key] instanceof Image) allItems[key].src = mergedAssets[fileName] || getBase64Image(removeDotSlash(defaultAllItems[key]), assets)
      else allItems[key] = mergedAssets[fileName] || getBase64Image(removeDotSlash(defaultAllItems[key]), assets)
    }
 for (const [key, src] of Object.entries(specialTexturesOld)) {
 const fileName = src.replace('./', '')
 if (specialTextures[key] instanceof Image) specialTextures[key].src = mergedAssets[fileName] || getBase64Image(removeDotSlash(specialTexturesOld[key]), assets)
 else specialTextures[key] = mergedAssets[fileName] || getBase64Image(removeDotSlash(specialTexturesOld[key]), assets)
}
    for (const [key, path] of Object.entries(textureDefinitions)) {
      const fileName = path.replace('./', '')
      if (enemyTextures[key] instanceof Image) enemyTextures[key].src = mergedAssets[fileName] || getBase64Image(removeDotSlash(textureDefinitions[key]), assets)
    }
  }
}
function activatePack(pack) {
    if (!activePacks.includes(pack)) activePacks.push(pack)
    applyActivePacks()
}
function deactivatePack(pack) {
    activePacks = activePacks.filter(p => p !== pack)
    
    function restoreOriginalTextures() {
 for (const [key, animData] of Object.entries(animatedTexturesOld)) {
 const frames = animData.frames.map(src => {
  const img = new Image()
  img.src = getBase64Image(removeDotSlash(src), assets)
  return img
 })
 animatedTextures[key] = {
  frames,
  speed: animData.speed,
  currentFrame: 0,
  lastFrameTime: 0
 }
}
	for (const [key, src] of Object.entries(defaultTextureSources)) {
		if (textures[key]) textures[key].src = getBase64Image(removeDotSlash(src), assets)
	}
	for (const [key, src] of Object.entries(defaultAllItems)) {
		if (allItems[key] instanceof Image) allItems[key].src = getBase64Image(removeDotSlash(src), assets)
		else allItems[key] = getBase64Image(removeDotSlash(src), assets)
	}
	for (const [key, src] of Object.entries(specialTexturesOld)) {
		if (specialTextures[key] instanceof Image) specialTextures[key].src = getBase64Image(removeDotSlash(src), assets)
		else specialTextures[key] = getBase64Image(removeDotSlash(src), assets)
	}
	for (const [key, path] of Object.entries(textureDefinitions)) {
		if (enemyTextures[key] instanceof Image) enemyTextures[key].src = getBase64Image(removeDotSlash(path), assets)
	}
}restoreOriginalTextures()
    
    for(const [img, src] of originalImages) img.src = src
for(const [el, bg] of originalBackgrounds) el.style.backgroundImage = bg
originalImages.clear()
originalBackgrounds.clear()
injectedStyles.forEach(s => s.remove())
injectedStyles.length = 0
blockVariants={}
const container = document.getElementById('menu-bg-video')
container.style.display = 'none'
for (const [obj, src] of originalSounds) obj.src = src
for (const [instance, src] of originalMusic) instance.src = src
originalSounds.clear()
originalMusic.clear()
    applyActivePacks()
}
function replaceSoundEffects(mergedSounds) {
	function tryReplace(obj, file) {
		const name = file.split('/').pop()
		if (!originalSounds.has(obj)) originalSounds.set(obj, obj.src)
		if (mergedSounds[name]) obj.src = mergedSounds[name]
	}
	restoreOriginalMusic();
    tryReplace(stonestep,'stonestep.wav')
    tryReplace(footstepSound,'step2.mp3')
    tryReplace(windsound,'wind.mp3')
    tryReplace(swimSound,'swim.mp3')
    tryReplace(noucant,'block.wav')
    tryReplace(craftsound,'crafted.mp3')
    tryReplace(slashsound,'slash.mp3')
    tryReplace(hitenemysound,'hit (1).mp3')
    tryReplace(slashsound3,'slash2.mp3')
    tryReplace(slashsound4,'slash3.mp3')
    snowStepsFiles.forEach((f,i)=>{ if(mergedSounds[f]) snowStepsFiles[i]=mergedSounds[f] })
    stoneStepsFiles.forEach((f,i)=>{ if(mergedSounds[f]) stoneStepsFiles[i]=mergedSounds[f] })
    sandStepsFiles.forEach((f,i)=>{ if(mergedSounds[f]) sandStepsFiles[i]=mergedSounds[f] })
    coaststepFiles.forEach((f,i)=>{ if(mergedSounds[f]) coaststepFiles[i]=mergedSounds[f] })
    ;(async()=>{
        snowStepsBuffers.length=0
        stoneStepsBuffers.length=0
        sandStepsBuffers.length=0
        coastStepsBuffers.length=0
        await preloadSteps(snowStepsFiles,snowStepsBuffers)
        await preloadSteps(stoneStepsFiles,stoneStepsBuffers)
        await preloadSteps(sandStepsFiles,sandStepsBuffers)
        await preloadSteps(coaststepFiles,coastStepsBuffers)
    })()
}
function replaceMusicTracks(mergedMusic) {
	function tryReplace(instance, file) {
		const name = file.split('/').pop()
		if (!originalMusic.has(instance)) originalMusic.set(instance, instance.src)
		if (mergedMusic[name]) instance.src = mergedMusic[name]
	}
	audioInstances.forEach((a, i) => tryReplace(a, musicTracks[i]))
	audioInstances2.forEach((a, i) => tryReplace(a, musicTracks2[i]))
	audioInstances3.forEach((a, i) => tryReplace(a, nightmusicTracks[i]))
	etherInstances.forEach((a, i) => tryReplace(a, ethertracks[i]))
	tryReplace(boss1, 'electric force.mp3')
	tryReplace(boss2, 'boss2.mp3')
	tryReplace(boss3, 'fleshbe2winus.mp3')
	tryReplace(bossWorldEater, 'THEWORLDEATER.mp3')
	tryReplace(boss4, 'soulreinforcement.mp3')
	tryReplace(crimsondoomon, 'DOOMON.mp3')
	tryReplace(trueTrack, 'TRUE.mp3')
	tryReplace(voltaryTrack, 'Voltary.mp3')
	tryReplace(desertTrack, 'SandInEyes.mp3')
	tryReplace(swallowing, 'VSwallowing.mp3')
	tryReplace(desertnightTrack, 'ruins.mp3')
	tryReplace(snowyTrack, 'snowy.mp3')
	tryReplace(snowyTrack2, 'Ethernia cold.mp3')
	tryReplace(foresttrack, 'MyCosmos.mp3')
	tryReplace(canyontrack, 'Canyon.mp3')
	tryReplace(canyontrack2, 'WesternTypeShit.mp3')
	tryReplace(beautifulnature, 'BeautifulNature.mp3')
	tryReplace(imfrog, 'FROG.mp3')
	tryReplace(DiedAlone, 'DiedAlone.mp3')
	tryReplace(vulcanotrack, 'Vulcano.mp3')
	tryReplace(cemetery, 'graveyard.mp3')
	tryReplace(abyssumTrack, 'abyssum.mp3')
	tryReplace(hellTrack, 'The Magma.mp3')
	tryReplace(aquamarine, 'deep in abyss.mp3')
}
let inoptions = {
	sfxvolume: 1,
	uiscale:1,
	musicvolume: 1,
	tshirtcolor: [50, 50, 50],
	leggingscolor: [30, 60, 70],
	haircolor: [133,105,73],
	shoescolor: [133,105,73],
	skincolor: [227,216,145],
	eyescolor: [49,59,65], 
	outlinecolor:[20,23,25],
	currhue:0,
	classicmusic:false
}
let editingPart = "tshirt";
const buttons11 = ["editTshirt", "editShoes", "editLeggings", "editHair","editSkin","editEyes","editOutline"];
buttons11.forEach(id => {
	const btn = document.getElementById(id);
	btn.addEventListener("click", () => {
		buttons11.forEach(otherId => document.getElementById(otherId).classList.remove("selected1"));
		btn.classList.add("selected1");
		editingPart = id.replace("edit", "").toLowerCase();
	});
});
document.getElementById("resetSkin").addEventListener("click", () => {
	inoptions.tshirtcolor = [65,100,119];
	inoptions.leggingscolor = [49,59,65];
	inoptions.haircolor = [133, 105, 73];
	inoptions.shoescolor = [133, 105, 73];
	inoptions.skincolor = [227, 216, 145];
	inoptions.eyescolor = [49, 59, 65];
	inoptions.outlinecolor= [20,23,25];
	inoptions.currhue = 0;
});
  const picker = document.getElementById("colorPickerCanvas");
  const ctx30 = picker.getContext("2d");
  function drawPicker(hue=0) {
  	 ctx30.clearRect(0,0,picker.width,picker.height);
    let gradientH = ctx30.createLinearGradient(0,0,picker.width,0);
    gradientH.addColorStop(0,"#fff");
    gradientH.addColorStop(1,"hsl("+hue+",100%,50%)");
    ctx30.fillStyle = gradientH;
    ctx30.fillRect(0,0,picker.width,picker.height);
    let gradientV = ctx30.createLinearGradient(0,0,0,picker.height);
    gradientV.addColorStop(0,"rgba(0,0,0,0)");
    gradientV.addColorStop(1,"#000");
    ctx30.fillStyle = gradientV;
    ctx30.fillRect(0,0,picker.width,picker.height);
  }
  let currentHue = inoptions.currhue;
  drawPicker(currentHue);
  let dragging = false;
  picker.addEventListener("mousedown", e=>{
    dragging = true; pickColor(e);
  });
  picker.addEventListener("mouseup", ()=>dragging=false);
  picker.addEventListener("mouseleave", ()=>dragging=false);
  picker.addEventListener("mousemove", e=>{ if(dragging) pickColor(e); });
  picker.addEventListener("touchstart", e=>{ e.preventDefault(); dragging=true; pickColor(e.touches[0]); });
  picker.addEventListener("touchend", e=>{ dragging=false; });
  picker.addEventListener("touchmove", e=>{ e.preventDefault(); if(dragging) pickColor(e.touches[0]); });
  function pickColor(e) {
    const rect = picker.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const img = ctx30.getImageData(x,y,1,1).data;
if (editingPart == "leggings") {
	inoptions.leggingscolor = [img[0],img[1],img[2]];
} else if (editingPart == "hair") {
 inoptions.haircolor = [img[0], img[1], img[2]];
}else if (editingPart == "outline") {
 inoptions.outlinecolor = [img[0], img[1], img[2]];
}else if (editingPart == "skin") {
	inoptions.skincolor = [img[0], img[1], img[2]];
}else if (editingPart == "eyes") {
	inoptions.eyescolor = [img[0], img[1], img[2]];
}else if (editingPart == "shoes") {
	inoptions.shoescolor = [img[0], img[1], img[2]];
}else {
	inoptions.tshirtcolor = [img[0],img[1],img[2]]
}
currentHue = inoptions.currhue;
localStorage.setItem('inoptions', JSON.stringify(inoptions));
drawPicker(currentHue);
    ctx30.strokeStyle="white";
    ctx30.lineWidth=1;
    ctx30.strokeRect(x-3,y-3,6,6);
  }
const previewCanvas = document.getElementById("previewCanvas");
const pctx = previewCanvas.getContext("2d");
pctx.imageSmoothingEnabled = false;
let previewPlayer = {
  frameIndex:0,
  frameCounter:0,
  frameSpeed:8,
  currentAnimation:"movedown",
  isMoving:true
};
let previewRAF = null;
function recolorTexture2(img,rules){
  let c=document.createElement("canvas");
  let ctx=c.getContext("2d");
  c.width=img.width; c.height=img.height;
  ctx.drawImage(img,0,0);
  let d=ctx.getImageData(0,0,c.width,c.height);
  let data=d.data;
  for(let i=0;i<data.length;i+=4){
    let r=data[i],g=data[i+1],b=data[i+2];
    let idx=i/4;
    let x=idx%c.width,y=Math.floor(idx/c.width);
    for(let rule of rules){
      let fromColor=rule[0],toColor=rule[1],range=rule[2];
      let inRange=true;
      if(range){let [x1,y1,x2,y2]=range; inRange=(x>=x1 && x<=x2 && y>=y1 && y<=y2);}
      if(inRange && r===fromColor[0] && g===fromColor[1] && b===fromColor[2]){
        data[i]=toColor[0]; data[i+1]=toColor[1]; data[i+2]=toColor[2]; break;
      }
    }
  }
  ctx.putImageData(d,0,0); return c;
}
function drawPreview(){
  pctx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
  let animFrames = [];
  for(let i=0;i<2;i++){
    const tex = getSpecialTexture(previewPlayer.currentAnimation,i);
    if(tex) animFrames.push(tex);
  }
  if(previewPlayer.isMoving){
    previewPlayer.frameCounter++;
    if(previewPlayer.frameCounter>=previewPlayer.frameSpeed){
      previewPlayer.frameIndex=(previewPlayer.frameIndex+1)%animFrames.length;
      previewPlayer.frameCounter=0;
    }
  }
  const baseFrame = animFrames[previewPlayer.frameIndex];
  const rules = [
    [[65,100,119], inoptions.tshirtcolor],
    [[49,59,65], inoptions.leggingscolor,[0,9,15,15]],
    [[133,105,73], inoptions.haircolor, [0,1,15,9]],
    [[133,105,73], inoptions.shoescolor, [0,8,15,15]],
    [[49,59,65], inoptions.eyescolor, [4,4,11,12]],
    [[227,216,145], inoptions.skincolor],
    [[20,23,25], inoptions.outlinecolor],
  ];
  const recolored=recolorTexture2(baseFrame,rules);
  pctx.drawImage(recolored,0,0,recolored.width,recolored.height,0,0,previewCanvas.width,previewCanvas.height);
  previewRAF=setTimeout(drawPreview,20);
}

function startDrawPreview(){ previewPlayer.isMoving=true; if(!previewRAF) drawPreview(); }
function stopDrawPreview(){ previewPlayer.isMoving=false; if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; } }
function setPreviewAnimation(dir){
  if(["movedown","moveup","moveleft","moveright"].includes(dir)){
    previewPlayer.currentAnimation=dir;
  }
}
const pickerContainer=document.getElementById("skincustomisation");
const savedOptions = JSON.parse(localStorage.getItem('inoptions')) || {};
for (let key in savedOptions) {
	if (key in inoptions) inoptions[key] = savedOptions[key];
}
function Switcher(option,label,value1,value2,appendToElement,callback){
	const container=document.createElement('div');
	container.style.display='flex';
	container.style.alignItems='center';
	container.style.justifyContent='space-between';
	container.style.width='120px';
	container.style.margin='5px';
	const textLabel=document.createElement('span');
	textLabel.textContent=label;
	textLabel.style.color='white';
	textLabel.style.fontSize='12px';
	container.appendChild(textLabel);
	const switchBtn=document.createElement('div');
	switchBtn.style.width='45px';
	switchBtn.style.height='18px';
	switchBtn.style.background=inoptions[option]==value2?'green':'#444';
	switchBtn.style.position='relative';
	const knob=document.createElement('div');
	knob.style.width='16px';
	knob.style.height='18px';
	knob.style.background='white';
	knob.style.position='absolute';
	knob.style.top='0px';
	knob.style.left=inoptions[option]==value2?'28px':'0px';
	knob.style.transition='all 0.2s ease';
	switchBtn.appendChild(knob);
	switchBtn.addEventListener('click',()=>{
		inoptions[option]=inoptions[option]==value1?value2:value1;
		knob.style.left=inoptions[option]==value2?'28px':'0px';
		switchBtn.style.background=inoptions[option]==value2?'limegreen':'#444';
		localStorage.setItem('inoptions',JSON.stringify(inoptions));
		if(callback&&typeof callback=='function')callback(inoptions[option]);
	});
	container.appendChild(switchBtn);
	appendToElement.appendChild(container);
}

function Slider(min,max,steps,option,appendToElement,cssForBar,cssForThumb,containerCss,width=200,height=30,nolabel,callback, callbackend){
    const container=document.createElement('div');
    container.style.position='relative';
    container.style.width=width+'px';
    container.style.height=(height+20)+'px';
    container.style.marginTop='-10px';
    container.style.marginLeft='5px';
    container.style.cssText+=containerCss;
    if(!nolabel){
    const label=document.createElement('span');
    label.style.color='white';
    label.style.display='block';
    label.style.marginBottom='2px';
    label.textContent=option ;
    container.appendChild(label);
    }
    const bar=document.createElement('div');
    bar.style.position='absolute';
    bar.style.top='50%';
    bar.style.left='0';
    bar.style.width='100%';
    bar.style.height='16px';
    bar.style.background='#333';
    bar.style.transform='translateY(-50%)';
    bar.style.cssText+=cssForBar;
    container.appendChild(bar);
    const thumb=document.createElement('div');
    thumb.style.position='absolute';
    thumb.style.top='50%';
    thumb.style.left='0%';
    thumb.style.width='20px';
    thumb.style.height='20px';
    thumb.style.background='lightgreen';
    thumb.style.transform='translate(-50%,-50%)';
    thumb.style.cssText+=cssForThumb;
    container.appendChild(thumb);
    const valueLabel=document.createElement('span');
    valueLabel.style.position='absolute';
    valueLabel.style.top='50%';
    valueLabel.style.pointerEvents="none"
    valueLabel.style.right='-10px';
    valueLabel.style.color='white';
    valueLabel.style.fontSize="7px"
    valueLabel.style.transform='translateY(-50%)';
    valueLabel.textContent=inoptions[option].toFixed(3);
    container.appendChild(valueLabel);
    let value=inoptions[option];
    const updateValue=event=>{
        const rect=bar.getBoundingClientRect();
        let x;
        if(event.touches) x=event.touches[0].clientX-rect.left;
        else x=event.clientX-rect.left;
        x=Math.max(0,Math.min(x,rect.width));
        const rawValue=min+(x/rect.width)*(max-min);
        value=Math.round(rawValue/steps)*steps;
        value=Math.min(max,Math.max(min,value));
        inoptions[option]=value;
        thumb.style.left=((value-min)/(max-min)*100)+'%';
        valueLabel.textContent=value.toFixed(3);
        localStorage.setItem('inoptions', JSON.stringify(inoptions));
if (currentTrack && !currentTrack.paused) {
		currentTrack.volume = inoptions["musicvolume"]
	}
	if(callback && typeof callback == "function"){
	callback()
	}
    };
const updateThumb = () => {
	thumb.style.left = ((value - min) / (max - min) * 100) + '%';
	valueLabel.textContent = value.toFixed(3);
};
updateThumb();
    const startDrag=e=>{
        updateValue(e);
        const moveHandler=ev=>updateValue(ev);
        const upHandler=()=>{
if (callbackend && typeof callbackend == "function") {
		callbackend()
	}
            document.removeEventListener('mousemove',moveHandler);
            document.removeEventListener('mouseup',upHandler);
            document.removeEventListener('touchmove',moveHandler);
            document.removeEventListener('touchend',upHandler);
        };
        document.addEventListener('mousemove',moveHandler);
        document.addEventListener('mouseup',upHandler);
        document.addEventListener('touchmove',moveHandler,{passive:false});
        document.addEventListener('touchend',upHandler);
        e.preventDefault();
    };
    bar.addEventListener('mousedown',startDrag);
    thumb.addEventListener('mousedown',startDrag);
    bar.addEventListener('touchstart',startDrag,{passive:false});
    thumb.addEventListener('touchstart',startDrag,{passive:false});
    appendToElement.appendChild(container);
}
function changezoom(){
	let valuesToAdd=":root{"
	let _styleElement=document.getElementById("styles");
	document.querySelector("html").style.zoom = inoptions.uiscale;
	valuesToAdd+="--width-o:"+ document.getElementById("MainMenu").innerWidth+";";
	valuesToAdd+="--height-o:"+ document.getElementById("MainMenu").innerHeight+";";
	valuesToAdd+="}"
	_styleElement.textContent = valuesToAdd ;
}
window.addEventListener('DOMContentLoaded',()=>{
 if (window.matchMedia("(pointer: fine)").matches) {
  const style = document.createElement("style");
  style.textContent = `
    .mobilecontroller {
      display: block !important;
    }
  `;
  document.head.appendChild(style);
}

    const appendTo=document.querySelectorAll('#addhere')[0];
    const appendTo2=document.querySelectorAll("#huesliderhere")[0];
    Slider(0,1,0.002,'musicvolume',appendTo,'','','margin-top:5px;',200,30);
    Slider(0,1,0.1,'sfxvolume',appendTo,'','','margin-top:-15px;',200,30,false,()=>{playTestSound();} ,()=>{stopTestSound()} );
if (window.matchMedia("(pointer: coarse)").matches) {
  Slider(0.6, 1.5, 0.025, 'uiscale', appendTo, '', '', 'margin-top:-15px;', 200, 30, false, () => {}, () => {
    changezoom();
  });
} else {
  inoptions.uiscale = 1;
  changezoom();
}

    Switcher('classicmusic',"only classic musics",false,true,appendTo);
    Slider(0,360,5,'currhue',appendTo2,'','','margin-top:2px;',80,10,true,()=>{  currentHue = inoptions.currhue; drawPicker(currentHue); } );
changezoom()
});
function createStorage(dbName = "myDB", storeName = "store") {
  const dbPromise = new Promise((resolve, reject) => {const request = indexedDB.open(dbName, 1);request.onupgradeneeded = (event) => {const db = event.target.result;if (!db.objectStoreNames.contains(storeName)) {db.createObjectStore(storeName);}};request.onsuccess = () => {resolve(request.result);};request.onerror = () => {reject(request.error);};
  });
  async function save(slot, data) {const db = await dbPromise;return new Promise((resolve, reject) => {const tx = db.transaction([storeName], "readwrite");const store = tx.objectStore(storeName);const req = store.put(data, slot);req.onsuccess = () => resolve();req.onerror = () => reject(req.error);});
  }
  function load(slot, callback) {
  dbPromise.then(db => {const tx = db.transaction([storeName], "readonly");const store = tx.objectStore(storeName);const req = store.get(slot);req.onsuccess = () => callback(req.result ?? null);req.onerror = () => callback(null);
  }).catch(() => callback(null));
  }
  return { save, load };
}
let tutorialhelps = {
    "en": {
        "start": `Collect resources by clicking on them. Some items can be picked up, while others cannot. \n you can customize quickbutton in settings ! \n After you die your items will fall on the ground\n The green bar is your hunger bar and blue one is your thirst bar soo drink water or eat water foods, \n Dropany - drops every item but bowls will place as a water , Drop all - drop all wil drop item as it is in your inventory `,
        "swimming": `Be careful when swimming. Swimming drains your yellow "stamina" bar, and if it reaches 0, you'll start taking damage!`, 
        "tree": `To chop down a tree, you need an axe. You can find the recipe in your inventory by clicking the "show more" button.`,
        "morecrafting": `Some blocks unlock extra recipes when you stay near them, like the Fermenter, Wood Manipulator, Unknown, Furnace, or Campfire ( Any item that can be used like that is yellow texted ). You can show recipes in the inventory by clicking "show more" button`,
        "caves": `In caves, you may find a strange portal and another mysterious hole. The hole teleports you to the Hell dimension, and the portal takes you to the Abyss dimension. You'll also find valuable minerals, but you'll need a pickaxe to mine the cave walls.`,
        "weapons": `You can't attack enemies with your bare hands, so craft a weapon first. Good starting options include the "Pointed Stick", "Long Spear", or "Bone Sword". You can craft more advanced weapons using the anvil.\n \n Also weapons is displayed with light blue text `,
        "underwater": `You have a 'drowning bar' while underwater. If it reaches 0, you'll take damage. Beware: creatures like jellyfish can kill you faster than drowning!`,
        "unknown": `You can craft a Boss Spawner. Clicking "Unknown" will summon the boss, so be careful! Start from Voltary and progress to True Universe.`,
        "red anvil": `The Red Anvil unlocks recipes for magical items, making it extremely valuable.`,
        "farming": `You can grow plants by planting seeds in dirt. plants can grow everywhere lmfao.\n Honey mushrooms Grow in the rain on the logs in the forest`,
        "cooking": `You can cook at a Campfire or Furnace to make cooked food. Cooking will make some food eatable like bunnymeat .\n\nEvery eatable food is displayed with green text \n If you dont want eat food just use "drop all items" in settings or quickbutton`,
        "exploration": `Exploring the world helps you find hidden treasures, secret locations, and rare resources. You can find Voulcano , Canyon , Forest, SnowForest , Desert and Swamp`,
        "extra":`Did you know you can use cave builder to build underwater entrance or the cave entrance. \n\n Some settings are useful try experiment with it`,
        "controls":`Phone:\n joystick move the player, click dropAny set in quickbutton to drop each item, useful if you don't want to eat a given food.\n\nComputer:\n wasd - move , scroll change slot (if cursor on gamescreen) or scroll recipes, x - inventory, c - use selected item, q - toggle quickbutton z e.g DropAny, z - toggle second quickbutton , e - toggle shoot enabled `
    },
    "pl": {
        "start": `Zbieraj zasoby, klikając je. Niektóre przedmioty można podnieść, a innych nie. \n Możesz dostosować przycisk szybkiego dostępu w ustawieniach! \n Po śmierci przedmioty upadną na ziemię.\nZielony pasek to pasek głodu a ten niebieski to pragnienia tak więc pij dużo wody lub sporzywaj wodne jedzenie,\n Dropany - Wyrzuci wszystko nie licząc wody woda zostanie polorzona, Drop all - wyrzuci kazdy item taki jaki jest w ekwipunku `,
        "swimming": `Uważaj podczas pływania. Pływanie zużywa twój żółty pasek "staminy", a jeśli spadnie do 0, zaczniesz otrzymywać obrażenia!`,
        "tree": `Aby ściąć drzewo, potrzebujesz siekiery. Recepturę znajdziesz w ekwipunku, klikając przycisk "Show All".`,
        "morecrafting": `Niektóre bloki odblokowują dodatkowe receptury, gdy stoisz w ich pobliżu, np. Fermentator, Manipulator Drewna, Unknown, Piec czy Ognisko ( Każdy przedmiot który może być urzyty w ten sposób ma żułty tekst ). Możesz zobaczyć receptury klikajac w ekwipunku "Show All"`,
        "caves": `W jaskiniach możesz natknąć się na dziwny portal i inną tajemniczą dziurę. Dziura przenosi cię do wymiaru piekła, a portal do wymiaru otchłani. Znajdziesz też cenne minerały. Jeżeli chesz zniszczyć sciane w jaskini potrzebujesz kilof!`,
        "weapons": `Nie możesz atakować wrogów gołymi rękami, więc najpierw stwórz broń. Dobry wybór na początek to "Zaostrzony kij", "Długa włócznia" lub "Kościany miecz". Bardziej zaawansowaną broń możesz wytwarzać w kowadle.\n \n Tak poza tym bronie są pokazane z jasno niebieskim tekstem `,
        "underwater": `Pod wodą masz pasek powietrza. Gdy spadnie do 0, otrzymasz obrażenia. Uważaj: meduzy mogą zabić cię szybciej niż utonięcie!`,
        "unknown": `Możesz stworzyć Przywoływacz Bossa. Kliknięcie "Unknown" przywoła bossa, więc bądź ostrożny! Zacznij od Voltary i dotrzyj do True Universe.`,
        "red anvil": `Czerwone kowadło odblokowuje przepisy na magiczne przedmioty, co czyni je bardzo wartościowym.`,
        "farming": `Możesz uprawiać rośliny, sadząc nasiona w ziemi . mogą rosnąć wszędzie.\n Opieńki rosna w deszczu w lesie na kłodach drewna. `,
        "cooking": `Możesz gotować przy ognisku lub w piecu, aby przygotować ugotowane jedzenie. Gotowanie sprawi, że niektóre potrawy będą jadalne, na przykład mięso królika.\n\nKażde jadalne jedzenie jest wyświetlane zielonym tekstem.\nJeśli nie chcesz jeść, po prostu użyj opcji „drop all items” w ustawieniach lub przycisku szybkiego dostępu.`,
        "exploration": `Eksploracja świata pozwala znaleźć ukryte skarby, tajne lokacje i rzadkie surowce. Możesz znaleźć Wulkan Kaniony Lasy Śnieżne lasy Pustynie i Bagna`,
        "extra":`Czy wiesz, że możesz użyć zabudowywacza jaskiń, aby zabudować wejście podwodne lub wejście do jaskini? \n\n Niektóre ustawienia są przydatne, spróbuj z nimi poeksperymentować`,
        "controls":`Telefon:\n joystick poruszaj graczem kliknij dropAny ustawiony w quickbutton by upuścić każdy przedmiot przydatne jeżeli nie chesz zjeść danego jedzenia \n\nKomputer:\n wasd- poruszanie  , scroll zmiana slota (jeżeli kursor będzie na ekranie gry) lub scrollowanie receptur , x- ekwipunek , c- urzyj wybranego przedmiotu, q- przełącz quickbutton np DropAny , z - przełącz kolejny quickbutton e - przełącz shootenabled ( strzelanie ) `
    }
}
let itemstrans = { 
    "pl": { 
        "red anvil": "czerwone kowadło",
        "underwater": "pod wodą",
        "weapons": "bronie",
        "caves": "jaskinie",
        "morecrafting": "więcej receptur",
        "tree": "drzewo",
        "swimming": "pływanie",
        "farming": "uprawa",
        "cooking": "gotowanie",
        "exploration": "eksploracja",
        "extra":"ekstra",
        "controls":"sterowanie "
    }
};
let langPlactive = 0;
function showTutorial() {
	document.getElementById("helpmenu").style.display = "block";
	document.getElementById("helpmenu2").style.display = "block";
	document.getElementById("detailView").style.display = "none";
	document.getElementById("helpmenu2").innerHTML = "";
	let lang = langPlactive ? "pl" : "en";
	let keys = Object.keys(tutorialhelps[lang]);
	keys.forEach(key => {
		let displayName = langPlactive && itemstrans["pl"][key] ? itemstrans["pl"][key] : key;
		let div = document.createElement("div");
		div.style.width = "100%";
		div.style.height = "30px";
		div.style.background = "rgb(20,20,20)";
		div.style.marginTop = "5px";
		div.style.display = "flex";
		div.style.alignItems = "center";
		div.style.paddingLeft = "10px";
		div.style.color = "white";
		div.textContent = displayName;
		div.onclick = () => showDetail(key);
		document.getElementById("helpmenu2").appendChild(div);
	});
}
function showDetail(key) {
	let lang = langPlactive ? "pl" : "en";
	let text = tutorialhelps[lang][key];
	document.getElementById("helpmenu2").style.display = "none";
	document.getElementById("detailView").style.display = "block";
	document.getElementById("detailText").textContent = text;
}
var tutorial=0;
var langDEactive=0;
    var splashTexts = [
  "<span style='font-style:italic;'>Invisible Chicken Detected</span>",
  "<span style='text-decoration:underline;'>You Shall Not Pass!</span>",
  "<span style='color:magenta;'>Rainbow Explosion!!!</span>",
     "New Visuals ",
        "Other side on the other road",
        "Splash Text is always welcome",
        "Powered with HTML5!",
        "Hello World",
        "Try randomloot",
        " Badseed is bad",
        "Try rock seed",
        "Try night seed",
        "Ahh primoria ferox classic soundtrack",
        "The world is as simple as black and white",
        "Anyone can code. You just need to drink a lot of coffee",
        "Greetings to my colleagues ;)",
        "You meet Ohio Rizzler final boss",
        "Did you know that 100% of living people are alive",
        "Now on Android with Java!",
        "console.log('hello world!')",
        "Scientists have confirmed that yawning repels evil demons",
        "It's always a good time for coffee!",
        "No, this isn't Terraria!",
        "Click Show More to show recipes",
        "Explore the world and you will find something interesting",
        "Cut down some trees!",
        "The diamond is unbreakable.",
        "Remember, you don't come back after death!",
        "There are ghosts in the forest, so be careful!",
        "This game is made in JavaScript, that's why it's so good.",
        "Don't drown underwater",
        "Underwater and desert are not the best places to live",
        "Weapon is a priority!",
        "Does anyone have an idea for a splash text?",
        "Go touch some grass",
        "Made in JS",
        "Gigachads always code on a phone",
        "Do you write assembly code?",
        "~ Nya",
        "You are the main character!",
        "Do you like Primoria OSTs?",
        "You are hacked, lmfao!",
        "This is not a virus",
        "printf(\"hello world!\")",
        "Why is '2' Not a Number?!",
        "My name is Yes",
        "Pōrando!",
        "We have 60% DNA from bananas",
        "Meow meow, I'm a bird",
        "I tell you a secret: spam save button to get an achievement",
        "OMG, I didn't know that grass is green!",
        "0/0 & √(-1) == undefined",
        "The aliens will cooperate",
        "Mice dream about cheese castles",
        "If you can do 5 push-ups, then you can definitely pet a dog",
        "Cats are not missiles!",
        "Remember that cats have 9 lives and humans only have one",
        "The game looks like it was made in Ohio, but it's in Poland",
        "Omae wa mou shindeiru",
        "[Object Object] is my love",
        "Primoria Bizarre Adventure",
        "Universe!",
        "Two plus two is five!",
        "2 * 2 + 2 = 8!",
        "Aliens will come, it's only a matter of time",
        "Out of splash text ideas",
        "Jikan wa sugite modoranai",
        "Game is 'Gluten Free'",
        "If mitochondria are the powerhouse of the cell, then your fridge is the powerhouse of snacks",
        "If you know the speed of light, you can surely outrun a snail",
        "If you can see your Stand, then you definitely have schizophrenia.",
        "Anime is real",
        "If you don't learn to swim, you'll drown.",
        "Au revoir, je ne reviens pas",
        "Bonjour le monde",
        "Rest is a priority",
        "What do you think about thinking about what do you think and think about what think do you think ?",
        "Did you know that you can't cut down a tree without an axe?",
        "Without tree fibers you can't do almost anything",
        "The blocks are weird but that's normal",
        "Some blocks can be covered by other blocks or objects.",
        "Without a weapon you are weak",
        "English or Spanish.",
        "The game probably deserves a PEGI 13+",
        "The desert is not safe. badseed even more so",
        "Dlaczego jest tu polski splash ? ",
        "Back on track and back to the madness",
        "Isekai isn't real",
        "I lock little kitties in my code ^_^",
      "<span style='color:blue'>=`ᢦ ᤪ ᢦ`=</span>   why im even doing that sh*meow*t",
    `<span style="color: red;">R</span><span style="color: orange;">a</span><span style="color: #f0e000;">i</span><span style="color: green;">n</span><span style="color: blue;">b</span><span style="color: indigo;">o</span><span style="color: violet;">w</span><span style="color: red;">!</span>`,
    "Crafting is not witchcraft... or is it?",
    "May the frame rate be with you!",
    "404: Splash text not found",
    "This message was brought to you by a friendly slime",
    "Reality has bugs too",
    "Insert witty splash here",
    "Every chest is a mystery box",
    "Even the trees have eyes... maybe",
    "Press F to respect the tutorial",
    "Yoo Yoo Yoo",
    "Multiplayer Tests will come out soon ... in 1.8.9 ",
    "Rule 1. Break the rule 1 ",
    "I HEARD . MmmHmHmh",
    "New sounds!"
    ];
    var splashTextsPL = [
      "Co sądzisz o tym o tym co sądzisz co sądzisz o sądzisz sądzisz ?",
  "Yoo Yoo Yoo",
    "Testy Multiplayer'a wyjdą niedługo w 1.8.9 ...",
    "Zasada nr 1 Złam zasadę nr 1",
    "Usłyszałem. MmmHmHmh",
    "Nowe dźwięki!",
      "<div style='float:left;' ><div style='background:white; width:40px; height:10px;'> </div><div style='background:red; width:40px; height:10px;'> </div></div><polska style='float:left;margin:7px;' >Polska Gurom</polska>",
      "Isekai nie istnieje",
      "Zamykam małe kotki w moim kodzie ^_^",
      "Back on track i przejdź na madness",
      "Why is there an English splash here?",
      "Angielski czy hiszpański. Nieważne. W każdym razie nikt nie jest gejem",
      "Gra prawdopodobnie zasługuje na PEGI 13+ ",
      "Pustynia Jest nie bezpieczna. badseed jeszcze bardziej ",
      "Bloki są dziwne ale to normalne",
      "Niektóre bloki można przykryć innymi blokami lub przedmiotami",
      "Bez broni jesteś bezbronny",
      "Bez włókien drzew nie zrobisz prawie wszystkiego!",
      "Co myślisz o myśleniu o tym, co myślisz i myślisz o tym, co myślisz?",
      "Wiedziałeś że bez siekiery nie zetkniesz drzewa?",
        "Druga strona na drugiej drodze",
        "Tekst powitalny zawsze mile widziany",
        "Działa na HTML5!",
        "Witaj świecie",
        "Ahh, klasyczna ścieżka dźwiękowa Primoria Ferox",
        "Świat jest tak prosty jak czerń i biel",
        "Każdy może kodować. Wystarczy dużo kawy",
        "Pozdrowienia dla moich kolegów ;)",
        "Spotykasz ostatecznego bossa Ohio Rizzlera",
        "Czy wiesz, że 100% żyjących ludzi żyje?",
        "Teraz na Androidzie z Java!",
        "console.log('witaj świecie!')",
        "Naukowcy potwierdzili, że ziewanie odpędza złe demony",
        "Zawsze jest dobry czas na kawę!",
        "Nie, to nie jest Terraria!",
        "Kliknij Pokaż więcej, aby zobaczyć przepisy",
        "Eksploruj świat, a znajdziesz coś ciekawego",
        "Wiedziałeś że pustynne potwory dropią medalion szybkości i rdzeń pustynny",
        "Zabijaj mroźne duchy by zdobyć ważne materiały urzywane w specjalnym kowadle",
        "Drewno Palmowe nadaje się tylko do opału ",
        "Latające koty w czeluści dropia gemy",
        "Ścinaj drzewa!",
        "Diament jest niezniszczalny.",
        "Pamiętaj, po śmierci nie wracasz!",
        "W lesie są duchy, bądź ostrożny!",
        "Ta gra jest napisana w JavaScript, dlatego jest taka dobra.",
        "Nie ton pod wodą",
        "Woda i pustynia to nie najlepsze miejsca do życia",
        "Broń to priorytet!",
        "Ktoś ma pomysł na tekst powitalny?",
        "Idź dotknij trawy",
        "Zrobione w JS",
        "Gigachady zawsze kodują na telefonie",
        "Piszesz w asemblerze?",
        "~ Nya",
        "Jesteś głównym bohaterem!",
        "Lubisz OST-y Primorii?",
        "Zostałeś zhakowany, haha!",
        "To nie jest wirus",
        "printf(\"witaj świecie!\")",
        "Dlaczego '2' nie jest liczbą?!",
        "Nazywam się Tak",
        "Polska!",
        "Mamy 60% DNA z bananów",
        "Miau, jestem ptakiem",
        "Powiem ci sekret: spamuj przycisk zapisu, aby zdobyć osiągnięcie",
        "Omg, nie wiedziałem, że trawa jest zielona!",
        "0/0 & √(-1) == undefined",
        "Obcy będą współpracować",
        "Myszy śnią o zamkach z sera",
        "Jeśli umiesz zrobić 5 pompek, możesz pogłaskać psa",
        "Kot to nie pocisk!",
        "Pamiętaj, że koty mają 9 żyć, a ludzie tylko jedno",
        "Gra wygląda, jakby była zrobiona w Ohio, ale to Polska",
        "Omae wa mou shindeiru",
        "[Object Object] to moja miłość",
        "Primoria Dziwna Przygoda",
        "Wszechświat!",
        "Dwa plus dwa to pięć!",
        "2 * 2 + 2 = 8!",
        "Obcy przybędą, to tylko kwestia czasu",
        "Nie mam pomysłów na tekst powitalny",
        "Jikan wa sugite modoranai",
        "Gra jest 'Bezglutenowa'",
        "Jeśli mitochondria to siłownia komórki, to lodówka to siłownia przekąsek",
        "Jeśli znasz prędkość światła, na pewno prześcigniesz ślimaka",
        "Jeśli widzisz swojego Standa, to masz schizofrenię.",
        "Anime jest prawdziwe",
        "Jeśli nie nauczysz się pływać, utoniesz.",
        "Au revoir, nie wrócę",
        "Witaj świecie",
        "Odpoczynek to priorytet",
        "Rzemiosło to nie czarna magia... a może jednak?",
    "Niech klatki będą z tobą!",
    "404: Tekst powitalny nie znaleziony",
    "Ten komunikat sponsoruje przyjazny szlam",
    "Rzeczywistość też ma błędy",
    "Wstaw zabawny tekst tutaj",
    "Każda skrzynia to niespodzianka",
    "Nawet drzewa mają oczy... chyba",
    "Wciśnij F, by uszanować samouczek"
    ];
    function splashrandomize() {
        const splash = document.getElementById('splashText');
        const texts = langPlactive ? splashTextsPL : splashTexts;
        splash.innerHTML = texts[  Math.floor(Math.random() * texts.length)];
    }
document.addEventListener('keydown', function (e) {
	const tag = event.target.tagName.toLowerCase();
if (tag === 'input' || tag === 'textarea') return;
	const splash = document.getElementById('splashText');
const texts = langPlactive ? splashTextsPL : splashTexts;
    if (e.key.toLowerCase() === 'f' && isPlaying === 0) {
        const currentSplash = splash.textContent || splash.innerText;
const isEnglishMatch = currentSplash.startsWith(
	"Press F to respect the tutorial");
 const isPolishMatch = currentSplash.startsWith(
 	"Wciśnij F, by uszanować samouczek");
        if (langPlactive && isPolishMatch) {
            splash.innerHTML = "Dziękuję za uszanowanie samouczka";
        } else if (!langPlactive && isEnglishMatch) {
            splash.innerHTML = "Thank you for respecting the tutorial";
        }
    }
});
    splashrandomize();
    const loadingTexts = [
      "Did you know that desert monsters drop the Medallion of Speed and the Desert Core", "Kill frost spirits to get important materials used in the special anvil", "Palmwood is only good for firewood", "Flying cats in the abyss drop gems",  
      "To destroy tree you need an axe",
      "Bed sets your respawn point", "Abyss is really dangerous place being here without dark sword or any greater sword may be dangerous",
      "Craft Buff to be more stronger in defense ",
      "Ilmenite is used to craft Titanium buff craft alchemy table to turn it to titanium dioxide",
      "You can't kill enemies without any weapon :(",
      
      "Item bags can boost your inventory space",
      "Hell is more dangerous than abyss",
      "Do not Go into caves without torches or hand torch and weapon better than pointed stick",
      "Ducks drop Feathers",
      " Magic Wands Are USE-less ",
      "Loading... go touch some grass!",
            "Please wait, we're fetching the stars!",
            "Hang tight! The magic is happening.",
            "Loading your dreams...",
            "Just a moment, we're brewing some coffee!",
            "Almost there, enjoy the view!",
            "Loading... think about your next adventure!",
            "Please wait, checking with the universe...",
            "Loading... grab a snack!",
            "Hang on! We're putting things together!",
            "Wait umm you know .. This is a settimeout lol ",
            "We hate fake loading screen. So i made one",
            "Loading... don't worry, it's not a black hole! iTs jUsT a BlAcK sCrEeN",
    "Please hold on, we're training squirrels to fetch data!",
    "Just a sec! We're synchronizing with the cat memes database.",
    "Almost there! Counting clouds and unicorns.",
    "Hang tight! We're checking if the coffee is strong enough.",
    "Loading... time to ponder the meaning of life!",
    "Please Trying To Connect With Nearest UFO",
    "Loading... remember to breathe and stretch!",
    "Just a moment, we're negotiating with the Wi-Fi gremlins!",
    "Hold off! The area is under construction.",
"Do you know you know ?",
"Wait! we're trying to connect with Earendel!",
"Loading... searching for lost socks and missing keys!",
    "Please hang on, we're calibrating the time machine!",
    "Loading... contemplating the mysteries of the universe!",
    "Just a moment, our team of hamsters is hard at work!",
    "Loading... counting the grains of sand on the beach!",
    "Please wait, we're tuning the cosmic radio!",
    "Loading... waiting for the next episode of life!",
    "Hang tight! Our ducks are in a row... sort of!",
    ".. you knew no one cared  ",
"Not only people work. Computers too..",
"Code Treatment Clinic?",
"be patient, loading can take some time ...",
"Dont worry this will always annoy you ..",
        ];
        const loadingTextsPL = [
      "Wiedziałeś że Potwory na pustyni mogą upuścić medalion prędkości i rdzeń pustynny", "Zabijaj Lodowe duchy by zdobyć ważne materiały do czerwonego kowadła", "Drewno palmowe nadaje się tylko do opału", "Latające koty dropia gemy",
      "By zniszczyć Drzewo potrzebujesz Siekiery",
      "Łuzko ustawia twuj punkt odradzania", "Czeluść jest groźnym miejscem może być nie bezpieczne bez broni jak ciemny miecz lub lepszej",
      "Stwórz Buffy by być silniejszy w defensywie",
      "ilmenit jest urzywany do stworzenia tytanu w stole alchemicznym",
      "Nie możesz zabić żadnego wroga bez broni :(",
      "Plecaki na przedmioty dają ci dodatwoe miejsce w ekwipunku",
      "Piekło jest niebezpieczne nawet bardziej niż czeluść ",
      " Nie wchodź do jaskiń bez pochodni i broni lepszej niż ostry kij",
      "Kaczki Dropia Piura urzywane do tworzenia strzał ",
      " różdżki są bez-URZYTECZNE",
    "Ładowanie... idź dotknąć trawy!",
    "Proszę czekać, łapiemy gwiazdy!",
    "Trzymaj się! Dzieje się magia.",
    "Ładowanie twoich marzeń...",
    "Chwila, parzymy kawę!",
    "Prawie gotowe, podziwiaj widoki!",
    "Ładowanie... pomyśl o swojej kolejnej przygodzie!",
    "Proszę czekać, konsultujemy się z wszechświatem...",
    "Ładowanie... weź sobie przekąskę!",
    "Chwila! Składamy wszystko do kupy!",
    "Czekaj... wiesz, że to tylko setTimeout? Lol",
    "Nienawidzimy fałszywych ekranów ładowania, więc zrobiłem jeden",
    "Ładowanie... spokojnie, to nie czarna dziura! To tYlKo cZaRnY eKrAn",
    "Proszę chwilę poczekać, szkolimy wiewiórki do zbierania danych!",
    "Chwila! Synchronizujemy się z bazą memów o kotach.",
    "Prawie gotowe! Liczymy chmury i jednorożce.",
    "Trzymaj się! Sprawdzamy, czy kawa jest wystarczająco mocna.",
    "Ładowanie... czas zastanowić się nad sensem życia!",
    "Proszę czekać, nasz robot wykonuje mały taniec.",
    "Ładowanie... pamiętaj, żeby oddychać i się rozciągnąć!",
    "Chwila! Negocjujemy z gremlinami Wi-Fi!",
    "Zatrzymaj się! Obszar w budowie.",
    "Czy wiesz, czym jest Sigma Skidibi?",
    "Czekaj! Próbujemy połączyć się z Earendel!",
    "Ładowanie... szukamy zaginionych skarpetek i kluczy!",
    "Proszę czekać, kalibrujemy wehikuł czasu!",
    "Ładowanie... rozważamy tajemnice wszechświata!",
    "Chwila! Nasza ekipa chomików ciężko pracuje!",
    "Ładowanie... liczymy ziarenka piasku na plaży!",
    "Proszę czekać, dostrajamy kosmiczne radio!",
    "Ładowanie... czekamy na kolejny odcinek życia!",
    "Trzymaj się! Nasze kaczki są w rządku... mniej więcej!",
    ".. wiedziałeś, że nikogo to nie obchodzi",
    "Nie tylko ludzie pracują. Komputery też...",
    "Klinika leczenia kodu?",
    "Bądź cierpliwy, ładowanie może chwilę potrwać...",
    "Nie martw się, to zawsze będzie Cię irytować..."
];
        function updateTextMenuLoading() {
            const loadingMenu = document.getElementById('loadingMenu');
            const texts = langPlactive ? loadingTextsPL : loadingTexts;
loadingMenu.innerHTML = texts[Math.floor(Math.random() * texts.length)]; 
 
             if(document.getElementById('loadingScreen')){
                 document.getElementById('loadingScreen').innerText=loadingMenu.innerText 
             }
        }
        updateTextMenuLoading();

    const htmltranslations = {
      "pl": {
                "readme": `<span style="color: lightblue;">Cześć!</span> Jestem <span style="color: orange;">Krystian Popiołek</span>, twórca gier z <span style="color: yellow;">Polski</span>, który uwielbia gry survivalowe.  
Jest to moją największa gra do tej pory
Stworzyłem <span style="color: cyan;">Całą grę od podstaw</span>—muzykę, grafikę i cały kod.  
Mam nadzieję, że Ci się spodoba!  
Ta gra jest napisana w całości w<span style="color: gold;">  JavaScript</span>/<span style="color: darkred;">Html</span>, bez silników i bibliotek.  
Do muzyki użyłem <span style="color: violet;">FruitBox</span>. . .
Masz pomysł na grę/ lub aktualizacje gry primoria ? Możesz podzielić się nim pod  
<span style="color: pink;">awlie8518@gmail.com</span> lub na  
**Kashumy GitHub** → <span style="color: lightgreen;">Primoria Ferox issues</span>.  
<span style="color: red;">kashumy.github.io</span> <span style="color: gray;">© Wszelkie prawa zastrzeżone</span>  
<span style="color: silver;">Data Wydania:</span> 24.21.12
<span style="color: yellow;">Zmiany w tej wersji:</span>  
- Poprawki bledów 
- nowe menu
`
      },
      "en": {
"readme":`<span style="color: lightblue;">Hello!</span> I'm <span style="color: orange;">Krystian Popiołek</span>, a game developer from <span style="color: yellow;">Poland</span> who loves survival games.  
This is my biggest game so far.  
I have created <span style="color: cyan;">the entire game from scratch</span>—music, graphics, and all the code.  
I hope you like it!  
This game is written entirely in <span style="color: gold;">  JavaScript</span>/<span style="color: darkred;">Html</span>, without engines or libraries.  
For the music, I used <span style="color: violet;">FruitBox</span>. . .
Got a game/or primoria update  idea? You can share it at  
<span style="color: pink;">awlie8518@gmail.com</span> or on  
**Kashumy GitHub** → <span style="color: lightgreen;">Primoria Ferox issues</span>.  
<span style="color: red;">kashumy.github.io</span> <span style="color: gray;">© All rights reserved</span>  
<span style="color: silver;">Date:</span> 24.21.12
<span style="color: yellow;">Changes in this version:</span>  
- Bug fixes 
- new menu
`
      }
    }
    const translations = {
    "pl": {
        "start": "Graj",
        "settings": "Ustawienia ",
        "options": "",
        "startmenu":`Graj <img src='./settings.png' id="settings" style="position:absolute; top:0;  right:0px; background-color:#5c5c5c; image-rendering:pixelated; height:calc(100%);" onclick="event.stopPropagation(); document.getElementById('settingscontainer').style.display='block';" ></img>`,
        "multiplayer":"Gra Wieloosobowa",
        "about": "O Mnie",
        "languageselect":"Wybierz Język :",
        "load":"Wczytaj plik PFD",
        "tutorial":"Samouczek :",
        "newgame":"Nowa Gra/Kontynuuj",
        "continue":"Kontynuuj ?",
        "seedplay":"Uruchom Ziarno",
        "music": "Music",
        "sfx": "Sfx sound effects",
        "ocmusic":"Only classical music "
    },
    "en": {
        "start": "Play",
        "settings":"Settings ",
        "options":"",
        "languageselect":"Select Language :",
        "tutorial":"Tutorial :",
        "multiplayer":"Multiplayer.",
        "startmenu":`Play <img src='./settings.png' id="settings" style="position:absolute; top:0;  right:0px; background-color:#5c5c5c; image-rendering:pixelated; height:calc(100%);" onclick="event.stopPropagation(); document.getElementById('settingscontainer').style.display='block';" ></img>`,
        "about": "About",
        "load": "Load PFD file",
        "newgame":"New game/Continue ",
        "continue":"Continue ?",
        "seedplay":"Play seed",
        "music":"Muzyka",
        "sfx":"Efekty dźwiękowe",
        "ocmusic":"Tylko klasyczna muzyka"
    }
};
function translatePage(lang) { document.querySelectorAll("[data-lang]").forEach((el) => {let key = el.getAttribute("data-lang");if(translations[lang][key]){el.innerHTML = translations[lang][key];} });
  document.querySelectorAll("[data-lang]").forEach((el) => {let key = el.getAttribute("data-lang");if(htmltranslations[lang][key]){el.innerHTML = htmltranslations[lang][key];} });
}
setTimeout(function (){
translatePage("en")
},3000)
function changeLanguage() {
const selectElement = document.getElementById('languageSelect');
const selectedValue = selectElement.value;
    if (selectedValue === 'pl') {
        langPlactive = 1; 
        translatePage("pl");
        splashrandomize();
    } else {
        langPlactive = 0; 
        translatePage("en");
        splashrandomize();
    }
}
    setTimeout(function(){
      document.getElementById("gameversion1").innerHTML = gameversion
    },1000);
            const loader = document.getElementById('loader');
            const logo = document.getElementById('logo');
            setTimeout(function (){
            logo.style.display = 'block';
logo.style.animation = 'fadeIn 2s forwards rainbow 10s forwards infinite ';
            setTimeout(() => {
                logo.style.animation = 'fadeOut 4s forwards rainbow 10s forwards infinite'; 
            }, 1000);
setTimeout(()=>{
  logo.style.animation = 'fadeOut 0.5s forwards';
},2000)
            setTimeout(() => {
              loader.style.animation = 'fadeOut 4s forwards';
              loader.style.pointerEvents = 'none';
              upadtegameslots()
            }, 2500);  
setTimeout(() => {
  loader.style.display = 'none';
}, 10000);
},5000)
    var diedRMEN=0
    let options = {
    	nightvision:0,
      showleafes:1,
      noleafes:1,
      showfps:0,
showuiinventory:1,
fullscreen:0,
  autoclose: 0,
  dontbreakfloor: 0,
  dropany: 0,
  creativemode: 0,
  autopause: 1,
  fightmode: 0,
  fancygraphic: 0,
  quickinventory: 1,
  noclip: 0,
  zoomout: 0,
  biggerzoomout: 0,
  hyperzomout: 0,
  Fskipping: 0,
  hideBlocksnumber: 0,
  showEveryBlocksNumber: 0,
  invertControls: 0,
  fancynight: 1,
  oldlight: 0,
  editblocks: 1,
  lightplusplus:1,
  shoot: 1,
  nomusic: 0,
  rendermode: 12,
  quickbutton: 2 ,
  quickbuttonselected:0,
  invertBars: 0,
};
let takedamage = new Audio2('./hit.mp3',1);
takedamage.loop=false
let deathsound = new Audio2('./dead.mp3',1);
let collectsound = new Audio2('./collect.mp3',1);
    function playdeathsound() {
    	deathsound.volume= inoptions["sfxvolume"];
  deathsound.play();
}
let thundersound= new Audio2('./tunder.mp3',1);
thundersound.volume=0.3
    function playthundersound() {
    	deathsound.volume= 0.3*inoptions["sfxvolume"];
  thundersound.play();
}
let rainsound= new Audio2('./rain1.mp3',1);
var rainsoundavailable=true;
rainsound.loop=true
rainsound.volume=0.3
    function playRain() {
      if(inhell!==1){
  rainsound.play();
}}
function stopRain() {
  rainsound.pause();
}
function playcollectsound() {
  collectsound.play();
}
function playhitmp3() {
	takedamage.volume= inoptions["sfxvolume"];
  takedamage.play();
}
function DIED(){
	 
 

	if(options.nomusic==1 || inoptions["musicvolume"] == 0 )return;
	stopSnowyMusic();
stopVulcano();
stopForest();
stopCanyon()
stopSwamp();
stopSwampfrog();
stopCementary();
stopDesertMusic();
	startDiedSound()
}
let scheduleEnemies=[]
function checkIfItems(item, amount) {
            let count = yourItems.filter(i => i === item).length;
            return parseInt(count) >= amount;
        }
      let maxHP = 100; 
      let currentHP = 100; 
      let currentStamina = 100; 
      let currentThirst = 100; 
      let currentHunger = 100; 
      function updateHealth(amount) {
         if(checkIfItems("dracobuff",1)){
          if(amount<1){
          amount=amount/1.25
        }}else if(checkIfItems("hellbuff",1)){
          if(amount<1){
          amount=amount/1.10
        }} else if(checkIfItems("titaniumbuff",1)){
          if(amount<1){
          amount=amount/1.3
        }}else if(checkIfItems("osmiumbuff",1)){
          if(amount<1){
          amount=amount*2
        }}
        currentHP = Math.max(0, Math.min(maxHP, currentHP + amount));
playhitmp3()
if(currentHP<50){
}
        const healthBar = document.getElementById('healthBar');
        const healthPercentage = (currentHP / maxHP) * 100;
        healthBar.style.width = healthPercentage + '%';
        if(currentHP<=1){
          currentHP=100;
          if(options.creativemode!==1){
          playdeathsound();
          for(let i =0; i< yourItems.length; i++){
           if(yourItems[i]!==""&&yourItems[i]!==" "&&yourItems[i]!==undefined){
           dropItemAtPlayerPosition2(yourItems[i])
          }}
          yourItems=[] 
if (isunderwater == 1) {
    seachunks = { ...chunks };
    chunks = overworldChunks;
    isunderwater = 0;
}else if (generateCave == 1) {
    caveChunks = { ...chunks };
    chunks = overworldChunks;
    generateCave = 0;
} else if (inhell == 1) {
    seachunks = { ...chunks };
    chunks = overworldChunks;
    inhell = 0;
}else if (inabyss == 1) {
    abysschunks = { ...chunks };
    chunks = overworldChunks;
    inabyss = 0;
}else if (isinhouse == 1) {
    housechunks = { ...chunks };
    chunks = overworldChunks;
    isinhouse = 0;
}else if (inether == 1) {
	etherchunks = { ...chunks };
	chunks = overworldChunks;
	inether = 0;
}

let oldlv = stats.lv
const x = offsetX + (canvas.width/2)
const y = offsetY + (canvas.height/2)
const randomSpell = "orb";
let bat = new Enemy(x, y, randomSpell);
bat.type = "orb"
bat.width = 32;
bat.height = 32;
bat.speed = 1;
bat.givexp = oldlv || 1;
bat.givexp= bat.givexp/1.1
scheduleEnemies.push(bat);

offsetX = 0;
offsetY = 0;
if(player.savedinworld=="house"){
if(!housechunks.length<2){
isinhouse=1
overworldChunks = { ...chunks };
chunks = housechunks;
offsetX = player.spawnX;
offsetY = player.spawnY;
}else{
  player.savedinworld=''
}
}
stopMovement=1
stopMovementTicks=10
if(player.spawnX){
offsetX = player.spawnX;
offsetY = player.spawnY;
}
diedRMEN=1
paused=0
currentHunger=100;
currentThirst=100;
updateHunger(0)
updateThirst(0)
cannotmove=0
achievementget("You died LMFAO ",0)
diedrespawn=1
showTextInCanvas("YOU DIED")
DIED()
stats = { lv: 0 }
          }
         const healthBar = document.getElementById('healthBar');
const healthPercentage = (currentHP / maxHP) * 100;
healthBar.style.width = healthPercentage + '%';
setTimeout(function (){
},200);
if(nightpower<0){
 nightpower=0
}
        }
      }
      
let stats={lv:0}


function updateStats() {
	let level= isNaN(stats.lv/ stats.lv**0.15)  ? 0 : stats.lv/ stats.lv**0.12
        const healthBar = document.getElementById('lvBar');
        const healthPercentage = ((((level) %0.1) / 1)) * 1000;
        healthBar.style.width = healthPercentage + '%';
        document.getElementById("lvtext").innerText="Lv: "+Math.floor(((((level)) / 1))/100 * 1000  *10)/10
}
updateStats()

      function updateHealth2(amount) {
         if(checkIfItems("dracobuff",1)){
          if(amount<1){
          amount=amount/1.25
        }}else if(checkIfItems("hellbuff",1)){
          if(amount<1){
          amount=amount/1.10
        }} else if(checkIfItems("titaniumbuff",1)){
          if(amount<1){
          amount=amount/1.3
        }}else if(checkIfItems("osmiumbuff",1)){
          if(amount<1){
          amount=amount*1
        }}
        currentHP = Math.max(0, Math.min(maxHP, currentHP + amount));
if(currentHP<50){
}
        const healthBar = document.getElementById('healthBar');
        const healthPercentage = (currentHP / maxHP) * 100;
        healthBar.style.width = healthPercentage + '%';
        if(currentHP<=1){
          currentHP=100;
          if(options.creativemode!==1){
          playdeathsound();
          options.dropany=1
          for(let i =0; i< yourItems.length; i++){
           if(yourItems[i]!==""&&yourItems[i]!==" "&&yourItems[i]!==undefined){
           dropItemAtPlayerPosition2(yourItems[i])
          }}
          yourItems=[] 
if (isunderwater == 1) {
	seachunks = { ...chunks };
	chunks = overworldChunks;
	isunderwater = 0;
} else if (generateCave == 1) {
	caveChunks = { ...chunks };
	chunks = overworldChunks;
	generateCave = 0;
} else if (inhell == 1) {
	seachunks = { ...chunks };
	chunks = overworldChunks;
	inhell = 0;
} else if (inabyss == 1) {
	abysschunks = { ...chunks };
	chunks = overworldChunks;
	inabyss = 0;
} else if (isinhouse == 1) {
	housechunks = { ...chunks };
	chunks = overworldChunks;
	isinhouse = 0;
} else if (inether == 1) {
	etherchunks = { ...chunks };
	chunks = overworldChunks;
	inether = 0;
}
let oldlv = stats.lv
const x = offsetX + (canvas.width / 2)
const y = offsetY + (canvas.height / 2)
const randomSpell = "orb";
let bat = new Enemy(x, y, randomSpell);
bat.type = "orb"
bat.width = 32;
bat.height = 32;
bat.speed = 1;
bat.givexp = oldlv || 1;
bat.givexp= bat.givexp/1.1
scheduleEnemies.push(bat);

offsetX = 0;
offsetY = 0;
if (player.savedinworld == "house") {
	if (!housechunks.length < 2) {
		isinhouse = 1
		overworldChunks = { ...chunks };
		chunks = housechunks;
		offsetX = player.spawnX;
		offsetY = player.spawnY;
	} else {
		player.savedinworld = ''
	}
}
stopMovement=1
stopMovementTicks=10
if (player.spawnX) {
	offsetX = player.spawnX;
	offsetY = player.spawnY;
}
diedRMEN = 1
paused = 0
currentHunger = 100;
currentThirst = 100;
cannotmove = 0
achievementget("You died LMFAO ", 0)
diedrespawn=1
showTextInCanvas("YOU DIED")
DIED()

  
stats = { lv: 0 }
          }
         const healthBar = document.getElementById('healthBar');
const healthPercentage = (currentHP / maxHP) * 100;
healthBar.style.width = healthPercentage + '%';
setTimeout(function (){
},200);
nightpower=nightpower-1 
if(nightpower<0){
 nightpower=0
}
        }
      }
function updateStamina(amount) {
if (amount > 0 && currentStamina<maxHP ) {
  if (currentHP > 90 && isflying==0 ) {
    currentHP -= 0.15
    currentStamina += 0.8
const healthBar = document.getElementById('healthBar');
const healthPercentage = (currentHP / maxHP) * 100;
healthBar.style.width = healthPercentage + '%';
  }
}
        currentStamina= Math.max(0, Math.min(maxHP, currentStamina + amount));
        const staminaBar = document.getElementById('staminaBar');
        const staminaprocentage = (currentStamina / maxHP) * 100;
        staminaBar.style.width = staminaprocentage + '%';
        if(currentStamina<=1){
            if (checkIfItems("dracobuff", 1)) {
    updateHealth(-0.50)
        }else if (checkIfItems("hellbuff", 1)) {
           updateHealth(-0.35)
          }
          showTextInCanvas(" you are tried ")
          updateHealth(-0.25)
        }
      }
function updateThirst(amount) {
	currentThirst = Math.max(0, Math.min(maxHP, currentThirst + amount));
	const bar = document.getElementById('Vthirstbar');
	const staminaprocentage = (currentThirst / maxHP) * 100;
	bar.style.width = staminaprocentage + '%';
}
function updateHunger(amount) {
	currentHunger = Math.max(0, Math.min(maxHP, currentHunger + amount));
	const bar = document.getElementById('Vhungerbar');
	const staminaprocentage = (currentHunger / maxHP) * 100;
	bar.style.width = staminaprocentage + '%';
}
      updateHealth2(0);
function scanvarible(data){document.getElementById('ggsvbdnfnnfnnxkrgjgmvmfjrhf').innerText=data }
var paused=0;
 var style = document.createElement('style');
 style.type = 'text/css';
 style.innerHTML = `#infotoast {
    position: fixed;
    bottom: 20px;
    left: 50% ;
    transform: translateX( -50% );
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 3px;
    border-radius: 8px;
    display: none; 
    font-size:10px;
    z-index: 1000;
    transition: opacity 0.5s ease,
    bottom 0.5s ease;
}`;
style.innerHTML += `#infotoast2 {
    position: fixed;
    top: 20px;
    left: 50% ;
    transform: translateX( -50% );
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px;
    border-radius: 8px;
    display: none; 
    font-size:16px;
    z-index: 1000;
    transition: opacity 0.5s ease,
    top 0.5s ease;
}`;
document.head.appendChild(style);
function TextPopUp(text) {
    let toast = document.createElement('div');
    toast.id = 'infotoast';
    toast.innerText = text;
    document.body.appendChild(toast);
    toast.style.display = 'block';
    toast.style.opacity = '1';
    toast.style.bottom = '20px';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.bottom = '50px';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500); 
    }, 3000);
}
function TextPopUp2(text) {
    let toast = document.createElement('div');
    toast.id = 'infotoast2';
    toast.innerText = text;
    document.body.appendChild(toast);
    toast.style.display = 'block';
    toast.style.opacity = '1';
    toast.style.top = '20px';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.top = '50px';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500); 
    }, 3000);
}
function customAlert(message) {
    const modalId = `customAlertModal_${Date.now()}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    Object.assign(modal.style, {
        display: 'flex',
        position: 'fixed',
        zIndex: '99999',
        left: '0', 
        top: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'scroll'
    });
    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
        backgroundColor: '#1a1a1a', 
        color: 'white', 
        fontFamily: '"pffont"', 
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)', 
        width: '300px',
        borderRadius: '8px',
        textAlign: 'center',
        position: 'relative',
        height: '200px',
        overflow: 'hidden scroll',
        overflowX: 'hidden scroll',
        whiteSpace : 'pre-wrap'
    });
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    Object.assign(closeButton.style, {
        color: 'white', 
        fontSize: '24px',
        position: 'absolute',
        top: '10px',
        right: '10px',
        cursor: 'pointer'
    });
    closeButton.onclick = () => document.body.removeChild(modal);
    const messageParagraph = document.createElement('p');
    messageParagraph.innerHTML = message;
    Object.assign(messageParagraph.style, {
        marginBottom: '20px',
        width: '300px',
        overflow: ' scroll',
  overflowX: ' scroll',
    });
    const okButton = document.createElement('button');
    okButton.innerText = 'OK';
    Object.assign(okButton.style, {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    });
    okButton.onclick = () => document.body.removeChild(modal);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(messageParagraph);
    modalContent.appendChild(okButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}
 var nocliping=0
var blockSize = 32;
var playerX = 0
var playerY = 0
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; 
const inventory = {
    items: [], 
    maxSlots: 4, 
};
const waterBuilder = ["stone_floor", "fiber_floor","grasslayer","yellow","violet","thistle","clayblock","clayblock1","dandelion","toadstool","sandblock2","gypsumblock","glass","fern","planks_floor","log_floor","ashblock","ashfloor","brickfloor","daffodil","flax" ,"myosotis" ,"fiber_floor","bed1","magnetite","nettle","stone_floor","emeraldfloor","sapphirefloor","rubyfloor","opalblock","opalblock","violetfloor","gypsum_dirt","gypsumfloor","gelfloor","gelblock","fiber_floor", "grasslayer", "yellow", "violet", "clayblock", "clayblock1", "dandelion", "toadstool", "sandblock2", "gypsumblock", "glass", "fern", "planks_floor", "log_floor", "ashblock", "ashfloor", "brickfloor", "daffodil", "fiber_floor", "bed1", "magnetite", "nettle", "stone_floor", "emeraldfloor", "sapphirefloor", "rubyfloor", "clayblock1", "clayblock","violetfloor","toadstool","stones","thistle","ryeroof","houseroof","housewall","brickhouse","gelblock","gypsum_dirt","roadfloor","gypsumblock","gypsumfloor","brickfloor2","grass2","forestgrasslayer","deadgrassfloor2","deadgrassfloor","forestgrasslayer","hill","climbhill","hellplank","abyssplank","polishedfloor","snowgrass2","dandelion","dandelion2","smooth_stone","blossomblock","curedgrasslayer","road2"
  ,"coral1floor","coral2floor","swampgrasslay","peatfloor", "Hstone","Hstonelay","lily","canyonsandlayer","canyonsand","ethergrass2","ethersand2"
];
function isPlayerInWater() {
    let isInWater = false;
    for (const block of renderedBlocks) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        if (
            playerCenterX >= block.x && playerCenterX <= block.x + blockSize &&
            playerCenterY >= block.y && playerCenterY <= block.y + blockSize
        ) {
            if (block.type === 'water'||block.type === 'underwaterentrance'||block.type === 'water1'||block.type === 'shallowwater'||block.type === 'swampwater') {
                isInWater = true;
            }
            if(inether){
            if (block.type === 'etherwater') {
															isInWater = true;
												}
            }
            if (waterBuilder.includes(block.type)) {
                return false;
            }
        }
    }
    return isInWater;
}
let waterspeed = 3.1;
let norspeed = 5;
let playerSpeed = 5;
let Aplayerid=0;
let pvpactive=0; 
'tabCount'
'tabCount'
'tabCount'
'unload'
'tabCount'
'storage'
'tabCount'
'tabCount'
let worldsdimensions = {
    "currentdim": "ovw",
    "ovw": {},
    "hll": {},
    "abs": {},
    "hse": {},
    "sea": {}
}
function multiplayerLoop(){
    asynchronousHostUpdate()
}
function asynchronousHostUpdate(){
    asynchronousClientUpdate()
}
function asynchronousClientUpdate() {
}
let hostData={
    updatedKEYS:[] 
}
let clientData={
    updatedKEYS:[]
}
function localStorageSET(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
function localStorageGET(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}
let yourname = "name";
let players = {
    "name":{x:0,y:0,items:[],currentAnimation:"moveleft",speed:2,frameIndex:0,frameCounter:0,savedinworld:"", visibleinworld:"", texture: new Image(), hp:200 , frameIndex: 0, currentAnimation: "movedown", items: [], width: 32, height: 32, frameIndex: 0,  frameSpeed: 2,},
}
function drawPlayerInfo(playerData,name) {
    ctx.fillStyle = "white"; 
    ctx.font = "12px 'pffont'"; 
    ctx.letterSpacing = "1px"; 
    ctx.fillText(name, playerData.x - offsetX, playerData.y - offsetY - 10);
    ctx.font = "9px 'pffont'";
    ctx.fillStyle = "red";
    ctx.fillText(`${playerData.hp}/200`, playerData.x - offsetX-2, playerData.y - offsetY + 1);
}
function updateOthersAnimation() {
    for (const playerName in players) {
        if(playerName!==yourname){
        const playerData = players[playerName];
if(!playerData.frameCounter){
playerData.frameCounter=0;}if(!playerData.currentAnimation){
            playerData.currentAnimation="staydown"}
 if (!playerData.frameIndex || playerData.frameIndex == 0) {
    playerData.frameIndex = 0
}
const inWater = false
if (inWater) {
    updateStaminaForOtherPlayer(playerData, -0.2);
}     if (inWater || (checkIfItemsForPlayer(playerData, "broom", 1) && playerData.isflying == 1)) {
            if (playerData.currentAnimation=="moveright") playerData.currentAnimation = 'inwater_moveright';
            else if (playerData.currentAnimation=="moveleft") playerData.currentAnimation = 'inwater_moveleft';
            else if (playerData.currentAnimation=="moveup") playerData.currentAnimation = 'inwater_moveup';
            else if (playerData.currentAnimation=="movedown") playerData.currentAnimation = 'inwater_movedown';
        } else {
        }
        playerData.frameCounter++;
if (playerData.frameCounter >= playerData.frameSpeed) {
        playerData.frameIndex = (playerData.frameIndex + 1) % player.textures[playerData.currentAnimation].length;
        playerData.frameCounter = 0;
    }
let newTexture
 if (playerData.frameIndex +1 > player.textures[playerData.currentAnimation].length) {
 playerData.frameIndex -=1
 }
newTexture = player.textures[playerData.currentAnimation][playerData.frameIndex];
player.frameCounter2++;
if (player.frameCounter2 >= player.frameSpeed2) {
  player.frameIndex2 = (player.frameIndex2 + 1) % player.textures["waterstep"].length;
  player.frameCounter2 = 0;
}
if (player.frameIndex2 + 1 > player.textures["waterstep"].length) {
  player.frameIndex2 -= 1
}
let newTexture2
newTexture2 = player.textures["waterstep"][player.frameIndex2];
        if (checkIfItemsForPlayer(playerData, "broom", 1) && playerData.isflying == 1) {
            newTexture = armourstextures.broom[playerData.currentAnimation][playerData.frameIndex];
        } else if (checkIfItemsForPlayer(playerData, "dracobuff", 1) && !checkIfItems("invisiblearmourring",1) ) {
            newTexture = armourstextures.dracobuff[playerData.currentAnimation][playerData.frameIndex];
        } else if (checkIfItemsForPlayer(playerData, "hellbuff", 1)   && !checkIfItems("invisiblearmourring",1) ) {
            newTexture = armourstextures.hellbuff[playerData.currentAnimation][playerData.frameIndex];
        } else if (checkIfItemsForPlayer(playerData, "titaniumbuff", 1) && !checkIfItems("invisiblearmourring",1) ) {
            newTexture = armourstextures.titaniumbuff[playerData.currentAnimation][playerData.frameIndex];
        }
        playerData.texture = newTexture;
         playerData.texture = newTexture2;
    }}
}
function checkIfItemsForPlayer(playerData, itemName, quantity) {
    return false;
}
let player = {
    x: canvas.width / 2 -2,
    y: canvas.height / 2 +6.7,
    spawnX:0,spawnY:0,
    savedinworld:"",
    width: 32,
    height: 32,
    speed: 2,
    currentAnimation: 'staydown', 
    frameIndex: 0, 
    frameSpeed: 2, 
    frameCounter: 0, 
    texture: new Image(), 
    stepstexture: new Image(),
    frameIndex2: 0,
    frameSpeed2: 3,
    frameCounter2: 0,
    textures: {
      waterstep: ['./watereff1.png',"watereff2.png"],
        staydown: ['./staydown.png'],
        stayup: ['./stayup.png'],
        moveup: ['./moveup0.png', './moveup1.png'],
        stayupright: ['./upright0.png'],
        stayupleft: ['./upleft0.png'],
        stayleft: ['./moveleft0.png'],
        stayright: ['./moveright0.png'],
        moveleft: ['./moveleft0.png', './moveleft1.png'],
        moveright: ['./moveright0.png', './moveright1.png'],
        movedown: ['./movedown0.png', './movedown1.png'],
        moveupright: ['./upright0.png','./upright1.png'],
        moveupleft: ['./upleft0.png','./upleft1.png'],
        stayupleft: ['./upleft0.png'],
        stayupright: ['./upright0.png'],
  inwater_moveleft: ['./swimleft0.png', './swimleft1.png'],
  inwater_moveright: ['./swimright0.png', './swimright1.png'],
  inwater_movedown: ['./swimdown0.png', './swimdown1.png'],
  inwater_moveup: ['./swimup0.png', './swimup1.png'],
    },
};
let playerold={...player}
let armourstextures={
      "dracobuff": {
      staydown: ['./dracostaydown.png'],
      stayup: ['./dracostayup.png'],
      moveup: ['./dracoup1.png', './dracoup2.png'],
      stayupleft: ['./dracoleft1.png'],
      stayupright: ['./dracoright1.png'],
      stayright: ['./dracoright1.png'],
      stayleft: ['./dracoleft1.png'],
      moveright: ['./dracoright1.png', './dracoright2.png'],
      moveleft: ['./dracoleft1.png', './dracoleft2.png'],
      movedown: ['./dracodown1.png', './dracodown2.png'],
      moveupleft: ['./dracoleft1.png', './dracoleft2.png'],
      moveupright: ['./dracoright1.png', './dracoright2.png'],
      stayupleft: ['./dracoleft1.png'],
      stayupright: ['./dracoright1.png'],
      inwater_moveleft: ['./swimleft0.png', './swimleft1.png'],
      inwater_moveright: ['./swimright0.png', './swimright1.png'],
      inwater_movedown: ['./swimdown0.png', './swimdown1.png'],
      inwater_moveup: ['./swimup0.png', './swimup1.png'],
  },
  "titaniumbuff":{
    staydown: ['./titaniumstaydown.png'],
        stayup: ['./titaniumstayup.png'],
        moveup: ['./titaniummoveup1.png', './titaniummoveup2.png'],
        stayupright: ['./titaniummoveright1.png'],
        stayupleft: ['./titaniummoveleft1.png'],
        stayleft: ['./titaniummoveleft1.png'],
        stayright: ['./titaniummoveright1.png'],
        moveleft: ['./titaniummoveleft1.png', './titaniummoveleft2.png'],
        moveright: ['./titaniummoveright1.png', './titaniummoveright2.png'],
        movedown: ['./titaniummovedown1.png', './titaniummovedown2.png'],
        moveupright: ['./titaniummoveright1.png','./titaniummoveright2.png'],
        moveupleft: ['./titaniummoveleft1.png','./titaniummoveleft2.png'],
        stayupleft: ['./titaniummoveleft1.png'],
        stayupright: ['./titaniummoveright1.png'],
  inwater_moveleft: ['./swimleft0.png', './swimleft1.png'],
  inwater_moveright: ['./swimright0.png', './swimright1.png'],
  inwater_movedown: ['./swimdown0.png', './swimdown1.png'],
  inwater_moveup: ['./swimup0.png', './swimup1.png'],
  },
    "osmiumbuff": {
    staydown: ['./osmstaydown.png'],
    stayup: ['./osmstayup.png'],
    moveup: ['./osmup1.png', './osmup2.png'],
    stayupright: ['./osmright1.png'],
    stayupleft: ['./osmleft1.png'],
    stayleft: ['./osmleft1.png'],
    stayright: ['./osmright1.png'],
    moveleft: ['./osmleft1.png', './osmleft2.png'],
    moveright: ['./osmright1.png', './osmright2.png'],
    movedown: ['./osmdown1.png', './osmdown2.png'],
    moveupright: ['./osmright1.png', './osmright2.png'],
    moveupleft: ['./osmleft1.png', './osmleft2.png'],
    stayupleft: ['./osmleft1.png'],
    stayupright: ['./osmright1.png'],
    inwater_moveleft: ['./swimleft0.png', './swimleft1.png'],
    inwater_moveright: ['./swimright0.png', './swimright1.png'],
    inwater_movedown: ['./swimdown0.png', './swimdown1.png'],
    inwater_moveup: ['./swimup0.png', './swimup1.png'],
  },
  "hellbuff": {
    staydown: ['./hellarmourstaydown.png'],
    stayup: ['./hellarmourstayup.png'],
    moveup: ['./hellarmourmoveup1.png', './hellarmourmoveup2.png'],
    stayupleft: ['./hellarmourmoveright1.png'],
    stayupright: ['./hellarmourmoveleft1.png'],
    stayright: ['./hellarmourmoveleft1.png'],
    stayleft: ['./hellarmourmoveright1.png'],
    moveright: ['./hellarmourmoveleft1.png', './hellarmourmoveleft2.png'],
    moveleft: ['./hellarmourmoveright1.png', './hellarmourmoveright2.png'],
    movedown: ['./hellarmourmovedown1.png', './hellarmourmovedown2.png'],
    moveupleft: ['./hellarmourmoveright1.png', './hellarmourmoveright2.png'],
    moveupright: ['./hellarmourmoveleft1.png', './hellarmourmoveleft2.png'],
    stayupleft: ['./hellarmourmoveright1.png'],
    stayupright: ['./hellarmourmoveleft1.png'],
    inwater_moveleft: ['./swimleft0.png', './swimleft1.png'],
    inwater_moveright: ['./swimright0.png', './swimright1.png'],
    inwater_movedown: ['./swimdown0.png', './swimdown1.png'],
    inwater_moveup: ['./swimup0.png', './swimup1.png'],
  },
    "smoking": {
      staydown: ['./smoking0.png',"./smoking3.png"],
      stayup: ['./smoking0.png',"./smoking3.png"],
      moveup: ['./smoking1.png',"./smoking3.png"],
      stayupleft: ['./smoking0.png',"./smoking3.png"],
      stayupright: ['./smoking0.png',"./smoking3.png"],
      stayright: ['./smoking0.png',"./smoking3.png"],
      stayleft: ['./smoking0.png',"./smoking3.png"],
      moveright: ['./smoking1.png',"./smoking3.png"],
      moveleft: ['./smoking1.png',"./smoking3.png"],
      movedown: ['./smoking1.png',"./smoking3.png"],
      moveupleft: ['./smoking1.png',"./smoking3.png"],
      moveupright: ['./smoking1.png',"./smoking3.png"],
      stayupleft: ['./smoking0.png',"./smoking3.png"],
      stayupright: ['./smoking0.png',"./smoking3.png"],
      inwater_moveleft: ['./swimleft0.png', './swimleft1.png'],
      inwater_moveright: ['./swimright0.png', './swimright1.png'],
      inwater_movedown: ['./swimdown0.png', './swimdown1.png'],
      inwater_moveup: ['./swimup0.png', './swimup1.png'],
  },
    "broom": {
    staydown: ['./broomdown.png','./broomdown2.png'],
    stayup: ['./broomup.png','./broomup2.png'],
    moveup: ['./broomup.png', './broomup2.png'],
    stayupright: ['./broomright.png','./broomright2.png'],
    stayupleft: ['./broomleft.png','./broomleft2.png'],
    stayright: ['./broomright.png','./broomright2.png'],
    stayleft: ['./broomleft.png','./broomleft2.png'],
    moveright: ['./broomright.png', './broomright2.png'],
    moveleft: ['./broomleft.png', './broomleft2.png'],
    movedown: ['./broomdown.png', './broomdown2.png'],
    moveupleft: ['./broomleft.png', './broomleft2.png'],
    moveupright: ['./broomright.png', './broomright2.png'],
    stayupleft: ['./broomleft.png','./broomleft2.png'],
    stayupright: ['./broomright.png', './broomright2.png'],
    inwater_moveleft: ['./broomleft.png', './broomleft2.png'],
    inwater_moveright: ['./broomright.png', './broomright2.png'],
    inwater_movedown: ['./broomdown.png', './broomdown2.png'],
    inwater_moveup: ['./broomup.png', './broomup2.png'],
  }
}; let oldarmour={...armourstextures}; 
function loadTextures2(textures) {
    const loadedTextures = {};
    for (const key in textures) {
        loadedTextures[key] = textures[key].map(src => {
            const img = new Image();
            let src2 = removeDotSlash(src)
img.src = getBase64Image(src2, assets);
            return img;
        });
    }
    return loadedTextures;
}
player.textures = loadTextures2(player.textures);
for (const armour in armourstextures) {
    armourstextures[armour] = loadTextures2(armourstextures[armour]);
}
 player.stepstexture = player.textures["waterstep"][0];
player.texture = player.textures[player.currentAnimation][0];
let stonestep = new Audio2('./stonestep.wav');
stonestep.loop = true;
let footstepSound = new Audio2('./step2.mp3',200);
footstepSound.loop = true;
let windsound = new Audio2('./wind.mp3');
let swimSound = new Audio2('./swim.mp3');
swimSound.loop = true;
let noucant = new Audio2('./block.wav');
noucant.volume = 0.1;
let craftsound = new Audio2('./crafted.mp3');
let slashsound = new Audio2('./slash.mp3');
let hitenemysound = new Audio2('./hit (1).mp3');
let slashsound3 = new Audio2('./slash2.mp3');
let slashsound4 = new Audio2('./slash3.mp3');
const snowStepsFiles = ["Snow walk.mp3", "Snow walk2.mp3", "Snow walk3.mp3"];
const stoneStepsFiles = ["standard step.mp3"];
const sandStepsFiles = ["sandwalk.mp3"];
const coaststepFiles = ["coaststep.mp3"];
const snowStepsBuffers = [];
const stoneStepsBuffers = [];
const sandStepsBuffers = [];
const coastStepsBuffers = [];
async function preloadSteps(files, targetArray) {
  for (let file of files) {
    const response = await fetchv20(file);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    targetArray.push(audioBuffer);
  }
}
(async () => {
  await preloadSteps(snowStepsFiles, snowStepsBuffers);
  await preloadSteps(stoneStepsFiles, stoneStepsBuffers);
  await preloadSteps(sandStepsFiles, sandStepsBuffers);
  await preloadSteps(coaststepFiles, coastStepsBuffers);
})();
 let isStepPlaying = false
const stepQueue = []
let currentStepSource = null
function playStep(buffer, panValue, volume = 1.0) {
  isStepPlaying = true
  const source = audioCtx.createBufferSource()
  currentStepSource = source
  source.buffer = buffer
  const gainNode = audioCtx.createGain()
  gainNode.gain.value = volume
  const panner = audioCtx.createStereoPanner()
  panner.pan.value = panValue
  source.connect(gainNode).connect(panner).connect(audioCtx.destination)
  source.onended = () => {
    isStepPlaying = false
    currentStepSource = null
    if (stepQueue.length > 0) {
      const next = stepQueue.shift()
      playStep(next.buffer, next.pan, next.volume)
    }
  }
  source.start()
}
function enqueueFootstep(buffer, pan, volume) {
  if (isStepPlaying) stepQueue.push({ buffer, pan, volume })
  else playStep(buffer, pan, volume)
}
function stopAllSteps() {
  stepQueue.length = 0
  if (currentStepSource) currentStepSource.stop()
  isStepPlaying = false
  currentStepSource = null
}
function isWalking() {
  return moveLeft || moveRight || moveUp || moveDown
}
let currentStep = null
let lastStepTime = 0
const stepDelay = 400
const caveReverb = audioCtx.createConvolver()
const caveReverbGain = audioCtx.createGain()  
caveReverbGain.gain.value = 0.4
caveReverb.connect(caveReverbGain).connect(audioCtx.destination)
function loadCaveIR() {
  fetchv20('standard step.mp3')
    .then(r => r.arrayBuffer())
    .then(b => audioCtx.decodeAudioData(b))
    .then(buffer => caveReverb.buffer = buffer)
}
loadCaveIR()
function playTestSound() {
	const now = Date.now()
	if (now - lastStepTime < stepDelay) return
	lastStepTime = now
	 let buffer = stoneStepsBuffers[Math.floor(Math.random() * stoneStepsBuffers.length)]
		const source = audioCtx.createBufferSource()
		source.buffer = buffer 
		const gainNode = audioCtx.createGain()
		gainNode.gain.value = 9
		gainNode.gain.value = gainNode.gain.value * inoptions["sfxvolume"];
   let pan = (Math.random() * 2 - 1) * 0.7
		const panner = audioCtx.createStereoPanner()
		panner.pan.value = pan
		source.connect(gainNode).connect(panner).connect(audioCtx.destination)
		source.start()
		currentStep = source
		source.onended = () => { if (currentStep === source) currentStep = null }
}
function stopTestSound() {
	if (!footstepSound.paused) {
		footstepSound.stop();
		footstepSound.currentTime = 0;
	}
}
function playFootstepSound() {
	const now = Date.now()
	if (!isWalking()) {
		if (currentStep) { currentStep.stop();
			currentStep = null }
		return
	}
	if (now - lastStepTime < stepDelay) return
	if (!footstepSound.paused && (isStayOn("snowgrass") || isStayOn("cave_floor") || isStandingOnWaterBuilderNonPlant() == true||  isStandingOnWaterBuilderNonPlant() =="sand"||  isStandingOnWaterBuilderNonPlant() =="coast" )) {
	footstepSound.stop()
	footstepSound.currentTime = 0
 }
	lastStepTime = now
	let buffer
	if (isStayOn("snowgrass")) buffer = snowStepsBuffers[Math.floor(Math.random() * snowStepsBuffers.length)]
	else if (isStayOn("cave_floor")) buffer = stoneStepsBuffers[Math.floor(Math.random() * stoneStepsBuffers.length)]
	else buffer = stoneStepsBuffers[Math.floor(Math.random() * stoneStepsBuffers.length)]
	let pan = (Math.random() * 2 - 1) * 0.7
	if (isStayOn("cave_floor")) {
  [0, 0.1, 0.25].forEach((delay, i) => {
    const source = audioCtx.createBufferSource() 
    source.buffer = buffer
    const gainNode = audioCtx.createGain()
    gainNode.gain.value = [10, 8, 3][i] 
    gainNode.gain.value = gainNode.gain.value * inoptions["sfxvolume"];
    const panner = audioCtx.createStereoPanner()
    panner.pan.value = pan
    source.connect(gainNode).connect(panner).connect(caveReverb).connect(audioCtx.destination)
    source.start(audioCtx.currentTime + delay)
    if(i===0){
      currentStep = source
      source.onended = () => { if(currentStep===source) currentStep=null }
    }
  })
} else {
if (isStandingOnWaterBuilderNonPlant() == "sand" && !(isStayOn("snowgrass") || isStayOn("cave_floor")) ) {
	const source = audioCtx.createBufferSource()
	buffer = sandStepsBuffers[Math.floor(Math.random() * sandStepsBuffers.length)]
	source.buffer = buffer
	const gainNode = audioCtx.createGain()
	gainNode.gain.value = 13
	gainNode.gain.value = gainNode.gain.value * inoptions["sfxvolume"];
	const panner = audioCtx.createStereoPanner()
	pan = pan = (Math.random() * 2 - 1) * 0.7
	panner.pan.value = pan
	source.connect(gainNode).connect(panner).connect(audioCtx.destination)
	source.start()
	currentStep = source
	source.onended = () => { if (currentStep === source) currentStep = null }
}else if (isStandingOnWaterBuilderNonPlant() == "coast" && !(isStayOn("snowgrass")|| isStayOn("cave_floor") ) ) {
	const source = audioCtx.createBufferSource()
	buffer = coastStepsBuffers[Math.floor(Math.random() * coastStepsBuffers.length)]
	source.buffer = buffer
	const gainNode = audioCtx.createGain()
	gainNode.gain.value = 13
	gainNode.gain.value = gainNode.gain.value * inoptions["sfxvolume"];
	const panner = audioCtx.createStereoPanner()
	pan = pan = (Math.random() * 2 - 1) * 0.7
	panner.pan.value = pan
	source.connect(gainNode).connect(panner).connect(audioCtx.destination)
	source.start()
	currentStep = source
	source.onended = () => { if (currentStep === source) currentStep = null }
}else if (!isStandingOnWaterBuilderNonPlant() && !(isStayOn("snowgrass") || isStayOn("cave_floor"))) {
	if (footstepSound.paused) {
		footstepSound.volume = 4
		footstepSound.play();
	}
} else {
		const source = audioCtx.createBufferSource()
		source.buffer = buffer 
		const gainNode = audioCtx.createGain()
		gainNode.gain.value = 9
		gainNode.gain.value = gainNode.gain.value * inoptions["sfxvolume"];
		const panner = audioCtx.createStereoPanner()
		panner.pan.value = pan
		source.connect(gainNode).connect(panner).connect(audioCtx.destination)
		source.start()
		currentStep = source
		source.onended = () => { if (currentStep === source) currentStep = null }
	}}
}
let slashsounds = [ new Audio2(slashsound.src,2),new Audio2(slashsound3.src,2),new Audio2(slashsound4.src,2) ]
 
function playslash() {
   slashsounds[Math.floor(Math.random()*slashsounds.length)].volume=0.5
    slashsounds[Math.floor(Math.random()*slashsounds.length)].play();
}
let playingSlashes = 0;
const maxSlashes = 10; 
function playslash2() {
    slashsounds[Math.floor(Math.random() * slashsounds.length)].volume = 0.5
slashsounds[Math.floor(Math.random() * slashsounds.length)].play();
}
function blockedsound() {
    noucant.play();
}
function playswimsound() {
  if (swimSound.paused) {
    swimSound.play();
  }
}
function playwindsound() {
  if(options.nomusic==1)return;
  if (windsound.paused) {
    windsound.volume=0.15;
    windsound.play();
  }
}
function stopswimsound() {
  if (!swimSound.paused) {
    swimSound.pause();
    swimSound.currentTime = 0; 
  }
}
function stopFootstepSound() {
    if (!footstepSound.paused) {
        footstepSound.stop();
        footstepSound.currentTime = 0; 
    }
}
var issmoking=0;
let lastDirection = 'down'; 
 
function drawPlayer() {
    if (player.texture && player.texture.complete && player.texture.naturalWidth > 0) {
    } else {
        console.warn('Player texture not available.');
    }
}
var cannotmove=0
const musicTracks = [
  "./LandOnMyLand.mp3",
  "./primoria ferox 1.mp3",
  "./primoria ferox 3.mp3",
  "./new horizons above.mp3",
  "./tonight.mp3",
  "./Remember The Stars - Primoria.mp3",
  "./prime primoria (1).mp3",
  "./ChipChip.mp3",
  "./feroxia star.mp3",
  "./ShatteredBack.mp3",
  "./dayflow.mp3",
  "./Overflow drain.mp3",
  "./primoria resonance (1).mp3", 
  "./PrimoriaFerox.mp3",
  "./Primoria Division.mp3",
  "./primoria-lunatic.mp3",
  "./sleeping over.mp3",
  "./YouReInMyDay.mp3",
  "./SQISMYFAV.mp3",
  "./BUILDEDTOWN.mp3"
];
const ethertracks = [
	"./EtherWorld.mp3",
	"./EtherNight.mp3",
	"./EtherWorld.mp3",
	"./EtherNight.mp3",
	"./SubJungleGlith.mp3"
];
const musicTracks2 = [
  "./nightstand.mp3",
  "./AdventureSynth2.mp3",
  "./unionworld.mp3",
  "./coldnight.mp3",
  "./ovw3.mp3",
  "./Current Action.mp3",
  "./go-ahead.mp3",
  "./sleeping over.mp3",
  "./OWOPOB.mp3",
  "./key1.mp3",
  "./chiptune2.mp3",
"./springstring.mp3",
"./Overflow drain.mp3",
"./Explorer3.mp3", 
"./nightstand.mp3",
"./NOTITLEPROVIDED.mp3",
"./Fetching.mp3",
"./PianoThingy.mp3",
];
const nightmusicTracks = [
"./LOVECHONOVA.mp3",
"./Sound Of Echo.mp3",
"./primoriWorld.mp3",
"./FallenOUTOFBOUNDS.mp3",
  "./night.mp3",
  "./night5.mp3",
"./KaputDeFerxo.mp3",
 "./night4.mp3",
 "./%4NIGHTP - BBS -.mp3",
 "./tonight.mp3",
 "./Cosmic.mp3",
 "./Comfortable Night.mp3",
 "./night4.mp3",
 "./Darknight.mp3"
];
const cavemusicTracks = [
];
let etherInstances = ethertracks.map(track => new Audio(track));
let audioInstances = musicTracks.map(track => new Audio(track));
let audioInstances2 = musicTracks2.map(track => new Audio(track));
let audioInstances3 = nightmusicTracks.map(track => new Audio(track));
let caveInstances = cavemusicTracks.map(track => new Audio(track));
 let originalAudioInstances = {
  ovwday: [...audioInstances],
  ovwnight: [...audioInstances3],
  ether: [...etherInstances],
  cave: [...caveInstances]
};
const boss2 = new Audio('./boss2.mp3');
const boss3 = new Audio('./fleshbe2winus.mp3');
const bossWorldEater = new Audio('./THEWORLDEATER.mp3');
const boss4 = new Audio('./soulreinforcement.mp3');
const boss1 = new Audio('./electric force.mp3');
const crimsondoomon = new Audio('./DOOMON.mp3');
const trueTrack = new Audio('./TRUE.mp3');
const voltaryTrack = new Audio('./Voltary.mp3');
const desertTrack = new Audio('./SandInEyes.mp3');
desertTrack.volume=0.2
const swallowing = new Audio('./VSwallowing.mp3');
const desertnightTrack = new Audio('./ruins.mp3');
desertnightTrack.volume=0.2
const snowyTrack = new Audio('./snowy.mp3');
const snowyTrack2 = new Audio('./Ethernia cold.mp3');
const foresttrack = new Audio('./MyCosmos.mp3');
const canyontrack = new Audio('./Canyon.mp3');
const canyontrack2 = new Audio('./WesternTypeShit.mp3');
const beautifulnature = new Audio('./BeautifulNature.mp3');
beautifulnature.volume=0.02
const imfrog = new Audio('./FROG.mp3');
const DiedAlone = new Audio('./DiedAlone.mp3');
const vulcanotrack = new Audio('./Vulcano.mp3');
const cemetery = new Audio('./graveyard.mp3');
const abyssumTrack = new Audio('./abyssum.mp3');
const hellTrack = new Audio('./The Magma.mp3');
const aquamarine = new Audio('./deep in abyss.mp3');
let musicLists = {
	ovwday: [...musicTracks],
	ovwnight: [...nightmusicTracks],
	ether: [...ethertracks],
	cave: [...cavemusicTracks]
}
let currentTrack = null;
function stopMusic() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
    currentTrack = null
  }
}
function playRandomMusic() {
  if(options.nomusic==1 || inoptions["musicvolume"] == 0 || beforecreatedtrue==1 )return;
    if(currentTrack){
    currentTrack.pause();
    currentTrack.currentTime = 0;
currentTrack = null
}
 if(!(checkIfHasEnemy("trueuniversehead",1)) && inabyss!==1 && inhell!==1 ){
  let randomIndex = getRandomInt(0, audioInstances.length - 1);
let randomTrack = audioInstances[randomIndex];
if(generateCave==1 && caveInstances.length>0) {
	randomIndex = getRandomInt(0, caveInstances.length - 1);
	randomTrack = caveInstances[randomIndex];
}else if (!inether || !generateCaveForEther && (   storelastdimension !== "inether" ) ) {
if(Math.random()<0.5){
 randomIndex = getRandomInt(0, audioInstances2.length - 1);
 randomTrack = audioInstances2[randomIndex];
}
if( nightpower>2.3){
randomIndex = getRandomInt(0, audioInstances3.length - 1 );
randomTrack = audioInstances3[randomIndex];
}
if(seed.startsWith("badseed") && !isStayOn("curredgrass")   && !isStayOn("water1")  && !inoptions.classicmusic){
randomTrack = crimsondoomon
}
}else{
	randomIndex = getRandomInt(0, etherInstances.length - 1);
 randomTrack = etherInstances[randomIndex];
}
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
if(randomTrack){
randomTrack.pause();
randomTrack.currentTime = 0;
}
  currentTrack = randomTrack;
  currentTrack.volume=1;
currentTrack.play()
if (currentTrack && isfading == 0) {
	currentTrack.volume = inoptions["musicvolume"]
}
var randomDelay = getRandomInt(3000, 20000);
  currentTrack.onended = function () {
      currentTrack.pause();
    currentTrack = null;
     randomDelay = getRandomInt(5000, 20000);
    setTimeout(playMusic, randomDelay);
  };
  currentTrack.onerror = function () {
   currentTrack.pause();
currentTrack.currentTime = 0;
currentTrack=null
   setTimeout(playMusic, randomDelay);
  };
}}
console.log("Primoriaferox copyright allrights reserved ")
function playMusic() {
  if(options.nomusic==1 || inoptions["musicvolume"] == 0 )return;
  if(!((isStayOn("forestgrasslayer") || isStayOn("forestgrass"))&& nightpower>1 ) ){
if(!(checkIfHasEnemy("trueuniversehead",1))&&!(checkIfHasEnemy("deepgodhead",1))&&!(checkIfHasEnemy("flesh",1))&&!(checkIfHasEnemy("insaneuniversegod",1)) &&!(checkIfHasEnemy("2medusa",1)) &&!(checkIfHasEnemy("darkeye",1)) &&!(checkIfHasEnemy("voltary",1)) ){
   if(generateCave==1&&caveInstances.length>0){
   	playRandomMusic()
   	return;
   }
  if (isStayOn("water") && isPlayingSnowyMusic) {
  stopSnowyMusic();
  isPlayingSnowyMusic = false
}else if (((isStayOn("grass") || isStayOn("water"))&& !isStayOn("snowgrass")&&!isStayOn("snowgrass2"))) {
    isPlayingDesertMusic = false
  stopDesertMusic();
}else{
  if (isStayOn("desertsand")) {
    playDesertMusic();
    return;
  }else if (isPlayingDesertMusic) {
  stopDesertMusic();
}
if (isStayOn("snowgrass")||isStayOn("snowgrass2")) {
  playSnowyMusic();
  return;
} else if (isPlayingSnowyMusic) {
  stopSnowyMusic();
}
if(inhell!==1&& inabyss!==1){
 playRandomMusic();
}
}
if(inhell==1){
  playHelltrack();
} 
if (isunderwater === 1 && (!checkIfHasEnemy("trueuniversehead", 1))) {
    playAquaMarine()
}
if (inabyss === 1 && (!checkIfHasEnemy("trueuniversehead", 1))) {
    playAbyssumTrack()
  } else if (checkIfHasEnemy("trueuniversehead", 1)) {
    playTrueTrack();
  } else {
  }
}else if((checkIfHasEnemy("trueuniversehead",1))){
  playTrueTrack()
}else if ((checkIfHasEnemy("deepgodhead", 1))) {
 playBoss1()
}else if ((checkIfHasEnemy("insaneuniversegod", 1))) {
 playBossWORLDEATER()
}else if ((checkIfHasEnemy("flesh", 1))) {
	playBoss3()
}else if ((checkIfHasEnemy("voltary", 1))) {
	playBossVoltary()
}else if ((checkIfHasEnemy("darkeye", 1))) {
  playBoss4()
}else if ((checkIfHasEnemy("2medusa", 1))) {
  playBoss4()
}
}
setTimeout(function(){if (currentTrack) {
	currentTrack.volume = inoptions["musicvolume"]
}},200);
}
function playBoss4() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
  currentTrack = boss4
  currentTrack.play().catch(() => {
    playRandomMusic(); 
  });
  currentTrack = boss4
  boss4.onended = function() {
    setTimeout(playMusic, 1000);
  };
  boss4.onerror = function() {
    playRandomMusic(); 
  };
}
function playBoss3() {
 if (currentTrack) {
  currentTrack.pause();
  currentTrack.currentTime = 0;
 }
 currentTrack = boss3
 currentTrack.play().catch(() => {
  playRandomMusic(); 
 });
 currentTrack = boss3;
 boss3.onended = function() {
  setTimeout(playMusic, 1000);
 };
 boss3.onerror = function() {
  playRandomMusic(); 
 };
}
function playBossVoltary() {
	if (currentTrack) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
	}
	currentTrack = voltaryTrack
	currentTrack.play().catch(() => {
		playRandomMusic();
	});
	currentTrack = voltaryTrack;
	voltaryTrack.onended = function() {
		setTimeout(playMusic, 1000);
	};
	voltaryTrack.onerror = function() {
		playRandomMusic();
	};
}
function playBossWORLDEATER() {
	if (currentTrack) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
	}
	currentTrack = bossWorldEater
	currentTrack.play().catch(() => {
		playRandomMusic();
	});
	currentTrack = bossWorldEater;
	bossWorldEater.onended = function() {
		setTimeout(playMusic, 1000);
	};
	bossWorldEater.onerror = function() {
		playRandomMusic();
	};
}
function playBoss1() {
 if (currentTrack) {
  currentTrack.pause();
  currentTrack.currentTime = 0;
 }
 currentTrack = boss1
 currentTrack.play().catch(() => {
  playRandomMusic(); 
 });
 currentTrack = boss1;
 boss1.onended = function() {
  setTimeout(playMusic, 1000);
 };
 boss1.onerror = function() {
  playRandomMusic(); 
 };
}
function playTrueTrack() {
	if(options.nomusic==1 || inoptions["musicvolume"] == 0 )return;
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
currentTrack= trueTrack
  currentTrack.play().catch(() => {
    playRandomMusic(); 
  });
  currentTrack = trueTrack;
  trueTrack.onended = function () {
    setTimeout(playMusic, 1000);
  };
  trueTrack.onerror = function () {
  };
}
function playAbyssumTrack() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
  abyssumTrack.play().catch(() => {
    playRandomMusic(); 
  });
  currentTrack = abyssumTrack;
  abyssumTrack.onended = function() {
    setTimeout(playMusic, 1000);
  };
  abyssumTrack.onerror = function() {
    playRandomMusic(); 
  };
}
function playAquaMarine() {
    if (currentTrack) {
        currentTrack.pause();
        currentTrack.currentTime = 0;
    }
    currentTrack = aquamarine;
currentTrack.play().catch(() => {
        playRandomMusic(); 
    });
    currentTrack.onended = function() {
        setTimeout(playMusic, 1000);
    };
    currentTrack.onerror = function() {
        playRandomMusic(); 
    };
}
function playHelltrack() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
  }
  hellTrack.play().catch(() => {
    playRandomMusic(); 
  });
  currentTrack = hellTrack;
  hellTrack.onended = function() {
    setTimeout(playMusic, 1000);
  };
  hellTrack.onerror = function() {
    playRandomMusic(); 
  };
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
document.getElementById("gameCanvas").addEventListener("click", () => {
});
document.querySelector("html").addEventListener("click", () => {
  if (!currentTrack || currentTrack.paused) {
    playMusic();
  }
  if (isStayOn("desertsand")) {
    checkPlayerOnDesertSand();
  }
});
let isPlayingDesertMusic = false;
let isPlayingSnowyMusic =false;
function playDesertMusic() {
  if(options.nomusic==1)return;
  if (currentTrack === desertTrack||currentTrack === desertnightTrack) return; 
  if (currentTrack) {
    fadeOut(currentTrack, () => {
      currentTrack.pause();
      currentTrack.currentTime = 0;
      startDesertTrack();
    });
  } else {
    startDesertTrack();
  }
}
function playSnowyMusic() {
  if(options.nomusic==1)return;
  if (currentTrack === snowyTrack ||currentTrack === snowyTrack2 ) return; 
if( seed.startsWith("badseed") ){return;} 
  if (currentTrack) {
    fadeOut(currentTrack, () => {
      currentTrack.pause();
      currentTrack.currentTime = 0;
      startSnowyTrack();
    });
  } else {
    startSnowyTrack();
  }
}
function startDesertTrack() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
    if(nightpower<2){
  currentTrack = desertTrack;
  currentTrack.volume = 0;
currentTrack.play().then(() => fadeIn(desertTrack));
    }else{
currentTrack = desertnightTrack;
currentTrack.volume = 0;
currentTrack.play().then(() => fadeIn(desertnightTrack));
    }
  isPlayingDesertMusic = true;
  currentTrack.onended = () => {
    currentTrack = null;
    isPlayingDesertMusic = false;
  };
}}
function startSnowyTrack() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
      if(nightpower<1.5){
  currentTrack = snowyTrack;
  currentTrack.volume = 0;
  currentTrack.play().then(() => fadeIn(snowyTrack));
}else{
 currentTrack = snowyTrack2;
currentTrack.volume = 0;
currentTrack.play().then(() => fadeIn(snowyTrack2));
}
  isPlayingSnowyMusic = true;
  currentTrack.onended = () => {
    currentTrack = null;
    isPlayingSnowyMusic = false;
  };
}}
var isPlayingForest=false;
var isPlayingCanyon=false;
var isPlayingVulcano=false; 
var isPlayingGraveyard=false; 
function startVulcano() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
 currentTrack = vulcanotrack;
currentTrack.volume = 0;
currentTrack.loop=true;
currentTrack.play().then(() => fadeIn(vulcanotrack));
  isPlayingVulcano = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isPlayingVulcano = false;
  };
}}
var isplayingDied=false; 
var isPlayingSwamp=false; 
function startDiedSound() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
 currentTrack = DiedAlone;
currentTrack.volume = 0;
currentTrack.loop=false;
currentTrack.play().then(() => fadeIn(DiedAlone));
  isplayingDied = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isplayingDied = false;
  };
}}
function startSwampfrog() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
 currentTrack = imfrog;
currentTrack.volume = 0;
currentTrack.loop=true;
currentTrack.play().then(() => fadeIn(imfrog));
  isPlayingSwamp = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isPlayingSwamp = false;
  };
}}
function startSwamp() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
 currentTrack = beautifulnature;
currentTrack.volume = 0;
currentTrack.loop=true;
currentTrack.play().then(() => fadeIn(beautifulnature));
  isPlayingSwamp = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isPlayingSwamp = false;
  };
}}
function startForest() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
      if(nightpower>1.5){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
 currentTrack = foresttrack;
currentTrack.volume = 0;
currentTrack.loop=true;
currentTrack.play().then(() => fadeIn(foresttrack));
  isPlayingForest = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isPlayingForest = false;
  };
 }
}}
function startCanyon() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
        if(nightpower<2){
 currentTrack = canyontrack;
 currentTrack.volume = 0;
currentTrack.loop = true;
currentTrack.play().then(() => fadeIn(canyontrack));
isPlayingCanyon = true;
currentTrack.onended = () => {
	currentTrack = null;
	isPlayingCanyon = false;
};
        }else{
 currentTrack = canyontrack2;
 currentTrack.volume = 0;
currentTrack.loop = true;
currentTrack.play().then(() => fadeIn(canyontrack2));
isPlayingCanyon = true;
currentTrack.onended = () => {
	currentTrack = null;
	isPlayingCanyon = false;
};
        }
 }
}
function startCementary() {
	if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1))){
      if(true){
        if(currentTrack) { currentTrack.pause()
          currentTrack.currentTime = 0;
          currentTrack=null
        }
 currentTrack = cemetery;
currentTrack.volume = 0;
currentTrack.loop=true;
currentTrack.play().then(() => fadeIn(cemetery));
  isPlayingGraveyard = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isPlayingGraveyard = false;
  };
      }
}}
function stopCementary() {
	if ( isPlayingGraveyard) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
		isPlayingGraveyard = false;
		fadeOut(foresttrack, () => {
			cemetery.pause();
			cemetery.currentTime = 0;
			isPlayingGraveyard = false;
			if (inabyss === 1) {
				playAbyssumTrack();
			} else if (checkIfHasEnemy("trueuniversehead", 1)) {
				playTrueTrack();
			} else {
			}
		});
	}
}
function stopForest() {
    if ( isPlayingForest) {
        currentTrack.pause();
currentTrack.currentTime = 0;
isPlayingForest = false;
        fadeOut(foresttrack, () => {
            foresttrack.pause();
            foresttrack.currentTime = 0;
            isPlayingForest = false;
            if (inabyss === 1) {
                playAbyssumTrack();
            } else if (checkIfHasEnemy("trueuniversehead", 1)) {
                playTrueTrack();
            } else {
            }
        });
    }
}
function stopCanyon() {
	if (isPlayingCanyon) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
		isPlayingCanyon = false;
		if(nightpower<2){
		fadeOut(canyontrack, () => {
			canyontrack.pause();
			canyontrack.currentTime = 0;
			isPlayingCanyon = false;
			if (inabyss === 1) {
				playAbyssumTrack();
			} else if (checkIfHasEnemy("trueuniversehead", 1)) {
				playTrueTrack();
			} else {
			}
		});
	}else{
		fadeOut(canyontrack2, () => {
			canyontrack.pause();
			canyontrack.currentTime = 0;
			isPlayingCanyon = false;
			if (inabyss === 1) {
				playAbyssumTrack();
			} else if (checkIfHasEnemy("trueuniversehead", 1)) {
				playTrueTrack();
			} else {
			}
		});
	}
	}
}
function stopVulcano() {
	if (isPlayingVulcano) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
		isPlayingVulcano = false;
		fadeOut(vulcanotrack, () => {
			vulcanotrack.pause();
			vulcanotrack.currentTime = 0;
			isPlayingVulcano = false;
			if (inabyss === 1) {
				playAbyssumTrack();
			} else if (checkIfHasEnemy("trueuniversehead", 1)) {
				playTrueTrack();
			} else {
			}
		});
	}
}
function stopSwamp() {
	if (isPlayingSwamp) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
		isPlayingSwamp = false;
		fadeOut(beautifulnature, () => {
			beautifulnature.pause();
			beautifulnature.currentTime = 0;
			isPlayingSwamp = false;
			if (inabyss === 1) {
				playAbyssumTrack();
			} else if (checkIfHasEnemy("trueuniversehead", 1)) {
				playTrueTrack();
			} else {
			}
		});
	}
}
function stopSwampfrog() {
	if (isPlayingSwamp) {
		currentTrack.pause();
		currentTrack.currentTime = 0;
		isPlayingSwamp = false;
		fadeOut(imfrog, () => {
			imfrog.pause();
			imfrog.currentTime = 0;
			isPlayingSwamp = false;
			if (inabyss === 1) {
				playAbyssumTrack();
			} else if (checkIfHasEnemy("trueuniversehead", 1)) {
				playTrueTrack();
			} else {
			}
		});
	}
}
let isplayingSwallowing=false;
function checkPlayerOnDesertSand() {
	if( inoptions.classicmusic)return;
	if(etherEventActive){
		if( options.nomusic==1)return;
  if(!(checkIfHasEnemy("trueuniversehead",1)) && isplayingSwallowing == false  ){
if(currentTrack) { currentTrack.pause()
currentTrack.currentTime = 0;
currentTrack=null
}
 currentTrack = swallowing;
currentTrack.volume = 0;
currentTrack.loop=true;
currentTrack.play().then(() => fadeIn(swallowing));
  isplayingSwallowing = true;
  currentTrack.onended = () => {
    currentTrack = null;
   isplayingSwallowing = false;
  };} 
  return;
	}
	if(!(checkIfHasEnemy("trueuniversehead",1))&&!(checkIfHasEnemy("deepgodhead",1))&&!(checkIfHasEnemy("flesh",1))&&!(checkIfHasEnemy("insaneuniversegod",1)) &&!(checkIfHasEnemy("2medusa",1)) &&!(checkIfHasEnemy("darkeye",1)) &&!(checkIfHasEnemy("voltary",1)) ){
}else{return;}
if(options.nomusic==1 || inoptions["musicvolume"] == 0 || beforecreatedtrue==1 )return;
if (((isStayOn("deadgrassfloor") || isStayOn("deadgrassfloor2")) )) {
	if(!isPlayingGraveyard){
	stopForest();
	startCementary();
	}
} else if (((isStayOn("forestgrasslayer") || isStayOn("forestgrass")) && nightpower > 2)) {
	if (!isPlayingForest) {
		stopCementary();
		startForest();
	}
}else if (((isStayOn("canyonsandlayer") || isStayOn("canyonsand")) )) {
	if (!isPlayingCanyon) {
		startCanyon();
	}
}else if (((isStayOn("Hstone") || isStayOn("Hstonelay")))) {
	if (!isPlayingVulcano) {
		startVulcano();
	}
}else if (((isStayOn("swampgrass") || isStayOn("swampgrasslay")) || (isStayOn("peatfloor") || isStayOn("peat"))) && nightpower < 1) {
	if (!isPlayingSwamp) {
		startSwamp();
	}
}else if (((isStayOn("swampgrass") || isStayOn("swampgrasslay")) || (isStayOn("peatfloor") || isStayOn("peat"))) && nightpower > 2) {
	if (!isPlayingSwamp) {
		startSwampfrog();
	}
}else if (((isStayOn("grass") || isStayOn("grasslayer") || isStayOn("water") || isStayOn("water2")) && (isPlayingDesertMusic || isPlayingSnowyMusic|| isPlayingForest || isPlayingGraveyard|| isPlayingVulcano|| isPlayingSwamp || isPlayingCanyon))) {
   	stopCanyon()
     stopSnowyMusic();
     stopVulcano();
     stopForest();
     stopSwamp();
     stopSwampfrog();
     stopCementary();
    stopDesertMusic();  
  }else if (( isStayOn("snowgrass") ||isStayOn("snowgrass2") )&& !isPlayingSnowyMusic) {
      achievementget("Cold island",0)
    playSnowyMusic();
  }else if (isStayOn("desertsand") && !isPlayingDesertMusic) {
  playDesertMusic();
  achievementget("Hot island",0)
}
}
function stopDesertMusic() {
  if (currentTrack === desertTrack||currentTrack === desertnightTrack) {
    fadeOut(desertTrack, () => {
      desertTrack.pause();
      desertTrack.currentTime = 0;
      isPlayingDesertMusic = false;
        if (inabyss === 1) {
    playAbyssumTrack();
  } else if (checkIfHasEnemy("trueuniversehead", 1)) {
    playTrueTrack();
  } else {
    playRandomMusic();
  }
    });
  }else if(currentTrack === desertnightTrack){
    fadeOut(desertnightTrack, () => {
  desertnightTrack.pause();
  desertnightTrack.currentTime = 0;
  isPlayingDesertMusic = false;
  if (inabyss === 1) {
    playAbyssumTrack();
  } else if (checkIfHasEnemy("trueuniversehead", 1)) {
    playTrueTrack();
  } else {
    playRandomMusic();
  }
});
  }	
setTimeout(function(){if (currentTrack) {
	currentTrack.volume = inoptions["musicvolume"]
}},200);
}
function stopSnowyMusic() {
  if ((isStayOn("water")||isStayOn("grass"))&& !isStayOn("snowgrass") &&!isStayOn("snowgrass2")) {
  if (currentTrack === snowyTrack) {
    fadeOut(snowyTrack, () => {
      snowyTrack.pause();
      snowyTrack.currentTime = 0;
      isPlayingDesertMusic = false;
      isPlayingSnowyMusic = false;
      if (inabyss === 1) {
        playAbyssumTrack();
      } else if (checkIfHasEnemy("trueuniversehead", 1)) {
        playTrueTrack();
      } else {
        playRandomMusic();
      }
    });
  }
}}
function fadeOut(audio, callback) {
  let volume = audio.volume;
  const interval = setInterval(() => {
    volume -= 0.05;
    if (volume <= 0) {
      clearInterval(interval);
      audio.volume = 0;
      if (callback) callback();
    } else {
      audio.volume = Math.max(volume, 0); 
    }
  }, 100);
}
let isfading=0
function fadeIn(audio, step = 0.05, intervalTime = 100) {
	let volume = 0;
	audio.volume = 0;
	let targetVolume = inoptions["musicvolume"]
	audio.play();
	const interval = setInterval(() => {
		volume += step;
		if (volume >= targetVolume) {
			clearInterval(interval);
			audio.volume = targetVolume;
			isfading=0
		} else {
			audio.volume = volume;
			isfading=1
		}
	}, intervalTime);
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const textures = {};
const textureSources = {
	axivector: "./axivector.png",
	invisiblearmourring: "./ring1.png",
	extinguished_torch:"./extinguished_torch.png",
	cdb:"./cdb.png",
	cdba:"./cdb.png",
	cdbpicker:"./custompicker.png",
	godbench:"./godbench.png",
	canvas:"./canvas.png",
nullblock:"./null.png",
 shield:"./shield.png",
 
	ethergrass2: "./ethergrass.png",
	ethersand2: "./ethersand.png",
	etherlog: "./ethertree1.png",
etherthing:"./etherthings1.png",
etheractive:'./etheractive1.png',
etheractive2:'./etheractive1.png',
ethertree1:"./ethertree1.png",
ethertree2:"./ethertree2.png",
ethertree3:"./ethertree3.png",
ethercrystals:"./ethercrystals.png",
etherflowers:"./etherflowers.png",
ethergate:"./ethergate1.png",
ethergateback:"./ethergate1.png",
apple:"./apple.png",
silverapple:"./silverapple.png",
ethersoul:"./ethersoul1.png",
etherbricks:"./etherbricks.png",
ethergrass:"./ethergrass.png",
ethersand:"./ethersand.png",
etherwater:"./etherwater1.png",
hill3:"./Cstone.png",
canyonsand:"./canyonsand.png",
dracobow:"./dracobow.png",
canyonsandlayer:"./canyonsand.png",
Cgrass:"./Cgrass1.png",
 tin: './tin.png',
 tinore: './tinore.png',
 nitre: './nitre.png',
 damageindicator: './damageindicator.png',
 dummy: './dummy.png',
	lysimachia: './lysimachia.png',
	heather: './heather.png',
	flowerpollen: './flowerpollen1.png',
	bucket: './bucket.png',
	bucketwithcwater: './bucketwithcleanwater.png',
	bucketwithwater: './bucketwithwater.png',
	bucketwithswampwater: './bucketwithwater.png',
	lavabucket: './lavabucket.png',
Hstone: './Hstonefloor.png',
 Hstonelay: './Hstonefloor.png',
	hill2: './Hstone_d.png',
	peatfloor: "./peat.png",
	lily:"./lily.png",
	peat:"./peat.png",
	swampwater:"./swampwater1.png",
	mud:"./mud.png",
	swampiris:"./swampiris.png",
	swampgrass:"./swampgrass.png",
	swampgrasslay:"./swampgrass.png",
	stonehill:"./Hstonefloor.png",
	silverlongsword:"./silverlongsword.png",
	silver:"./silver.png",
	graygrass:"./graygrass1.png",
	magma:"./magma1.png",
	galena:"./galena.png",
	leafbowlwithswampwater: './leafbowlwithcleanwater.png',
	bowl_with_swampwater: './bowl_with_water.png',
	copper_sword:"./copper-sword.png",
	lamptorch:"./lamp2.png",
  'window':"./window.png",
  windows:"./windows.png",
  bed22:"./bed22.png",
  bed21:"./bed21.png",
  fluortorch:"./fluortorch1.png",
  book:"./book.png",
  bookshelf:"./bookshelf.png",
  shelf:"./shelf.png",
  loom:"./loom.png",
  web:"./web.png",
  silk:"./silk.png",
  carnallite :"./carnallite.png",
  pyrolusite:"./pyrolusite.png",
  epsomite:"./epsomite.png",
  barite:"./barite.png",
  anhydrite:"./anhydrite.png",
  hematite:"./hematite.png",
  calcite:"./calcite.png",
  fluorite:"./fluorite.png",
  bluewallpaperroller:"./bluewallpaperroller.png",
  redwallpaperroller:"./redwallpaperroller.png",
  whitewallpaperroller:"./whitewallpaperroller.png",
  bluewallpaper:"./bluewallpaper.png",
  limewallpaperroller: "./limewallpaperroller.png",
  limewallpaper: "./limewallpaper.png",
  whitewallpaper:"./whitewallpaper.png",
  redwallpaper:"./redwallpaper.png",
  houseinside:"./houseinside.png",
  coral1block:"./coral1block.png",
  coral2block:"./coral2block.png",
  coral1floor:"./coral1floor.png",
  coral2floor:"./coral2floor.png",
  desertsoul:"./desertsoul.png",
  orangetorch:"./desertorch1.png",
  darktorch:"./darktorch1.png",
  whitetorch:"./whitetorch1.png",
  limetorch:"./limetorch1.png",
  purpletorch:"./purpletorch1.png",
  crystal6:"./crystal6.png",
  ghostsapling:"./ghostsapling.png",
  ghosttree1:"./ghosttree1.png",
  ghosttree2:"./ghosttree2.png",
  musicbox:"./musicbox.png",
  disc1:"./disc1.png",
  disc2:"./disc2.png",
  itempotato:"./itempotato.png",
  litpumpkin:"./litpumpkin.png",
  chips:"./chips.png",
  potato:"./potato.png",
  potato2:"./potato2.png",
  fire:"./fire1.png",
  bluetorch:"./bluetorch1.png",
  melonfruit:"./melonfruit.png",
  melon:"./melon.png",
  melon2: "./melon2.png",
  melon1: "./melon1.png",
  nametag: "./nametag.png",
  melonsword: "./melonsword.png",
  trashcan:"./trashcan.png",
  pumpkin1:"./pumpkin1.png",
  pumpkin2:"./pumpkin2.png",
  pumpkin3:"./pumpkin3.png",
  pumpkin:"./pumpkin.png",
  corruptedthing:"./corruptedthing.png",
  thingeyes:"./thingeyes.png",
  bloodentrance:"./bloodentrance.png",
  darkmagnetite:"./darkmagnetite.png",
  bloodsnow:"./bdsnow.png",
  blood1: "./blood1.png",
  blood2: "./blood2.png",
  darksand: "./darksand.png",
darkgrass: "./darkgrass.png",
   wolframite: "./wolframite.png",
  cavebuilder: "./cavebuilder.png",
  wolframaxe: "./wolframaxe.png",
  chest: "./chest.png",
  uraniumaxe: "./uraniumaxe.png",
  wolfram: "./wolfram.png", 
  shallowwater:"./shallowwater1.png",
  zombieflesh:"./flesh.png",
  coalore:"./coalore.png",
  cavedirt:"./cavedirt.png",
  randomrock1:"./randomrock1.png",
  randomrock2:"./randomrock2.png",
  hypersword:"./hypersword.png",
  osm:"./osm.png",
  osmiumbar:"./osmiumbar.png",
  osmiumbuff:"./osmiumbuff.png",
  osmiumsword:"./osmiumsword.png",
  osmium:"./osmium.png",
  uranium:"./uranium.png",
  toxicsword:"./toxicsword.png",
    stairsup: "./stairsup.png",
    stairsdown: "./stairsdown.png",
    templewall:"./templewall.png",
    templefloor:"./templefloor.png",
    templekey:"./templekey.png",
    flesh:"./flesh.png",
    eyeball:"./eyeball.png",
    rainbowbow: "./rainbowbow.png",
    quantumbow: "./quantumbow.png", 
    moltenbow: "./moltenbow.png",
carrot: "./carrot.png",
    sushi: "./sushi.png",
    shell1: "./shell1.png",
    shell2: "./shell2.png",
    shell3: "./shell3.png",
    wildcarrot: "./wildcarrot1.png",
carrot2: "./carrot1.png",
    soup: "./soup.png",
    plantmaker: "./plantmaker.png" ,
    cauldron: "./cauldron1.png" ,
    fountain: "./fountain1.png" ,
    textstone: "./textstone.png" ,
    nametag: "./nametag.png" ,
bottle: "./bottle.png" , bow: "./bow.png", arrows: "./arrow.png", hellbow: "./hellbow.png",  
nightbow: "./nightbow.png",
darkbow: "./darkbow.png",
powerfullarrows: "./powerfullarrow.png",
    goodarrows: "./goodarrow.png",
mercurybottle: "./mercurybottle.png",
mercuryliquid: "./mercuryliquid.png",
eggs: "./eggs.png",
eggshells: "./eggshells.png",
friedegg: "./friedegg.png",
feather: "./feather.png",
rarefeather: "./rarefeather.png",
mythicfeather: "./mythicfeather.png",
calciumacetylide: "./calciumacetylide.png",
cigarettes: "./cigarettes.png",
diamante: "./diamante.png",
diamante1: "./diamante.png",
cinnabargeode: "./cinnabargeode.png",
warporb: "./warporb1.png",
palm1: "./palm1.png",
palm3: "./palm1.png",
palm2: "./palm21.png",
palmlog: "./palm1.png",
palm12: "./palm1.png",
    palm32: "./palm1.png",
    coconutpalm: "./palm31.png",
coconut: "./coconut.png",
palmsapling: "./palmsapling.png",
stonesing: "./stonesing.png",
hallucinate: "./hallucinate1.png",
    candle: "./candle.png",
    a1bed: "./1bed.png",
    a2bed: "./2bed.png",
    can: "./can.png",
    carpet: "./carpet.png",
    polishedfloor: "./polishedfloor.png",
    road2: "./road2.png",
    abysslog: "./abysstree0.png",
    helllog: "./helltree0.png",
 hellsapling:"./hellsapling.png",
 abysssapling:"./abysssapling.png",
 helltree0:"./helltree1.png",
 helltree1:"./helltree1.png",
 helltree2:"./helltree2.png",
 hellwood:"./hellwood.png",
 hellgrass:"./hellgrass1.png",
 hellplank:"./hellplank1.png",
 abyssgrass: "./abyssgrass1.png",
abyssplank: "./abyssplank1.png",
 abyssgel:"./abyssgel.png",
 abysswood:"./abysswood.png",
 abysstree0:"./abysstree0.png",
 abysstree1:"./abysstree0.png",
 abysstree2:"./abysstree2.png",
 hell_boomerang:"./hell_boomerang.png",
 draco_boomerang:"./draco_boomerang.png",
 good_boomerang:"./good_boomerang.png",
 titanium_boomerang:"./titanium_boomerang.png",
 boomerang: './boomerang.png',
 dracobuff: './dracobuff.png',
 extinguished_campfire: './extinguished_campfire1.png',
 algae1: './algae1.png',
 algae0: './algae1.png',
 algae2: './algae3.png',
 goldnugget: './goldnugget.png',
 leafbowl: './leafbowl.png',
 leafbowlwithwater: './leafbowlwithwater.png',
 leafbowlwithcleanwater: './leafbowlwithcleanwater.png',
 briarempty: './briarempty.png',
 deepblues: './deepblues.png',
 climbhill: './climbhill.png',
 blueflower2: './blueflower2.png',
 redflower2: './redflower2.png',
 lightwhite: './lightwhite.png',
 hill_climber: './hill_climber.png',
 iron_shovel: './iron_shovel.png',
 statue1_1: './statue1_1.png',
 statue1_2: './statue1_2.png',
 statue2_1: './statue2_1.png',
 statue2_2: './statue2_2.png',
 blower: './blower.png',
 kiln: './kiln.png',
 lit_kiln: './lit_kiln1.png',
 iron_shovel: './iron_shovel.png',
 hill1: './hill_d.png',
 grassdeco: './grassdeco1.png',
 coast: './coast1.png',
 cactusempty: './cactusempty.png',
  godwand: './godwand.png',
  statueofgods: './statueofgods1.png',
  honey_mushrooms : './honey-mushroom.png',  
  log0: './log0.png', 
  deadgrassfloor: './deadgrass.png',
  deadgrassfloor2: './deadgrass.png',
  deadgrass: './dead grass.png',
  itemroad: './road.png',
  road: './road0.png',
  leaves: './leaves.png',
  grass2:"./grass2none.png",
  healthregenerator: './healthregenerator.png',
  staminaregenerator: './staminaregenerator.png',
  redanvil: './redanvil.png',
  magicwand: './magicwand.png',
  greenwand: './greenwand.png',
  magicwandofsharp: './wandofsharp.png',
  hyperblastwand: './hyperblastwand.png',
  forestgrass: './forestgrass.png',
  blush: './forestblush.png',
  forestleaf: './forestleaf.png',
  gravestone: './gravestone.png',
  forestgrasslayer:"./forestgrass.png",
  moltensword: './moltensword.png',
  broom: './broom.png',
  hellsword: './hellsword.png',
  knive: './knive.png',
  hellknive: './hellknive.png',
  hellwall: './hellwall2.png',
  fleshblock1: './fleshwall1.png',
  myosotis:"./Myosotis.png",
  granite: './granite.png',
  basalt: './basalt.png',
  hellbuff: './hellbuff.png',
  aquagem: './aquagem.png',
  darkore: './darkore.png',
  hellessence: './hellessence.png',
  celestialfragment: './celestialfragment.png',
  celestialspawner: './celestialspawner.png',
  darkore: './darkore.png',
  daffodil: './daffodil.png',
  flax:"./flax0.png",
  fleshblock2: './fleshblock1.png',
  lava: './lava1.png',
hell_entrance: './cave-entrance.png',
hell_escape: './cave-escape.png',
hellgem:"./hellgem.png",
hellwall:"./hellwall2.png",
moltenstone:"./moltenstone1.png",
hellcavestone:"./hellcavestone.png",
  titaniumbuff:"./titaniumbuff.png",
  lamp:"./lamp1.png",
  lamp2:"./lamp2.png",
  truegodsword:"./truegodsword.png",
  table:"./table.png",
  roadfloor:"./roadfloor.png",
  compass:"./compass.png",
  defensering:"./defensering.png",
  sing:"./sing.png",
  deepgodspawner:"./deepgodspawner.png",
  itemfence:"./itemfence.png",
fence:"./fence.png",
emptyblackberry:"./emptyblackberry.png",
brickfloor2:"./brickfloor2.png",
godstatue:"./godstatue.png",
geyser:"./geyser1.png",
magiclanter:"./magiclantern.png",
magicgem:"./magicgem.png",
desertcore:"./desertcore.png",
skull:"./skull.png",
bush:"./bush.png",
icemedalion:"./icemedalion.png",
speedmedalion:"./speedmedalion.png",
healmedalion:"./cursedmedalion.png",
icesword:"./icesword.png",
desertsand: './sandblock.png',
frozeningot:"./frozeningot.png",
snowflower:"./snowflower.png",
snowgrass:"./snowgrass.png",
snowgrass2:"./snowgrass.png",
snowpine1:"./snowpine1.png",
snowpine2:"./snowpine2.png",
snowpine3:"./snowpine3.png",
thistleseeds:"./thistleseeds.png",
abysscore:"./coreofabyss.png",
gel:"./gel.png",
abyssgem:"./abyssgem.png",
gelblock:"./gelfloor.png",
abyssfloor:"./abyssfloor.png",
abyssblock2:"./abyssblock.png",
abyssblock:"./abyssblock.png",
crystal1:"./crystal1.png",
crystal2:"./crystal2.png",
crystal3: "./crystal3.png",
abyssentrance: "./abyssportal1.png",
abyssescape: "./cave-escape.png",
universeechoes:"./universeechoes.png",
trueuniverseorb:"./trueuniverseorb.png",
trueuniversesword:"./trueuniversesword.png",
trueuniversespawner:"./trueuniversespawner.png",
seaweed:"./seaweed1.png",
seashiny:"./seashiny.png",
aquacore:"./aquacore.png",
aquagodshell:"./aquagodshell.png",
  universesword:"./universesword.png",
  universefragment:"./universefragment.png",
  shell:"./shell.png",
  corruptioncore:"./corruptioncore.png",
  underwaterescape:"./underwaterescape.png",
  underwaterentrance:"./underwaterentrance.png",
  coral1:"./coral1.png",
  coral2:"./coral2.png",
  underwatersand:"./underwatersand.png",
  underwatersandblock:"./underwatersandblock.png",
  aquawall:"./aquawall1.png",
  echofabric:"./echofabric.png",
  echorocks:"./echorocks.png",
  aquaspear:"./aquaspear.png",
  blossomblock:"./blossomblock.png",
  glowblossom:"./glowblossom.png",
  aquaore:"./aquaore.png",
  aquacaveblock:"./aquacaveblock.png",
  corruptedchalcopyrite:"./corruptedchalcopyrite.png",
  corruptedgrass:"./corruptedgrass.png",
  fleshvolume:"./fleshvolume.png",
  fleshdumbass:"./fleshdumbass.png",
  fleshsaber:"./fleshsaber.png",
  coloressence:"./colorsessence.png",
rainbow:"./rainbow.png",
  titaniumsword:"./titaniumsword.png",
  evileye:"./evileye.png",
  nightgem:"./nightgem.png",
  nightsword:"./nightsword.png",
  goodmace:"./godmace.png",
  goodsword:"./godsword.png",
  thundersword:"./thundersword.png",
  evileye:"./evileye.png",
  evileye:"./evileye.png",
  evilsummoner:"./evilsummoner.png",
  soulofsharp:"./soulofsharp.png",
  aquaticevent:"./aquaticevent.png",
  soulofsharp:"./soulofsharp.png",
  sharpsaw:"./sharpsaw.png",
  sharpmace:"./sharpmace.png",
  titaniummace:"./titaniummace.png",
  dandelion2:"./dandelion2.png",
dandelionseeds:"./dandelionseeds.png",
  candy:"./candy.png",
  energybowl:"./energybowl.png",
  healthbowl:"./healthbowl.png",
  salt: './salt.png',
  titaniumbar: './titaniumbar.png',
  titaniumdioxide: './titaniumdioxide.png',
  iron_mace: './iron-mace.png',
  iron_sword: './iron-sword.png',
  voltary_essence: './voltaryspawner.png',
 spikegod_essence: './spikegodspawner.png',
  unknown: './unknown1.png',
  violetfloor: './violetfloor.png',
  bread_sample: './bread_sample.png',
  gypsumhouse: './gypsumhouse.png',
  gypsumdoor: './gypsumdoor.png',
  gypsumroof: './gypsumroof.png',
  house_wall: './housewall.png',
heavybag: './heavybag.png',
  ryeroof: './ryeroof.png',
  poppy: './poppy.png',
  brickhouse: './brickhouse.png',
  rockhouse: './rockhouse.png',
  table: './table.png',
  voidblock: './void.png',
  housegrass: './housefloor.png',
  houseroof: './rooftop.png',
  door: './door.png',
  door2: './door2.png',
  yeast: './yeast.png',
  beer: './beer.png',
  rye_seeds: './rye_seeds.png',
  black_elderberry: './black_elderberry.png',
  black_elderberry_tree: './black_elderberry_tree.png',
  empty_black_elderberry: './empty_black_elderberry.png',
  black_elderberry2: './black_elderberry2.png',
  empty_black_elderberry2: './empty_black_elderberry2.png',
  mycelium: './mycelium.png',
  black_elderberries: './black_elderberries.png',
  fermentator: './fermentator.png',
  flour: './flour.png',
  sugar: './sugar.png',
  waterdrop: './waterdrop.png',
  fermentator: './fermentator.png',
  smoother: './smoother.png',
  bread: './bread.png',
  smooth_stone: './smooth-stone.png',
  emerald: './emerald.png',
  cave_entrance: './cave-entrance.png',
  gypsumfloor: './gypsumfloor.png',
  opal: './opal1.png',
  opalblock: './opalblock1.png',
  emeraldblock: './emeraldblock.png',
  sapphireblock: './sapphireblock.png',
  rubyblock: './rubyblock.png',
  sapphirefloor: './sapphirefloor.png',
  emeraldfloor: './emeraldfloor.png',
  rubyfloor: './rubyfloor.png',
  cinnabar: './cinnabar.png',
  mercury: './mercury.png',
  pipette: './pipete.png',
  ilmenite: './ilmenite.png',
  hook: './hook1.png',
  salmon: './salmon.png',
  cooked_salmon: './cooked_salmon.png',
  trout: './trout.png',
  cooked_trout: './cooked_trout.png',
  catchhook: './catchhook1.png',
  fishing_rod:"./fishing_rod.png",
  rye1: './rye.png',
  cavemakingpickaxe: './great-cave-making-pickaxe.png',
  customcaveentrance: './custom-cave-entrance.png',
  cave_escape: './cave-escape.png',
  cave_wall: './cavewall.png',
  cave_floor: './cavefloor.png',
  pickaxe: './pickaxe.png',
  ruby: './ruby.png',
  sapphire: './sapphire.png',
  pyrite : './pyrite.png',
  pyritestone : './pyritestone.png',
  cavewallwithsalt: './cavewallwithsalt.png',
stonewithgypsum: './cavewallwithgypsum.png',
  broken_cavewall:"./cavewall2.png",
water1: './water.png',
bed1: './fiberbed.png',
gypsumblock: './gypsumblock.png',
  copper: './copper.png',
  anvil: './anvil.png',
  stonedirt: './dirt-with-stones.png',
  larger_bag: './larger-bag.png',
  lit_furnace: './lit_furnace.png',
  furnace: './furnace.png',
  bunnmeat: './bunnmeat.png',
  cooked_bunnmeat: './cooked_bunnmeat.png',
  alchemy_table: './alchemy_table.png',
  gypsum: './gypsum.png',
  wood_manipulator: './wood_manipulator.png',
  sulfur: './sulfur.png',
  grains_of_sand: './sand2.png',
  planks: './planks.png',
  planks_floor: './planks_floor.png',
  gypsum_dirt: './gypsum_dirt.png',
  bone: './bone.png',
  bone_sword: './bone_sword.png',
  bowl: './bowl.png',
  bowl_with_seawater: './bowl_with_seawater.png',
  bowl_with_water: './bowl_with_water.png',
  sandblock2: './sandblock.png',
  sand2: './sandblock.png',
  glass: './glass.png',
  cactus: './cactus.png',
  cactus_fruit: './cactus-fruit.png',
  rye: './rye.png',
  flour: './flour.png',
  
iron: './iron.png',
iron_bar: './iron-bar.png',
copper_bar: './copper-bar.png',
copper: './copper.png',
extrabag: './extra-bag.png',
fiber_fabric: './fiber-fabric.png',
magnetite_powder: './magnetite-powder.png',
coal: './coal.png',
iron_spear: './iron-spear.png',
copper_spear: './copper-spear.png',
  long_spear: './long-spear.png',
  hand_torch: './hand-torch.png',
  magnetite: './magnetite.png',
  raw_sharkmeat: './raw_sharkmeat.png',
  cooked_sharkmeat: './cooked_sharkmeat.png',
    grass: './grass.png',
    coal: './coal.png',
    sapling: './sapling.png',
pointed_stick: './pointed_stick.png',
    clay: './clay.png',
  clayblock1: './clayblock.png',
  clayblock: './clayblock.png',
  brick: './brick.png',
  brickwall: './brickwall.png',
  brickfloor: './brickfloor.png',
  ash: './ash1.png',
  ashfloor: './ashblock.png',
    dirt: './dirt.png',
    tree0: './tree0.png',
    tree1: './tree1.png',
    tree2: './tree2.png',
    birch0: './birch0.png',
    birch1: './birch1.png',
    birch2: './birch2.png',
    tallgrass: './grass2.png',
    rock: './rock.png',
    yellow: './yellow.png',
    dirty_water: './dirty-water.png',
    water: './water.png',
    stones: './stones.png',
    sticks: './sticks.png',
    briar: './briar.png',
    kite1: './kite.png',
    kite: './kite.png',
    nettle: './nettle.png',
    thistle: './thistle.png',
    thistle1: './thistle.png',
    yew0: './yew0.png',
    yew1: './yew1.png',
    pine0: './pine0.png',
    pine1: './pine1.png',
    pine2: './pine2.png',
    violet: './violet.png',
    treebark: './treebark.png',
    shiny: './shine.png',
    toadstool: './toadstool.png',
    fern: './fern.png',
    blackberry: './blackberry.png',
    dandelion: './dandelion.png',
    sand: './sandblock.png',
    chalcopyrite: './chalcopyrite.png',
    stone_floor: './stone_floor.png',
    stone_wall: './stone_wall.png',
    fiber_floor: './fiber_floor.png',
    log_wall: './woodblock.png',
    thistleroot: './thistleroot.png',
  cooked_thistleroot: './cooked_thistleroot.png',
"blackberry-fruit": './blackberry-fruit.png',
    "fiber": "./fiber.png",
            "bigrock": "./largerock.png",
            "stone": "./stones.png",
            "sharpstone": "./sharpstone.png",
            "stick": "./sticks.png",
            "longstick": "./longstick.png",
            "woodboard": "./board.png",
            "treebark": "./treebark.png",
            "yew": "./yew-fruit.png",
            "briar-fruit": "./briar-fruit.png",
            "resin": "./resin.png",
"handdrill-kit": "./handdrill.png",
"fireroll": "./fireroll.png",
"cordage": "./cordage.png",
"dowel": "./dowel.png",
"log": "./tree0.png",
"stone_axe": "./stone_axe.png",
"stone_scyte": "./stone_scyte.png",
"fireplow": "./fireplow.png",
"birch-powder": "./birch-powder.png",
torch:"./torch.png", 
campfire:"./campfire.png",
ignited_fiber  :"./embered_fiber.png",
log_floor  :"./log_floor.png",
stoneshovel  :"./shovel.png",
grasslayer  :"./grass.png",
curedgrasslayer  :"./grass.png",
decrafter  :"./decrafter.png",
};
let defaultTextureSources = { ...textureSources }

 
let specialTextures = {
cut1: "./cut1.png", cut2:"./cut2.png", cut3:"./cut3.png", cut4:"./cut4.png",cut5:"./cut5.png",cut6:"./cut6.png",cut7:"./nothing.png",cut8:"./nothing.png",cut9:"./nothing.png", 
crit1:"./crit1.png",crit2:"./crit2.png",crit3:"./crit3.png",crit4:"./crit4.png",crit5:"./crit5.png",crit6:"./nothing.png",
orb1:"./exp1.png",orb2:"./exp2.png",
};
function loadTexturesToSpecial(player, armour, specialTextures) {
    let specialLoaded = { ...specialTextures };
    for (let anim in player.textures) {
        const tex = player.textures[anim];
        if (Array.isArray(tex)) {
            tex.forEach((src, i) => {
                specialLoaded[`${anim}${i}`] = src;
            });
        } else {
            specialLoaded[anim] = tex;
        }
    }
    for (let armourName in armour) {
        for (let anim in armour[armourName]) {
            const tex = armour[armourName][anim];
            if (Array.isArray(tex)) {
                tex.forEach((src, i) => {
                    specialLoaded[`${armourName}_${anim}${i}`] = src;
                });
            } else {
                specialLoaded[`${armourName}_${anim}`] = src;
            }
        }
    }
    return specialLoaded;
}
specialTextures = {...specialTextures,...loadTexturesToSpecial(playerold, oldarmour, specialTextures) }
let specialTexturesOld = { ...specialTextures }
for (const [name, src] of Object.entries(specialTextures)) {
 specialTextures[name] = new Image();
 let src2 = removeDotSlash(src)
 specialTextures[name].src = getBase64Image(src2, assets);
}
function loadWeaponTextures() {
}
const animatedTextures = {
ethersoul: {
	frames: ['./ethersoul1.png', './ethersoul2.png'],
	speed: 0.5
},
invisiblearmourring:{
	frames:['./ring1.png','./ring2.png','./ring3.png','./ring4.png','./ring5.png','./ring6.png','./ring7.png','./ring8.png'],
	speed:0.2
},
ethergate: {
	frames: ['./ethergate1.png', './ethergate2.png', './ethergate3.png'],
	speed: 0.5
},
ethergateback: {
	frames: ['./ethergate1.png', './ethergate2.png', './ethergate3.png'],
	speed: 0.2
},
etherwater: {
	frames: ['./etherwater1.png', './etherwater2.png'],
	speed: 0.5
},
etheractive: {
	frames: ['./etheractive1.png', './etheractive2.png'],
	speed: 0.4
},
etheractive2: {
	frames: ['./etheractive1.png', './etheractive2.png'],
	speed: 0.4
},
etherthing: {
	frames: ['./etherthings1.png', './etherthings2.png'],
	speed: 1
},
 magma: {
	frames: ['./magma1.png', './magma2.png', './magma3.png', './magma4.png'],
	speed: 0.2
},
fluortorch: {
  frames: ['./fluortorch1.png', './fluortorch2.png'],
  speed: 0.2
},
orangetorch: {
  frames: ['./desertorch1.png', './desertorch2.png'],
  speed: 0.2
},
darktorch: {
  frames: ['./darktorch1.png', './darktorch2.png'],
  speed: 0.2
},
whitetorch: {
  frames: ['./whitetorch1.png', './whitetorch2.png'],
  speed: 0.2
},
flowerpollen: {
	frames: ['./flowerpollen1.png', './flowerpollen2.png'],
	speed: 1.2
},
limetorch: {
  frames: ['./limetorch1.png', './limetorch2.png'],
  speed: 0.2
},
purpletorch: {
  frames: ['./purpletorch1.png', './purpletorch2.png'],
  speed: 0.2
},
Cgrass:{
 frames:["./Cgrass1.png","./Cgrass2.png"], speed:0.8
},
  fire:{
    frames:["./fire1.png","./fire2.png"], speed:1.5
  },
    hallucinate: {
        frames : ["./hallucinate1.png","./hallucinate2.png","./hallucinate3.png","./hallucinate4.png","./hallucinate5.png","./hallucinate6.png",],
        speed:0.5
    },
    bloodliquid:{
      frames: ['./blood1.png', './blood2.png'],
  speed: 1.5
    },
warporb: {
    frames: ['./warporb1.png', './warporb2.png'],
    speed: 1.5
},
wildcarrot: {
    frames: ['./wildcarrot1.png', './wildcarrot2.png'],
    speed: 1.5
},
carrot2: {
    frames: ['./carrot1.png', './carrot2.png'],
    speed: 1.5
},
palm2: {
    frames: ['./palm21.png', './palm22.png'],
    speed: 1.5
},
cauldron: {
    frames: ['./cauldron1.png', './cauldron2.png'],
    speed: 1.5
},
fountain: {
    frames: ['./fountain1.png', './fountain2.png'],
    speed: 0.5
},
coconutpalm: {
    frames: ['./palm31.png', './palm32.png'],
    speed: 1.5
},
hellplank: {
    frames: ['./hellplank1.png', './hellplank2.png'],
    speed: 1.5
},
abyssplank: {
    frames: ['./abyssplank1.png', './abyssplank2.png'],
    speed: 1.5
},
 abyssgrass: {
    frames: ['./abyssgrass2.png', './abyssgrass1.png'], 
    speed: 0.7
},
hellgrass: {
    frames: ['./hellgrass2.png', './hellgrass1.png'],
    speed: 0.7
},
abysstree1: {
    frames: ['./abysstree1.png', './abysstree0.png'],
    speed: 1.7
},
abysstree0: {
    frames: ['./abysstree1.png', './abysstree0.png'],
    speed: 1.7
},
helltree1: {
    frames: ['./helltree1.png', './helltree0.png'],
    speed: 1.7
},
helltree0: {
    frames: ['./helltree1.png', './helltree0.png'],
    speed: 1.7
},
 algae1: {
 frames: ['./algae1.png', './algae2.png'],
 speed: 0.5
},
algae0: {
 frames: ['./algae1.png', './algae2.png'],
 speed: 0.5
},
 statueofgods: {
  frames: ['./statueofgods1.png', './statueofgods2.png'], 
  speed: 0.2 
},
bluetorch: {
  frames: ['./bluetorch1.png', './bluetorch2.png'], 
  speed: 0.2
},
    torch: {
        frames: ['./torch.png', './torch2.png'], 
        speed: 0.2  
    },
lamp2: {
  frames: ['./lamp2.png', './lamp3.png'], 
  speed: 0.1 
},
hellwall: {
  frames: ['./hellwall1.png', './hellwall2.png'], 
  speed: 0.5 
},
lava: {
  frames: ['./lava1.png', './lava1.png'], 
  speed: 0.3 
},
hellwall2: {
  frames: ['./hellwall1.png', './hellwall2.png'], 
  speed: 0.5 
},
moltenstone: {
  frames: ['./moltenstone1.png', './moltenstone2.png'], 
  speed: 5 
},
abyssentrance: {
  frames: ['./abyssportal1.png', './abyssportal2.png'], 
  speed: 0.2 
},
seaweed: {
      frames: ['./seaweed1.png', './seaweed2.png'], 
      speed: 1.5 
    },
    geyser: {
  frames: ['./geyser2.png', './geyser3.png', './geyser4.png', './geyser5.png'], 
  speed: 0.2 
},
aquawall: {
  frames: ['./aquawall1.png', './aquawall2.png'], 
  speed: 0.3 
},
    unknown: {
  frames: ['./unknown1.png', './unknown2.png'], 
  speed: 0.1 
},
water: {
  frames: ['./water.png', './water2.png'], 
  speed: 0.9 
},
shallowwater: {
  frames: ['./shallowwater1.png', './shallowwater2.png'], 
  speed: 0.9 
},
swampwater: {
	frames: ['./swampwater1.png', './swampwater2.png'], 
	speed: 0.9 
},
coast: {
 frames: ['./coast1.png', './coast2.png'], 
 speed: 0.9 
},
water1: {
  frames: ['./water.png', './water2.png'], 
  speed: 0.9 
},
rye: {
  frames: ['./rye.png', './rye2.png'], 
  speed: 0.5 
},
grassdeco: {
 frames: ['./grassdeco1.png', './grassdeco2.png'], 
 speed: 0.5 
},
graygrass: {
	frames: ['./graygrass1.png', './graygrass2.png'], 
	speed: 0.5 
},
opalblock: {
  frames: ['./opalblock1.png', './opalblock2.png', './opalblock3.png', './opalblock4.png', './opalblock5.png', './opalblock6.png', './opalblock7.png', './opalblock8.png', './opalblock9.png', './opalblock10.png', './opalblock11.png','./opalblock12.png','./opalblock13.png'], 
  speed: 0.1 
},
opal: {
  frames: ['./opal1.png', './opal2.png', './opal3.png', './opal4.png', './opal5.png', './opal6.png', './opal7.png', './opal8.png', './opal9.png', './opal10.png', './opal11.png'], 
  speed: 0.2 
},
    lit_furnace: {
  frames: ['./lit_furnace.png', './lit_furnace1.png'], 
  speed: 0.2 
},
lit_kiln: {
 frames: ['./lit_kiln1.png', './lit_kiln2.png'], 
 speed: 0.2 
},
tallgrass: {
  frames: ['./grass2.png', './grass3.png'], 
  speed: 0.5 
},
    campfire: {
  frames: ['./campfire.png', './campfire2.png'], 
  speed: 0.5 
   },
 extinguished_campfire: {
 frames: ['./extinguished_campfire1.png', './extinguished_campfire2.png'], 
 speed: 0.3 
},
   hook: {
  frames: ['./hook1.png', './hook2.png'], 
  speed: 0.5 
},
catchhook: {
  frames: ['./catchhook1.png', './catchhook2.png'], 
  speed: 0.2 
},
};
let animatedTexturesOld = { ...animatedTextures }
function loadTextures() {
    for (const [key, animData] of Object.entries(animatedTextures)) {
        const frames = animData.frames.map(src => {
            const img = new Image();
         let src2=removeDotSlash(src)
            img.src = getBase64Image(src2,assets) ;
            return img; 
        });
        animatedTextures[key] = {
            frames: frames,
            speed: animData.speed,
            currentFrame: 0,
            lastFrameTime: 0
        };
    }
}
loadTextures()
for (const [name, src] of Object.entries(textureSources)) {
    textures[name] = new Image();
    let src2 = removeDotSlash(src)
textures[name].src = getBase64Image(src2, assets);
}
var offsetX = 0;
var offsetY = 0;
let chunks = {};
let moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
var worldseed="83455AB5CC2092";
let caveChunks = {};
let caveChunks2 = {};
let overworldChunks = null;
let generateCave = 0; 
let generateCaveForEther = 0; 
let allCaveEntrances = [];
let allHellCaveEntrances = [];
let delayChangeDimension=0
function checkCaveEntranceOrExit(playerX, playerY) {
  }
let cavesempty = [];
function generateCaves(x, y) {
    const islandChance = 0.025 ; 
    const minDistance = 500;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of cavesempty) {
        const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
        const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius && island.typ ) {
if (island.typ == 1) {
  return 1;
}else if (island.typ == 3) {
  return 3;
} else { 
  return 2;
}
}}
if (distanceFromCenter > minDistance && hashCoords(x,y,0, seed) < islandChance) {
  let radius = Math.floor(hashCoords(x,y,1, seed) * 150) + 20;
  let type = 0
if (hashCoords(x,y,1, seed) < 0.75 ) {
  type = 2
  radius = Math.floor(hashCoords(x,y,2, seed) * 155) + 70;
}else if (hashCoords(x,y,1, seed) < 0.65) {
  type = 3
  radius = Math.floor(hashCoords(x,y,3, seed) * 155) + 70;
} else {
  type = 1
  radius = Math.floor(hashCoords(x,y,4, seed) * 120) + 20;
}
const islandX = x ;
const islandY = y ;
cavesempty.push({ x: islandX, y: islandY, radius: radius, typ: type });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
        if(dta<=radius){ return true; }else{ return false;}
    }
return false; }
let cavesempty3 = [];
function generateCaves3(x, y) {
    const islandChance = 0.05; 
    const minDistance = 500;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of cavesempty3) {
        const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
        const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,4.5, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,5, seed) * 100) + 10;
const islandX = x + Math.floor(hashCoords(x,y,6, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,7, seed) * 300) - 250;
cavesempty3.push({ x: islandX, y: islandY, radius: radius  });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
        if(dta<=radius){ return true; }else{ return false;}
    }
return false; }
let cavesempty4 = [];
function generateFlesh(x, y) { 
    const islandChance = 0.005; 
    const minDistance = 500;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of cavesempty4) {
        const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
        const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,8, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,9, seed) * 200) + 10;
const islandX = x + Math.floor(hashCoords(x,y,10, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,10.5, seed) * 300) - 250;
cavesempty4.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
        if(dta<=radius){ return true; }else{ return false;}
    }
return false;
}
let cavesempty5 = [];
function generateGranite(x, y) { 
    const islandChance = 0.005; 
    const minDistance = 500;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of cavesempty5) {
        const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
        const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,11, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,12, seed) * 200) + 10;
const islandX = x + Math.floor(hashCoords(x,y,12.5, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,13, seed) * 300) - 250;
cavesempty5.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
        if(dta<=radius){ return true; }else{ return false;}
    }
return false;
}
let cavesempty6 = [];
function generateBasalt(x, y) { 
    const islandChance = 0.005; 
    const minDistance = 500;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of cavesempty6) {
        const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
        const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,14, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,15, seed) * 200) + 10;
const islandX = x + Math.floor(hashCoords(x,y,17, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,18, seed) * 300) - 250;
cavesempty6.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
        if(dta<=radius){ return true; }else{ return false;}
    }
return false;
}
let cavesempty2 = [];
function generateCaves2(x, y) {
    const islandChance = 0.05; 
    const minDistance = 500;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of cavesempty2) {
        const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
        const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,7, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,19, seed) * 200) + 40;
const islandX = x + Math.floor(hashCoords(x,y,20, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,21, seed) * 300) - 250;
cavesempty2.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
        if(dta<=radius){ return true; }else{ return false;}
    }
return false; }
let swamppeats = [];
let swampshallowaters = [];
let deadlands = [];
function generateDeadLand(x, y) {
    const islandChance = 0.0015; 
    const minDistance = 1000;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of deadlands) {
const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,22, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,23, seed) * 100) + 80;
const islandX = x + Math.floor(hashCoords(x,y,24, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,25, seed) * 300) - 250;
deadlands.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
if(dta<=radius){ return true; }else{ return false;}}
return false; }
function generateSwampPeat(x, y) {
    const islandChance = 0.0065; 
    const minDistance = 1000;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of swamppeats) {
const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,1, "1"+seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,2, "12"+seed) * 150) + 50;
const islandX = x + Math.floor(hashCoords(x,y,3, "12"+seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,4, "12"+seed) * 300) - 250;
swamppeats.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
if(dta<=radius){ return true; }else{ return false;}}
return false; }
function generateShWater(x, y) {
    const islandChance = 0.0065; 
    const minDistance = 1000;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of swampshallowaters) {
const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,1, "1"+seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,2, "1"+seed) * 200) + 100;
const islandX = x + Math.floor(hashCoords(x,y,3, "1"+seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,4, "1"+seed) * 300) - 250;
swampshallowaters.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
if(dta<=radius){ return true; }else{ return false;}}
return false; }
let grassroad = [];
function generategrassroad(x, y) {
    const islandChance = 0.05; 
    const minDistance = 1000;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of grassroad) {
const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
        if (distToIslandCenter <= island.radius) {
if (distanceFromEdge < 30) {return true;
} else { return true;}}}
if (distanceFromCenter > minDistance && hashCoords(x,y,26, seed) < islandChance) {
const radius = Math.floor(hashCoords(x,y,27, seed) * 60) + 30;
const islandX = x + Math.floor(hashCoords(x,y,28, seed) * 300) - 250; 
const islandY = y + Math.floor(hashCoords(x,y,29, seed) * 300) - 250;
grassroad.push({ x: islandX, y: islandY, radius: radius });
let dta=Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2)
if(dta<=radius){ return true; }else{ return false;}}
return false; }
let islands = [];
let islands2 = [];
function islandEther(x, y) {
	const islandChance = 0.012;
	const minDistance = 750; 
	const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
	for (const island of islands2) {
		const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
		const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
		if (distToIslandCenter <= island.radius) {
				return "grass"
				}
				if (distanceFromEdge < 65) {
	return 'sand';
}
	}
	if (distanceFromCenter > minDistance && hashCoords(x, y, 30, seed) < islandChance) {
		const randomType = hashCoords(x, y, 997, seed);
		let radius;
		radius = Math.floor(hashCoords(x, y, 36, seed) * 375) + 150; 
		const islandX = x + Math.floor(hashCoords(x, y, 37, seed) * 300) - 250; 
		const islandY = y + Math.floor(hashCoords(x, y, 38, seed) * 300) - 250;
		islands2.push({ x: islandX, y: islandY, radius });
		const distToNewIsland = Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2);
		if (distToNewIsland <= radius) {
			return 'grass';
		}
	}
	return 'water';
}
function generateRandomIsland(x, y) {
  const islandChance = 0.012; 
  let addchance=0.015
  const snowIslandChance = 0.019+addchance;
  const desertIslandChance = 0.021+addchance;
  const ForestIslandChance = 0.040+addchance; 
  const SwampIslandChance = 0.065+addchance; 
  const VuIslandChance = 0.090+addchance; 
  const canyonChance = 0.050+addchance; 
  const minDistance = 850; //750
  const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
  for (const island of islands) {
    const distToIslandCenter = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
    const distanceFromEdge = Math.abs(distToIslandCenter - island.radius);
    if (distToIslandCenter <= island.radius) {
      if (island.isSnowy) {
        return distanceFromEdge < 30 ? 'snowgrass' : 'snowgrass'; 
      } else if (island.isDesert) {
        return 'desertsand'; 
      }else if (island.isForest) {
        return 'forestgrass'; 
      }else if (island.isSwamp) {
	return 'swampgrass'; 
}else if (island.isVoulcano) {
	return 'Hstone'; 
}else if (island.isCanyon) {
	return 'canyonsand'; 
}
if( distanceFromEdge < 65){
  if (!seed.startsWith("badseed")) {
  return'coast';
} else {
  return'water';
}
      }else if(distanceFromEdge < 120){
       return hashCoords(x,y,29.5, seed)<0.05 ? "magnetite" : "sand"
      }else {
 return "grass"
}
    }
  }
  if (distanceFromCenter > minDistance && hashCoords(x,y,30, seed) < islandChance) {
    const randomType = hashCoords(x,y,997, seed);
    const randomType2 = hashCoords(x,y,998, seed);
    const randomType3 = hashCoords(x,y,999, seed);
    const randomType4 = hashCoords(x,y,1, "C1"+seed);
    const isSnowy = randomType < snowIslandChance;
    const isDesert = randomType2 <  desertIslandChance;
    const isForest = randomType3 <  ForestIslandChance;
    const isSwamp = randomType3 <  SwampIslandChance;
    const isVoulcano = randomType3 <  VuIslandChance;
    const isCanyon = randomType4 <  canyonChance;
    let radius;
    if (isSnowy) {
      radius = Math.floor(hashCoords(x,y,33, seed) * 500) + 400; 
    } else if (isDesert) {
      radius = Math.floor(hashCoords(x,y,34, seed) * 750) + 450; 
    }else if (isForest) {
      radius = Math.floor(hashCoords(x,y,35, seed) * 750) + 500; 
    }else if (isSwamp) {
	radius = Math.floor(hashCoords(x, y, 35.5, seed) * 750) + 500; 
}else if (isVoulcano) {
	radius = Math.floor(hashCoords(x, y, 35.5, seed) * 750) + 400; 
}else if (isCanyon) {
	radius = Math.floor(hashCoords(x, y, 37, seed) * 750) + 400; 
}else {
radius = Math.floor(hashCoords(x,y,36, seed) * 375)  + 150; 
const biggerChance = hashCoords(x, y, 123, "%"+seed);
if (biggerChance < 0.08) radius = Math.floor(hashCoords(x,y,35, seed) * 750) + 500;
}
    const islandX = x + Math.floor(hashCoords(x,y,37, seed) * 300) - 250; 
    const islandY = y + Math.floor(hashCoords(x,y,38, seed) * 300) - 250;
    islands.push({ x: islandX, y: islandY, radius, isSnowy, isDesert , isForest,isSwamp,isVoulcano,isCanyon });
    const distToNewIsland = Math.sqrt((x - islandX) ** 2 + (y - islandY) ** 2);
    if (distToNewIsland <= radius) {
      if (isSnowy) return 'snowgrass';
      if (isDesert) return 'desertsand';
      if (isForest) return 'forestgrass';
      if (isSwamp) return 'swampgrass';
      if (isVoulcano) return 'Hstone';
      if (isCanyon) return 'canyonsand';
      return 'grass';
    }
  }
  return 'water';
}
let hills = [];
function generateCanyonHills(x, y) {
	const islandChance = 0.010;
	const minDistance = 700;
	const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
	for (const island of hills) {
		const distToIslandCenterX = Math.abs(x - island.x);
		const distToIslandCenterY = Math.abs(y - island.y);
		const minRequiredDistance = (island.width) 
		const minRequiredDistance2 = (island.width) - 64
		if (distToIslandCenterX < minRequiredDistance2 && distToIslandCenterY < minRequiredDistance2 && distToIslandCenterX > 32 * 1.5 && distToIslandCenterY > 32 * 1.5) {
			return "inside";
		}
		if (distToIslandCenterX < minRequiredDistance && distToIslandCenterY < minRequiredDistance) {
			return "hill";
		}
	}
	if (distanceFromCenter > minDistance && hashCoords(x, y, 390, "2" + seed) < islandChance) {
		let scale = (hashCoords(x, y, 180, "2" + seed) * 2) + 0
		const width = scale * 32;
		const height = scale * 32;
		const islandX = x;
		const islandY = y;
		hills.push({ x: islandX, y: islandY, width: width, height: height });
		return true;
	}
	return false;
}
function generateStoneHills(x, y) {
	const islandChance = 0.02;
	const minDistance = 700;
	const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
	for (const island of hills) {
		const distToIslandCenterX = Math.abs(x - island.x);
		const distToIslandCenterY = Math.abs(y - island.y);
		const minRequiredDistance = (island.width) 
		const minRequiredDistance2 = (island.width) - 64
		if (distToIslandCenterX < minRequiredDistance2 && distToIslandCenterY < minRequiredDistance2 && distToIslandCenterX > 32*1.5&& distToIslandCenterY > 32*1.5) {
			return "inside";
		}
		if (distToIslandCenterX < minRequiredDistance && distToIslandCenterY < minRequiredDistance) {
			return "hill"; 
		}
	}
	if (distanceFromCenter > minDistance && hashCoords(x, y, 390, "2"+seed) < islandChance) {
		let scale = (hashCoords(x, y, 180, "2"+seed) * 6) + 5
		const width = scale * 32;
		const height = scale * 32;
		const islandX = x;
		const islandY = y;
		hills.push({ x: islandX, y: islandY, width: width, height: height });
		return true;
	}
	return false;
}
function generateHills(x, y) {
    const islandChance = 0.004;
    const minDistance = 400;
    const distanceFromCenter = Math.sqrt(x ** 2 + y ** 2);
    for (const island of hills) {
        const distToIslandCenterX = Math.abs(x - island.x);
        const distToIslandCenterY = Math.abs(y - island.y);
        const minRequiredDistance = (island.width)  
        const minRequiredDistance2 = (island.width)-34
        if (distToIslandCenterX < minRequiredDistance2 && distToIslandCenterY < minRequiredDistance2 && distToIslandCenterX > 1*34 && distToIslandCenterY > 1*34 ) {
             
            return "inside";
        }
        if (distToIslandCenterX < minRequiredDistance && distToIslandCenterY < minRequiredDistance) {
            return "hill"; 
        }
    }
    if (distanceFromCenter > minDistance && hashCoords(x,y,390, seed) < islandChance) {
     let scale =(hashCoords(x,y,180, seed)*6)+5
        const width = scale * 32;  
        const height = scale * 32; 
        const islandX = x;
        const islandY = y;
        hills.push({ x: islandX, y: islandY, width: width, height: height });
        return true; 
    }
    return false; 
}
var dataChunksStructures = {
  cavesempty: cavesempty,
  cavesempty3: cavesempty3,
  cavesempty4: cavesempty4,
  cavesempty5: cavesempty5,
  cavesempty6: cavesempty6,
  cavesempty2: cavesempty2,
  deadlands: deadlands,
  grassroad: grassroad,
  islands: islands,
  hills:hills,
  swampshallowaters:swampshallowaters,
  swamppeats:swamppeats
}
let hellchunks = {};
let housechunks = {};
let house2chunks = {};
let abysschunks = {};
let seachunks = {};
let etherchunks = {};
let alldoors = [];
let doorsisthere = [];
let allunderwater = [];
let allabyssportals = [];
let isinhouse = 0;
let isinhouse2 = 0;
let isunderwater = 0;
let inabyss = 0;
let isflying=0
let inhell = 0;
let inether = 0;
let storelastdimension = "";
function getRandomKey(obj) {
    const klucze = Object.keys(obj); 
    const losowyIndeks = Math.floor(Math.random() * klucze.length); 
    if(klucze[losowyIndeks]!=="godsword" && klucze[losowyIndeks]!=="godwand"){
    return klucze[losowyIndeks]; 
    }else{
    }
}
function xorshift(seed) { let state = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn; return function() { state ^= state << 13n; state ^= state >> 7n; state ^= state << 17n; return Number(state & 0x7FFFFFFFFFFFFFFFn) / Number(0x7FFFFFFFFFFFFFFFn); }; }
function hashStringToBigInt(str) { let hash = 0xcbf29ce484222325n; const prime = 0x100000001b3n; for (let i = 0; i < str.length; i++) { hash ^= BigInt(str.charCodeAt(i)); hash *= prime; } return hash & 0xFFFFFFFFFFFFFFFFn; }
function hashCoords(x, y, z, seed) { let hash = hashStringToBigInt(`${x},${y},${z},${seed}`); let random = xorshift(hash); return random();
}
var seed = Math.floor(10 ** 15 + Math.random() * 9 * 10 ** 15).toString(); 
function generateChunk(chunkX, chunkY) {
  const chunkKey = `${Math.floor(chunkX)},${Math.floor(chunkY)}`;
  if (chunks[chunkKey]) return;
  const blocks = [];
  for (let i = 0; i < 1; i++) {
    for (let j = 0; j < 1; j++) {
      const blockPosX = chunkX * blockSize + i * blockSize;
      const blockPosY = chunkY * blockSize + j * blockSize;
      const distanceFromSpawn = Math.sqrt(blockPosX ** 2 + blockPosY ** 2);
      let blockType;
      const isInSpawnArea = Math.abs(chunkX-5) <= 4 && Math.abs(chunkY-5) <= 4;
      if(isinhouse!==1&&isinhouse2!==1){
if (generateCave === 1 || generateCaveForEther === 1 || isunderwater==1|| inabyss==1|| inhell==1|| inether==1) {
if(inabyss==1){
}
}else if (distanceFromSpawn > 890) {
        blockType = generateRandomIsland(blockPosX, blockPosY) 
        if(blockType=="water"){
         if (hashCoords(chunkX,chunkY,40, seed) < 0.002) {
         blockType = 'underwaterentrance';
         allunderwater.push([blockPosX, blockPosY])
        } else {
         blockType = 'water'; 
        }
        }
      } else if (distanceFromSpawn > 830) {
        if(hashCoords(chunkX,chunkY,41, seed)<0.005){
          blockType = 'underwaterentrance';
          allunderwater.push([blockPosX, blockPosY])
        }else{
          blockType = 'water'; 
        }
      }else if (distanceFromSpawn > 686 && distanceFromSpawn < 760) {
        blockType =  hashCoords(chunkX,chunkY,42, seed) < 0.1 ? 'magnetite' : 'sand'; 
      }else if (distanceFromSpawn > 700) {
        if(!seed.startsWith("badseed")){
 blockType = 'coast';
        }else{
          blockType = 'water';
        }
} else {
      }
if (blockType === 'Hstone') {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'Hstone' });
	let data1233 = generateStoneHills(blockPosX, blockPosY)
	if (data1233) {
		if (data1233 == "inside") {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hill2' });
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'magma' });
		} else {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hill2' });
			if (hashCoords(chunkX, chunkY, 1, "_" + seed) < 0.009) {
				blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sulfur' });
			} else if (hashCoords(chunkX, chunkY, 2, "_" + seed) < 0.018) {
				blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hematite' });
			} else if (hashCoords(chunkX, chunkY, 3, "_" + seed) < 0.017) {
				blocks.push({ x: i * blockSize, y: j * blockSize, type: 'chalcopyrite' });
			} else if (hashCoords(chunkX, chunkY, 4, "_" + seed) < 0.017) {
				blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
			} else if (hashCoords(chunkX, chunkY, 5, "_" + seed) < 0.017) {
				blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
			}
		}
	} else {
		if (hashCoords(chunkX, chunkY, 44.5, "_" + seed) < 0.20) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'graygrass' });
		} else if (hashCoords(chunkX, chunkY, 2, "e" + seed) < 0.008) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'silver' });
		} else if (hashCoords(chunkX, chunkY, 2.5, "e" + seed) < 0.20) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrass' });
		} else if (hashCoords(chunkX, chunkY, 4, "e" + seed) < 0.04) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
		} else if (hashCoords(chunkX, chunkY, 5, "e" + seed) < 0.04) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
		} else if (hashCoords(chunkX, chunkY, 6, "e" + seed) < 0.005) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tree0' });
			blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'tree1' });
			blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'tree2' });
		} else if (hashCoords(chunkX, chunkY, 7, "e" + seed) < 0.005) {
			blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
		}
	}
}else if (blockType === 'canyonsand') {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'canyonsand' });
	let data1233 = generateStoneHills(blockPosX, blockPosY)
 	if (data1233) {
   blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hill3' });
  if (hashCoords(chunkX, chunkY, 1, "_" + seed) < 0.009) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sulfur' });
}else if (hashCoords(chunkX, chunkY, 2, "_" + seed) < 0.018) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hematite' });
}else if (hashCoords(chunkX, chunkY, 3, "_" + seed) < 0.017) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'chalcopyrite' });
}
} else{
  	if (hashCoords(chunkX, chunkY, 44.5, "_"+seed) < 0.20) {
   	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'Cgrass' });
   }else if (hashCoords(chunkX, chunkY, 2, "e" + seed) < 0.005) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'goldnugget' });
}else if (hashCoords(chunkX, chunkY, 2.5, "e" + seed) < 0.04) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bush' });
}else if (hashCoords(chunkX, chunkY, 6, "e" + seed) < 0.01) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tree0' });
blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'tree1' });
blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'tree2' });
}else if (hashCoords(chunkX, chunkY, 7, "e" + seed) < 0.013) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
}else if (hashCoords(chunkX, chunkY, 8, "e" + seed) < 0.008) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'galena' });
}
  }
}else if (blockType === 'swampgrass') {
	let data123 = generateShWater(blockPosX, blockPosY)
let data1232 = generateSwampPeat(blockPosX, blockPosY)
if (data123) {
	 blockType = "swampwater";
	if (hashCoords(chunkX, chunkY, 44.5, seed) < 0.09) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampwater' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampiris' });
} else if (hashCoords(chunkX, chunkY, 41, "x" + seed) < 0.14) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampwater' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'lily' });
}else if (hashCoords(chunkX, chunkY, 42, "x" + seed) < 0.14) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampwater' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'flowerpollen' });
} else   {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampwater' });
	}
}else if (data1232) {
	blockType = "peat";
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'peat' });
	if (hashCoords(chunkX, chunkY, 2, "23" + seed) < 0.4) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grassdeco' });
}else if(hashCoords(chunkX, chunkY, 3, "23" + seed) < 0.2){
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blush' });
}
}  else
	if (hashCoords(chunkX, chunkY, 43.5, seed) < 0.02) {
		blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
		blocks.push({ x: i * blockSize, y: j * blockSize, type: 'mud' });
	}else if (hashCoords(chunkX, chunkY, 45.5, seed) < 0.05) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tree0' });
	blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'tree1' });
	blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'tree2' });
}else if (hashCoords(chunkX, chunkY, 1, "24" + seed) < 0.008) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'galena' });
}else if (hashCoords(chunkX, chunkY, 1, "2" + seed) < 0.02) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
}else if (hashCoords(chunkX, chunkY, 1, "3" + seed) < 0.07) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blush' });
}else if (hashCoords(chunkX, chunkY, 1.5, "2" + seed) < 0.02) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
}else if (hashCoords(chunkX, chunkY, 2.5, "2" + seed) < 0.02) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
}else if (hashCoords(chunkX, chunkY, 2, "2" + seed) < 0.08) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grassdeco' });
}else if (hashCoords(chunkX, chunkY, 3, "2" + seed) < 0.05) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'log0' });
}else if (hashCoords(chunkX, chunkY, 4, "2" + seed) < 0.05) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'heather' });
}else if (hashCoords(chunkX, chunkY, 5, "2" + seed) < 0.055) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'lysimachia' });
}else if (hashCoords(chunkX, chunkY, 6, "2" + seed) < 0.045) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blueflower2' });
}else if (hashCoords(chunkX, chunkY, 7, "2" + seed) < 0.045) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'redflower2' });
}else if (hashCoords(chunkX, chunkY, 8, "2" + seed) < 0.035) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'lightwhite' });
}else{
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'swampgrass' });
}
}else 
 if (blockType === 'desertsand') {
if (seed.startsWith("randomloot") && !isInSpawnArea && hashCoords(chunkX, chunkY, 0.5, seed) < 0.008) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: 0, y: 0, type: 'chest' });
  chestsData[`${chunkX},${chunkY}`] = [getRandomKey(allItems), getRandomKey(allItems),getRandomKey(allItems)];
}else  if (hashCoords(chunkX,chunkY,43, seed) < 0.003) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'skull' });
}else if (hashCoords(chunkX,chunkY,44, seed) < 0.002) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shell1' });
}else if (hashCoords(chunkX,chunkY,45, seed) < 0.002) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shell2' });
}else if (hashCoords(chunkX,chunkY,46, seed) < 0.002) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shell3' });
}else if (hashCoords(chunkX,chunkY,47, seed) < 0.005) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: (j ) * blockSize, type: 'palm1' });
    blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'palm3' });
blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'palm2' });
  }else if (hashCoords(chunkX,chunkY,48, seed) < 0.004) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bone' });
} else if (hashCoords(chunkX, chunkY, 49, seed) < 0.05) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'magnetite' });
}else if (hashCoords(chunkX, chunkY, 49.5, seed) < 0.0005) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hematite' });
} else if (hashCoords(chunkX,chunkY,50, seed) < 0.05) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bush' });
}else if (hashCoords(chunkX,chunkY,51, seed) < 0.009) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cactus' });
} else {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'desertsand' });
  }
}else if (blockType === 'forestgrass') {
if (blockType == "forestgrass") {
  let data123 = generateDeadLand(blockPosX, blockPosY)
  if (data123) {
    blockType = "deadgrass";
  }
}
if (blockType === 'forestgrass') {
  if (seed.startsWith("randomloot") && !isInSpawnArea && hashCoords(chunkX, chunkY, 0.5, seed) < 0.008) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: 0, y: 0, type: 'chest' });
  chestsData[`${chunkX},${chunkY}`] = [getRandomKey(allItems), getRandomKey(allItems),getRandomKey(allItems)];
}else if (hashCoords(chunkX,chunkY,52, seed) < 0.15) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
     blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pine0' });
 blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'pine1' });
 blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'pine2' });
 blocks.push({ x: i * blockSize, y: (j - 3) * blockSize, type: 'pine2' });
  } else if (hashCoords(chunkX, chunkY, 53, seed) < 0.08) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestleaf' });
}else if (hashCoords(chunkX, chunkY, 53.5, seed) < 0.005) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'melon1' });
}else if (hashCoords(chunkX,chunkY,54, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bigrock' });
}else if (hashCoords(chunkX,chunkY,55, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'longstick' });
}else if (hashCoords(chunkX,chunkY,56, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'log0' });
} else if (hashCoords(chunkX,chunkY,57, seed) < 0.02) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
  } else if (hashCoords(chunkX,chunkY,58, seed) < 0.01) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
}else if (hashCoords(chunkX,chunkY,59, seed) < 0.03) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blackberry' });
}else if (hashCoords(chunkX,chunkY,60, seed) < 0.2) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blush' });
}else if (hashCoords(chunkX,chunkY,61, seed) < 0.012) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'kite1' });
}else {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'forestgrass' });
  }
}else{
  blockType = "deadgrassfloor"
  if (hashCoords(chunkX,chunkY,62, seed) < 0.008) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrassfloor' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bone' });
  } else if (hashCoords(chunkX,chunkY,63, seed) < 0.2) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrassfloor' });
    if (Math.random() < 0.002) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'gravestone', text: "Rip My BrainCells" });
}else if (Math.random() < 0.002) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'gravestone', text: "Nexaturion" });
}else if (Math.random() < 0.002) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'gravestone', text: "Rip Deer god" });
}else{
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'gravestone' });
    }
  } else if (hashCoords(chunkX,chunkY,64, seed) < 0.4) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrassfloor' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'road' });
  } else if (hashCoords(chunkX,chunkY,65, seed) < 0.4) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrassfloor' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrass' });
  } else {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deadgrassfloor' });
  }
}
}else if (blockType === 'snowgrass') {
if (seed.startsWith("randomloot") && !isInSpawnArea && hashCoords(chunkX, chunkY, 0.5, seed) < 0.008) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
  blocks.push({ x: 0, y: 0, type: 'chest' });
  chestsData[`${chunkX},${chunkY}`] = [getRandomKey(allItems), getRandomKey(allItems),getRandomKey(allItems),getRandomKey(allItems),getRandomKey(allItems)];
}else if (hashCoords(chunkX,chunkY,66, seed) < 0.1) {
      blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
        blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowpine1' });
        blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'snowpine2' });
        blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'snowpine3' });
        blocks.push({ x: i * blockSize, y: (j - 3) * blockSize, type: 'snowpine3' });
    } else if (hashCoords(chunkX,chunkY,67, seed) < 0.08) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowflower' });
}else if (hashCoords(chunkX,chunkY,68, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'longstick' });
}else if (hashCoords(chunkX,chunkY,69, seed) < 0.01) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
}else if (hashCoords(chunkX,chunkY,70, seed) < 0.01) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
} else {
        blocks.push({ x: i * blockSize, y: j * blockSize, type: 'snowgrass' });
    }
} else if (blockType === 'dirt'  ||blockType === 'sand' || blockType === 'water' || blockType=="underwaterentrance" || blockType === 'coast') { 
  blocks.push({ x: i * blockSize, y: j * blockSize, type: blockType });
  if (blockType === 'sand') {
 if (hashCoords(chunkX,chunkY,71, seed) < 0.004) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shell1' });
} else if (hashCoords(chunkX,chunkY,72, seed) < 0.004) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shell2' });
} else if (hashCoords(chunkX,chunkY,73, seed) < 0.004) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sand' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shell3' });
}else if (hashCoords(chunkX,chunkY,74, seed) < 0.022) {
blocks.push({ x: i * blockSize, y: (j ) * blockSize, type: 'palm12' });
blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'palm32' });
blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'coconutpalm' });
}
  if (hashCoords(chunkX,chunkY,75, seed) < 0.02) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bone' });
  }else if (hashCoords(chunkX,chunkY,76, seed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cactus' });
}
}
} else {
  if(generateCave!==1&& generateCaveForEther !== 1  && isunderwater!==1&& inabyss!==1&& inhell!==1 && inether!==1){
if(!isInSpawnArea){
 let data123 = generateHills(blockPosX, blockPosY)
 if (data123) {
  if(data123=="hill"){
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blockType = "hill1";
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hill1' });
  } else if (data123=="inside"){
   blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
   blockType = "hill1";
   blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hill1' });
   if (hashCoords(chunkX,chunkY,0, seed) < 0.11) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tree0' });
 blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'tree1' });
 blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'tree2' });
} else if (hashCoords(chunkX,chunkY,77, seed) < 0.05) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pine0' });
 blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'pine1' });
 blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'pine2' });
 blocks.push({ x: i * blockSize, y: (j - 3) * blockSize, type: 'pine2' });
}else if (hashCoords(chunkX,chunkY,78, seed) < 0.2) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grassdeco' });
}else if (hashCoords(chunkX,chunkY,79, seed) < 0.22) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'deepblues' });
}else if (hashCoords(chunkX,chunkY,80, seed) < 0.22) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
}else if (hashCoords(chunkX,chunkY,81, seed) < 0.22) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'lightwhite' });
}else if (hashCoords(chunkX,chunkY,82, seed) < 0.22) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
}else if (hashCoords(chunkX,chunkY,83, seed) < 0.32) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blueflower2' });
}else if (hashCoords(chunkX,chunkY,84, seed) < 0.32) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'redflower2' });
}
  }}
 }
if (blockType!=="hill1"){
if (seed.startsWith("randomloot") && !isInSpawnArea && hashCoords(chunkX, chunkY, 0.5 , seed) < 0.008  ) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: 0, y: 0, type: 'chest' });
  chestsData[`${chunkX},${chunkY}`]=[ getRandomKey( allItems  ),getRandomKey( allItems )  ];  
}else if(seed.startsWith("badseed") && !isInSpawnArea && hashCoords(chunkX,chunkY,84.5, seed) < 0.8){ 
  blocks.push({ x: 0, y: 0, type: 'fleshblock1' });
 if (  hashCoords(chunkX, chunkY, 894.5, seed) < 0.005) {
  blocks.push({ x: 0, y: 0, type: 'corruptedthing' });
}
}else if (!isInSpawnArea && hashCoords(chunkX,chunkY,85, seed) < 0.009) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass2' });
}else if (!isInSpawnArea && hashCoords(chunkX,chunkY,86, seed) < 0.05) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tree0' });
    blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'tree1' });
    blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'tree2' });
  }else if (!isInSpawnArea && hashCoords(chunkX,chunkY,87, seed) < 0.01) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'birch0' });
  blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'birch1' });
  blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'birch2' });
}else if (!isInSpawnArea && hashCoords(chunkX,chunkY,88, seed) < 0.05) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pine0' });
  blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'pine1' });
  blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'pine2' });
blocks.push({ x: i * blockSize, y: (j - 3) * blockSize, type: 'pine2' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 89, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 89.5, seed) < 0.002) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pumpkin1' });
}  else if (!isInSpawnArea && hashCoords(chunkX,chunkY,90, seed) < 0.007) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'longstick' });
}else if (!isInSpawnArea && hashCoords(chunkX,chunkY,91, seed) < 0.005) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'wildcarrot' });
}else if (hashCoords(chunkX,chunkY,92, seed) < 0.03) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
            }else if (hashCoords(chunkX,chunkY,93, seed) < 0.05) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
            } else if (hashCoords(chunkX,chunkY,94, seed) < 0.15 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'yellow' });
}else if (hashCoords(chunkX,chunkY,95, seed) < 0.05 && !seed.startsWith("badseed") ) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'daffodil' });
}else if (hashCoords(chunkX,chunkY,96, seed) < 0.02 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'myosotis' });
}else if (hashCoords(chunkX,chunkY,97, seed) < 0.015 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'flax' });
}else if (hashCoords(chunkX,chunkY,98, seed) < 0.006 && !seed.startsWith("badseed")) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'kite1' });
            } else if (hashCoords(chunkX,chunkY,99, seed) < 0.01 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'briar' });
}else if (hashCoords(chunkX,chunkY,100, seed) < 0.003 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'poppy' });
}else if (hashCoords(chunkX,chunkY,101, seed) < 0.002 ) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'black_elderberry' });
blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'black_elderberry2' });
          }  else if (hashCoords(chunkX,chunkY,104, seed) < 0.02 && !seed.startsWith("badseed") ) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'violet' });
}else if (hashCoords(chunkX,chunkY,105, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'treebark' });
} else if (hashCoords(chunkX,chunkY,106, seed) < 0.2 ) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tallgrass' });
            }else if (hashCoords(chunkX,chunkY,107, seed) < 0.12  ) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grassdeco' });
}else if (hashCoords(chunkX,chunkY,108, seed) < 0.01 ) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
    if (hashCoords(chunkX,chunkY,109, seed) < 0.3) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hallucinate' });
  }
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'toadstool' });
} else if (hashCoords(chunkX,chunkY,110, seed) < 0.07 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'fern' });
}else if (hashCoords(chunkX,chunkY,110, seed) < 0.03 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shiny' });
}else if (hashCoords(chunkX,chunkY,112, seed) < 0.005) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blackberry' });
}else if (hashCoords(chunkX,chunkY,113, seed) < 0.04 && !seed.startsWith("badseed") ) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'dandelion' });
}else if (hashCoords(chunkX,chunkY,114, seed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'chalcopyrite' });
}else if (hashCoords(chunkX,chunkY,115, seed) < 0.002) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_entrance' });
  allCaveEntrances.push([blockPosX, blockPosY])
} else if (hashCoords(chunkX,chunkY,116, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rye1' });
}else if (hashCoords(chunkX,chunkY,117, seed) < 0.02) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blueflower2' });
} else if (hashCoords(chunkX,chunkY,118, seed) < 0.03) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'redflower2' });
}else if (hashCoords(chunkX,chunkY,119, seed) < 0.005) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'honey_mushrooms' });
}else {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'grass' });
                blocks.push({ x: Math.floor( i * blockSize), y: Math.floor( j * blockSize), type: blockType });
            }
        }}else if(isunderwater!==1 && generateCave==1 && generateCaveForEther !== 1 && inabyss!==1&& inhell!==1&& inether!==1){
let entranceX2;
let entranceY2;
const isCaveEntrance = allCaveEntrances.some(([entranceX, entranceY]) => {
  entranceX2=entranceX ; entranceY2=entranceY
  return entranceX === blockPosX && entranceY === blockPosY;
});
const isNearCaveEntrance = allCaveEntrances.some(([entranceX, entranceY]) => {
  return Math.abs(entranceX - blockPosX) <= blockSize * 3 && Math.abs(entranceY - blockPosY) <= blockSize * 3;
});
const shouldPlaceHole = hashCoords(chunkX,chunkY,120, seed) < 0.05; 
var shcave=generateCaves(blockPosX, blockPosY);
if (shcave == 1) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
 if (hashCoords(chunkX, chunkY, 121.52, seed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'web' });
}
}else if (shcave == 3) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
  blocks.push({ x: 0, y: 0, type: 'cavedirt' });
  blocks.push({ x: 0, y: 0, type: 'shallowwater' });
}else if (shcave == 2) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
  blocks.push({ x: 0, y: 0, type: 'cavedirt' });
if (hashCoords(chunkX,chunkY,121, seed) < 0.12) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
}else if (hashCoords(chunkX, chunkY, 122, seed) < 0.05) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
}else if (hashCoords(chunkX, chunkY, 122.5, seed) < 0.006) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pyrolusite' });
}else if (hashCoords(chunkX, chunkY, 123, seed) < 0.003) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'kite1' });
}else if (hashCoords(chunkX,chunkY,124, seed) < 0.012) { 
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'water1' });
}else if (hashCoords(chunkX,chunkY,125, seed) < 0.012) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shallowwater' });
}else if (hashCoords(chunkX,chunkY,126, seed) < 0.09) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bush' });
}else if (hashCoords(chunkX,chunkY,127, seed) < 0.07) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'randomrock1' });
}else if (hashCoords(chunkX,chunkY,128, seed) < 0.07) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'randomrock2' });
} 
}else if (generateGranite(blockPosX, blockPosY)) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'granite' });
}else if(!shcave){
if (shouldPlaceHole) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_floor' });
  blocks.push({ x: 0, y: 0, type: 'cavedirt' });
}else
if(isNearCaveEntrance){
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_floor' });
}else{
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_floor' });
if (hashCoords(chunkX, chunkY, 129, seed) < 0.04) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sapphire' });
}else if (hashCoords(chunkX, chunkY, 129.5, seed) < 0.004) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tinore' });
}else if (hashCoords(chunkX, chunkY, 130, seed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ruby' });
}else if (hashCoords(chunkX, chunkY, 130.5 , seed) < 0.007) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'fluorite' });
}else if (hashCoords(chunkX,chunkY,131, seed) < 0.019) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'coalore' });
}else if (hashCoords(chunkX, chunkY, 131.5, seed) < 0.007) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'barite' });
}else if (hashCoords(chunkX, chunkY, 132, seed) < 0.0014) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'diamante1' });
}else if (hashCoords(chunkX, chunkY, 132.5, seed) < 0.0012) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'crystal6' });
}else if (hashCoords(chunkX,chunkY,133, seed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'abyssentrance' });
  allabyssportals.push([blockPosX, blockPosY])
}else if (hashCoords(chunkX, chunkY, 133.5, seed) < 0.0014) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'calcite' });
}else if (hashCoords(chunkX,chunkY,134, seed) < 0.0025) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'hell_entrance' });
  allHellCaveEntrances.push([blockPosX, blockPosY])
}else if (hashCoords(chunkX,chunkY,135, seed) < 0.018) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cinnabar' });
}else if (hashCoords(chunkX,chunkY,136, seed) < 0.018) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ilmenite' });
}else if (hashCoords(chunkX,chunkY,137, seed) < 0.011) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'osmium' });
}else if (hashCoords(chunkX,chunkY,138, seed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'uranium' });
}else if (hashCoords(chunkX,chunkY,139, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'opal' });
}else if (hashCoords(chunkX, chunkY, 140, seed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'emerald' });
}else if (hashCoords(chunkX, chunkY, 140.5, seed) < 0.03) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'chalcopyrite' });
}else if (hashCoords(chunkX,chunkY,141, seed) < 0.05) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pyritestone' });
}else if (hashCoords(chunkX,chunkY,142, seed) < 0.008) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'wolframite' });
}else if (hashCoords(chunkX,chunkY,143, seed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stonewithgypsum' });
}else if (hashCoords(chunkX,chunkY,144, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cavewallwithsalt' });
}else {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
}
}
          if (isCaveEntrance) {
  blocks.push({ x: 0, y: 0, type: 'cave_escape' });
}
}}
else if(isunderwater!==1 && generateCaveForEther==1 && generateCave==0 && inabyss!==1&& inhell!==1&& inether!==1){
let entranceX2;
let entranceY2;
const isCaveEntrance = allCaveEntrances.some(([entranceX, entranceY]) => {
  entranceX2=entranceX ; entranceY2=entranceY
  return entranceX === blockPosX && entranceY === blockPosY;
});
const isNearCaveEntrance = allCaveEntrances.some(([entranceX, entranceY]) => {
  return Math.abs(entranceX - blockPosX) <= blockSize * 3 && Math.abs(entranceY - blockPosY) <= blockSize * 3;
});
let specseed=seed+"&";
const shouldPlaceHole = hashCoords(chunkX,chunkY,120, specseed) < 0.05; 
var shcave=generateCaves(blockPosX, blockPosY);
if (shcave == 1) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
 if (hashCoords(chunkX, chunkY, 121.52, specseed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'web' });
} else if (hashCoords(chunkX, chunkY, 123, seed + "q") < 0.3) {
	blocks.push({ x: 0, y: 0, type: 'glowblossom' });
} else if (hashCoords(chunkX, chunkY, 124, seed + "q") < 0.2) {
	blocks.push({ x: 0, y: 0, type: 'echorocks' });
} else if (hashCoords(chunkX, chunkY, 125, seed + "q") < 0.2) {
	blocks.push({ x: 0, y: 0, type: 'crystal2' });
}
}else if (shcave == 3) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
  blocks.push({ x: 0, y: 0, type: 'cavedirt' });
  blocks.push({ x: 0, y: 0, type: 'shallowwater' });
}else if (shcave == 2) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
  blocks.push({ x: 0, y: 0, type: 'cavedirt' });
if (hashCoords(chunkX,chunkY,121, specseed) < 0.12) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
}else if (hashCoords(chunkX, chunkY, 122, specseed) < 0.05) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
}else if (hashCoords(chunkX, chunkY, 122.5, specseed) < 0.006) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pyrolusite' });
}else if (hashCoords(chunkX, chunkY, 123, seed + "q") < 0.07) {
	blocks.push({ x: 0, y: 0, type: 'glowblossom' });
}else if (hashCoords(chunkX, chunkY, 124, seed + "q") < 0.05) {
	blocks.push({ x: 0, y: 0, type: 'echorocks' });
}else if (hashCoords(chunkX, chunkY, 125, seed + "q") < 0.05) {
	blocks.push({ x: 0, y: 0, type: 'crystal2' });
}else if (hashCoords(chunkX, chunkY, 123, specseed) < 0.003) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'kite1' });
}else if (hashCoords(chunkX,chunkY,124, specseed) < 0.012) { 
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'water1' });
}else if (hashCoords(chunkX,chunkY,125, specseed) < 0.012) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'shallowwater' });
}else if (hashCoords(chunkX,chunkY,126, specseed) < 0.09) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'bush' });
}else if (hashCoords(chunkX,chunkY,127, specseed) < 0.07) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'randomrock1' });
}else if (hashCoords(chunkX,chunkY,128, specseed) < 0.07) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'randomrock2' });
} 
}else if (generateGranite(blockPosX, blockPosY)) {
  blocks.push({ x: 0, y: 0, type: 'cave_floor' });
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'granite' });
}else if(!shcave){
if (shouldPlaceHole) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_floor' });
  blocks.push({ x: 0, y: 0, type: 'cavedirt' });
}else
if(isNearCaveEntrance){
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_floor' });
}else{
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_floor' });
if (hashCoords(chunkX, chunkY, 129, specseed) < 0.04) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sapphire' });
}else if (hashCoords(chunkX, chunkY, 129.5, specseed) < 0.004) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tinore' });
}else if (hashCoords(chunkX, chunkY, 130, specseed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ruby' });
}else if (hashCoords(chunkX, chunkY, 130.5 , specseed) < 0.007) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'fluorite' });
}else if (hashCoords(chunkX,chunkY,131, specseed) < 0.019) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'coalore' });
}else if (hashCoords(chunkX, chunkY, 131.5, specseed) < 0.007) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'barite' });
}else if (hashCoords(chunkX, chunkY, 132, specseed) < 0.0014) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'diamante1' });
}else if (hashCoords(chunkX, chunkY, 132.5, specseed) < 0.0012) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'crystal6' });
} else if (hashCoords(chunkX, chunkY, 133.5, specseed) < 0.0014) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'calcite' });
} else if (hashCoords(chunkX,chunkY,135, specseed) < 0.018) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cinnabar' });
}else if (hashCoords(chunkX,chunkY,136, specseed) < 0.018) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ilmenite' });
}else if (hashCoords(chunkX,chunkY,137, specseed) < 0.011) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'osmium' });
}else if (hashCoords(chunkX,chunkY,138, specseed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'uranium' });
}else if (hashCoords(chunkX,chunkY,139, specseed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'opal' });
}else if (hashCoords(chunkX, chunkY, 140, specseed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'emerald' });
}else if (hashCoords(chunkX, chunkY, 140.5, specseed) < 0.03) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'chalcopyrite' });
}else if (hashCoords(chunkX,chunkY,141, specseed) < 0.05) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pyritestone' });
}else if (hashCoords(chunkX,chunkY,142, specseed) < 0.008) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'wolframite' });
}else if (hashCoords(chunkX,chunkY,143, specseed) < 0.04) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stonewithgypsum' });
}else if (hashCoords(chunkX,chunkY,144, specseed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cavewallwithsalt' });
}else {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'cave_wall' });
}
}
if (isCaveEntrance) {
  blocks.push({ x: 0, y: 0, type: 'cave_escape' });
}
        }}
        else if(isunderwater!==1 && generateCave!==1 && generateCaveForEther !== 1&& inabyss!==1 && inhell==1&& inether!==1 ){
let entranceX2;
let entranceY2;
const isCaveEntrance = allHellCaveEntrances.some(([entranceX, entranceY]) => {
  entranceX2=entranceX ; entranceY2=entranceY
  return entranceX === blockPosX && entranceY === blockPosY;
});
const isNearCaveEntrance = allHellCaveEntrances.some(([entranceX, entranceY]) => {
  return Math.abs(entranceX - blockPosX) <= blockSize * 3 && Math.abs(entranceY - blockPosY) <= blockSize * 3;
});
const shouldPlaceHole = hashCoords(chunkX,chunkY,145, seed) < 0.05; 
if (generateFlesh(blockPosX, blockPosY)) {
  if (generateCaves3(blockPosX, blockPosY)) {
  if (hashCoords(chunkX,chunkY,146, seed) < 0.2) {
    blocks.push({ x: 0, y: 0, type: 'fleshblock1' });
  } else {
    blocks.push({ x: 0, y: 0, type: 'fleshblock1' });
  }
}else{
    blocks.push({ x: 0, y: 0, type: 'fleshblock2' });
}
}else if (generateBasalt(blockPosX, blockPosY)){
blocks.push({ x: 0, y: 0, type: 'moltenstone' });
blocks.push({ x: i * blockSize, y: j * blockSize, type: 'basalt' });
}else if (generateCaves3(blockPosX, blockPosY)) {
  if(hashCoords(chunkX,chunkY,147, seed)<0.2){
  blocks.push({ x: 0, y: 0, type: 'moltenstone' });
  }else{
  blocks.push({ x: 0, y: 0, type: 'hellcavestone' });
if (hashCoords(chunkX,chunkY,148, seed) < 0.05) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'helltree0' });
    blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'helltree1' });
    blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'helltree2' });
} else if (hashCoords(chunkX,chunkY,149, seed) < 0.002) {
    blocks.push({ x: 0, y: 0, type: 'hellwood' });
}else if (hashCoords(chunkX,chunkY,0, seed) < 0.020) {
    blocks.push({ x: 0, y: 0, type: 'hellgrass' });
}
  }
} else {
  if (isNearCaveEntrance) {
    if (hashCoords(chunkX,chunkY,150, seed) < 0.5) {
  blocks.push({ x: 0, y: 0, type: 'moltenstone' });
} else {
  blocks.push({ x: 0, y: 0, type: 'hellcavestone' });
}
  } else {
    blocks.push({ x: 0, y: 0, type: 'moltenstone' });
    if (hashCoords(chunkX,chunkY,151, seed) < 0.010) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'basalt' });
}else{
    blocks.push({ x: 0, y: 0, type: 'hellwall' });} 
    if (hashCoords(chunkX,chunkY,152, seed) < 0.012) {
  blocks.push({ x: 0, y: 0, type: 'hellgem' });
} 
  if (hashCoords(chunkX,chunkY,153, seed) < 0.02) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ilmenite' });
  } else if (hashCoords(chunkX,chunkY,154, seed) < 0.08) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ruby' });
}else if (hashCoords(chunkX,chunkY,155, seed) < 0.08) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'emerald' });
}else if (hashCoords(chunkX,chunkY,156, seed) < 0.08) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sapphire' });
}else if (hashCoords(chunkX,chunkY,157, seed) < 0.005) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'opal' });
  }
  }
}
if (isCaveEntrance) {
  blocks.push({ x: 0, y: 0, type: 'hell_escape' });
}
        }else if(isunderwater==1 && inhell!==1 && inether!==1 ){
let entranceX2;
let entranceY2;
const isCaveEntrance = allunderwater.some(([entranceX, entranceY]) => {
  entranceX2=entranceX ; entranceY2=entranceY
  return entranceX === blockPosX && entranceY === blockPosY;
});
const isNearCaveEntrance = allunderwater.some(([entranceX, entranceY]) => {
  return Math.abs(entranceX - blockPosX) <= blockSize * 3 && Math.abs(entranceY - blockPosY) <= blockSize * 3;
});
const shouldPlaceHole = hashCoords(chunkX,chunkY,158, seed) < 0.10; 
if(isNearCaveEntrance){
  blocks.push({ x: 0, y: 0, type: 'underwatersand' });
}else{
  if(shouldPlaceHole){
    blocks.push({ x: 0, y: 0, type: 'underwatersand' });
    blocks.push({ x: 0, y: 0, type: 'underwatersandblock' })
    if (hashCoords(chunkX,chunkY,159, seed) < 0.0002) {
  blocks.push({ x: 0, y: 0, type: 'aquaore' });
};
if (hashCoords(chunkX,chunkY,160, seed) < 0.05) {
  blocks.push({ x: 0, y: 0, type: 'echorocks' });
}
if (hashCoords(chunkX,chunkY,161, seed) < 0.05) {
  blocks.push({ x: 0, y: 0, type: 'aquaore' });
}
  }else{
    blocks.push({ x: 0, y: 0, type: 'underwatersand' });
    if (hashCoords(chunkX,chunkY,162, seed) < 0.04) {
 blocks.push({ x: 0, y: 0 , type: 'algae1' });
 blocks.push({ x: 0, y: -( 1 * blockSize), type: 'algae0' });
 blocks.push({ x: 0, y: -( 2 * blockSize), type: 'algae2' });
}
    if(hashCoords(chunkX,chunkY,163, seed)<0.05){
blocks.push({ x: 0, y: 0, type: 'coral1' });
    }else if (hashCoords(chunkX,chunkY,0, seed) < 0.05) {
  blocks.push({ x: 0, y: 0, type: 'coral2' });
}
if (hashCoords(chunkX,chunkY,164, seed) < 0.005) {
  blocks.push({ x: 0, y: 0, type: 'geyser' });
}
if (hashCoords(chunkX,chunkY,165, seed) < 0.00010) {
  blocks.push({ x: 0, y: 0, type: 'aquagodshell' });
};
if (hashCoords(chunkX,chunkY,166, seed) < 0.022) {
  blocks.push({ x: 0, y: 0, type: 'seaweed' });
};
  }
}
if (isCaveEntrance) {
  blocks.push({ x: 0, y: 0, type: 'underwaterescape' });
}
}else if(inabyss==1 && inhell!==1 && inether!==1){
let entranceX2;
let entranceY2;
const isCaveEntrance = allabyssportals.some(([entranceX, entranceY]) => {
  entranceX2=entranceX ; entranceY2=entranceY
  return entranceX === blockPosX && entranceY === blockPosY;
});
const isNearCaveEntrance = allabyssportals.some(([entranceX, entranceY]) => {
  return Math.abs(entranceX - blockPosX) <= blockSize * 3 && Math.abs(entranceY - blockPosY) <= blockSize * 3;
});
if (generateCaves2(blockPosX, blockPosY)) {
  blocks.push({ x: 0, y: 0, type: 'abyssfloor' });
  if (hashCoords(chunkX,chunkY,167, seed) < 0.03) {
    blocks.push({ x: 0, y: 0, type: 'crystal1' });
  } else if (hashCoords(chunkX,chunkY,168, seed) < 0.03) {
    blocks.push({ x: 0, y: 0, type: 'crystal2' });
  } else if (hashCoords(chunkX,chunkY,169, seed) < 0.03) {
    blocks.push({ x: 0, y: 0, type: 'crystal3' });
  } else if (hashCoords(chunkX,chunkY,170, seed) < 0.2) {
    blocks.push({ x: 0, y: 0, type: 'glowblossom' });
  } else if (hashCoords(chunkX,chunkY,171, seed) < 0.01) {
    blocks.push({ x: 0, y: 0, type: 'echorocks' });
  }else if (hashCoords(chunkX,chunkY,172, seed) < 0.05) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'abysstree0' });
    blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'abysstree1' });
    blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'abysstree2' });
} else if (hashCoords(chunkX,chunkY,173, seed) < 0.002) {
    blocks.push({ x: 0, y: 0, type: 'abysswood' });
}else if (hashCoords(chunkX,chunkY,174, seed) < 0.020) {
    blocks.push({ x: 0, y: 0, type: 'abyssgrass' });
}
}else{
if (isNearCaveEntrance) {
  blocks.push({ x: 0, y: 0, type: 'abyssfloor' });
    if (hashCoords(chunkX,chunkY,175, seed) < 0.002) {
    blocks.push({ x: 0, y: 0, type: 'crystal1' });
  } else if (hashCoords(chunkX,chunkY,176, seed) < 0.002) {
    blocks.push({ x: 0, y: 0, type: 'crystal2' });
  } else if (hashCoords(chunkX,chunkY,177, seed) < 0.002) {
    blocks.push({ x: 0, y: 0, type: 'crystal3' });
  } else if (hashCoords(chunkX,chunkY,178, seed) < 0.005) {
    blocks.push({ x: 0, y: 0, type: 'glowblossom' });
  } else if (hashCoords(chunkX,chunkY,179, seed) < 0.0005) {
    blocks.push({ x: 0, y: 0, type: 'echorocks' });
  }
} else {
    blocks.push({ x: 0, y: 0, type: 'abyssfloor' });
    if (hashCoords(chunkX,chunkY,180, seed) < 0.008) {
  blocks.push({ x: 0, y: 0, type: 'crystal1' });
} else if (hashCoords(chunkX,chunkY,181, seed) < 0.008) {
  blocks.push({ x: 0, y: 0, type: 'crystal2' });
} else if (hashCoords(chunkX,chunkY,182, seed) < 0.008) {
  blocks.push({ x: 0, y: 0, type: 'crystal3' });
}else if (hashCoords(chunkX,chunkY,183, seed) < 0.011) {
  blocks.push({ x: 0, y: 0, type: 'glowblossom' });
}else if (hashCoords(chunkX,chunkY,184, seed) < 0.006) {
  blocks.push({ x: 0, y: 0, type: 'echorocks' });
}
    blocks.push({ x: 0, y: 0, type: 'abyssblock' })
}
}
}else if(inether==1 && inhell!==1 && generateCave!==1 && generateCaveForEther !== 1){
	blockType2 = islandEther(blockPosX, blockPosY) 
if (blockType2 == "water") {
		blocks.push({ x: i * blockSize, y: j * blockSize, type: 'etherwater' });
}else if(blockType2=="grass"){
if (blockType2!=="hill1"){
if (seed.startsWith("randomloot") && !isInSpawnArea && hashCoords(chunkX, chunkY, 0.5 , seed) < 0.008  ) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: 0, y: 0, type: 'chest' });
  chestsData[`${chunkX},${chunkY}`]=[ getRandomKey( allItems  ),getRandomKey( allItems )  ];  
}else if(seed.startsWith("badseed") && !isInSpawnArea && hashCoords(chunkX,chunkY,84.5, seed) < 0.8){ 
  blocks.push({ x: 0, y: 0, type: 'fleshblock1' });
 if (  hashCoords(chunkX, chunkY, 894.5, seed) < 0.005) {
  blocks.push({ x: 0, y: 0, type: 'corruptedthing' });
}
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 85, seed) < 0.05) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'etherflowers' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 81, seed+"1q") < 0.002) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pyrite' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 85.5, seed) < 0.05) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'glowblossom' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 82, seed + "1q") < 0.02) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'crystal1' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 83, seed + "1q") < 0.02) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'crystal2' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 84, seed + "1q") < 0.02) {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'crystal3' });
}else if (!isInSpawnArea && hashCoords(chunkX,chunkY,86, seed) < 0.05) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethertree1' });
    blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'ethertree2' });
    blocks.push({ x: i * blockSize, y: (j - 2) * blockSize, type: 'ethertree3' });
  }else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 89, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
}else if (!isInSpawnArea && hashCoords(chunkX, chunkY, 89.5, seed) < 0.002) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'pumpkin1' });
}  else if (!isInSpawnArea && hashCoords(chunkX,chunkY,90, seed) < 0.007) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'longstick' });
}else if (!isInSpawnArea && hashCoords(chunkX,chunkY,91, seed) < 0.005) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'wildcarrot' });
}else if (hashCoords(chunkX,chunkY,92, seed) < 0.03) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'sticks' });
            }else if (hashCoords(chunkX,chunkY,93, seed) < 0.05) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
            } else if (hashCoords(chunkX,chunkY,98, seed) < 0.006 && !seed.startsWith("badseed")) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'kite1' });
            } else if (hashCoords(chunkX,chunkY,100, seed) < 0.003 && !seed.startsWith("badseed")) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'poppy' });
}else if (hashCoords(chunkX,chunkY,101, seed) < 0.002 ) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'black_elderberry' });
blocks.push({ x: i * blockSize, y: (j - 1) * blockSize, type: 'black_elderberry2' });
          }  else if (hashCoords(chunkX,chunkY,105, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'treebark' });
} else if (hashCoords(chunkX,chunkY,106, seed) < 0.2 ) {
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
                blocks.push({ x: i * blockSize, y: j * blockSize, type: 'tallethergrass' });
            }else if (hashCoords(chunkX,chunkY,112, seed) < 0.005) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blackberry' });
} else if (hashCoords(chunkX,chunkY,114, seed) < 0.004) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'chalcopyrite' });
}else if (hashCoords(chunkX,chunkY,116, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rye1' });
}else if (hashCoords(chunkX,chunkY,117, seed) < 0.02) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'blueflower2' });
} else if (hashCoords(chunkX,chunkY,118, seed) < 0.03) {
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
 blocks.push({ x: i * blockSize, y: j * blockSize, type: 'redflower2' });
}else if (hashCoords(chunkX,chunkY,119, seed) < 0.02) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'honey_mushrooms' });
}else {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethergrass' });
            }
}
}else if (blockType2 == "sand") {
	blocks.push({ x: i * blockSize, y: j * blockSize, type: 'ethersand' });
}
}
}}else {
  blocks.push({ x: 0, y: 0, type: 'housegrass' });
  blocks.push({ x: 0, y: 0, type: 'voidblock' });
}
if (seed.startsWith("rock") && !isInSpawnArea && hashCoords(chunkX, chunkY, 89, seed) < 0.5) {
  blocks.push({ x: i * blockSize, y: j * blockSize, type: 'rock' });
  if (hashCoords(chunkX, chunkY, 89, seed + 1) < 0.5) {
    blocks.push({ x: i * blockSize, y: j * blockSize, type: 'stones' });
  }
}
    } 
    }
    chunks[chunkKey] = blocks;
}
function addSurroundingWater(blocks, x, y) {
    const directions = [
        { dx: blockSize, dy: 0 },   
        { dx: -blockSize, dy: 0 },  
        { dx: 0, dy: blockSize },   
        { dx: 0, dy: -blockSize },  
    ];
    let waterCount = 0;
    for (const direction of directions) {
        if (waterCount >= 12) break; 
        const newX = x + direction.dx;
        const newY = y + direction.dy;
        if (canPlaceWater(blocks, newX, newY)) {
            blocks.push({ x: newX, y: newY, type: 'water' });
            waterCount++;
        }
    }
}
function canPlaceWater(blocks, x, y) {
    for (const block of blocks) {
        if (block.x === x && block.y === y) {
            return block.type === 'grass';
        }
    }
    return true; 
}
function drawTreesBelowPlayer(trees) {
    trees.forEach(tree => {
        if (textures[tree.type].complete && textures[tree.type].naturalWidth > 0) { 
            ctx.drawImage(textures[tree.type], tree.x, tree.y, blockSize, blockSize);
        } else {
        }
    });
}
function drawTreesAbovePlayer(trees) {
    trees.forEach(tree => {
let addgap = 0.2;
let rmxy=0
if (zoomedDELTA > 0) {
  addgap = 0.5;
  rmxy=1
} else {} 
let x =tree.x 
let y =tree.y
if (animatedTextures[tree.type] ) {
        const anim = animatedTextures[tree.type];
    const currentTime = performance.now() / 1000; 
    if (currentTime - anim.lastFrameTime > anim.speed) {
      anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length; anim.lastFrameTime = currentTime;}
    if (anim.frames[anim.currentFrame] && anim.frames[anim.currentFrame].complete && anim.frames[anim.currentFrame].naturalWidth > 0) {
      ctx.drawImage(anim.frames[anim.currentFrame], x, y, blockSize+addgap, blockSize+addgap); }  } else  {
    if (textures[tree.type] && textures[tree.type].complete && textures[tree.type].naturalWidth > 0) { 
let block = tree
 if (block.type === "cdba") {
	if (textures["cdba"] && textures["cdba"].complete && textures["cdba"].naturalWidth > 0) {
		let tempCanvas = document.createElement("canvas");
		tempCanvas.width = textures["cdba"].naturalWidth;
		tempCanvas.height = textures["cdba"].naturalHeight;
		let tctx = tempCanvas.getContext("2d");
		if (block.draw) {
			for (let i = 0; i < 16; i++) {
				for (let j = 0; j < 16; j++) {
					let color = block.draw[i][j] || "#c9c9c9";
					if (color.toLowerCase() === "#c9c9c9") continue;
					tctx.fillStyle = color;
					tctx.fillRect(i, j, 1, 1);
				}
			}
		}
		ctx.drawImage(tempCanvas, x, y, blockSize + addgap, blockSize + addgap);
	}
}else if (inether && (block.type === "sticks" || block.type === "stick" || block.type === "treebark" || block.type === "sapling" || block.type === "black_elderberry_tree" || block.type === "black_elderberry" || block.type === "black_elderberry2" || block.type === "empty_black_elderberry" || block.type === "empty_black_elderberry2" || block.type === "longstick")) {
		ctx.save()
		ctx.filter = "hue-rotate(130deg)"
		ctx.drawImage(textures[tree.type], x, y, blockSize+addgap, blockSize+addgap); 
		ctx.restore()
	} else {
		ctx.drawImage(textures[tree.type], x, y, blockSize+addgap, blockSize+addgap); 
	}
    } }
    });
    for(let i=0 ; i<textarr.length; i++){
      
ctx.letterSpacing = "1px"; 
 ctx.font = '13px pffont';
ctx.fillStyle = 'white';
ctx.textAlign = 'center';
let x =textarr[i].dx ; let y=textarr[i].dy;
ctx.fillText(textarr[i].text, x + blockSize / 2, y - 5);
        }
}
let renderedBlocks = []; 
let nightpower = 0;  
const maxNightpower = 3;  
let dayNightCycleSpeed = 0.0002;  
let dayNightCycleSpeed2 = 0.0002;  
let increasing = true;  
var surviveddays=0
function updateDayNightCycle() {
  if(seed.startsWith("night") ){
    nightpower=3
  }
  var boost1=0
  var boost2=0
  if(seed.startsWith("badseed")){
    boost1=0.001
  } 
  if (seed.startsWith("speed")) {
  boost1 = 0.01
  boost2 = 0.02
}
    if (increasing) {
        nightpower += dayNightCycleSpeed+boost1;  
        if (nightpower >= maxNightpower) {
            nightpower = maxNightpower;
            increasing = false;  
        }
 if (nightpower > 2.5) {
    achievementget("Its Night Now !", 0)
}
    } else {
        nightpower -= dayNightCycleSpeed2+boost2;
        if (nightpower <= 0) {
            nightpower = 0;
            increasing = true;  
            surviveddays++
            if( surviveddays>10){
                achievementget("Survive 10 days !",1)
            }
if (surviveddays > 50) {
    achievementget("Yoo 50 days !", 1)
}
if (surviveddays > 100) {
    achievementget("<span style='color: purple;'>100 days !</span>", 1)
}
if (surviveddays > 500) {
    achievementget("Man you're really playing very long <span style='color: yellow;'>500 days !</span>", 1)
}
        }
    }
}
function isNearTorch2(blocks, x, y) {
  const rad = 1.5 * blockSize; 
  const nearbyBlocks = blocks.filter(block => {
    const distX = Math.abs(block.x - x);
    const distY = Math.abs(block.y - y);
    return distX <= rad && distY <= rad;
  });
  for (const block of nearbyBlocks) {
    const distX = Math.abs(block.x - x);
    const distY = Math.abs(block.y - y);
    if ((block.type === 'torch' && distX <= 2 * blockSize && distY <=  blockSize) ||
  (  block.type === 'lamp' && distX <= 3 * blockSize && distY <=  blockSize) ||
      (block.type === 'cave_escape' && distX <= blockSize && distY <=blockSize) ||
      (block.type === 'glowblossom' && distX <= blockSize && distY <=blockSize) ||
      (block.type === 'lit_furnace' && distX <= 4 * blockSize && distY <= blockSize) ||
      (block.type === 'campfire' && distX <= blockSize && distY <=  blockSize) ||
      (block.type === 'ignited_fiber' && distX === 0 && distY === 0)) {
      return true; 
    }
  }
  if (yourItems !== undefined) {
    if (checkIfItems("hand_torch", 1)) {
      const radius5 = 1.5 * blockSize;
      const playerCenterX = offsetX + canvas.width / 2 * 32 * blockSize;
      const playerCenterY = offsetY + canvas.height / 2 * 32 * blockSize;
      const distX2 = Math.abs(playerCenterX / 32 / 32 - x);
      const distY2 = Math.abs(playerCenterY / 32 / 32 - y);
      if (distX2 <= rad && distY2 <= rad) {
        return true; 
      }
    }
    if (checkIfItems("magiclanter", 1)) {
  const radius5 = 3 * blockSize;
  const playerCenterX = offsetX + canvas.width / 2 * 32 * blockSize;
  const playerCenterY = offsetY + canvas.height / 2 * 32 * blockSize;
  const distX2 = Math.abs(playerCenterX / 32 / 32 - x);
  const distY2 = Math.abs(playerCenterY / 32 / 32 - y);
  if (distX2 <= radius5 && distY2 <= radius5) {
    return true; 
  }
}
  }
  return false; 
}
var blocksGlow = {
	"etherflowers":{ "x": 0, "y": 0, "d": 1},
	"ethertree3":{ "x": 0, "y": 0, "d": 1},
	"ethergate": { "x": 1, "y": 1, "d": 0 }, 
	"ethergateback": { "x": 1, "y": 1, "d": 0 }, 
	"etheractive": { "x": 0, "y": 0, "d": 1.5 }, 
    "torch": { "x": 1, "y": 1, "d": 1 }, 
"magma": { "x": 0.6, "y": 0.6, "d": 0 }, 
    "whitetorch": { "x": 1, "y": 1, "d": 1 }, 
    "orangetorch": { "x": 1, "y": 1, "d": 1 }, 
    "darktorch": { "x": 1, "y": 1, "d": 1 }, 
    "fluortorch": { "x": 1, "y": 1, "d": 0 }, 
    "limetorch": { "x": 1, "y": 1, "d": 1 }, 
    "purpletorch": { "x": 1, "y": 1, "d": 1 }, 
    "litpumpkin": { "x": 0, "y": 0, "d": 2 }, 
    "candle": { "x": 1, "y": 1, "d": 0 },
    "lamp2": { "x": 2, "y": 2, "d": 1 },
    "cave_escape": { "x": 0, "y": 0, "d": 1 },
    "blossomblock": { "x": 0, "y": 0, "d": 1 },
    "glowblossom": { "x": 0, "y": 0, "d": 1 },
    "bluetorch": { "x": 0, "y": 0, "d": 1 },
    "lit_furnace": { "x": 3, "y": 3, "d": 1 },
    "lit_kiln": { "x": 3, "y": 2, "d": 1 },
    "campfire": { "x": 0, "y": 0, "d": 1 },
    "extinguished_campfire": { "x": 0, "y": 0, "d": 0 },
    "echorocks": { "x": 0, "y": 0, "d": -0.1 },
    "aquaore": { "x": 0, "y": 0, "d": 0 },
    "hand_torch": { "x": 0, "y": 0, "d": 0 },
    "ignited_fiber": { "x": 0, "y": 0, "d": 1 },
    "opal": { "x": 0, "y": 0, "d": -0.3},
    "uranium": { "x": 0, "y": 0, "d": -0.3},
    "fluorite": { "x": 0, "y": 0, "d": -0.2},
    "crystal6": { "x": 0, "y": 0, "d": -0.3},
"crystal3": { "x": 0, "y": 0, "d": -0.3},
"crystal2": { "x": 0, "y": 0, "d": -0.3},
"crystal1": { "x": 0, "y": 0, "d": -0.3},
"abyssentrance": { "x": 0, "y": 0, "d": 0},
    "statueofgods": { "x": 2, "y": 2, "d": 2 },
    "abysstree2": { "x": 0, "y": 0, "d": 1 },
    "abysstree0": { "x": 0, "y": 0, "d": 1 },
    "abysstree1": { "x": 0, "y": 0, "d": 1 },
    "helltree0": { "x": 0, "y": 0, "d": 0 },
    "helltree1": { "x": 0, "y": 0, "d": 0 },
    "helltree2": { "x": 0, "y": 0, "d": 0 },
    "magiclanter": { "x": 0.5, "y": 1, "d": 1 },
};
var itemsGlow = {
  "hand_torch": { "x": 1, "y": 1, "d": 0.5 },
  "magiclanter": { "x": 1, "y": 1, "d": 5 },
  "hallucinate": { "x": 3, "y": 3, "d": 7},
};
var coloredlight={
	"etherflowers":"rgb(220,100,229,0.2)",
	"ethertree3":"rgb(150,255,120,0.2)",
	"etheractive":"rgb(255,10,10,0.3)",
	"ethergate":"rgb(0,255,205,0.1)",
	"ethergateback":"rgb(0,255,205,0.1)",
  "fluortorch":"rgb(0,255,205,0.3)",
  "fluorite":"rgb(0,255,205,0.5)",
  "echorocks":"rgb(200,25,250,0.5)",
  "aquaore":"rgb(0,255,255,0.5)",
  "uranium":"rgb(0,255,25,0.5)",
"glowblossom":"rgb(0,100,255,0.3)",
"blossomblock":"rgb(100,10,255,0.3)",
"purpletorch":"rgb(150,10,255,0.3)",
"crystal6":"rgb(150,100,255,0.3)",
"abyssentrance":"rgb(150,100,255,0.3)",
"crystal3":"rgb(255,50,10,0.2)",
"crystal1":"rgb(0,100,255,0.2)",
"crystal2":"rgb(150,255,50,0.2)",
"magma":"rgb(255,200,10,0.3)",
"orangetorch":"rgb(255,200,10,0.3)",
"darktorch":"rgb(0,0,0,0.7)",
"whitetorch":"rgb(255,255,255,0.3)",
"limetorch":"rgb(10,255,10,0.3)",
"lit_pumpkin":"rgb(250,100,0,0.2)",
"ignited_fiber":"rgb(255,10,10,0.3)",
"lit_furnace":"rgb(250,100,0,0.15)",
"bluetorch":"rgb(0,100,255,0.3)",
"extinguished_campfire":"rgb(200,0,0,0.3)",
}
function getLightPlusPlus(blocks, x, y) {
  const result = [];
  const added = new Set(); 
  const radiusTorch = canvas.width+50;
  const nearbyBlocks = blocks.filter(block => {
    const distX = Math.abs(block.x - x);
    const distY = Math.abs(block.y - y);
    return distX <= radiusTorch && distY <= radiusTorch;
  });
  for (const block of nearbyBlocks) {
    if (block.type in blocksGlow) {
      const key = `${block.x},${block.y}`;
      if (!added.has(key)) {
        const glow = blocksGlow[block.type];
        if (glow) {
          if((blocksGlow[block.type].x==1||blocksGlow[block.type].x==0||blocksGlow[block.type].y==1 )&& blocksGlow[block.type].d<=1  ){
      let coloroflight="";
      if(coloredlight[block.type]){
        coloroflight=coloredlight[block.type] ;
      }
          result.push({
            color:coloroflight,
            x: block.x,
            y: block.y,
            power: (glow.x+glow.y+(glow.d/2))*200 ,
            radius: 1 + ((glow.x+glow.y+(glow.d/2) ) /6) ,
            basePower: (glow.x+glow.y+(glow.d/2))*200 ,
            powerDirection: -1,
            baseRadius: 1 + ((glow.x+glow.y+(glow.d/2)) /6) ,
            radiusDirection: -1
          });
          }else if(blocksGlow[block.type].d>1){
let coloroflight = "";
if (coloredlight[block.type]) {
  coloroflight = coloredlight[block.type];
}
result.push({
      color: coloroflight,
  x: block.x,
  y: block.y,
  power: (glow.x + glow.y + (glow.d/2)*2) * 600,
  radius: 3 + ((glow.x + glow.y + (glow.d/2)) / 8),
  basePower: (glow.x + glow.y + (glow.d/2)*2) * 600 ,
  powerDirection: -1,
  baseRadius: 3 + ((glow.x + glow.y + (glow.d/2)) / 8),
  radiusDirection: -1
});
          }else {
  let coloroflight = "";
if (coloredlight[block.type]) {
  coloroflight = coloredlight[block.type];
}
result.push({
      color: coloroflight,
    x: block.x,
    y: block.y,
    power: (glow.x + glow.y + glow.d) * 600,
    radius: 4 + ((glow.x + glow.y + glow.d) / 6),
  basePower: (glow.x + glow.y + glow.d) * 600 ,
  powerDirection: -1,
  baseRadius: 4 + ((glow.x + glow.y + glow.d) / 6) ,
  radiusDirection: -1
  });
}
          added.add(key);
        }
      }
    }
  }
if (yourItems !== undefined) {
    const playerCenterX = offsetX + (canvas.width / 2 * 32 * 32 * blockSize);
const playerCenterY = offsetY + (canvas.height / 2 * 32 * 32 * blockSize);
    for (const [itemName, glow] of Object.entries(itemsGlow)) {
        if (checkIfItems(itemName, 1)) {
            let coloroflight = "";
            if (coloredlight[itemName]) {
                coloroflight = coloredlight[itemName];
            }
            result.push({
                color: coloroflight,
                x: Math.floor( Math.floor(playerCenterX/32)*32 / (blockSize * 32))/32+ (16/2) ,
                y: Math.floor( Math.floor(playerCenterY/32)*32 / (blockSize * 32))/32+ (16/2) ,
                power:50+ (glow.x + glow.y + glow.d) * 100,
                radius: 0+ ((glow.x + glow.y + glow.d) / 3),
                basePower: (glow.x + glow.y + glow.d) * 100,
                powerDirection: -1,
                baseRadius: 0 + ((glow.x + glow.y + glow.d) / 3),
                radiusDirection: -1
            });
        }
    }
}
  return result;
}
function isNearTorch(blocks, x, y) {
    if(options.oldlight==1){
            const radiusTorch = 4 * blockSize;
    const nearbyBlocks = blocks.filter(block => {
        const distX = Math.abs(block.x - x);
        const distY = Math.abs(block.y - y);
        return distX <= radiusTorch && distY <= radiusTorch;
    });
    if (generateCave == 1 || generateCaveForEther==1|| nightpower > 1.5 || (isinhouse == 1 || isinhouse2 == 1)) {
        for (const block of nearbyBlocks) {
            const distX = Math.abs(block.x - x);
            const distY = Math.abs(block.y - y);
            if (block.type in blocksGlow) {
                if (distX <= (blocksGlow[block.type].x+blocksGlow[block.type].d) * blockSize && distY <=( blocksGlow[block.type].y+blocksGlow[block.type].d )* blockSize) {
                    return true;
                }
            }
        }
    }else{
        for (const block of nearbyBlocks) {
    const distX = Math.abs(block.x - x);
    const distY = Math.abs(block.y - y);
    if ((block.type in blocksGlow) &&
        (distX <= (blocksGlow[block.type].x) * blockSize && distY <= (blocksGlow[block.type].y) * blockSize)) {
        return true;
    }
}
    }
    if (yourItems !== undefined) {
        const playerCenterX = offsetX + (canvas.width / 2 * 32 * 32 * blockSize);
        const playerCenterY = offsetY + (canvas.height / 2 * 32 * 32 * blockSize);
        const itemChecks = [
            { name: "hand_torch", radius: [0.5, 1.5] },
            { name: "magiclanter", radius: [1.5, 2.5] },
            { name: "hallucinate", radius: [2.5, 3.5] }
        ];
        for (const item of itemChecks) {
            if (checkIfItems(item.name, 1)) {
                const distX2 = Math.abs(playerCenterX / 32 / 32 / 32 - x);
                const distY2 = Math.abs(playerCenterY / 32 / 32 / 32 - y);
                if (generateCave == 1|| generateCaveForEther==1 || nightpower > 1.8 || (isinhouse == 1 || isinhouse2 == 1) ) {
                if (distX2 <= (item.radius[0] +1)* blockSize && distY2 <= (item.radius[0] +1)* blockSize) {
                    return true;
                }}else{
                if (distX2 <= item.radius[0]* blockSize && distY2 <= item.radius[0] * blockSize) {
                 return true;
                }
                }
            }
        }
    }
    return false; 
    }else{
    const radiusTorch = 4 * blockSize;  
    const nearbyBlocks = blocks.filter(block => {
        const distX = Math.abs(block.x - x);
        const distY = Math.abs(block.y - y);
        return distX <= radiusTorch && distY <= radiusTorch;
    });
if(generateCave!==0 || ( storelastdimension=="inether" && generateCaveForEther!== 0 )|| nightpower>1.5){
    for (const block of nearbyBlocks) {
        const distX = Math.abs(block.x - x);
        const distY = Math.abs(block.y - y);
if ((block.type in blocksGlow) && 
            (distX <= (blocksGlow[block.type].x) * blockSize && distY <= (blocksGlow[block.type].y) * blockSize) && blocksGlow[block.type].d >=0 ) {
            return true; 
}
    }
    if (yourItems !== undefined) {
        if (checkIfItems("hand_torch", 1)) {
const radius5 = 0.5 * blockSize;
const radius6 = 1.5 * blockSize;
const playerCenterX = offsetX + canvas.width / 2 * 32 *32* blockSize;
const playerCenterY = offsetY + canvas.height / 2 * 32 *32 * blockSize;
const distX2 = Math.abs(playerCenterX / 32 / 32 /32- x);
const distY2 = Math.abs(playerCenterY / 32 / 32 /32- y);
if (distX2 <= radius5 && distY2 <= radius5) {
  return true;
}
if ((distX2 <= radius6 && distY2 <= radius6)) {
  return 0.5;
}
}
        if (checkIfItems("magiclanter", 1)) {
const radius5 = 1.5 * blockSize;
const radius6 = 2.5 * blockSize;
const playerCenterX = offsetX + canvas.width / 2 * 32*32 * blockSize;
const playerCenterY = offsetY + canvas.height / 2 * 32*32 * blockSize;
const distX2 = Math.abs(playerCenterX / 32 / 32 /32 - x);
const distY2 = Math.abs(playerCenterY / 32 / 32 /32- y);
if (distX2 <= radius5 && distY2 <= radius5) {
  return true;
}
if ((distX2 <= radius6 && distY2 <= radius6)) {
  return 0.5;
}
        }
    }
    for (const block of nearbyBlocks) {
  const distX = Math.abs(block.x - x);
  const distY = Math.abs(block.y - y);
  if ((block.type in blocksGlow) &&
    (distX <= (blocksGlow[block.type].x + blocksGlow[block.type].d ) * blockSize && distY <= (blocksGlow[block.type].y + blocksGlow[block.type].d ) * blockSize)) {
    return 0.5;
    }
  }
}else{
  for (const block of nearbyBlocks) {
  const distX = Math.abs(block.x - x);
  const distY = Math.abs(block.y - y);
  if ((block.type in blocksGlow) &&
    (distX <= (blocksGlow[block.type].x) * blockSize && distY <= (blocksGlow[block.type].y) * blockSize)) {
    return true;
  }
}
if (yourItems !== undefined) {
  if (checkIfItems("hand_torch", 1)) {
    const radius5 = 0.5 * blockSize;
    const radius6 = 1.5 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2 * 32 * 32 * blockSize;
const playerCenterY = offsetY + canvas.height / 2 * 32 * 32 * blockSize;
const distX2 = Math.abs(playerCenterX / 32 / 32 / 32 - x);
const distY2 = Math.abs(playerCenterY / 32 / 32 / 32 - y);
if (distX2 <= radius5 && distY2 <= radius5) {
    return true;
}
if ((distX2 <= radius6 && distY2 <= radius6)) {
    return 0.5;
}
  }
if (checkIfItems("hallucinate", 1)) {
    const radius5 = 2.5 * blockSize;
    const radius6 = 3.5 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2 * 32 * 32 * blockSize;
    const playerCenterY = offsetY + canvas.height / 2 * 32 * 32 * blockSize;
    const distX2 = Math.abs(playerCenterX / 32 / 32 / 32 - x);
    const distY2 = Math.abs(playerCenterY / 32 / 32 / 32 - y);
    if (distX2 <= radius5 && distY2 <= radius5) {
        return true;
    }
    if ((distX2 <= radius6 && distY2 <= radius6)) {
        return 0.5;
    }
}
  if (checkIfItems("magiclanter", 1)) {
    const radius5 = 1.5 * blockSize;
    const radius6 = 2.5 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2 * 32*32 * blockSize;
    const playerCenterY = offsetY + canvas.height / 2 * 32 *32* blockSize;
    const distX2 = Math.abs(playerCenterX / 32 / 32 /32- x);
    const distY2 = Math.abs(playerCenterY / 32 / 32 /32- y);
    if (distX2 <= radius5 && distY2 <= radius5) {
      return true;
    }
    if ((distX2 <= radius6 && distY2 <= radius6)) {
      return 0.5;
    }
  }
}
}
    return false; 
}}
let chunkPositions = []; 
var dontcount = ["dirt", "grass", "tallgrass", "yellow", "dandelion", "violet","tree0","pine0","birch0","tree1","pine1","birch1","tree2","pine2","birch2","grasslayer","clayblock","ashfloor","shine","shiny","log_floor","log_wall","log","stone_floor","stone_wall","brickwall","brickfloor","clayblock1","glass","gypsumblock","abyssfloor","abyssescape","snowpine1","snowpine2","snowpine3","stone_floor", "fiber_floor", "grasslayer", "yellow", "violet", "clayblock", "clayblock1", "dandelion", "toadstool", "sandblock2", "gypsumblock", "glass", "fern", "planks_floor", "log_floor", "ashblock", "ashfloor", "brickfloor", "daffodil","flax","myosotis", "fiber_floor", "bed1", "magnetite", "nettle", "stone_floor", "emeraldfloor", "sapphirefloor", "rubyfloor", "clayblock1", "clayblock","violetfloor","grass","toadstool","stones","thistle","ryeroof","houseroof","housewall","brickhouse","gelblock","gypsum_dirt","roadfloor","gypsumblock","gypsumfloor","torch","brickfloor2","door","door2","housegrass","lamp","lamp2","hellwall2","forestgrass","forestleaf","blush","hill1","climbhill","statue1_1","statue1_2","kiln","algae1","algae2","algae0","statue2_2","statue2_1","helltree0","helltree1","helltree2","abysstree2","abysstree1","abysstree0","helllog","abysslog","abyssgrass","hellgrass" ,"gypsumhouse","gypsumroof","gypsumdoor","carpet","polishedfloor","sing","palm1","palm2","coconutpalm","palm12","palm32","stonesing","cauldron","textstone","fountain","candle","grassdeco","grassdeco1","curedgrasslayer","road2" ,"cinnabargeode"
  ,"coral1floor","coral2floor","whitewallpaper","redwallpaper","bluewallpaper","limewallpaper","chest","housegrass","houseinside","bed1","bed","bed2","bluetorch","torch","limetorch","orangetorch","darktorch","whitetorch","purpletorch","bed21","bed22", "a1bed","a2bed","abyssblock2","swampgrasslay","peatfloor","lily","hill2",
  "Hstone","Hstonelay","hook","magma","canyonsandlayer","canyonsand","hill3","ethertree1","ethertree2","ethertree3","canvas","cdb","cdba"
];
let waveTick = 0;
var fenceconnections={
  "none": "./fence.png",
  "ud": "./fence_u_d.png",
  "u": "./fence_u.png",
  "ul": "./fence_u_r.png" ,
  "ur": "./fence_u_l.png",
  "lr": "./fence_l_r.png",
  "rd": "./fence_l_d.png",
  "ld": "./fence_r_d.png",
  "d": "./fence_u_d.png",
  "r": "./fence_r.png",
  "l": "./fence_l.png"
}
var fencetextures ={};
for (const [name, src] of Object.entries(fenceconnections)) {
  fencetextures[name] = new Image();
  let src2=removeDotSlash(src)
  fencetextures[name].src = getBase64Image(src2,assets);
}

var waterconnections = {
  "u1": "./water_up1.png",
  "u2": "./water_up2.png",
  "d1": "./water_down1.png",
  "d2": "./water_down2.png",
  "l1": "./water_left1.png",
  "l2": "./water_left2.png",
  "r1": "./water_right1.png",
  "r2": "./water_right2.png",
  "1": "./water.png",
  "2": "./water2.png"
}
var watertextures = {};
for (const [name, src] of Object.entries(waterconnections)) {
  watertextures[name] = new Image();
  let src2 = removeDotSlash(src)
watertextures[name].src = getBase64Image(src2, assets);
}
var waterconnections2 = {
 "u1": "./water_up12.png",
 "u2": "./water_up22.png",
 "d1": "./water_down12.png",
 "d2": "./water_down22.png",
 "l1": "./water_left12.png",
 "l2": "./water_left22.png",
 "r1": "./water_right12.png",
 "r2": "./water_right22.png",
 "1": "./water.png",
 "2": "./water2.png",
 "reflection":"./cloudsreflection.png",
"starsinthesky":"./starsinthesky.png"
}
var watertextures2 = {};
for (const [name, src] of Object.entries(waterconnections2)) {
 watertextures2[name] = new Image();
 let src2 = removeDotSlash(src)
watertextures2[name].src = getBase64Image(src2, assets);
}
var roadconnections = {
  "none": "./road0.png",
  "ud": "./roadud.png",
  "u": "./roadd.png",
  "ul": "./roadlu.png",
  "ur": "./roadur.png",
  "lr": "./roadlr.png",
  "rd": "./roaddr.png",
  "ld": "./roadld.png",
  "d": "./roadu.png",
  "l": "./roadr.png",
  "r": "./roadl.png",
  "ldr": "./roadldr.png",
  "lur": "./roadlur.png",
  "full": "./road1.png", 
}
var grass2connections = {
  "none": "./grass2none.png",
  "udl": "./grass2ud-l.png",
  "udr": "./grass2ud-r.png",
  "ul": "./grass2lu.png",
  "ur": "./grass2ru.png",
  "rlu": "./grass2rl-u.png",
  "rld": "./grass2rl-d.png",
  "rd": "./grass2rd.png",
  "ld": "./grass2ld.png",
  "lu": "./grass2lu.png",
  "ru": "./grass2ru.png",
  "full": "./grass2full.png",
}
var roadtextures = {};
for (const [name, src] of Object.entries(roadconnections)) { 
  roadtextures[name] = new Image();
  let src2 = removeDotSlash(src)
roadtextures[name].src = getBase64Image(src2, assets);
}
var grasstextures = {};
for (const [name, src] of Object.entries(grass2connections)) {
  grasstextures[name] = new Image();
  let src2 = removeDotSlash(src)
grasstextures[name].src = getBase64Image(src2, assets);
}
var hill1connections = {
 "none": "./hill_none.png",
 "u": "./hill_u.png",
 "ul": "./hill_ul.png",
 "ur": "./hill_ur.png",
 "dl": "./hill_dl.png",
 "dr": "./hill_dr.png",
 "Cul":"./hillC_ul.png",
 "Cur":"./hillC_ur.png",
 "Cdr":"./hillC_dr.png",
 "Cdl":"./hillC_dl.png",
 "Culdr":"./hillC_ul_dr.png",
 "Curdl":"./hillC_ur_dl.png",
 "r": "./hill_r.png",
 "l": "./hill_l.png",
 "d": "./hill_d.png",
 "full": "./hill_grass.png",
}
var hill1textures = {};
for (const [name, src] of Object.entries(hill1connections)) {
 hill1textures[name] = new Image();
 let src2 = removeDotSlash(src)
hill1textures[name].src = getBase64Image(src2, assets);
}
var hill2connections = {
	"none": "./Hstone_none.png",
	"u": "./Hstone_u.png",
	"ul": "./Hstone_ul.png",
	"ur": "./Hstone_ur.png",
	"dl": "./Hstone_dl.png",
	"dr": "./Hstone_dr.png",
	"Cul": "./HstoneC_ul.png",
	"Cur": "./HstoneC_ur.png",
	"Cdr": "./HstoneC_dr.png",
	"Cdl": "./HstoneC_dl.png",
	"Culdr": "./HstoneC_ul_dr.png",
	"Curdl": "./HstoneC_ur_dl.png",
	"r": "./Hstone_r.png",
	"l": "./Hstone_l.png",
	"d": "./Hstone_d.png",
	"full": "./Hstone.png",
}
var hill2textures = {};
for (const [name, src] of Object.entries(hill2connections)) {
	hill2textures[name] = new Image();
	let src2 = removeDotSlash(src)
	hill2textures[name].src = getBase64Image(src2, assets);
}
var hill3connections = {
	"none": "./Cstone_none.png",
	"u": "./Cstone_u.png",
	"ul": "./Cstone_ul.png",
	"ur": "./Cstone_ur.png",
	"dl": "./Cstone_dl.png",
	"dr": "./Cstone_dr.png",
	"Cul": "./CstoneC_ul.png",
	"Cur": "./CstoneC_ur.png",
	"Cdr": "./CstoneC_dr.png",
	"Cdl": "./CstoneC_dl.png",
	"Culdr": "./CstoneC_ul_dr.png",
	"Curdl": "./CstoneC_ur_dl.png",
	"r": "./Cstone_r.png",
	"l": "./Cstone_l.png",
	"d": "./Cstone_d.png",
	"full": "./Cstone.png",
}
var hill3textures = {};
for (const [name, src] of Object.entries(hill3connections)) {
	hill3textures[name] = new Image();
	let src2 = removeDotSlash(src)
	hill3textures[name].src = getBase64Image(src2, assets);
}
var climbhill1 = {
 "none": "./climbhill.png",
 "u": "./climbhill.png",
 "d": "./climbhill2.png",
}
var climbhill1textures = {};
for (const [name, src] of Object.entries(climbhill1)) {
 climbhill1textures[name] = new Image();
 let src2 = removeDotSlash(src)
climbhill1textures[name].src = getBase64Image(src2, assets);
}
var watertickcount=0
function isVisibleBlockAtPosition(x, y, type) {
  const hiddenExceptions = ['torch','stones','limetorch','stick','sticks','longstick',"clay","bigrock","rock","bluetorch","glass"]
  const globalX = x + offsetX
  const globalY = y + offsetY
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize
  const chunkX = Math.floor(snappedGlobalX / blockSize)
  const chunkY = Math.floor(snappedGlobalY / blockSize)
  const chunkKey = `${chunkX},${chunkY}`
  const chunkBlocks = chunks[chunkKey]
  if (!chunkBlocks) return false
  let targetBlock = null
  for (let i = 0; i < chunkBlocks.length; i++) {
    const block = chunkBlocks[i]
    const blockGlobalX = block.x + chunkX * blockSize
    const blockGlobalY = block.y + chunkY * blockSize
    if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
      if (block.type === type) targetBlock = block
      else if (!hiddenExceptions.includes(block.type)) return false
    }
  }
  return targetBlock !== null
}
function getTextureFromConnections(blockType, chunkX, chunkY) {
  const data = connections[blockType];
  if (!data) return null;
  function evalCondition(cond) {
    if (Array.isArray(cond)) {
      let res = evalCondition(cond[0]);
      for (let i = 1; i < cond.length; i += 2) {
        const op = cond[i];
        const val = evalCondition(cond[i + 1]);
        if (op === 'AND') res = res && val;
        else if (op === 'OR') res = res || val;
        else if (op === 'NOT') res = res && !val;
      }
      return res;
    } else if (typeof cond === 'string') {
      return cond; 
    } else {
      const { x, y, t, type } = cond;
if (type === "visible") {
	return isVisibleBlockAtPosition(chunkX + x * 32, chunkY + y * 32, t);
} else {
	return checkBlockAtPosition2(chunkX + x * 32, chunkY + y * 32, t);
}
    }
  }
  for (const entry of data) {
    if (evalCondition(entry.condition)) return entry.result;
  }
  return null;
}
function getFenceConnection(chunkX, chunkY, typeZ) {
  if(typeZ==-1){
    let connection = "none";
    const hasAbove = checkBlockAtPosition2(chunkX, chunkY - 32, "hill1");
    const hasBelow = checkBlockAtPosition2(chunkX, chunkY + 32, "hill1");
if (hasAbove) {
  connection = "u"
}
if (hasBelow) {
  connection = "d"; 
}
     return connection;
  } else   if(typeZ==1){
    let connection = "none";
    const hasLeft = checkBlockAtPosition2(chunkX - 32, chunkY, "fence");
    const hasRight = checkBlockAtPosition2(chunkX + 32, chunkY, "fence");
    const hasAbove = checkBlockAtPosition2(chunkX, chunkY - 32, "fence");
    const hasBelow = checkBlockAtPosition2(chunkX, chunkY + 32, "fence");
if (hasBelow) {
  connection = "ud"; 
}
    if (hasLeft && hasRight) {
        connection = "lr";
    } else if (hasLeft) {
        if (!checkBlockAtPosition2(chunkX , chunkY+32, "fence")) {
            connection = "l"; 
        } else {
            connection = "ld"; 
        }
    } else if (hasRight) {
        if (!checkBlockAtPosition2(chunkX , chunkY+32, "fence")) {
            connection = "r"; 
        } else {
            connection = "rd"; 
        }
    }if (hasAbove && hasBelow) {
        connection = connection === "none" ? "ud" : connection; 
    } else if (hasAbove) {
        connection = connection === "none" ? "u" : connection; 
    } else if (hasBelow) {
        connection = connection === "none" ? "d" : connection; 
    }if (hasAbove) {
        if (hasLeft && !checkBlockAtPosition2(chunkX - 32, chunkY - 32, "fence")) {
            connection =  "ul" ; 
        }
        if (hasRight && !checkBlockAtPosition2(chunkX + 32, chunkY - 32, "fence")) {
            connection = "ur"; 
        }
    }if (hasAbove && hasBelow) { connection = "ud" ; } return connection;
  } else if (typeZ == 2) {
    let connection = "none";
    const hasLeft = checkBlockAtPosition2(chunkX - 32, chunkY, "grass2");
    const hasRight = checkBlockAtPosition2(chunkX + 32, chunkY, "grass2");
    const hasAbove = checkBlockAtPosition2(chunkX, chunkY - 32, "grass2");
    const hasBelow = checkBlockAtPosition2(chunkX, chunkY + 32, "grass2");
 if ((hasLeft || hasRight || hasAbove || hasBelow)) {
  connection = "full"; 
} if (hasLeft && hasRight && hasAbove && hasBelow) {
      connection = "full"; 
    } else if ((hasAbove && hasBelow) && hasLeft) {
      connection = "udl"; 
    } else if ((hasAbove && hasBelow) && hasRight) {
      connection = "udr"; 
    } else if ((hasLeft && hasRight) && hasAbove) {
      connection = "rlu"; 
    } else if ((hasLeft && hasRight) && hasBelow) {
      connection = "rld"; 
    } else if (hasAbove && hasLeft) {
      connection = "ul"; 
    } else if (hasAbove && hasRight) {
      connection = "ur"; 
    } else if (hasRight && hasBelow) {
      connection = "rd"; 
    } else if (hasLeft && hasBelow) {
      connection = "ld"; 
    }
    return connection;
  }else if (typeZ == 5) {
let connection = "none";
function retblock(x,y){
return checkBlockAtPosition2(chunkX + (x*32), chunkY + (y*32), "hill1")||checkBlockAtPosition2(chunkX + (x*32), chunkY + (y*32), "climbhill")
||checkBlockAtPosition2(chunkX + (x*32), chunkY + (y*32), "hill2")||checkBlockAtPosition2(chunkX + (x*32), chunkY + (y*32), "hill3")
}
const hasLeft = retblock(-1,0) 
const hasRight = retblock(1,0) 
const hasAbove = retblock(0,-1) 
const hasBelow = retblock(0,1) ;
 const hasCUR = retblock(1,1) 
 const hasCDR = retblock(1,-1) 
 const hasCUL = retblock(-1,0) 
 const hasCDL = retblock(-1,-1) 
 if (!(hasLeft && hasRight && hasAbove && hasBelow)) {
 connection = "none"; 
}
 if ((hasLeft || hasRight || hasAbove || hasBelow)) {
 connection = "none"; 
 } 
 if (hasBelow && !hasAbove && ( hasLeft || hasRight )) {
 connection = "u";
}
if ((hasAbove && !hasBelow && ( hasLeft || hasRight ))) {
 connection = "d";
}
if ( hasLeft && (hasAbove && hasBelow) ) {
 connection = "r"; 
}if ( hasRight && (hasAbove && hasBelow)) {
 connection = "l"; 
}
if (hasBelow && hasLeft && !hasAbove) {
 connection = "ur"; 
 } if (hasBelow && hasRight && !hasAbove) {
 connection = "ul"; 
}
 if (hasBelow && !hasAbove && hasLeft && hasRight) {
  connection = "u";
 }
if ((hasAbove && !hasBelow && hasLeft)) {
 connection = "dr";
}
if ((hasAbove && !hasBelow && hasRight)) {
 connection = "dl";
}
if ((hasAbove && !hasBelow && hasLeft && hasRight )) {
 connection = "d";
}
if (hasLeft && hasRight && hasAbove && hasBelow) {
 connection = "full"; 
 if ((hasAbove && hasBelow && hasLeft && !hasCDR)) {
 connection = "Cur";
}
if ((hasAbove && hasBelow && hasRight && !hasCDL)) {
 connection = "Cul";
}
if ((hasAbove && hasBelow && hasRight && !hasCUL)) {
 connection = "Cdl";
}
if ((hasAbove && hasBelow && hasLeft && !hasCUR)) {
 connection = "Cdr";
}
 if ((hasAbove && hasBelow && hasLeft && !hasCDR && !hasCUL)) {
  connection = "Curdl";
 }
  if ((hasAbove && hasBelow && hasLeft && !hasCDL && !hasCUR)) {
  connection = "Culdr";
 }
}
 return connection;
 }else if (typeZ == 3) {
    let connection = "none";
    const offsets = [
        { x: 0, y: -32, conn: "u1" , conn2:"u2" }, 
        { x: 0, y: 32, conn: "d1" , conn2:"d2" },  
        { x: 32, y: 0, conn: "r1" , conn2:"r2" },  
        { x: -32, y: 0, conn: "l1" , conn2:"l2" }   
    ];
    const blockTypes = ["sand", "grass", "forestgrass", "grasslayer","curedgrasslayer","swampgrass","Hstone","Hstonelay","forestgrasslayer","Hstonelay","desertsand","swampgrasslay","canyonsand","canyonsandlayer"];
    for (const offset of offsets) {
        const { x, y, conn , conn2 } = offset;
        const hasBlock = blockTypes.some(type => checkBlockAtPosition2(chunkX + x, chunkY + y, type)&&! checkBlockAtPosition2(chunkX + x, chunkY + y, "water1"));
        if (hasBlock) {
            connection = conn;
            if (watertickcount > 20) {
              connection = conn2;
            }
            break; 
        }
    }
    return connection;
}
else{
    let connection = "none";
    const hasLeft = checkBlockAtPosition2(chunkX - 32, chunkY, "road");
    const hasRight = checkBlockAtPosition2(chunkX + 32, chunkY, "road");
    const hasAbove = checkBlockAtPosition2(chunkX, chunkY - 32, "road");
    const hasBelow = checkBlockAtPosition2(chunkX, chunkY + 32, "road");
if (hasBelow) {
  connection = "ud"; 
}
if (hasAbove && hasBelow) {
  connection = connection === "none" ? "ud" : connection; 
} else if (hasBelow) {
  connection = "d"; 
} else if (hasAbove) {
  connection = "u"; 
}
    if (hasLeft && hasRight) {
        connection = "lr";
    } else if (hasLeft) {
        if (!checkBlockAtPosition2(chunkX , chunkY+32, "road")) {
            connection = "l"; 
        } else {
            connection = "ld"; 
        }
    } else if (hasRight) {
        if (!checkBlockAtPosition2(chunkX , chunkY+32, "road")) {
            connection = "r"; 
        } else {
            connection = "rd"; 
        }
    } if (hasAbove) {
        if (hasLeft && !checkBlockAtPosition2(chunkX - 32, chunkY - 32, "road")) {
            connection =  "ul" ; 
        }
        if (hasRight && !checkBlockAtPosition2(chunkX + 32, chunkY - 32, "road")) {
            connection = "ur"; 
        }
    }if (hasAbove && hasBelow) { connection = "ud" ; }
if (hasLeft && hasAbove && hasRight) {
  connection = "lur"; 
}
if (hasLeft && hasBelow && hasRight) {
  connection = "ldr"; 
}
if (hasLeft && hasAbove && hasBelow && hasRight) {
  connection = "full"; 
}return connection;
  }
}
let textarr=[]
function removeDotSlash(text) {
  return text.replace(/^\.\/(.*)$/, '$1');
}
const cachedTextures = {};
function getCachedImage(textureData) {
	if (cachedTextures[textureData]) return cachedTextures[textureData];
	const img = new Image();
	img.src = textureData;
	cachedTextures[textureData] = img;
	return img;
}
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64TwoChars(num) {
  const first = Math.floor(num / 64);
  const second = num % 64;
  return BASE64_CHARS[first] + BASE64_CHARS[second];
}
function assignBlockVariant(block) {
  if (block.v !== undefined) return ;
  const randomNum = Math.floor(Math.random() * 4096); 
  block.v = toBase64TwoChars(randomNum);
  return block;
}
function drawChunks() {
 textarr=[]
    let startX = Math.floor(offsetX / blockSize)  ;
    let startY = Math.floor(offsetY / blockSize)  ;
    if( zoomedDELTA >0 ){
     startX = Math.floor(offsetX / blockSize)-1  ;
     startY = Math.floor(offsetY / blockSize)-1  ;
    }
   if (zoomedDELTA > 80) {
    startX = Math.floor(offsetX / blockSize) - 2;
    startY = Math.floor(offsetY / blockSize) - 1;
  }
    const endX = startX + Math.ceil(canvas.width / blockSize / 1) + 1;
    const endY = startY + Math.ceil(canvas.height / blockSize / 1) + 3;
    let treesBelowPlayer = [];
    let treesAbovePlayer = [];
    renderedBlocks = []; 
    chunkPositions = []; 
    for (let chunkX = startX; chunkX < endX; chunkX++) {
        for (let chunkY = startY; chunkY < endY; chunkY++) {
            generateChunk(chunkX, chunkY);
            const chunkKey = `${chunkX},${chunkY}`;
            const blocks = chunks[chunkKey];
let addgap = 0.2;
let rmxy = 0
if (zoomedDELTA > 0) {
  addgap = 0.5;
  rmxy = 1
} else {}
            const chunkPosition = {
                x: ( chunkX * blockSize - offsetX +zoomedDELTA/2-rmxy) ,
                y: (chunkY * blockSize - offsetY+zoomedDELTA/2-rmxy) ,
                width: blockSize,
                height: blockSize
            };
            chunkPositions.push(chunkPosition);
let blo = 0;
function drawplayerreflection(){
  if (player.texture && !player.currentAnimation.startsWith('inwater')) {
  if (!(checkIfItems("broom", 1) && isflying == 1)) {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.1;
    ctx.drawImage(player.texture, -player.width / 2, 0, player.width, player.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }else{
ctx.save();
ctx.translate(player.x + player.width / 2, player.y + player.height * 2);
ctx.scale(1, -1);
ctx.globalAlpha = 0.05;
ctx.drawImage(player.texture, -player.width / 2, -3, player.width, player.height);
ctx.globalAlpha = 1;
ctx.restore();
  }
}else if (player.texture) {
  if (!(checkIfItems("broom", 1) && isflying == 1)) {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.1;
    ctx.drawImage(player.texture, -player.width / 2, 6, player.width, player.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }else{
ctx.save();
ctx.translate(player.x + player.width / 2, player.y + player.height * 2);
ctx.scale(1, -1);
ctx.globalAlpha = 0.05;
ctx.drawImage(player.texture, -player.width / 2, -3, player.width, player.height);
ctx.globalAlpha = 1;
ctx.restore();
  }
}
}
var cloudsoff=4; let starsoff=12;
let StarAlpha=Math.max(0, Math.min(0.98, 0.0 + (nightpower - 2) * 6 ));
            blocks.forEach((block, index) => {
const x = parseVar( block.x + chunkX * blockSize - offsetX +zoomedDELTA/2-rmxy , 1) ;
const y = parseVar(block.y + chunkY * blockSize - offsetY +zoomedDELTA/2-rmxy ,1);
renderedBlocks.push({ type: block.type, x: block.x + chunkX * blockSize - offsetX +zoomedDELTA/2-rmxy , y: block.y + chunkY * blockSize - offsetY +zoomedDELTA/2-rmxy  }); 
let x32 = block.x + chunkX * blockSize - Math.floor(offsetX)
let y32 = block.y + chunkY * blockSize - Math.floor(offsetY)
let textureData = false; 
assignBlockVariant(block);
if(connections[block.type]){
 textureData = getTextureFromConnections(block.type, x32, y32);
}
if(block.type === "canvas"){
    if(textures["canvas"] && textures["canvas"].complete && textures["canvas"].naturalWidth > 0){
        let tempCanvas = document.createElement("canvas");
        tempCanvas.width = textures["canvas"].naturalWidth;
        tempCanvas.height = textures["canvas"].naturalHeight;
        let tctx = tempCanvas.getContext("2d");
        tctx.drawImage(textures["canvas"], 0, 0);
        if(block.draw){
            for(let i=0;i<10;i++){
                for(let j=0;j<10;j++){
                    let color = block.draw[i][j] || "#fff";
                    tctx.fillStyle = color;
                    tctx.fillRect(3+i, 2+j, 1, 1);
                }
            }
        }
        ctx.drawImage(tempCanvas, x, y, blockSize + addgap, blockSize + addgap);
    }
}else if (block.type === "cdb") {
	if (textures["cdb"] && textures["cdb"].complete && textures["cdb"].naturalWidth > 0) {
		let tempCanvas = document.createElement("canvas");
		tempCanvas.width = textures["cdb"].naturalWidth;
		tempCanvas.height = textures["cdb"].naturalHeight;
		let tctx = tempCanvas.getContext("2d");
		if (block.draw) {
			for (let i = 0; i < 16; i++) {
				for (let j = 0; j < 16; j++) {
					let color = block.draw[i][j] || "#c9c9c9";
					if (color.toLowerCase() === "#c9c9c9") continue; 
					tctx.fillStyle = color;
					tctx.fillRect( i, j, 1, 1);
				}
			}
		}
		ctx.drawImage(tempCanvas, x, y, blockSize + addgap, blockSize + addgap);
	}
}else if (block.type === "cdba") {
}
else if (textureData) {
	const img = getCachedImage(textureData);
	if (img.complete && img.naturalWidth > 0) {
		ctx.drawImage(img, x32, y32, blockSize, blockSize);
	}else{
		ctx.drawImage(textures["nullblock"], x32, y32, blockSize, blockSize);
	}
}  
else if (blockVariants[block.type] && blockVariants[block.type].length) {
	const vNum = BASE64_CHARS.indexOf(block.v[0]) * 64 + BASE64_CHARS.indexOf(block.v[1]);
	const variants = blockVariants[block.type];
	let cumulativeChance = 0;
	let selectedVariant = null;
	for (const variant of variants) {
		const chance = parseFloat(variant.chance) || 0;
		cumulativeChance += chance;
		if ((vNum / 4096 * 100) <= cumulativeChance) { 
			selectedVariant = variant;
			break;
		}
	}
	let img = null;
	if (selectedVariant && selectedVariant.t) {
		img = getCachedImage(selectedVariant.t);
	} else {
		img = textures[block.type]; 
	}
	if (img && img.complete && img.naturalWidth > 0) {
		ctx.drawImage(img, x32, y32, blockSize, blockSize);
	}else {
	ctx.drawImage(textures["nullblock"], x32, y32, blockSize, blockSize);
}
} else if ( (block.type == 'grass'||block.type == 'grassfloor2'|| block.type == 'grass3'|| block.type == 'tallgrass'|| block.type == 'grasslayer'|| block.type == 'forestgrass' || block.type == 'forestgrasslayer' ) && seed.startsWith("badseed") ) {
  if (textures["darkgrass"] && textures["darkgrass"].complete && textures["darkgrass"].naturalWidth > 0) {
    ctx.drawImage(textures["darkgrass"], x, y, blockSize + addgap, blockSize + addgap);
  }
}else if ((block.type == 'sand' || block.type == 'desertsand') && seed.startsWith("badseed")) {
  if (textures["darksand"] && textures["darksand"].complete && textures["darksand"].naturalWidth > 0) {
    ctx.drawImage(textures["darksand"], x, y, blockSize + addgap, blockSize + addgap);
  }
}else if ((block.type == 'snowgrass2' || block.type == 'snowgrass') && seed.startsWith("badseed")) {
  if (textures["bloodsnow"] && textures["bloodsnow"].complete && textures["bloodsnow"].naturalWidth > 0) { 
    ctx.drawImage(textures["bloodsnow"], x, y, blockSize + addgap, blockSize + addgap);
  }
}else if ((block.type == 'magnetite') && seed.startsWith("badseed")) {
  if (textures["darkmagnetite"] && textures["darkmagnetite"].complete && textures["darkmagnetite"].naturalWidth > 0) {
    ctx.drawImage(textures["darkmagnetite"], x, y, blockSize + addgap, blockSize + addgap);
  }
}else if ((block.type == 'waterentrance') && seed.startsWith("badseed")) {
  if (textures["bloodentrance"] && textures["bloodentrance"].complete && textures["bloodentrance"].naturalWidth > 0) {
    ctx.drawImage(textures["bloodentrance"], x, y, blockSize + addgap, blockSize + addgap);
    if (options.showleafes == 1) {
      const reflectionTexture2 = watertextures2["starsinthesky"];
      const reflectionTexture = watertextures2["reflection"];
      const offsetTXT = zoomedDELTA;
      const offsetTYT = zoomedDELTA;
      const patternSize = 32 * 6;
      const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
      const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
      ctx.save();
      ctx.beginPath();
      const bx = block.x + chunkX * blockSize - offsetX;
      const by = block.y + chunkY * blockSize - offsetY;
      ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
      ctx.clip();
      if (reflectionTexture && reflectionTexture.complete) {
        for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
          for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
            ctx.globalAlpha = 0.2;
            ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
          }
        }
        ctx.globalAlpha = 1;
      }
const patternSize2 = 32 * 9;
const phaseX2 = ((tickit2 - offsetX / cloudsoff) % patternSize2) + offsetTXT;
const phaseY2 = ((-offsetY / cloudsoff) % patternSize2) + offsetTYT;
const bx1 = block.x + chunkX * blockSize - offsetX;
const by1 = block.y + chunkY * blockSize - offsetY;
ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
ctx.clip();
if (reflectionTexture2 && reflectionTexture2.complete) {
  for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
    for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
      ctx.globalAlpha = 0.2;
      ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
    }
  }
  ctx.globalAlpha = 1;
}
      if (nightpower > 1.8) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
drawplayerreflection()
ctx.restore();
    }
  }
}else if ((block.type == 'waterentrance')){
  if (textures["waterentrance"] && textures["waterentrance"].complete && textures["waterentrance"].naturalWidth > 0) {
    ctx.drawImage(textures["waterentrance"], x, y, blockSize + addgap, blockSize + addgap);
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
drawplayerreflection()
ctx.restore();
}
  }
}else if( (block.type == 'water'||block.type == 'water1') && seed.startsWith("badseed")){
                  if (animatedTextures["bloodliquid"]) {
                  const anim = animatedTextures["bloodliquid"];
                  const currentTime = performance.now() / 1000; 
                  if (currentTime - anim.lastFrameTime > anim.speed) {
                    anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
                    anim.lastFrameTime = currentTime;
                  }
                  if (anim.frames[anim.currentFrame] && anim.frames[anim.currentFrame].complete && anim.frames[anim.currentFrame].naturalWidth > 0) {
                    ctx.drawImage(anim.frames[anim.currentFrame], x, y, blockSize + addgap, blockSize + addgap);
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if(generateCave!==1 && ( storelastdimension=="inether" && generateCaveForEther!== 1 )){
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.2;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
}
drawplayerreflection()
ctx.restore();
}
                  }
                }  
}else if(block.type !== 'fence'&& block.type !== 'cdba'&&block.type !== 'road' && block.type !== 'grass2' && block.type !== 'coast'&& block.type !== 'water'&& block.type !== 'water1' && block.type !== "hill1"&& block.type !== "hill2"&& block.type !== "hill3"&& block.type !== "climbhill" ){
                if (animatedTextures[block.type]) {
                    const anim = animatedTextures[block.type];
                    const currentTime = performance.now() / 1000; 
                    if (currentTime - anim.lastFrameTime > anim.speed) {
                        anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
                        anim.lastFrameTime = currentTime;
                    }
                    if (anim.frames[anim.currentFrame] && anim.frames[anim.currentFrame].complete && anim.frames[anim.currentFrame].naturalWidth > 0) {
                        ctx.drawImage(anim.frames[anim.currentFrame], x, y, blockSize+addgap, blockSize+addgap);
                    }
if (block.type == "etherwater") {
	if (options.showleafes == 1) {
		const reflectionTexture = watertextures2["reflection"];
		const offsetTXT = zoomedDELTA;
		const offsetTYT = zoomedDELTA;
		const patternSize = 32 * 6;
		const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
		const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
		ctx.save();
		ctx.beginPath();
		const bx = block.x + chunkX * blockSize - offsetX;
		const by = block.y + chunkY * blockSize - offsetY;
		ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
		ctx.clip();
		if (generateCave!==1 && ( storelastdimension=="inether" && generateCaveForEther!== 1 ) ) {
			if (reflectionTexture && reflectionTexture.complete) {
				for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
					for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
						ctx.globalAlpha = 0.4;
						ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
					}
				}
				ctx.globalAlpha = 1;
			}
			if (nightpower > 1.8) {
				const patternSize2 = 32 * 9;
				const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
				const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
				const bx1 = block.x + chunkX * blockSize - offsetX;
				const by1 = block.y + chunkY * blockSize - offsetY;
				ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
				ctx.clip();
				const reflectionTexture2 = watertextures2["starsinthesky"];
				if (reflectionTexture2 && reflectionTexture2.complete) {
					for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
						for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
							ctx.globalAlpha = StarAlpha
							ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
						}
					}
					ctx.globalAlpha = 1;
				}
			}
		}
		drawplayerreflection()
		ctx.restore();
	}
}
if(block.type=="shallowwater" || block.type=="swampwater"){
  if (options.showleafes == 1 ) { 
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if(generateCave!==1 && (( generateCaveForEther!== 1 )) ){
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
}
drawplayerreflection()
ctx.restore();
}
}
                } else {
if (textures[block.type] && textures[block.type].complete && textures[block.type].naturalWidth > 0) {
    if (inether && (block.type === "sticks" ||block.type === "stick"||block.type === "treebark" ||block.type === "sapling" ||block.type === "black_elderberry_tree"||block.type === "black_elderberry" ||block.type === "black_elderberry2"||block.type === "empty_black_elderberry" ||block.type === "empty_black_elderberry2"|| block.type === "longstick")) {
        ctx.save()
        ctx.filter = "hue-rotate(130deg)"
        ctx.drawImage(textures[block.type], x, y, blockSize + addgap, blockSize + addgap)
        ctx.restore()
    } else if (inether && (block.type === "customcaveentrance")) {
	ctx.save()
	ctx.filter = "hue-rotate(50deg)"
	ctx.drawImage(textures[block.type], x, y, blockSize + addgap, blockSize + addgap)
	ctx.restore()
} else {
	if(textures[block.type]){
ctx.drawImage(textures[block.type], x, y, blockSize + addgap, blockSize + addgap)
}else {
	ctx.drawImage(textures["nullblock"], x32, y32, blockSize, blockSize);
}
    }
}
                }
}else if ( block.type == 'coast' ) {
  const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 3);
const texture = watertextures[connection];
if (texture && texture.complete && texture.naturalWidth > 0) {
  ctx.drawImage(texture, x, y, blockSize+addgap, blockSize+addgap);
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.2;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
drawplayerreflection()
if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}ctx.restore();
}
  return;
}
  if (animatedTextures[block.type] && connection=="none") {
    const anim = animatedTextures[block.type];
    const currentTime = performance.now() / 1000; 
    if (currentTime - anim.lastFrameTime > anim.speed) {
      anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length; anim.lastFrameTime = currentTime;}
    if (anim.frames[anim.currentFrame] && anim.frames[anim.currentFrame].complete && anim.frames[anim.currentFrame].naturalWidth > 0) {
      ctx.drawImage(anim.frames[anim.currentFrame], x, y, blockSize+addgap, blockSize+addgap);
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.2 ;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
drawplayerreflection()
ctx.restore();
}
    }else {
	ctx.drawImage(textures["nullblock"], x32, y32, blockSize, blockSize);
}  } else  {
    if (textures[block.type] && textures[block.type].complete && textures[block.type].naturalWidth > 0) { ctx.drawImage(textures[block.type], x, y, blockSize+addgap, blockSize+addgap);
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff ) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY /   cloudsoff ) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.2;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
drawplayerreflection()
ctx.restore();
}
    } }
}else if ( block.type == 'water'||block.type == 'water1'  ) { 
  const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 3);
const texture = watertextures2[connection];
if (texture && texture.complete && texture.naturalWidth > 0) {
  ctx.drawImage(texture, x, y, blockSize+addgap, blockSize+addgap);
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff ) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff ) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if(generateCave!==1 && ( generateCaveForEther!== 1 )){
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.2;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
if (nightpower > 1.8 ) {
  const patternSize2 = 32 * 9;
  const phaseX2 = ((tickit2 / 10 - offsetX / starsoff) % patternSize2) + offsetTXT;
  const phaseY2 = ((-offsetY / starsoff ) % patternSize2) + offsetTYT;
  const bx1 = block.x + chunkX * blockSize - offsetX;
  const by1 = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  const reflectionTexture2 = watertextures2["starsinthesky"];
  if (reflectionTexture2 && reflectionTexture2.complete) {
    for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
      for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
        ctx.globalAlpha = StarAlpha
        ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
}
}
drawplayerreflection()
ctx.restore();
}
  return;
}
  if (animatedTextures[block.type] && connection=="none") {
    const anim = animatedTextures[block.type];
    const currentTime = performance.now() / 1000; 
    if (currentTime - anim.lastFrameTime > anim.speed) {
      anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length; anim.lastFrameTime = currentTime;}
    if (anim.frames[anim.currentFrame] && anim.frames[anim.currentFrame].complete && anim.frames[anim.currentFrame].naturalWidth > 0) {
      ctx.drawImage(anim.frames[anim.currentFrame], x, y, blockSize+addgap, blockSize+addgap); }  } else  {
    if (textures[block.type] && textures[block.type].complete && textures[block.type].naturalWidth > 0) { ctx.drawImage(textures[block.type], x, y, blockSize+addgap, blockSize+addgap); }else {
	ctx.drawImage(textures["nullblock"], x32, y32, blockSize, blockSize);
} } 
if (options.showleafes == 1) {
  const reflectionTexture = watertextures2["reflection"];
  const offsetTXT = zoomedDELTA;
  const offsetTYT = zoomedDELTA;
  const patternSize = 32 * 6;
  const phaseX = ((tickit2 - offsetX / cloudsoff ) % patternSize) + offsetTXT;
  const phaseY = ((-offsetY / cloudsoff ) % patternSize) + offsetTYT;
  ctx.save();
  ctx.beginPath();
  const bx = block.x + chunkX * blockSize - offsetX;
  const by = block.y + chunkY * blockSize - offsetY;
  ctx.rect(Math.floor(bx + zoomedDELTA / 2), Math.floor(by + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
  ctx.clip();
  if(generateCave!==1 && (( generateCaveForEther!== 1 )) ){
  if (reflectionTexture && reflectionTexture.complete) {
    for (let x = -patternSize + phaseX; x < canvas.width; x += patternSize) {
      for (let y = -patternSize + phaseY; y < canvas.height; y += patternSize) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(reflectionTexture, x, y, patternSize, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
if(nightpower>1.8 ){
const patternSize2 = 32 * 9;
const phaseX2 = ((tickit2/10 - offsetX / starsoff) % patternSize2) + offsetTXT;
const phaseY2 = ((-offsetY / starsoff ) % patternSize2) + offsetTYT;
const bx1 = block.x + chunkX * blockSize - offsetX;
const by1 = block.y + chunkY * blockSize - offsetY;
ctx.rect(Math.floor(bx1 + zoomedDELTA / 2), Math.floor(by1 + zoomedDELTA / 2), Math.floor(blockSize + zoomedDELTA), Math.floor(blockSize + zoomedDELTA));
ctx.clip();
const reflectionTexture2 = watertextures2["starsinthesky"]; 
if (reflectionTexture2 && reflectionTexture2.complete) {
  for (let x = -patternSize2 + phaseX2; x < canvas.width; x += patternSize2) {
    for (let y = -patternSize2 + phaseY2; y < canvas.height; y += patternSize2) {
      ctx.globalAlpha = StarAlpha
      ctx.drawImage(reflectionTexture2, x, y, patternSize, patternSize);
    }
  }
  ctx.globalAlpha = 1;
}
}
}
drawplayerreflection()
ctx.restore();
} 
} else if (block.type === 'fence') {
 if (block.type === 'fence') {
  const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
  const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
  const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 1);
  const texture = fencetextures[connection];
  if (texture && texture.complete && texture.naturalWidth > 0) {
   ctx.drawImage(texture, x, y, blockSize+addgap, blockSize+addgap);
   return;
  }
 }
}else if (block.type === 'climbhill') {
 if (block.type === 'climbhill') {
  const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
  const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
  const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), -1);
  const texture = climbhill1textures[connection];
  if (texture && texture.complete && texture.naturalWidth > 0) {
   ctx.drawImage(texture, x, y, blockSize+addgap, blockSize+addgap);
   return;
  }
 }
}else if (block.type === 'grass2') {
 if (block.type === 'grass2') {
  const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
  const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
  const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 2);
  const texture = grasstextures[connection];
  if (texture && texture.complete && texture.naturalWidth > 0) {
   ctx.drawImage(texture, x, y, blockSize+addgap, blockSize+addgap);
   return;
  }
 }
}else if (block.type === 'hill1') {
	if (block.type === 'hill1') {
		const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
		const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
		const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 5);
		const texture = hill1textures[connection];
		if (texture && texture.complete && texture.naturalWidth > 0) {
			ctx.drawImage(texture, x, y, blockSize + addgap, blockSize + addgap);
			return;
		}
	}
}else if (block.type === 'hill2') {
	if (block.type === 'hill2') {
		const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
		const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
		const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 5);
		const texture = hill2textures[connection];
		if (texture && texture.complete && texture.naturalWidth > 0) {
			ctx.drawImage(texture, x, y, blockSize + addgap, blockSize + addgap);
			return;
		}
	}
}else if (block.type === 'hill3') {
	if (block.type === 'hill3') {
		const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
		const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
		const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 5);
		const texture = hill3textures[connection];
		if (texture && texture.complete && texture.naturalWidth > 0) {
			ctx.drawImage(texture, x, y, blockSize + addgap, blockSize + addgap);
			return;
		}
	}
}else if (block.type === 'road') {
  if (block.type === 'road') {
    const x2 = block.x + chunkX * blockSize - Math.floor(offsetX)
    const y2 = block.y + chunkY * blockSize - Math.floor(offsetY)
    const connection = getFenceConnection(Math.floor(x2), Math.floor(y2), 0);
    const texture = roadtextures[connection];
    if (texture && texture.complete && texture.naturalWidth > 0) {
      ctx.drawImage(texture, x, y, blockSize+addgap, blockSize+addgap);
      return;
    }
  }
}
                if (block.text) {
                    textarr.push({text:block.text,dx:x,dy:y});
                }else if (blocks.length > 3 && index === blocks.length - 1 && !dontcount.includes(block.type) && options.hideBlocksnumber!==1) {
                    ctx.font = '13px pffont';
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.letterSpacing = "1px"; 
                    ctx.fillText(`x${blocks.length - 2}`, x + blockSize / 2, y - 5);
                }
                if ( block.type === 'houseinside' ) {
                }
                if (block.type === 'tree1'|| block.type === 'tree2'|| block.type === 'ethertree2' || block.type === 'ethertree3' || block.type === 'voidblock'|| block.type === 'birch1' || block.type === 'birch2' || block.type === 'yew1' || block.type === 'pine1' || block.type === 'pine2'|| block.type === 'black_elderberry2'|| block.type === 'empty_black_elderberry2'|| block.type === 'houseroof'||block.type === 'ryeroof'||block.type === 'snowpine2'||block.type === 'snowpine3'||block.type === 'lamp2'||block.type === 'statue1_2'||block.type === 'statue2_2'||block.type === 'algae0'||block.type === 'algae2' ||block.type === 'helltree1'||block.type === 'helltree2'||block.type === 'abysstree1'||block.type === 'abysstree2'||block.type === 'gypsumroof'||block.type === 'palm2'||block.type === 'coconutpalm'||block.type === 'palm3'||block.type === 'palm32' ||block.type=="cdba") {
                    treesAbovePlayer.push({ type: block.type, x: x, y: y,draw: block.draw });
                }
            });
        }
    }
ctx.translate(0,0);
function updateWaveEffect() {
  if (options.fancygraphic !== 0 && isunderwater === 1) {
    if(oned==0){
      oned=1
    ctx.save()
    }
    waveTick++;
    const time = waveTick / 15; 
    const waveOffset =( Math.sin(time) / 6);
    ctx.translate(0, waveOffset);
  } else {
    if(oned==1){
      ctx.restore()
      oned=0
    }
  }
}
updateWaveEffect()
    return { treesBelowPlayer, treesAbovePlayer };
}
var oned=0
let targetX = offsetX; 
let targetY = offsetY; 
let smoothingFactor = 0.50; 
function parseVar(value, bynum) {
  return Math.round(value / bynum) * bynum;
}
let targetFPS = 18; 
let frameDuration = 1000 / targetFPS; 
const enemyTextures = {};
const textureDefinitions = {
	'ethoper1': './ethoper1.png',
	'ethoper2': './ethoper2.png',
    'bat': './bat.png',
    'bat1': './bat1.png',
    'shark': './shark.png',
    'shark1': './shark1.png',
    'wasp': './wasp.png',
    'wasp1': './wasp1.png',
    'voidguardian1': './voidguardian1.png',
    'voidguardian2': './voidguardian2.png',
    'bunn-left': './bunn-left.png',
    'bunn-right': './bunn-right.png',
    'bunn-up': './bunn-up.png',
    'bunn-down': './bunn-down.png',
    'raven-down': './raven1down.png',
    'raven-down2': './raven2down.png',
    'raven-up': './raven1up.png',
    'raven-up2': './raven2up.png',
    'raven-left': './raven1left.png',
    'raven-left2': './raven2left.png',
    'raven-right': './raven1right.png',
    'raven-right2': './raven2right.png',
    'voltary': './voltary1.png',
    'voltary2': './voltary2.png',
    'voltary3': './voltary3.png',
    'firefly1': './firefly1.png',
    'firefly2': './firefly2.png',
    'aquagod1': './aquagod1.png',
    'aquagod2': './aquagod2.png',
    'aquagod3': './aquagod3.png',
    'insaneuniversegod1': './insaneuniversegod1.png',
    'insaneuniversegod2': './insaneuniversegod2.png',
    'deepgodhead': './deepgod.png',
    'deepgodtorso': './deepgodtorso.png',
    '2medusa1': './2medusa1.png',
    '2medusa2': './2medusa2.png',
    '2medusa3': './2medusa3.png',
    'skull': './skull1.png',
    'skull1': './skull2.png',
    'spikegod': './spikegod1.png',
    'spikegod1': './spikegod2.png',
    'giantbat': './gigabat1.png',
    'giantbat1': './gigabat2.png',
    '1medusa1': './1medusa1.png',
    '1medusa2': './1medusa2.png',
    'spary': './spary.png',
    'spary2': './spary2.png',
    'darkeye': './darkeye.png',
    'flesh1': './flesh1.png',
    'flesh2': './flesh2.png',
    'flesh3': './flesh3.png',
    'floatingeye1': './floatingeye1.png',
    'floatingeye2': './floatingeye2.png',
    'pinkslime1': './pink1.png',
    'pinkslime2': './pink2.png',
    'pinkslime3': './pink3.png',
    'greenslime1': './green1.png',
    'greenslime2': './green2.png',
    'greenslime3': './green3.png',
    'blueslime1': './blue1.png',
    'blueslime2': './blue2.png',
    'blueslime3': './blue3.png',
    'spiderD1': './spiderD1.png',
    'spiderD2': './spiderD2.png',
    'spiderU1': './spiderU1.png',
    'spiderU2': './spiderU2.png',
    'spiderR1': './spiderR1.png',
    'spiderR2': './spiderR2.png',
    'spiderL1': './spiderL1.png',
    'spiderL2': './spiderL2.png',
    'zombieR1': './zombieR1.png',
    'zombieR2': './zombieR2.png',
    'zombieL1': './zombieL1.png',
    'zombieL2': './zombieL2.png',
    'zombieU1': './zombieU1.png',
    'zombieU2': './zombieU2.png',
    'zombieD1': './zombieD1.png',
    'zombieD2': './zombieD2.png',
    'skellybonesright1': './skellybonesright1.png',
    'skellybonesright2': './skellybonesright2.png',
    'skellybonesleft1': './skellybonesleft1.png',
    'skellybonesleft2': './skellybonesleft2.png',
    'skellybonesup1': './skellybonesup1.png',
    'skellybonesup2': './skellybonesup2.png',
    'skellybonesdown1': './skellybonesdown1.png',
    'skellybonesdown2': './skellybonesdown2.png',
    'abyssdevourerbody': './abyssdevourertorso.png',
    'abyssdevourerhead': './abyssdevourer.png',
    'hellskull1': './hellskull1.png',
    'hellskull2': './hellskull2.png',
    'soulcat1': './soulcat1.png',
    'soulcat2': './soulcat2.png',
    'frozenghost1': './frozenghost1.png',
    'frozenghost2': './frozenghost2.png',
    'desertscourgebody': './desertscourgebody.png',
    'desertscourgehead': './desertscourgehead.png',
   'desertelemental1': './sandelemental1.png',
    'desertelemental2': './sandelemental2.png',
   'flesher1': './flesher1.png',
    'flesher2': './flesher2.png',
       'hellscourgebody': './hellscourgebody.png',
   'hellscourgehead': './hellscourgehead.png',
    'trueuniversehead': './trueuniverse.png', 
    'trueuniversebody': './trueuniversetorso.png',
    "universeblast":"./universeblast.png",
    "aquablast":"./aquablast.png",
    'ghost': './ghost.png',
    'ghost1': './ghost1.png',
"crimsonprojectile":"./crimsonprojectile.png",
    "etherbeam":"./etherbeam.png",
    "magic":"./magic.png",
    "magicsharp":"./magicsharp.png",
    "hyperblast":"./hyperblast.png",
    "greenmagic1": "./greenmagic.png",
    "greenmagic2": "./grennmagic1.png",
    "duckright1": "./duckright1.png",
    "duckright2": "./duckright2.png",
    "duckleft1": "./duckleft1.png",
    "duckleft2": "./duckleft2.png",
    "duckup1": "./duckup1.png",
    "duckup2": "./duckup2.png",
    "duckdown1": "./duckdown1.png",
    "duckdown2": "./duckdown2.png",
"godmagic": "./godmagic.png",
"arrow": "./arrow.png",
"enchantedarrow":"./enchantedarrow.png",
"powerfullarrow": "./powerfullarrow.png",
"goodarrow": "./goodarrow.png",
"hyperarrows": "./hyperarrow.png",
"boomerang":"./boomerang.png",
"good_boomerang":"./good_boomerang.png",
"titanium_boomerang":"./titanium_boomerang.png",
"hell_boomerang":"./hell_boomerang.png",
"draco_boomerang":"./draco_boomerang.png",
    "butterflyyellow1": "./butterflyyellow1.png",
    "butterflyyellow2": "./butterflyyellow2.png",
    "butterflyred1": "./butterflyred1.png",
    "butterflyred2": "./butterflyred2.png",
    "butterflyblue1": "./butterflyblue1.png",
    "butterflyblue2": "./butterflyblue2.png",
    "universebulb": "./universebulb.png",
    "trueprojectile": "./trueprojectile.png",
"dummyvector": "",
    "demonbat1": "./demonbat1.png",
    "demonbat2": "./demonbat2.png",
    "demon1": "./demon1.png",
    "demon2": "./demon2.png",
};
let damageTexts = []
function DummyDamage(enemy, damage) {
	let XADD = (zoomedDELTA / 2)
let YADD = (zoomedDELTA / 2)
	damageTexts.push({
		x: enemy.x+XADD + (Math.random() * 30 - 15),
		y: enemy.y+YADD + (Math.random() * 30 - 10),
		value: -Math.abs(damage) ,
		alpha: 1,
		life: 60,
		damage: damage
	})
}
function updateDamageTexts(ctx, offsetX, offsetY) {
	let savi=null
	for (let i = damageTexts.length - 1; i >= 0; i--) {
		let d = damageTexts[i]
		ctx.globalAlpha = clamp(d.alpha,0,'')
		ctx.fillStyle = getDamageColor( Math.abs(d.damage))
		ctx.font = '15px pffont';
		ctx.letterSpacing = "1px"; 
		ctx.fillText(d.value,(d.x - offsetX)+blockSize/2, d.y - offsetY)
		d.y -= 0.9
		d.alpha -= 0.03
		d.life--
		if (d.alpha <= 0.5) {
			savi=i
  }
	}
	if(savi!==null){
		damageTexts.splice(savi, 1)
	}
	ctx.globalAlpha = 1
}
function getDamageColor(damage) {
	const stops = [
		{ d: 0, c: [255, 255, 255] },
		{ d: 50, c: [255, 255, 0] },
		{ d: 100, c: [255, 165, 0] },
		{ d: 150, c: [255, 0, 0] },
		{ d: 200, c: [0, 100, 255] },
		{ d: 300, c: [180, 0, 255] }
	]
	if (damage <= stops[0].d) return `rgb(${stops[0].c})`
	if (damage >= stops[stops.length - 1].d) return `rgb(${stops[stops.length - 1].c})`
	for (let i = 0; i < stops.length - 1; i++) {
		let a = stops[i],
			b = stops[i + 1]
		if (damage >= a.d && damage <= b.d) {
			let t = (damage - a.d) / (b.d - a.d)
			let r = Math.round(a.c[0] + t * (b.c[0] - a.c[0]))
			let g = Math.round(a.c[1] + t * (b.c[1] - a.c[1]))
			let bCol = Math.round(a.c[2] + t * (b.c[2] - a.c[2]))
			return `rgb(${r},${g},${bCol})`
		}
	}
}
for (const [key, path] of Object.entries(textureDefinitions)) {
    enemyTextures[key] = new Image();
    let src2=removeDotSlash(path)
    enemyTextures[key].src = getBase64Image(src2,assets);
}
let RENDEREDENEMIES2 = [];
let renderedEnemies = []; 
const enemies = {
 "orb": { hp: Infinity, atk: 0 },
 "arrow": { hp: Infinity, atk: 0 },
 "powerfullarrow": { hp: Infinity, atk: 0 },
 "goodarrow": { hp: Infinity, atk: 0 },
 "hyperarrows": { hp: Infinity, atk: 0 },
 "dummyvector": { hp: 99999999, atk: 0 },
  "godmagic": { hp: Infinity, atk: 0 },
  "magic": { hp: Infinity, atk: 0 },
  "universeblast": { hp: Infinity, atk: 0 },
  "aquablast": { hp: Infinity, atk: 0 },
  "greenmagic": { hp: Infinity, atk: 0 },
  "butterflyred": { hp: 1, atk: 0 },
  "butterflyyellow": { hp: 1, atk: 0 },
"butterflyblue": { hp: 1, atk: 0 },
"firefly": { hp: 1, atk: 0 },
  "magicsharp": { hp: Infinity, atk: 0 },
  "hyperblast": { hp: Infinity, atk: 0 },
  "boomerang": { hp: Infinity, atk: 0 },
  "titanium_boomerang": { hp: Infinity, atk: 0 },
  "good_boomerang": { hp: Infinity, atk: 0 },
  "draco_boomerang": { hp: Infinity, atk: 0 },
  "hell_boomerang": { hp: Infinity, atk: 0 },
  "bat": { hp: 5, atk: -1.5 , givexp:0.008},
  "ethoper": { hp: 1000, specialhp: 10, atk: -2.5, givexp:0.03 },
  "ethoper2": { hp: 100, specialhp: 5, atk: -2.5 },
  "ethoper3": { hp: 200, specialhp: 10, atk: -2.5 },
  "giantbat": { hp: 20, atk: -1.5 },
  "shark": { hp: 10, atk: -2 , givexp:0.008},
  "duck": { hp: 7, atk: -1.5},
  "ghost": { hp: 2000, atk: -1.5,givexp:0.05},
  "hellskull": { hp: 300, atk: -1 },
  "hellscourgehead": { hp: 1000, atk: -2 },
  "hellscourgebody": { hp: Infinity, atk: -1.5 },
  "bunny": { hp: 5, atk: 0, givexp:0.005 },
  "greenslime": { hp: 20, atk: -2 ,givexp:0.010},
  "blueslime": { hp: 25, atk: -2 ,givexp:0.010},
  "pinkslime": { hp: 40, atk: -2 ,givexp:0.010},
  "skellybones": { hp: 40, atk: -1.5 ,givexp:0.010},
  "zombie": { hp: 30, atk: -1.5,givexp:0.010 },
  "spider": { hp: 15, atk: -2.5 ,givexp:0.010 },
  "wasp": { hp: 4, atk: -1.2 ,givexp:0.007},
  "raven": { hp: 15, atk: -1.2 },
  "voltary": { hp: 1000, atk: -1.5 ,givexp:0.1 },
  "demon": { hp: 20, atk: -1,givexp:0.01},
  "demonbat": { hp: 25, atk: -1.5,givexp:0.01 },
  "desertscourgehead": { hp: 500, atk: -2, givexp:0.02 },
  "desertscourgebody": { hp: Infinity, atk: -1 },
  "desertelemental": { hp: 300, atk: -2 , givexp:0.02},
"skull": { hp: 50, atk: -1.5 ,givexp:0.005},
"spary": { hp: 200, atk: -1.5,givexp:0.00 },
"spikegod": { hp: 2000, atk: -1.6 },
"darkeye": { hp: 4000, atk: -1.5 ,givexp:0.00 },
"1medusa": { hp: 400, atk: -1.5,givexp:0.001 },
"2medusa": { hp: 5000, atk: -1.5 , givexp:0.2},
"floatingeye": { hp: 400, atk: -1.5 },
"flesh": { hp: 6000, atk: -1.5 , givexp:2 ,givexp:0.04},
"insaneuniversegod": { hp: 10000, atk: -1.0, givexp:2},
"trueuniversehead": { hp: 25000, atk: -2.0 , givexp:3},
"trueuniversebody": { hp: Infinity, atk: -0.2 },
"aquagod": { hp: 3000, atk: -1.0 },
"voidguardian": { hp: 400, atk: -0.2, givexp:0.02 },
"soulcat": { hp: 200, atk: -0.2 },
"frozenghost": { hp: 200, atk: -0.2 },
"abyssdevourerhead": { hp: 700, atk: -2, givexp:0.02 },
"abyssdevourerbody": { hp: Infinity, atk: -2 },
"flesher": { hp: 2000, atk: -2 ,givexp:0.02},
"deepgodtorso": { hp: Infinity, atk: -2 },
"deepgodhead": { hp: 17000, atk: -2 ,givexp:0.3},
"crimsonprojectile": { hp: Infinity, atk: -2 },
"etherbeam": { hp: Infinity, atk: -2 },
"universebulb": { hp: 1000, atk: -1.0 },
"trueprojectile": { hp: Infinity, atk: -2 },
};
function Enemy(x, y, type) {
	let XADD = -(zoomedDELTA / 2)
let YADD = -(zoomedDELTA / 2)
  this.x = x+XADD;
  this.y = y+YADD;
  this.type = type;
  this.width = 32;
  this.height = 32;
  this.speed = 3;
  this.id = getNextAvailableID() ;
  VISIBLEIDS.push(this.id);
  this.animationFrame = 0;
  this.tickCount = 0;
  this.angle=0;
  this.following=null;
  this.givexp=0.001
  this.angleTickCounter=0;
  this.direction = Math.floor(Math.random() * 4);
  this.hpMax = enemies[type].hp;
  this.hp = enemies[type].hp; 
  this.specialhp = enemies[type].specialhp||0; 
  this.specialhpMax = enemies[type].specialhp||0; 
}
function EnemyNOR(x, y, type) {
	this.x = x ;
	this.y = y ;
	this.type = type;
	this.width = 32;
	this.height = 32;
	this.speed = 3;
	this.id = getNextAvailableID();
	VISIBLEIDS.push(this.id);
	this.animationFrame = 0;
	this.tickCount = 0;
	this.angle = 0;
	this.following = null;
	this.angleTickCounter = 0;
	this.direction = Math.floor(Math.random() * 4);
	this.hpMax = enemies[type].hp;
	this.givexp=0.001
	this.hp = enemies[type].hp;
	this.specialhp = enemies[type].specialhp;
this.specialhpMax = enemies[type].specialhp;
}
const collisionRadius = 32; 
const enemyDespawnDistance = 200; 
const enemyDamageDistance = 1; 
const despawnTicks = 100; 
function isCollidingWithEnemies(enemy) {
    return renderedEnemies.some(otherenemy => {
        if (otherenemy !== enemy) {
            const dx = (enemy.x + enemy.width / 2) - (otherenemy.x + otherenemy.width / 2);
            const dy = (enemy.y + enemy.height / 2) - (otherenemy.y + otherenemy.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < collisionRadius; 
        }
        return false; 
    });
}
let ddg=0
let darkeyes=0
let medusa2z=0
let fleshz=0
let universegodz=0
var VISIBLEIDS = [];
var AVAILABLE_IDS = []; 
function getNextAvailableID() {
    if (AVAILABLE_IDS.length > 0) {
        return AVAILABLE_IDS.shift(); 
    } else {
        return VISIBLEIDS.length + 1; 
    }
}
function releaseID(id) {
    if (!AVAILABLE_IDS.includes(id)) {
        AVAILABLE_IDS.push(id);
        AVAILABLE_IDS.sort((a, b) => a - b); 
    }
}
let beforecreatedtrue=0
function createTrueUniverse() {
    var id = getNextAvailableID();
    VISIBLEIDS.push(id);
    var head = new Enemy(offsetX - 64, offsetY - 80, 'trueuniversehead');
    head.id = id;
    beforecreatedtrue=0
    head.angle = 0;
    const wormLength = 30;
    let previousSegment = head;
    try {
        for (let i = 0; i < wormLength; i++) {
            const segment = new Enemy(previousSegment.x, previousSegment.y, 'trueuniversebody');
            segment.id = id; 
            segment.following = previousSegment;
            segment.angle = 0;
            previousSegment = segment;
            renderedEnemies.push(segment);
        }
        renderedEnemies.push(head);
    } catch (e) {
        console.log(e);
    }
}
function createDeepgod() {
  var id = getNextAvailableID();
  VISIBLEIDS.push(id);
  var head = new Enemy(offsetX - 64, offsetY - 80, 'deepgodhead');
  head.id = id;
  head.angle = 0;
  const wormLength = 40;
  let previousSegment = head;
  try {
    for (let i = 0; i < wormLength; i++) {
      const segment = new Enemy(previousSegment.x, previousSegment.y, 'deepgodtorso');
      segment.id = id;
      segment.following = previousSegment;
      segment.angle = 0;
      previousSegment = segment;
      renderedEnemies.push(segment);
    }
    renderedEnemies.push(head);
  } catch (e) {
    console.log(e);
  }
}
function createDesertScourge() {
  var id = getNextAvailableID();
  VISIBLEIDS.push(id);
  var head = new EnemyNOR(offsetX - 64, offsetY - 80, 'desertscourgehead');
  head.id = id;
  head.angle = 0;
  const wormLength = 15;
  let previousSegment = head;
  try {
    for (let i = 0; i < wormLength; i++) {
      const segment = new EnemyNOR(previousSegment.x, previousSegment.y, 'desertscourgebody');
      segment.id = id;
      segment.following = previousSegment;
      segment.angle = 0;
      previousSegment = segment;
      renderedEnemies.push(segment);
    }
    renderedEnemies.push(head);
  } catch (e) {
    console.log(e);
  }
}
function createHellScourge() {
  var id = getNextAvailableID();
  VISIBLEIDS.push(id);
  var head = new EnemyNOR(offsetX - 64, offsetY - 80, 'hellscourgehead');
  head.id = id;
  head.angle = 0;
  const wormLength = 13;
  let previousSegment = head;
  try {
    for (let i = 0; i < wormLength; i++) {
      const segment = new EnemyNOR(previousSegment.x, previousSegment.y, 'hellscourgebody');
      segment.id = id;
      segment.following = previousSegment;
      segment.angle = 0;
      previousSegment = segment;
      renderedEnemies.push(segment);
    }
    renderedEnemies.push(head);
  } catch (e) {
    console.log(e);
  }
}
function removeEntityById(entityId) {
    renderedEnemies = renderedEnemies.filter(enemy => enemy.id !== entityId);
    releaseID(entityId);
}
let delaytt=0
function createAbyssdevourer() {
  setTimeout(function (){
    if(delaytt==0){
      delaytt==1
  function spawnBatNearPlayer() {
    let spawnDistanceh=290
  let batX, batY;
  if (Math.random() >= 0.45) {
    batX = offsetX + spawnDistanceh;
  } else {
    batX = offsetX;
  }
  if (Math.random() >= 0.45) {
    batY = offsetY + spawnDistanceh;  
  } else {
    batY = offsetY; 
  }
let id = getNextAvailableID();
VISIBLEIDS.push(id);
let head = new EnemyNOR(batX , batY, 'abyssdevourerhead');
head.id = id;
head.angle = 0;
const wormLength = 10;
let previousSegment = head;
try {
  for (let i = 0; i < wormLength; i++) {
    const segment = new EnemyNOR(previousSegment.x, previousSegment.y, 'abyssdevourerbody');
    segment.id = id;
    segment.following = previousSegment;
    segment.angle = 0;
    previousSegment = segment;
    renderedEnemies.push(segment);
  }
  renderedEnemies.push(head);
} catch (e) {
  console.log(e);
}
}
spawnBatNearPlayer()
}else{
  setTimeout(function (){delaytt=0; createAbyssdevourer },1000)
}
},1000)
}
var yyte=null
function gfggf(data){
  yyte=data
}
let updfixbug=0
var arrows = {
    "arrow": { dmg: -4.0, speed: 17 },
    "goodarrow": { dmg: -5.0, speed: 17 },
    "powerfullarrow": { dmg: -7.5, speed: 16 },
    "hyperarrows": { dmg: -8.0, speed: 15 },
}
var magicspellsfromentities = {
  "greenmagic": { dmg: -8.0, speed: 5 },
  "boomerang": { dmg: -1.5, speed: 12 },
  "good_boomerang": { dmg: -50, speed: 18 },
  "hell_boomerang": { dmg: -100, speed: 20 },
  "draco_boomerang": { dmg: -300, speed: 15 },
  "titanium_boomerang": { dmg: -16, speed: 15 },
  "magic": { dmg: -15.2, speed: 9 },
  "magicsharp": { dmg: -15.2, speed: 10 },
  "hyperblast": { dmg: -55.0, speed: 13 },
  "godmagic": { dmg: -15000.2, speed: 10 },
};
var boomerangs = {
 "boomerang": {  speed: 0.8},
 "good_boomerang":{speed:1},
 "titanium_boomerang":{speed:1.3},
 "draco_boomerang":{speed:1.4},
 "hell_boomerang":{speed:1.4},
};
var butterflyentities = {
  "butterflyred": {   },
  "butterflyyellow": {   },
  "butterflyblue": {   },
  "firefly":{   },
};
var nodamage={
	"dummyvector":{  },
	"orb": { }
}
var speedmultiply=1.45
var attackedenemy=[] 
function updateHealth3(amount,enemy){
  if (!attackedenemy.includes(enemy)) {
        attackedenemy.push(enemy);
    }
  updateHealth(amount)
}
let orbCollision=0;
let orbDisplay=0;
function updateEnemies() {
  let REMALL=null 
  var updatehp=0;
  let enemytoremove=0;
  orbCollision=0;
  var removebymagic=0;
  if(updfixbug==0){
  darkeyes=0
  medusa2z=0
  fleshz=0
  universegodz=0
  let removedd = 0
  let newEnemies = [];
    renderedEnemies = renderedEnemies.filter(enemy => {
let XADD = -(zoomedDELTA / 2)
let YADD = -(zoomedDELTA / 2)
      const prevX = enemy.x;
const prevY = enemy.y;
const playerCenterX = offsetX + player.x + player.width / 2;
const playerCenterY = offsetY + player.y + player.height / 2;
let fixedspeed = 1.0
const diffX = playerCenterX - 15 - enemy.x+XADD - enemy.width / 2;
const diffY = playerCenterY - 15 - enemy.y+YADD - enemy.height / 2;
const distanceToPlayer = Math.sqrt(diffX * diffX + diffY * diffY);
var fds22 = 25
if (enemy.hp > 10000) {
  fds22 = 24
} if (enemy.hp < 10000) {
  fds22 = 22
}
if (enemy.type in magicspellsfromentities) {
  const spell = magicspellsfromentities[enemy.type];
  enemy.height = 32 - 8;
  enemy.width = 32 - 8;
  enemy.x += Math.cos(enemy.angle) * spell.speed*speedmultiply;
  enemy.y += Math.sin(enemy.angle) * spell.speed*speedmultiply;
  renderedEnemies.forEach(otherenemy => {
    if (otherenemy !== enemy) {
      const distanceFromSpell = Math.sqrt(
        ((otherenemy.x+XADD + otherenemy.width / 2) - (enemy.x+XADD + enemy.width / 2)) ** 2 +
        ((otherenemy.y+YADD + otherenemy.height / 2) - (enemy.y+YADD + enemy.height / 2)) ** 2
      );
      if (distanceFromSpell <= 32) {
if (otherenemy.specialhp && otherenemy.specialhp > 0) {
	otherenemy.specialhp -= 0.5
} else {
        otherenemy.hp += spell.dmg; 
}
        if(otherenemy.type=="dummyvector"){
        DummyDamage(otherenemy,-spell.dmg)
        }
        addDamageIndicator(otherenemy, spell.dmg );
        removebymagic=1
        return false;
      }
    }
  });
}
if (enemy.type in boomerangs) {
    const spell = boomerangs[enemy.type];
    enemy.height = 32+2;
    enemy.width = 32+2 ;
if(!enemy.angle2){enemy.angle2 = 0;}
 enemy.angle2 += spell.speed
}
if (enemy.type in arrows) {
    const spell = arrows[enemy.type];
    enemy.height = 32 + 2;
    enemy.width = 32 + 2;
  enemy.x += Math.cos(enemy.angle) * spell.speed * speedmultiply;
  enemy.y += Math.sin(enemy.angle) * spell.speed * speedmultiply;
  renderedEnemies.forEach(otherenemy => {
      if (otherenemy !== enemy) {
          const distanceFromSpell = Math.sqrt(
              ((otherenemy.x+XADD + otherenemy.width / 2) - (enemy.x+XADD + enemy.width / 2)) ** 2 +
              ((otherenemy.y+YADD + otherenemy.height / 2) - (enemy.y+YADD + enemy.height / 2)) ** 2
          );
          if (distanceFromSpell <= 32) {
              if(enemy.atkplus){
if (otherenemy.specialhp && otherenemy.specialhp > 0) {
	otherenemy.specialhp -= 0.5
} else {
otherenemy.hp += spell.dmg-enemy.atkplus;
}
              if(otherenemy.type=="dummyvector"){
              DummyDamage(otherenemy,-spell.dmg-enemy.atkplus)
              }
              addDamageIndicator(otherenemy, spell.dmg-enemy.atkplus );
              }else{
if (otherenemy.specialhp && otherenemy.specialhp > 0) {
	otherenemy.specialhp -= 0.5
} else {
                  otherenemy.hp += spell.dmg
}
                  if(otherenemy.type=="dummyvector"){
                  DummyDamage(otherenemy,-spell.dmg)
                  }
                  addDamageIndicator(otherenemy, spell.dmg );
              }
              removebymagic = 1
              return false;
          }
      }
  });
}
        if (enemy.type === "trueuniversebody" && enemy.following) {
            const prevSegment = enemy.following;
            enemy.height = 64
enemy.width = 64
            const distance = Math.sqrt((prevSegment.x - enemy.x) ** 2 + (prevSegment.y - enemy.y) ** 2);
            const angleToFollow = Math.atan2(prevSegment.y - enemy.y, prevSegment.x - enemy.x);
            enemy.angle = angleToFollow;
            let  followDistance = 40;
            if(fds22>25){
              followDistance=3
            }
            if (distance > followDistance) {
                enemy.x += Math.cos(angleToFollow) * fds22*speedmultiply;
                enemy.y += Math.sin(angleToFollow) * fds22*speedmultiply
            }
            if (!checkIfHasEnemy("trueuniversehead", 1)) {
  return false;
}
        }
        if (enemy.type === "trueuniversehead") {
    enemy.height = 64;
    enemy.width = 64;
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;  
    }
let entityname2 = "trueprojectile"
if (Math.random() <= 0.065) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, entityname2);
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance;
      batY += Math.random() * 200 - 100;
    } else {
      batX = offsetX;
      batY += Math.random() * 200 - 100;
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance;
      batX += Math.random() * 200 - 100;
    } else {
      batY = offsetY;
      batX += Math.random() * 200 - 100;
    }
    let bat = new Enemy(batX, batY, entityname2);
    newEnemies.push(bat);
  }
  spawnBatNearPlayer();
}
    let fds=Math.random()<0.010
    if(enemy.hp>15000){
    fds=Math.random()<0.010
    }else{
    fds=Math.random()<0.08
    }
    let gdf=35
    let fds2=10
    if(enemy.hp>10000){
    fds2=24
    gdf=35
    }else{
    fds2=27
    gdf=25
    }
    if (Math.random() <= 0.0025) {
  const typesof = ["universeblast"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer(x,y) {
    let bat = new Enemy(x, y, randomSpell); bat.width=32;bat.height=32; ; renderedEnemies.push(bat);  bat.speed=25
  } for (let i = 0; i < 10; i++) {
  setTimeout(function() {
    spawnEnemyNearPlayer(enemy.x,enemy.y);
  }, i * 200);
}}
    if (enemy.angleTickCounter % gdf === 0 || fds) {
        const angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    const amplitude = 15;
const frequency = 0.3;
const perpendicularAngle = enemy.angle + Math.PI / 2;
const sinusoidalOffsetX = Math.cos(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
const sinusoidalOffsetY = Math.sin(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
enemy.x += enemy.directionX * fds2 + sinusoidalOffsetX*speedmultiply;
enemy.y += enemy.directionY * fds2 + sinusoidalOffsetY*speedmultiply;
enemy.angleTickCounter++;
    enemy.angleTickCounter++;
  if (enemy.hp <= 0) {
  gfggf(enemy.id)
  return false; 
  }
}
if (enemy.type === "abyssdevourerhead") {
    enemy.height = 64;
    enemy.width = 64;
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;
    }
    const distanceToPlayer = Math.sqrt(
        (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
    ); let fds = Math.random() < 0.055; let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
    if (enemy.angleTickCounter % 35 === 0 || fds) {
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    const amplitude = 5; 
    const frequency = 0.8; 
    const perpendicularAngle = enemy.angle + Math.PI / 2; 
    const sinusoidalOffsetX = Math.cos(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
    const sinusoidalOffsetY = Math.sin(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
    enemy.x += enemy.directionX * 8 + sinusoidalOffsetX*speedmultiply;
    enemy.y += enemy.directionY * 8 + sinusoidalOffsetY*speedmultiply;
enemy.angle = angleToPlayer;
    enemy.angleTickCounter++;
    if (distanceToPlayer > 250) {
        enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
        if (enemy.despawnTickCount > 1000) {
            gfggf(enemy.id)
            return false; 
        }
    }
    if (enemy.hp <= 1 || inabyss==0) {
        gfggf(enemy.id)
        return false; 
    }
}
if(enemy.type=="dummyvector"){
let detect=false 
for (let block of renderedBlocks) {
if ( block.type === 'dummy') {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2) ;
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius/2) {detect=true}else if(distanceToBlock>collisionRadius/2){
}}
}
if(!detect){
	gfggf(enemy.id)
return false;
}
	if (distanceToPlayer > 150) {
		gfggf(enemy.id)
		return false;
 }
}
if (enemy.type === "abyssdevourerbody" && enemy.following) {
          const prevSegment = enemy.following;
          enemy.height = 64; enemy.width = 64
          const distance = Math.sqrt((prevSegment.x - enemy.x) ** 2 + (prevSegment.y - enemy.y) ** 2);
          const angleToFollow = Math.atan2(prevSegment.y - enemy.y, prevSegment.x - enemy.x);
          enemy.angle = angleToFollow;
          let followDistance = 50; 
          if (distance > followDistance) {
            enemy.x += Math.cos(angleToFollow) * 12*speedmultiply;
            enemy.y += Math.sin(angleToFollow) * 12*speedmultiply
          }
          if(!checkIfHasEnemy("abyssdevourerhead",1)){
            return false;
          }
        }
if (enemy.type === "deepgodhead") {
    enemy.height = 64;
    enemy.width = 64;
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;
    }
    const distanceToPlayer = Math.sqrt(
        (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
    ); let fds = Math.random() < 0.055; let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
    if (enemy.angleTickCounter % 35 === 0 || fds) {
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    const amplitude = 9; 
    const frequency = 0.5; 
    const perpendicularAngle = enemy.angle + Math.PI / 2; 
    const sinusoidalOffsetX = Math.cos(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
    const sinusoidalOffsetY = Math.sin(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
    enemy.x += enemy.directionX * 8 + sinusoidalOffsetX*speedmultiply;
    enemy.y += enemy.directionY * 8 + sinusoidalOffsetY*speedmultiply;
enemy.angle = angleToPlayer;
    enemy.angleTickCounter++;
    if (enemy.hp <= 1 ) {
        gfggf(enemy.id)
        return false; 
    }
    if (Math.random() <= 0.018) {
  const typesof = ["aquablast"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer(x,y) {
    let bat = new Enemy(x, y, randomSpell); bat.width=32;bat.height=32; ; renderedEnemies.push(bat);  bat.speed=20
  } for (let i = 0; i < 10; i++) {
  setTimeout(function() {
    spawnEnemyNearPlayer(enemy.x,enemy.y);
  }, i * 250);
}}
}
if (enemy.type === "deepgodtorso" && enemy.following) {
          const prevSegment = enemy.following;
          enemy.height = 64; enemy.width = 64
          const distance = Math.sqrt((prevSegment.x - enemy.x) ** 2 + (prevSegment.y - enemy.y) ** 2);
          const angleToFollow = Math.atan2(prevSegment.y - enemy.y, prevSegment.x - enemy.x);
          enemy.angle = angleToFollow;
          let followDistance = 50; 
          if (distance > followDistance) {
            enemy.x += Math.cos(angleToFollow) * 12*speedmultiply;
            enemy.y += Math.sin(angleToFollow) * 12*speedmultiply
          }
          if(!checkIfHasEnemy("deepgodhead",1)){
            return false;
          }
        }
if (enemy.type === "aquablast"||enemy.type === "universeblast") {
    enemy.height = 32;
    enemy.width = 32;
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;
    }
    const distanceToPlayer = Math.sqrt(
        (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
    ); let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
    if (enemy.angleTickCounter % 1000 === 0 ) {
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    enemy.x += enemy.directionX * enemy.speed*speedmultiply;
    enemy.y += enemy.directionY * enemy.speed*speedmultiply;
enemy.angle = angleToPlayer;
    enemy.angleTickCounter++;
    if (distanceToPlayer > 150) {
        enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
        if (enemy.despawnTickCount > 100) {
            return false; 
        }
    }
    if (enemy.type in arrows) {}else if (enemy.type in magicspellsfromentities) {}else{
 if (distanceToPlayer <= 32 && enemy.type == "universeblast") { updateHealth3(-1.2,enemy); }else if (distanceToPlayer <= 32) { updateHealth3(-0.8,enemy); }
}}
if (enemy.type === "crimsonprojectile") {
    enemy.height = 32-8;
    enemy.width = 32-8;
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;
    }
    const distanceToPlayer = Math.sqrt(
        (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
    ); let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
    if (enemy.angleTickCounter % 1000 === 0 ) {
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    enemy.x += enemy.directionX * 9*speedmultiply;
    enemy.y += enemy.directionY * 9*speedmultiply;
enemy.angle = angleToPlayer;
    enemy.angleTickCounter++;
    if (distanceToPlayer > 150) {
        enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
        if (enemy.despawnTickCount > 100) {
            return false; 
        }
    }
    if (enemy.type in arrows) {}else if (enemy.type in magicspellsfromentities) {}else{ 
if (distanceToPlayer <= 32) { updateHealth3(-1.5,enemy); }
}}
if (enemy.type === "etherbeam") {
    enemy.height = 32-5
    enemy.width = 32-5
    const playerCenterX = offsetX + player.x + player.width / 2
    const playerCenterY = offsetY + player.y + player.height / 2
    if (!enemy.angle) enemy.angle = Math.atan2(playerCenterY - enemy.y, playerCenterX - enemy.x)
    const angleToPlayer = Math.atan2(playerCenterY - enemy.y, playerCenterX - enemy.x)
    const changeAngleStep = 0.07
    let angleDiff = angleToPlayer - enemy.angle
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) 
    if(Math.abs(angleDiff) < changeAngleStep){
        enemy.angle = angleToPlayer
    } else {
        enemy.angle += changeAngleStep * Math.sign(angleDiff)
    }
    enemy.directionX = Math.cos(enemy.angle)
    enemy.directionY = Math.sin(enemy.angle)
    enemy.x += enemy.directionX * 9 * speedmultiply
    enemy.y += enemy.directionY * 9 * speedmultiply
    const distanceToPlayer = Math.hypot(playerCenterX - enemy.x, playerCenterY - enemy.y)
    if (distanceToPlayer <= 32) updateHealth3(-2, enemy)
    if (distanceToPlayer > 150) {
        enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1
        if (enemy.despawnTickCount > 100) return false
    }
    enemy.angleTickCounter = (enemy.angleTickCounter || 0) + 1
}
if (enemy.type === "trueprojectile") {
    enemy.height = 32-8;
    enemy.width = 32-8;
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;
    }
    const distanceToPlayer = Math.sqrt(
        (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
    ); let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
    if (enemy.angleTickCounter % 1000 === 0 ) {
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    enemy.x += enemy.directionX * 10*speedmultiply;
    enemy.y += enemy.directionY * 10*speedmultiply;
enemy.angle = angleToPlayer;
    enemy.angleTickCounter++;
    if (distanceToPlayer > 150) {
        enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
        if (enemy.despawnTickCount > 100) {
            return false; 
        }
    }
   if (enemy.type in arrows) {}else if (enemy.type in magicspellsfromentities) {}else{
if (distanceToPlayer <= 32) { updateHealth3(-1.5,enemy); }
}}
if (enemy.type === "hellscourgehead") {
    enemy.height =32+16
    enemy.width = 32+16
    const playerCenterX = offsetX + player.x + player.width / 2;
    const playerCenterY = offsetY + player.y + player.height / 2;
    if (!enemy.angleTickCounter) {
        enemy.angleTickCounter = 0;
        enemy.previousAngle = enemy.angle || 0;
    }
    const distanceToPlayer = Math.sqrt(
        (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
    ); let fds = Math.random() < 0.055; let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
    if (enemy.angleTickCounter % 35 === 0 || fds) {
        enemy.previousAngle = angleToPlayer;
        enemy.angle = angleToPlayer;
        enemy.directionX = Math.cos(angleToPlayer);
        enemy.directionY = Math.sin(angleToPlayer);
    }
    const amplitude = 5; 
    const frequency = 0.5; 
    const perpendicularAngle = enemy.angle + Math.PI / 2; 
    const sinusoidalOffsetX = Math.cos(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
    const sinusoidalOffsetY = Math.sin(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
    enemy.x += enemy.directionX * 5 + sinusoidalOffsetX*speedmultiply;
    enemy.y += enemy.directionY * 5 + sinusoidalOffsetY*speedmultiply;
enemy.angle = angleToPlayer;
    enemy.angleTickCounter++;
    if (distanceToPlayer > 250) {
        enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
        if (enemy.despawnTickCount > 1000) {
            gfggf(enemy.id)
            return false; 
        }
    }
    if (enemy.hp <= 1 || inhell==0) {
        gfggf(enemy.id)
        return false; 
    }
}
if (enemy.type === "hellscourgebody" && enemy.following) {
          const prevSegment = enemy.following;
          enemy.height = 32+16; enemy.width = 32+16;
          const distance = Math.sqrt((prevSegment.x - enemy.x) ** 2 + (prevSegment.y - enemy.y) ** 2);
          const angleToFollow = Math.atan2(prevSegment.y - enemy.y, prevSegment.x - enemy.x);
          enemy.angle = angleToFollow;
          let followDistance = 30; 
          if (distance > followDistance) {
            enemy.x += Math.cos(angleToFollow) * 10*speedmultiply;
            enemy.y += Math.sin(angleToFollow) * 10*speedmultiply
          }
          if(!checkIfHasEnemy("hellscourgehead",1)){
            return false;
          }
        }
if (enemy.type === "desertscourgehead") {
  enemy.height = 32+16
  enemy.width = 32+16
  const playerCenterX = offsetX + player.x + player.width / 2;
  const playerCenterY = offsetY + player.y + player.height / 2;
  if (!enemy.angleTickCounter) {
    enemy.angleTickCounter = 0;
    enemy.previousAngle = enemy.angle || 0;
  }
  const distanceToPlayer = Math.sqrt(
    (playerCenterX - enemy.x+XADD) ** 2 + (playerCenterY - enemy.y+YADD) ** 2
  );
  let fds = Math.random() < 0.055;
  let angleToPlayer = Math.atan2(playerCenterY - enemy.y+YADD, playerCenterX - enemy.x+XADD);
  if (enemy.angleTickCounter % 35 === 0 || fds) {
    enemy.previousAngle = angleToPlayer;
    enemy.angle = angleToPlayer;
    enemy.directionX = Math.cos(angleToPlayer);
    enemy.directionY = Math.sin(angleToPlayer);
  }
  const amplitude = 6; 
  const frequency = 0.5; 
  const perpendicularAngle = enemy.angle + Math.PI / 2; 
  const sinusoidalOffsetX = Math.cos(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
  const sinusoidalOffsetY = Math.sin(perpendicularAngle) * amplitude * Math.sin(enemy.angleTickCounter * frequency);
  enemy.x += enemy.directionX * 6 + sinusoidalOffsetX*speedmultiply;
  enemy.y += enemy.directionY * 6 + sinusoidalOffsetY*speedmultiply;
  enemy.angle = angleToPlayer;
  enemy.angleTickCounter++;
  if (distanceToPlayer > 200) {
    enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
    if (enemy.despawnTickCount > 100) {
      gfggf(enemy.id)
      return false; 
    }
  }
  if (enemy.hp <= 1 ) {
    gfggf(enemy.id)
    return false; 
  }
}
if (enemy.type === "desertscourgebody" && enemy.following) {   
  const prevSegment = enemy.following;
  enemy.height = 32+16
  enemy.width = 32+16
  const distance = Math.sqrt((prevSegment.x - enemy.x) ** 2 + (prevSegment.y - enemy.y) ** 2);
  const angleToFollow = Math.atan2(prevSegment.y - enemy.y, prevSegment.x - enemy.x); 
  enemy.angle = angleToFollow;
  let followDistance = 32;
  if (distance > followDistance) {
    enemy.x += Math.cos(angleToFollow) * 8*speedmultiply
    enemy.y += Math.sin(angleToFollow) * 8*speedmultiply
  }
  if (!checkIfHasEnemy("desertscourgehead", 1)) {
    return false;
  }
}
if (enemy.type == "2medusa" ) {
  if (medusa2z < 1) {
    nightpower=0;
    isRaining=false
    medusa2z += 1
    ctx.fillStyle = `rgba(0, 125, 255, 0.45)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (distanceToPlayer > 250) {
  enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
  if (enemy.despawnTickCount > 1000) {
    gfggf(enemy.id)
    return false; 
  }
}
}
if (enemy.type == "aquagod") {
  if (medusa2z < 1) {
    nightpower = 0;
    isRaining = false
    medusa2z += 1
    ctx.fillStyle = `rgba(0, ${Math.random()*255}, ${Math.random()*255}, 0.10)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
if (enemy.type == "insaneuniversegod") {
  if (universegodz < 1) {
    nightpower = 1.3;
    isRaining = false;
    universegodz += 1
    ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.05)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
        if (enemy.type == "flesh") {
          enemy.speed=5;
          if (fleshz < 1) {
            if(Math.random()<0.6){
            nightpower = 2.5;
            }else{
              nightpower = 3
            }
            isRaining = false;
            fleshz += 1
            ctx.fillStyle = `rgba(255, 50, 50, ${Math.random()/3.5})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
if(enemy.type=="darkeye"){
          if(darkeyes<1){
            darkeyes+=1
 ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
        }
        if(enemy.type=="voltary"||enemy.type=="spikegod"){
          enemy.height=80
          enemy.width=80
          if (Math.random() <= 0.015) {
            showTextInCanvas("skull summoned")
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'skull');
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance;  
    } else {
      batX = offsetX;  
    }
if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance;  
    } else {
      batY = offsetY;  
    }
    let bat = new Enemy(batX, batY, 'skull'); newEnemies.push(bat);  }spawnBatNearPlayer();
}}
if(enemy.type=="flesher"){
if (Math.random() <= 0.04) {
  function spawnBatNearPlayer() {
    let batX, batY;
    batX=enemy.x+XADD
    batY=enemy.y+YADD
    let bat = new Enemy(batX, batY, 'crimsonprojectile');
    bat.speed=9 
    newEnemies.push(bat);  
  }spawnBatNearPlayer();
}}
        if(enemy.type=="darkeye"){
          enemy.height=80
          enemy.width=80
          if (Math.random() <= 0.013) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'spary');
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance;  
    } else {
      batX = offsetX;  
    }
if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance;  
    } else {
      batY = offsetY;  
    }
    let bat = new Enemy(batX, batY, 'spary');
    newEnemies.push(bat);  
  }
  spawnBatNearPlayer();
}
        }
if (enemy.type == "demon" || enemy.type == "demonbat") {
let ggdf = 0;
function updatePlayerAngle() {
    switch (lastDirection) {
        case 'right':
            ggdf = 0;
            break;
        case 'down':
            ggdf = 90;
            break;
        case 'left':
            ggdf = 180;
            break;
        case 'up':
            ggdf = 270;
            break;
    }
}
updatePlayerAngle();
if (Math.random() < 0.013) {
    const angleInRadians = ggdf * (Math.PI / 180);
    const playerDirectionX = Math.cos(angleInRadians) * 32 * 5;
    const playerDirectionY = Math.sin(angleInRadians) * 32 *5;
    enemy.x = offsetX+player.x/1.5 + playerDirectionX;
    enemy.y =offsetY-32+ player.y + playerDirectionY;
}
let entityname=""
  entityname="crimsonprojectile"
    const angleInRadians = ggdf * (Math.PI / 180);
    const playerDirectionX = Math.cos(angleInRadians) * 32 * 5;
    const playerDirectionY = Math.sin(angleInRadians) * 32 * 5;
  let rand=Math.random() <= 0.035
  if (enemy.type == "demon") {
  rand = Math.random() <= 0.025
}
  if (rand) {
    if(!checkIfHasEnemy(entityname,9)){
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, entityname);
    const spawnDistance = 9 * blockSize;
    function spawnBatNearPlayer() {
      let batX, batY;
      if (Math.random() >= 0.3) {
        batX = offsetX + spawnDistance;
      } else {
        batX = offsetX;
      }
      if (Math.random() >= 0.3) {
        batY = offsetY + spawnDistance;
      } else {
        batY = offsetY;
      }
      batX = offsetX+32 + player.x / 1.5 + playerDirectionX;
     batY = offsetY-32+ player.y + playerDirectionY;
      let bat = new Enemy(batX, batY, entityname);
      newEnemies.push(bat);
    }
    spawnBatNearPlayer();
  }}
}
if (enemy.type == "flesh"||enemy.type=="insaneuniversegod"||enemy.type=="aquagod") {
  enemy.height = 80 + 32;
  enemy.width = 80 + 32;
let ggdf = 0;
function updatePlayerAngle() {
    switch (lastDirection) {
        case 'right':
            ggdf = 0;
            break;
        case 'down':
            ggdf = 90;
            break;
        case 'left':
            ggdf = 180;
            break;
        case 'up':
            ggdf = 270;
            break;
    }
}
updatePlayerAngle();
if (Math.random() < 0.013) {
    const angleInRadians = ggdf * (Math.PI / 180);
    const playerDirectionX = Math.cos(angleInRadians) * 32 * 5;
    const playerDirectionY = Math.sin(angleInRadians) * 32 *5;
    enemy.x = offsetX+player.x/1.5 + playerDirectionX;
    enemy.y =offsetY-32+ player.y + playerDirectionY;
}
let entityname="floatingeye"
if(enemy.type=="insaneuniversegod"){
  entityname="universebulb"
}
    const angleInRadians = ggdf * (Math.PI / 180);
    const playerDirectionX = Math.cos(angleInRadians) * 32 * 5;
    const playerDirectionY = Math.sin(angleInRadians) * 32 * 5;
  let rand=Math.random() <= 0.035
  if (enemy.type == "insaneuniversegod") {
  rand = Math.random() <= 0.025
}
  if (rand) {
    if(!checkIfHasEnemy(entityname,9)){
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, entityname);
    const spawnDistance = 9 * blockSize;
    function spawnBatNearPlayer() {
      let batX, batY;
      if (Math.random() >= 0.3) {
        batX = offsetX + spawnDistance;
      } else {
        batX = offsetX;
      }
      if (Math.random() >= 0.3) {
        batY = offsetY + spawnDistance;
      } else {
        batY = offsetY;
      }
      batX = offsetX+32 + player.x / 1.5 + playerDirectionX;
     batY = offsetY-32+ player.y + playerDirectionY;
      let bat = new Enemy(batX, batY, entityname);
      newEnemies.push(bat);
    }
    spawnBatNearPlayer();
  }}
  let entityname2 = "crimsonprojectile"
if (enemy.type == "insaneuniversegod") {
  entityname2 = "trueprojectile"
}
  if (Math.random() <= 0.085) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, entityname2);
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance;
      batY += Math.random()*200-100;
    } else {
      batX = offsetX;
      batY += Math.random()*200-100;
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance ;
      batX += Math.random()*200-100;
    } else {
      batY = offsetY;
      batX += Math.random()*200-100;
    }
    batX = offsetX + 32 + player.x / 1.5 + playerDirectionX ;
    batY = offsetY - 32 + player.y + playerDirectionY;
    let bat = new Enemy(batX, batY, entityname2);
    newEnemies.push(bat);
  }
  spawnBatNearPlayer();
}
}
if(enemy.type=="2medusa"){
          enemy.height=80+16
          enemy.width=80+16
          if (Math.random() <= 0.018) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, '1medusa');
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayerd() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance;  
    } else {
      batX = offsetX;  
    }
if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance;  
    } else {
      batY = offsetY;  
    }
    let bat = new Enemy(batX, batY, '1medusa');
    newEnemies.push(bat);  
  } spawnBatNearPlayerd(); }}
if (enemy.type == "skull") {
  enemy.speed = 5
}if (enemy.type == "giantbat") {
  enemy.speed = 4
}
if (enemy.type == "ethoper") {
	enemy.speed = 3
}
if (enemy.type == "ethoper2") {
	enemy.speed = 3
}
if (enemy.type == "voidguardian") {
  enemy.speed = 3
  enemy.width=64;
  enemy.height=64;
}
if (enemy.type == "floatingeye") {
  enemy.speed = 3
  if (Math.random() <= 0.045) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'crimsonprojectile');
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    batX = enemy.x+XADD
    batY = enemy.y+YADD
    let bat = new Enemy(batX, batY, 'crimsonprojectile');
    newEnemies.push(bat);
  }
  spawnBatNearPlayer();
}
}
if (enemy.type == "universebulb") {
  enemy.speed = 3
  if (Math.random() <= 0.025) {
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'trueprojectile');
    const spawnDistance = 9 * blockSize;
    function spawnBatNearPlayer() {
      batX = enemy.x+XADD
      batY = enemy.y+YADD
      let bat = new Enemy(batX, batY, 'trueprojectile');
      newEnemies.push(bat);
    }
    spawnBatNearPlayer();
  }
}
if (enemy.type == "soulcat") {
  enemy.speed = 2
}
if (enemy.type === "raven") {
  if (distanceToPlayer < enemyDespawnDistance) {
    enemy.despawnTickCount = 0;
enemy.speed=1.5
    const moveX = (diffX / distanceToPlayer) * enemy.speed;
const moveY = (diffY / distanceToPlayer) * enemy.speed;
enemy.x += moveX *(enemy.speed*fixedspeed)*speedmultiply;
enemy.y += moveY *(enemy.speed*fixedspeed)*speedmultiply;
if (Math.abs(moveX) > Math.abs(moveY)) {
  enemy.direction = moveX > 0 ? 3 : 2; 
} else {
  enemy.direction = moveY > 0 ? 1 : 0; 
}
  } else {
    enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
    if (enemy.despawnTickCount > despawnTicks) {
      return false; 
    }
  }}
 if (enemy.type in butterflyentities) {
enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
if (enemy.despawnTickCount > 300) {
return false; 
}
if (Math.random() < 0.10) { 
enemy.direction = Math.floor(Math.random() * 4);
}
switch (enemy.direction) {
case 1: 
enemy.y += (enemy.speed*fixedspeed);
break;
case 0: 
enemy.y -= (enemy.speed*fixedspeed);
break;
case 3: 
enemy.x += (enemy.speed*fixedspeed)
break;
case 2: 
enemy.x -= (enemy.speed*fixedspeed)
break;
}}
if (enemy.type == "bunny"||enemy.type == "soulcat"||enemy.type == "duck") {
    if(enemy.type !== "duck"){
if(distanceToPlayer> 5* blockSize ){
enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
if (enemy.despawnTickCount > despawnTicks) {
return false; 
}}
}else{
    if(distanceToPlayer> 8* blockSize ){
enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
if (enemy.despawnTickCount > despawnTicks) {
return false; 
}}
}
if (distanceToPlayer < 2 * blockSize) {
const moveX = (-diffX / distanceToPlayer) * enemy.speed;
const moveY = (-diffY / distanceToPlayer) * enemy.speed;
enemy.x += moveX*5*speedmultiply;
enemy.y += moveY*5*speedmultiply;
if (Math.abs(moveX) > Math.abs(moveY)) {
enemy.direction = moveX > 0 ? 3 : 2; 
} else {
enemy.direction = moveY > 0 ? 1 : 0; 
}} else {
if (Math.random() < 0.10) { 
enemy.direction = Math.floor(Math.random() * 4);
}
switch (enemy.direction) {
case 1: 
enemy.y += (enemy.speed*fixedspeed)*speedmultiply;
break;
case 0: 
enemy.y -= (enemy.speed*fixedspeed)*speedmultiply;
break;
case 3: 
enemy.x += (enemy.speed*fixedspeed)*speedmultiply
break;
case 2: 
enemy.x -= (enemy.speed*fixedspeed)*speedmultiply
break;
}}}else if(enemy.type=="skellybones"||enemy.type=="zombie"||enemy.type=="spider"||enemy.type=="voidguardian"){
  if(distanceToPlayer> 5* blockSize ){
enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
if (enemy.despawnTickCount > despawnTicks) {
return false; 
}}
if (distanceToPlayer < 5 * blockSize) {
const moveX = (-diffX / distanceToPlayer) * enemy.speed;
const moveY = (-diffY / distanceToPlayer) * enemy.speed;
enemy.x -= moveX*0.6*speedmultiply;
enemy.y -= moveY*0.6*speedmultiply;
if (Math.abs(moveX) > Math.abs(moveY)) {
enemy.direction = moveX > 0 ? 2 : 3; 
} else {
enemy.direction = moveY > 0 ? 0 : 1; 
}}
switch (enemy.direction) {
case 1: 
enemy.y += (enemy.speed*fixedspeed)*speedmultiply;
break;
case 0: 
enemy.y -= (enemy.speed*fixedspeed)*speedmultiply;
break;
case 3: 
enemy.x += (enemy.speed*fixedspeed)*speedmultiply
break;
case 2: 
enemy.x -= (enemy.speed*fixedspeed)*speedmultiply
break;
}}else if(enemy.type=="pinkslime"||enemy.type=="blueslime"||enemy.type=="greenslime"){
  if(distanceToPlayer> 6* blockSize ){
    enemy.speed=1.5
enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
if (enemy.despawnTickCount > despawnTicks) {
return false; 
}}
if (distanceToPlayer < 2 * blockSize) {
const moveX = (-diffX / distanceToPlayer) * enemy.speed;
const moveY = (-diffY / distanceToPlayer) * enemy.speed;
enemy.x -= moveX*0.6*speedmultiply;
enemy.y -= moveY*0.6*speedmultiply;
if (Math.abs(moveX) > Math.abs(moveY)) {
enemy.direction = moveX > 0 ? 2: 3; 
} else {
enemy.direction = moveY > 0 ? 0 :1; 
}}else {
  if (Math.random() < 0.10) {
    enemy.direction = Math.floor(Math.random() * 4);
  }
}
switch (enemy.direction) {
case 1: 
enemy.y += (enemy.speed*fixedspeed)*speedmultiply;
break;
case 0: 
enemy.y -= (enemy.speed*fixedspeed)*speedmultiply;
break;
case 3: 
enemy.x += (enemy.speed*fixedspeed)*speedmultiply
break;
case 2: 
enemy.x -= (enemy.speed*fixedspeed)*speedmultiply
break;
}}
if (enemy.type in arrows) {} else if (enemy.type in magicspellsfromentities) {}else{
 
if ( enemy.type == "orb" ) {
 enemy.despawnTickCount = 0;
 const playerCenterX2 = offsetX + player.x +32;
const playerCenterY2 = offsetY + player.y+32 ;
const distanceToPlayer2 = Math.sqrt(
 (playerCenterX2 - enemy.x + XADD) ** 2 + (playerCenterY2 - enemy.y + YADD) ** 2
);
const distanceToPlayer3 = Math.sqrt(
	(playerCenterX -15- enemy.x + XADD) ** 2 + (playerCenterY-15- enemy.y + YADD) ** 2
);
const diffX2 = playerCenterX2 - 15 - enemy.x + XADD - enemy.width / 2;
const diffY2 = playerCenterY2 - 15 - enemy.y + YADD - enemy.height / 2;
 const moveX = (diffX2 / distanceToPlayer2) * (enemy.speed * fixedspeed)
 const moveY = (diffY2 / distanceToPlayer2) * (enemy.speed * fixedspeed);
 let distanceboost = clamp(distanceToPlayer2,0,60)/20
 enemy.x += moveX * speedmultiply *distanceboost;
 enemy.y += moveY * speedmultiply *distanceboost;
 if(distanceToPlayer3<20){
  gfggf(enemy.id)
  
  stats.lv += enemy.givexp || 0.001
  updateStats()
  orbCollision=true;
  return false; 
 }
}

if (distanceToPlayer < enemyDespawnDistance&& enemy.type!=="ethoper" && enemy.type!=="ethoper3"  && enemy.type!=="bunny" && enemy.type!=="dummyvector" && enemy.type!=="orb" && enemy.type!=="duck"&& enemy.type!=="soulcat"&& enemy.type!=="pinkslime"&& enemy.type!=="blueslime"&& enemy.type!=="greenslime"&& enemy.type!=="skellybones"&&enemy.type!=="zombie"&&enemy.type!=="spider"&&enemy.type!=="voidguardian"&& enemy.type!=="voltary" && enemy.type!=="spikegod"&&enemy.type!=="darkeye"&&enemy.type!=="flesh"&&enemy.type!=="2medusa"&&enemy.type!=="insaneuniversegod"&&enemy.type!=="aquagod"&&enemy.type!=="trueuniversebody"&&enemy.type!=="trueuniversehead"&&enemy.type!=="abyssdevourerbody"&&enemy.type!=="abyssdevourerhead" &&enemy.type !== "desertscourgehead"&&enemy.type !== "desertscourgebody"&&enemy.type !== "hellscourgebody"&&enemy.type !== "hellscourgehead"&& enemy.type !== "crimsonprojectile"&& enemy.type !== "etherbeam"&&enemy.type !== "deepgodhead"&&enemy.type !== "deepgodtorso"&& enemy.type !== "aquablast"&&enemy.type !== "trueprojectile"&&enemy.type !== "universeblast" && !(enemy.type in butterflyentities)) {
enemy.despawnTickCount = 0;
const moveX = (diffX / distanceToPlayer) * (enemy.speed*fixedspeed)
const moveY = (diffY / distanceToPlayer) * (enemy.speed*fixedspeed);
enemy.x += moveX*speedmultiply;
enemy.y += moveY*speedmultiply;
} } if (distanceToPlayer < 99999999999*2 && (enemy.type == "voltary"|| enemy.type == "skull"|| enemy.type == "spary"|| enemy.type =="spikegod"||enemy.type=="darkeye" || enemy.type=="1medusa"|| enemy.type=="2medusa" || enemy.type =="floatingeye"||enemy.type =="universebulb"||enemy.type =="flesh" ||enemy.type=="insaneuniversegod"|| enemy.type=="aquagod")) {
enemy.speed=3+Math.floor(Math.random()*4)
if (enemy.type == "spary") { enemy.speed = 2; }
if (enemy.type == "insaneuniversegod") { enemy.speed = 7;}
if (enemy.type == "1medusa") { enemy.speed = 2.5;}
if (enemy.type == "floatingeye") { enemy.speed = 2;}
if (enemy.type == "flesh") {
  enemy.speed = 6; if(enemy.hp<5000){ enemy.speed = 7; enemy.hp+=1.5; }}
const moveX = (diffX / distanceToPlayer) * (enemy.speed * fixedspeed)
const moveY = (diffY / distanceToPlayer) * (enemy.speed * fixedspeed);
enemy.x += moveX*speedmultiply;
enemy.y += moveY*speedmultiply;
}
function spawnEtherBeam(enemy) {
	const beamX = enemy.x + XADD
	const beamY = enemy.y + YADD
	const etherBeam = new Enemy(beamX, beamY, 'etherbeam')
	etherBeam.speed = 20
	newEnemies.push(etherBeam)
}
if (enemy.type === 'ethoper' || enemy.type=="ethoper3") {
	let moveX = 0,
		moveY = 0
	if (distanceToPlayer > 0) {
		moveX = (diffX / distanceToPlayer) * (enemy.speed * fixedspeed)
		moveY = (diffY / distanceToPlayer) * (enemy.speed * fixedspeed)
	}
	const separationDistance = 50
	renderedEnemies.forEach(other => {
		if (other !== enemy && !other.dead && other.type === 'ethoper' || enemy.type=="ethoper3") {
			const dx = enemy.x - other.x
			const dy = enemy.y - other.y
			const dist = Math.hypot(dx, dy)
			if (dist < separationDistance && dist > 0) {
				const repelFactor = (separationDistance - dist) / separationDistance
				moveX += (dx / dist) * repelFactor * enemy.speed
				moveY += (dy / dist) * repelFactor * enemy.speed
			}
		}
	})
	let newX = enemy.x + moveX * speedmultiply
	let newY = enemy.y + moveY * speedmultiply
	const maxDist = 200
	const newCenterX = newX - XADD + enemy.width / 2
	const newCenterY = newY - YADD + enemy.height / 2
	const dxToPlayer = newCenterX - playerCenterX
	const dyToPlayer = newCenterY - playerCenterY
	const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer)
	if (distToPlayer <= maxDist) {
		enemy.x = newX
		enemy.y = newY
	} else {
		const scale = maxDist / distToPlayer
		const clampedCenterX = playerCenterX + dxToPlayer * scale
		const clampedCenterY = playerCenterY + dyToPlayer * scale
		enemy.x = clampedCenterX + XADD - enemy.width / 2
		enemy.y = clampedCenterY + YADD - enemy.height / 2
	}
	if (enemy.specialhp == 0) {
		if (enemy.prevHP === undefined) enemy.prevHP = enemy.hp
		if (enemy.beamCooldown === undefined) enemy.beamCooldown = 0
		if (enemy.hp < enemy.prevHP) {
			if (enemy.beamCooldown <= 0) {
				spawnEtherBeam(enemy)
				enemy.beamCooldown = 20
			}
			enemy.prevHP = enemy.hp
		}
	} else {
		if (enemy.prevSpec === undefined) enemy.prevSpec = enemy.specialhp
		if (enemy.beamCooldown === undefined) enemy.beamCooldown = 0
		if (enemy.specialhp < enemy.prevSpec) {
			if (enemy.beamCooldown <= 0) {
				spawnEtherBeam(enemy)
				enemy.beamCooldown = 20
			}
			enemy.prevSpec = enemy.specialhp
		}
	}
	if (enemy.beamCooldown > 0) enemy.beamCooldown--
}
else if( enemy.type!=="ethoper" && enemy.type!=="ethoper3" && enemy.type!=="bunny"&& enemy.type!=="dummyvector" && enemy.type!=="duck"&& enemy.type!=="pinkslime"&& enemy.type!=="soulcat"&& enemy.type!=="blueslime"&& enemy.type!=="greenslime"&& enemy.type!=="skellybones"&&enemy.type!=="zombie"&&enemy.type!=="spider"&&enemy.type!=="voidguardian"&&enemy.type!=="voltary"&& enemy.type!=="spikegod"&& enemy.type!=="2medusa" && enemy.type!=="darkeye" &&enemy.type!=="flesh" &&enemy.type!=="insaneuniversegod"&&enemy.type!=="aquagod"&&enemy.type!=="trueuniversebody"&&enemy.type!=="trueuniversehead"&&enemy.type!=="abyssdevourerbody"&&enemy.type!=="abyssdevourerhead"&&enemy.type !== "desertscourgehead"&&enemy.type !== "desertscourgebody"&&enemy.type !== "hellscourgebody"&&enemy.type !== "hellscourgehead"&& enemy.type !== "crimsonprojectile" && enemy.type !== "etherbeam"&&enemy.type !== "trueprojectile"&&enemy.type !== "deepgodhead"&&enemy.type !== "deepgodtorso"&& enemy.type !== "aquablast"&&enemy.type !== "universeblast" && !(enemy.type in butterflyentities)){
enemy.despawnTickCount = (enemy.despawnTickCount || 0) + 1;
if (enemy.despawnTickCount > despawnTicks) {
return false; 
}}
let collisionDetected = false;
const distanceFromPlayer = Math.sqrt(
          ((enemy.x-XADD+enemy.width/2) - playerCenterX) ** 2 + ((enemy.y-YADD+enemy.height/2) - playerCenterY) ** 2);
let collisionDetected2 = false;
if (enemy.type in arrows) {}else  if (enemy.type in magicspellsfromentities ||  enemy.type in butterflyentities  || enemy.type in nodamage) {} else if (enemy.type!=="aquablast" && enemy.type!=="universeblast"){
if (distanceFromPlayer <= 32) {  updateHealth3(-1,enemy);
if(enemy.type=="trueuniversehead"){
  updateHealth3(-5,enemy);
  if(diedRMEN==1 && enemy.id ){
    gfggf(enemy.id)
    if (enemy.type == "ethoper") {
	etherEventActive = false
	waveInProgress = false;
	currentWave = 0;
	etherBlockIndex = null;
	etherChunkKey = null
	waveEnemies = []
	TextPopUp("Failed...")
}
    return false;
  }
}
if (enemy.type == "trueuniversebody") {
  updateHealth3(-2,enemy);
  if (diedRMEN == 1) {
  gfggf(enemy.id)
  if (enemy.type == "ethoper") {
	etherEventActive = false
	waveInProgress = false;
	currentWave = 0;
	etherBlockIndex = null;
	etherChunkKey = null
	waveEnemies = []
	TextPopUp("Failed...")
}
  return false;
}
}
if(enemy.type=="flesh"|| enemy.type=="insaneuniversegod"|| enemy.type=="aquagod"){
  let ggdf = 0;
updateHealth3(-10,enemy);
function updatePlayerAngle() {
    switch (lastDirection) {
        case 'right':
            ggdf = 0;
            break;
        case 'down':
            ggdf = 90;
            break;
        case 'left':
            ggdf = 180;
            break;
        case 'up':
            ggdf = 270;
            break;
    }
}
updatePlayerAngle();
    const angleInRadians = ggdf * (Math.PI / 180);
    const playerDirectionX = Math.cos(angleInRadians) * 32 * 5;
    const playerDirectionY = Math.sin(angleInRadians) * 32 *5;
    enemy.x = offsetX+player.x/1.5 + playerDirectionX;
    enemy.y =offsetY-32+ player.y + playerDirectionY;
}
  if (diedRMEN == 1 && enemy.id) {
  gfggf(enemy.id) 
if (enemy.type == "ethoper" || enemy.type == "etherbeam" && waveInProgress) {
	transformToActiveColl()
	TextPopUp2("You Failed...")
	REMALL="ethoper"
}
  return false;
  }
}}
        if(enemy.type=='duck'){
        for (let block of renderedBlocks) {
          if (  block.type !== 'water' && block.type !== 'shallowwater' && block.type !== 'water1' && block.type!=="swampwater") {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {
collisionDetected = true;} if (distanceToBlock < collisionRadius-5) {
return false; break;}
          }}
}else {}
 if(enemy.type=='spider' ){
for (let block of renderedBlocks) {
if ( block.type === 'stone_wall' || block.type === 'log_wall' || block.type === 'brickwall'|| block.type === 'gypsumblock'|| block.type === 'planks'|| block.type === 'cave_wall' ||block.type === 'rubyblock'||block.type === 'sapphireblock'||block.type === 'emeraldblock'||block.type === 'voidblock'||block.type === 'housegrass'||block.type === 'abyssblock' ||block.type === 'abyssblock2'||block.type === 'fence' || block.type === 'hellwall' ||block.type === 'hellwall2'|| block.type === 'basalt' ||block.type === 'granite'|| block.type === 'basalt'|| block.type === 'randomrock1'|| block.type === 'randomrock2'|| block.type === 'bigrock') {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {
enemy.speed=0.8; break;}else if(distanceToBlock>collisionRadius){
enemy.speed=3;
}}
}}
  if(enemy.type=='bat'||enemy.type=='ethoper2'||enemy.type=='ethoper3'|| enemy.type=='demon' || enemy.type=='demonbat' || enemy.type=='wasp'|| enemy.type=='bat1'||enemy.type=='greenslime'||enemy.type=='blueslime'||enemy.type=='pinkslime'||enemy.type=='bunny'|| enemy.type=="skellybones"  ||enemy.type=="zombie" ){
        for (let block of renderedBlocks) {
            if(enemy.type=='bat'|| enemy.type=='wasp'||enemy.type=='ethoper2'||enemy.type=='ethoper3'){
                      if ( block.type === 'stone_wall' || block.type === 'log_wall' || block.type === 'brickwall'|| block.type === 'gypsumblock'|| block.type === 'planks'|| block.type === 'cave_wall' ||block.type === 'rubyblock'||block.type === 'sapphireblock'||block.type === 'emeraldblock'||block.type === 'voidblock'||block.type === 'housegrass'||block.type === 'abyssblock'||block.type === 'abyssblock2' ||block.type === 'fence' || block.type === 'hellwall' ||block.type === 'hellwall2'|| block.type === 'basalt' ||block.type === 'granite'|| block.type === 'basalt') {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {
collisionDetected = true;break;}else if(distanceToBlock<collisionRadius-3){
    return false;
}
          }
            }else if (block.type === 'rock' || block.type === 'tree0'|| block.type === 'ethertree1' || block.type === 'etherlog' || block.type === 'birch0' || block.type === 'yew0' || block.type === 'pine0' || block.type === 'stone_wall' || block.type === 'log_wall'|| block.type === 'log' || block.type === 'brickwall'|| block.type === 'gypsumblock'|| block.type === 'planks'|| block.type === 'cave_wall' ||block.type === 'rubyblock'||block.type === 'sapphireblock'||block.type === 'emeraldblock'||block.type === 'voidblock'||block.type === 'housegrass'||block.type === 'abyssblock' ||block.type === 'abyssblock2'||block.type === 'fence' || block.type === 'hellwall' ||block.type === 'hellwall2'|| block.type === 'basalt' ||block.type === 'granite'|| block.type === 'basalt'|| block.type === 'snowpine1'|| block.type === 'palmlog'|| block.type === 'lamp'|| block.type === 'palm1' ||block.type === 'coral1block' ||block.type === 'coral2block'
              ||block.type === 'bookshelf' ||block.type === 'shelf'
            ) {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {
collisionDetected = true;break;}else if(distanceToBlock<collisionRadius-3){
    return false;
}
          }
        }
}else {
for (let block of renderedBlocks) {
  if (block.type !== 'etherwater' && block.type !== 'water' && block.type !== 'shallowwater' && block.type !== 'water1' && block.type!=="swampwater" ) {
    let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
    let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
    let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {collisionDetected2 = true; break;}}}}
var collisionwithwater1 = false;
if (enemy.type == "bunny"|| enemy.type == "pinkslime" ||enemy.type == "greenslime" ||enemy.type == "blueslime"||enemy.type == "skellybones"||enemy.type=="zombie"||enemy.type=="spider") {
for (let block of renderedBlocks) {
if (block.type == 'water' || block.type == 'etherwater'  || block.type == 'water1' || block.type =="swampwater") {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {
let isCovered = renderedBlocks.some(otherBlock => 
otherBlock.x === block.x && otherBlock.y === block.y && otherBlock !== block  );
if (!isCovered) {
collisionwithwater1 = true; break;
}}}}}
if (collisionDetected && enemy.type !== 'shark' ) {
enemy.x = prevX;enemy.y = prevY;
} 
for (let block of renderedBlocks) {
if ( block.type === 'magma' ) {
let dx = (enemy.x-XADD + enemy.width / 2) - offsetX - (block.x + blockSize / 2);
let dy = (enemy.y-YADD + enemy.height / 2) - offsetY - (block.y + blockSize / 2);
let distanceToBlock = Math.sqrt(dx * dx + dy * dy);
if (distanceToBlock < collisionRadius) {
updatehp=-1; break;} 
}}
if (collisionDetected2 &&(enemy.type === 'shark') ) { return false;  } else if (collisionwithwater1 &&( enemy.type === 'bunny'||enemy.type === 'skellybones' ||enemy.type=="zombie" ||enemy.type=="spider" ||enemy.type === 'pinkslime'||enemy.type === 'greenslime'|| enemy.type === 'blueslime')) { return false; }
if(enemy.type=="voltary" ){
enemy.tickCount++;
if (enemy.tickCount >= 5) { 
enemy.animationFrame = (enemy.animationFrame + 1) ;
if(enemy.animationFrame>5){
enemy.animationFrame=0; }
enemy.tickCount = 0; }
isRaining=true; }  
if (enemy.type == "pinkslime"||enemy.type == "greenslime"||enemy.type == "blueslime") {
  enemy.tickCount++;
  if (enemy.tickCount >= 2) { 
    enemy.animationFrame = (enemy.animationFrame + 1); 
    if (enemy.animationFrame > 5) {
      enemy.animationFrame = 0
    }enemy.tickCount = 0;
} 
} else  if (enemy.type == "aquagod") {
  enemy.tickCount++;
  if (enemy.tickCount >= 5) { 
    enemy.animationFrame = (enemy.animationFrame + 1); 
    if (enemy.animationFrame > 5) {
      enemy.animationFrame = 0
    }enemy.tickCount = 0;
} isRaining = true
}else if (enemy.type == "flesh") { enemy.tickCount++;
if (enemy.tickCount >= 3) {
enemy.animationFrame = (enemy.animationFrame + 1);
if (enemy.animationFrame > 3) {enemy.animationFrame = 0; }enemy.tickCount = 0; 
}
}else if (enemy.type == "spikegod") {enemy.tickCount++;if (enemy.tickCount >= 5) {enemy.animationFrame = (enemy.animationFrame + 1) % 2; enemy.tickCount = 0; } isRaining = false
updateDayNightCycle();updateDayNightCycle();updateDayNightCycle();setTimeout(updateDayNightCycle,500);setTimeout(updateDayNightCycle,600);setTimeout(updateDayNightCycle,800);setTimeout(updateDayNightCycle,1000);setTimeout(updateDayNightCycle,1500); 
}else if (enemy.type == "2medusa") {
  enemy.tickCount++;
if (enemy.tickCount >= 5) { 
  enemy.animationFrame = (enemy.animationFrame + 1); 
if (enemy.animationFrame > 5) {
enemy.animationFrame = 0
} enemy.tickCount = 0; }}else if(enemy.type=="ghost"){   enemy.tickCount++;
if (enemy.tickCount >= 20) { 
  enemy.animationFrame = (enemy.animationFrame + 1) % 2; 
  enemy.tickCount = 0; 
}} else if(enemy.type=='ethoper3'){  enemy.tickCount++;
if (enemy.tickCount >= 2) { 
  enemy.animationFrame = (enemy.animationFrame + 1) % 2; 
  enemy.tickCount = 0; 
}} else{  enemy.tickCount++;
if (enemy.tickCount >= 5) { 
  enemy.animationFrame = (enemy.animationFrame + 1) % 2; 
  enemy.tickCount = 0; 
}}
if(updatehp!==0){
	enemy.hp+=updatehp
	if(enemy.hp<0){
	 enemytoremove=enemy
	}
}
return true; 
});
if(enemytoremove!==0){
 	dropsEnemyLoot(enemytoremove,0,0)
renderedEnemies = renderedEnemies.filter(enemy => enemy!==enemytoremove); 
}
if(newEnemies.length>0){
renderedEnemies.push(...newEnemies); 
}
if(yyte!==null){
  removeEntityById(yyte);  yyte=null
} else {
  if (diedRMEN == 1) {
  diedRMEN = 0;
  if (REMALL ) {
	transformToActiveColl()
	TextPopUp2("You Failed...")
	REMALL="ethoper"
	if (REMALL !== null) {
	renderedEnemies = renderedEnemies.filter(enemy => enemy.type !== REMALL)
 }
}else{
  renderedEnemies = renderedEnemies.filter(enemy => !attackedenemy.includes(enemy)); 
  attackedenemy = []
   }}
}
}
if(orbCollision){
 lvbar.classList.remove("hidden2");
 orbDisplay=25
}

  if (REMALL !== null) {
  	attackEnemyAtPosition(0,0)
  	renderedEnemies = renderedEnemies.filter(enemy => enemy.type !== REMALL)
  }
  if(scheduleEnemies&&scheduleEnemies.length>0){
  	renderedEnemies=[...renderedEnemies, ...scheduleEnemies]
  	scheduleEnemies=[]
  }
    if( removebymagic==1){
      attackEnemyAtPosition(0,0)
    }
} 
function checkIfHasEnemy(enemyType, minCount) {
    let count = renderedEnemies.filter(enemy => enemy.type === enemyType).length;
    return count >= minCount;
}
let fogOPACITY=0.001
function drawEnemyHealthBar(enemy) {
	let XADD = zoomedDELTA / 2
let YADD = zoomedDELTA / 2
  const healthBarWidth = 30; 
  const healthBarHeight = 4.5; 
  const healthRatio = enemy.hp / enemies[enemy.type].hp; 
  const healthBarX = enemy.x - offsetX + (enemy.width / 2) - (healthBarWidth / 2);
  const healthBarY = enemy.y - offsetY - 10; 
  ctx.fillStyle = "#CC5500";
  ctx.fillRect(healthBarX+XADD, healthBarY+YADD, healthBarWidth, healthBarHeight);
  ctx.fillStyle = "#039900";
  ctx.fillRect(healthBarX+XADD, healthBarY+YADD, healthBarWidth * healthRatio, healthBarHeight);
if (enemy.specialhp > 0) {
	const shpRatio = enemy.specialhp / enemy.specialhpMax
	ctx.fillStyle = "gold"
	ctx.fillRect(healthBarX + XADD, healthBarY + YADD, healthBarWidth * shpRatio, healthBarHeight)
}ctx.globalAlpha =1;
}
let deadenemies=[]
function drawEnemies() {
 renderedEnemies.forEach(enemy => {
let XADD=zoomedDELTA/2
let YADD=zoomedDELTA/2
if(enemy.type=='orb'  ){ const enemyTexture = enemy.animationFrame === 0 ? specialTextures['orb1'] : specialTextures['orb2']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}

if(enemy.type=='demon' || enemy.type=='demon1' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['demon1'] : enemyTextures['demon2']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}
if(enemy.type=='demonbat' || enemy.type=='demonbat2' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['demonbat1'] : enemyTextures['demonbat2']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}
if(enemy.type=='bat' || enemy.type=='bat1' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['bat'] : enemyTextures['bat1']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if( enemy.type=='greenmagic' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['greenmagic1'] : enemyTextures['greenmagic2']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if( enemy.type=='butterflyred' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['butterflyred1'] : enemyTextures['butterflyred2']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if( enemy.type=='butterflyblue' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['butterflyblue1'] : enemyTextures['butterflyblue2']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if( enemy.type=='firefly' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['firefly1'] : enemyTextures['firefly2']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if( enemy.type=='butterflyyellow' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['butterflyyellow1'] : enemyTextures['butterflyyellow2']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}else if (enemy.type == 'dummyvector') { 
const enemyTexture = enemyTextures['dummyvector']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'magic') {const enemyTexture = enemyTextures['magic']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'godmagic') {const enemyTexture = enemyTextures['godmagic']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'aquablast') {const enemyTexture = enemyTextures['aquablast']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'universeblast') {const enemyTexture = enemyTextures['universeblast']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'universebulb') {const enemyTexture = enemyTextures['universebulb']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'trueprojectile') {const enemyTexture = enemyTextures['trueprojectile']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'ghost') {const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['ghost1'] : enemyTextures['ghost'];; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'hyperblast') {const enemyTexture = enemyTextures['hyperblast']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
}else if (enemy.type == 'boomerang') {const enemyTexture = enemyTextures['boomerang'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle2-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'arrow') {const enemyTexture = enemyTextures['arrow'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93.45);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'goodarrow') {const enemyTexture = enemyTextures['goodarrow'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93.45);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'hyperarrows') {const enemyTexture = enemyTextures['hyperarrows'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93.45);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'powerfullarrow') {const enemyTexture = enemyTextures['powerfullarrow'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93.45);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'good_boomerang') {const enemyTexture = enemyTextures['good_boomerang'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle2-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'draco_boomerang') {const enemyTexture = enemyTextures['draco_boomerang'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle2-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'hell_boomerang') {const enemyTexture = enemyTextures['hell_boomerang'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle2-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'titanium_boomerang') {const enemyTexture = enemyTextures['titanium_boomerang'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle2-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }  
}else if (enemy.type == 'magicsharp') {const enemyTexture = enemyTextures['magicsharp']; if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);
    }
} if(enemy.type=='hellskull' || enemy.type=='hellskull1' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['hellskull1'] : enemyTextures['hellskull2']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if(enemy.type=='flesher1' || enemy.type=='flesher' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['flesher1'] : enemyTextures['flesher2']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if(enemy.type=='desertelemental' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['desertelemental2'] : enemyTextures['desertelemental1']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if(enemy.type=='soulcat' || enemy.type=='soulcat1' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['soulcat1'] : enemyTextures['soulcat2']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if(enemy.type=='frozenghost' || enemy.type=='frozenghost1' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['frozenghost2'] : enemyTextures['frozenghost1']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}if(enemy.type=='voidguardian' || enemy.type=='voidguardian1' ){ const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['voidguardian1'] : enemyTextures['voidguardian2']; drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.drawImage( enemyTexture, enemy.x + XADD - offsetX,  enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}else if (enemy.type == 'trueuniversehead') {const enemyTexture = enemyTextures['trueuniversehead'];
    drawEnemyHealthBar(enemy);if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {ctx.save()
        ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
        ctx.rotate(enemy.angle - 89.8);
        ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore()
    }
} else if (enemy.type == 'trueuniversebody') {
    const enemyTexture = enemyTextures['trueuniversebody'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }
}else if (enemy.type == 'deepgodhead') {
    const enemyTexture = enemyTextures['deepgodhead'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); } drawEnemyHealthBar(enemy);
}else if (enemy.type == 'deepgodtorso') {
    const enemyTexture = enemyTextures['deepgodtorso'];
    if (enemyTexture.complete && enemyTexture.naturalWidth > 0) { ctx.save(); ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2); ctx.rotate(enemy.angle-93);ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore(); }
}else if (enemy.type == 'abyssdevourerbody') {
  const enemyTexture = enemyTextures['abyssdevourerbody'];
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.save()
    ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
    ctx.rotate(enemy.angle - 93);
    ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    ctx.restore()
  }
}else if (enemy.type == 'abyssdevourerhead') {
  const enemyTexture = enemyTextures['abyssdevourerhead'];
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.save()
    ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
    ctx.rotate(enemy.angle - 93);
    ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    ctx.restore()
  }
  drawEnemyHealthBar(enemy);
}else if (enemy.type == 'desertscourgehead') {
  const enemyTexture = enemyTextures['desertscourgehead'];
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.save()
    ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
    ctx.rotate(enemy.angle - 93);
    ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    ctx.restore()
  }
  drawEnemyHealthBar(enemy);
}else if (enemy.type == 'desertscourgebody') {
  const enemyTexture = enemyTextures['desertscourgebody'];
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.save()
    ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
    ctx.rotate(enemy.angle - 93);
    ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    ctx.restore()
  }
}else if (enemy.type == 'hellscourgebody') {
  const enemyTexture = enemyTextures['hellscourgebody'];
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.save()
    ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
    ctx.rotate(enemy.angle - 93);
    ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    ctx.restore()
  }
}else if (enemy.type == 'crimsonprojectile') {
	const enemyTexture = enemyTextures['crimsonprojectile'];
	if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
		ctx.save()
		ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
		ctx.rotate(enemy.angle - 93);
		ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
		ctx.restore()
	}
}else if (enemy.type == 'etherbeam') {
	const enemyTexture = enemyTextures['etherbeam'];
	if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
		ctx.save()
		ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
		ctx.rotate(enemy.angle - 93);
		ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
		ctx.restore()
	}
}else if (enemy.type == 'hellscourgehead') {
  const enemyTexture = enemyTextures['hellscourgehead'];
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.save()
    ctx.translate(enemy.x + XADD - offsetX + enemy.width / 2, enemy.y + YADD - offsetY + enemy.height / 2);
    ctx.rotate(enemy.angle - 93);
    ctx.drawImage(enemyTexture, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    ctx.restore()
  }
  drawEnemyHealthBar(enemy);
}
else if(enemy.type=='pinkslime'){ var enemyTexture=null; if(enemy.animationFrame==1){ enemyTexture=enemyTextures['pinkslime1']; }else if(enemy.animationFrame==0){ enemyTexture=enemyTextures['pinkslime2']; }else if (enemy.animationFrame == 3) { enemyTexture = enemyTextures['pinkslime3']; }else{ enemyTexture = enemyTextures['pinkslime3']; }
drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(enemyTexture, enemy.x + XADD - offsetX, enemy.y + YADD - offsetY, enemy.width, enemy.height);}
}else if(enemy.type=='blueslime'){ var enemyTexture=null; if(enemy.animationFrame==1){ enemyTexture=enemyTextures['blueslime1']; }else if(enemy.animationFrame==0){ enemyTexture=enemyTextures['blueslime2']; }else if (enemy.animationFrame == 3) { enemyTexture = enemyTextures['blueslime3']; }else{ enemyTexture = enemyTextures['blueslime3']; }
drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(enemyTexture, enemy.x + XADD - offsetX, enemy.y + YADD - offsetY, enemy.width, enemy.height);}
} else if(enemy.type=='greenslime'){ var enemyTexture=null; if(enemy.animationFrame==1){ enemyTexture=enemyTextures['greenslime1']; }else if(enemy.animationFrame==0){ enemyTexture=enemyTextures['greenslime2']; }else if (enemy.animationFrame == 3) { enemyTexture = enemyTextures['greenslime3']; }else{ enemyTexture = enemyTextures['greenslime3']; }
drawEnemyHealthBar(enemy); if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(enemyTexture, enemy.x + XADD - offsetX, enemy.y + YADD - offsetY, enemy.width, enemy.height);}
} else if(enemy.type=='wasp'||enemy.type=='wasp1'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['wasp'] : enemyTextures['wasp1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='skull'||enemy.type=='skull1'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['skull'] : enemyTextures['skull1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='floatingeye'||enemy.type=='floatingeye1'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['floatingeye1'] : enemyTextures['floatingeye2'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='spary'||enemy.type=='spary2'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['spary'] : enemyTextures['spary2'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='darkeye'||enemy.type=='darkeye'){
        const enemyTexture =   enemyTextures['darkeye'] ;
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='spikegod'||enemy.type=='spikegod1'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['spikegod'] : enemyTextures['spikegod1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='giantbat'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['giantbat'] : enemyTextures['giantbat1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='ethoper'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['ethoper2'] : enemyTextures['ethoper1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='ethoper2'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['ethoper2'] : enemyTextures['ethoper1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='ethoper3'){
        const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['ethoper2'] : enemyTextures['ethoper1'];
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='voltary'||enemy.type=='voltary2'){
          var enemyTexture=null
          if(enemy.animationFrame==1){
            enemyTexture=enemyTextures['voltary']
          }else if(enemy.animationFrame==0){
            enemyTexture=enemyTextures['voltary2']
          }else if (enemy.animationFrame == 3) {
  enemyTexture = enemyTextures['voltary3']
}else{
  enemyTexture = enemyTextures['voltary3']
}
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='aquagod'||enemy.type=='aquagod2'){
          var enemyTexture=null
          if(enemy.animationFrame==1){
            enemyTexture=enemyTextures['aquagod1']
          }else if(enemy.animationFrame==0){
            enemyTexture=enemyTextures['aquagod2']
          }else if (enemy.animationFrame == 3) {
  enemyTexture = enemyTextures['aquagod3']
}else{
  enemyTexture = enemyTextures['aquagod3']
}
        drawEnemyHealthBar(enemy);
        if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
            ctx.drawImage(
                enemyTexture, 
                enemy.x + XADD - offsetX, 
                enemy.y + YADD - offsetY, 
                enemy.width, 
                enemy.height
            );
        }}else if(enemy.type=='insaneuniversegod'||enemy.type=='insaneuniversegod1'){
var enemyTexture=null
if(enemy.animationFrame==1){
enemyTexture=enemyTextures['insaneuniversegod1']
}else if(enemy.animationFrame==0){
enemyTexture=enemyTextures['insaneuniversegod2']
}else if (enemy.animationFrame == 3) {
enemyTexture = enemyTextures['insaneuniversegod1']
}else{
enemyTexture = enemyTextures['insaneuniversegod2']
}
drawEnemyHealthBar(enemy);
if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(
enemyTexture,
enemy.x + XADD - offsetX, 
enemy.y + YADD - offsetY, 
enemy.width,
enemy.height
);
}}else if(enemy.type=='flesh'||enemy.type=='flesh1'){
var enemyTexture=null
if(enemy.animationFrame==1){
enemyTexture=enemyTextures['flesh1']
}else if(enemy.animationFrame==0){
enemyTexture=enemyTextures['flesh2']
}else if (enemy.animationFrame == 3) {
enemyTexture = enemyTextures['flesh3']
}else{
enemyTexture = enemyTextures['flesh3']
}
drawEnemyHealthBar(enemy);
if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(
enemyTexture,
enemy.x + XADD - offsetX, 
enemy.y + YADD - offsetY, 
enemy.width,
enemy.height
);
}}else if(enemy.type=='2medusa'){
var enemyTexture=null
if(enemy.animationFrame==1){
enemyTexture=enemyTextures['2medusa1']
}else if(enemy.animationFrame==0){
enemyTexture=enemyTextures['2medusa2']
}else if (enemy.animationFrame == 3) {
enemyTexture = enemyTextures['2medusa3']
}else{
enemyTexture = enemyTextures['2medusa1']
}
drawEnemyHealthBar(enemy);
if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(
enemyTexture,
enemy.x + XADD - offsetX, 
enemy.y + YADD - offsetY, 
enemy.width,
enemy.height
);
}}else if (enemy.type == "shark") {
  const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['shark'] : enemyTextures['shark1'];
  drawEnemyHealthBar(enemy);
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.drawImage(
      enemyTexture,
      enemy.x + XADD - offsetX, 
      enemy.y + YADD - offsetY, 
      enemy.width,
      enemy.height
    );
  }
}else if (enemy.type == "1medusa") {
  const enemyTexture = enemy.animationFrame === 0 ? enemyTextures['1medusa1'] : enemyTextures['1medusa2'];
  drawEnemyHealthBar(enemy);
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.drawImage(
      enemyTexture,
      enemy.x + XADD - offsetX, 
      enemy.y + YADD - offsetY, 
      enemy.width,
      enemy.height
    );
  }
}  else if (enemy.type == "raven") {
  let enemyTexture;drawEnemyHealthBar(enemy); if (enemy.direction == 0) { enemyTexture = enemy.animationFrame === 0 ? enemyTextures['raven-up'] : enemyTextures['raven-up2'];} if (enemy.direction == 1) {  enemyTexture = enemy.animationFrame === 0 ? enemyTextures['raven-down'] : enemyTextures['raven-down2'];}
  if (enemy.direction == 2) {  enemyTexture = enemy.animationFrame === 0 ? enemyTextures['raven-left'] : enemyTextures['raven-left2'];  }if (enemy.direction == 3) { enemyTexture = enemy.animationFrame === 0 ? enemyTextures['raven-right'] : enemyTextures['raven-right2'];  }  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.drawImage(
      enemyTexture,
      enemy.x + XADD - offsetX,
      enemy.y + YADD - offsetY,
      enemy.width,
      enemy.height
    );
  }
}else if (enemy.type == "duck") {
  let enemyTexture;  if (enemy.direction == 0) { enemyTexture = enemy.animationFrame === 0 ? enemyTextures['duckup1'] : enemyTextures["duckup2"];} if (enemy.direction == 1) {  enemyTexture = enemy.animationFrame === 0 ? enemyTextures['duckdown1'] : enemyTextures['duckdown2'];}
  if (enemy.direction == 2) {  enemyTexture = enemy.animationFrame === 0 ? enemyTextures['duckleft1'] : enemyTextures['duckleft2'];  }if (enemy.direction == 3) { enemyTexture = enemy.animationFrame === 0 ? enemyTextures['duckright1'] : enemyTextures['duckright2'];  }  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.drawImage(
      enemyTexture,
      enemy.x + XADD - offsetX,
      enemy.y + YADD - offsetY,
      enemy.width,
      enemy.height
    );
  }
}
else if (enemy.type == "skellybones") {
  let enemyTexture;
  drawEnemyHealthBar(enemy);
  if (enemy.direction == 0) {
    enemyTexture = enemy.animationFrame === 0 ? enemyTextures['skellybonesup1'] : enemyTextures['skellybonesup2'];}
  if (enemy.direction == 1) {
    enemyTexture = enemy.animationFrame === 0 ? enemyTextures['skellybonesdown1'] : enemyTextures['skellybonesdown2'];}
  if (enemy.direction == 2) {
    enemyTexture = enemy.animationFrame === 0 ? enemyTextures['skellybonesleft1'] : enemyTextures['skellybonesleft2'];}
  if (enemy.direction == 3) {
    enemyTexture = enemy.animationFrame === 0 ? enemyTextures['skellybonesright1'] : enemyTextures['skellybonesright2'];}
  if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
    ctx.drawImage(
      enemyTexture,
      enemy.x + XADD - offsetX,
      enemy.y + YADD - offsetY,
      enemy.width,
      enemy.height
    );
  }
}else if (enemy.type == "zombie") {
let enemyTexture;
drawEnemyHealthBar(enemy);
if (enemy.direction == 0) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['zombieU1'] : enemyTextures['zombieU2'];}
if (enemy.direction == 1) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['zombieD1'] : enemyTextures['zombieD2'];}
if (enemy.direction == 2) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['zombieL1'] : enemyTextures['zombieL2'];}
if (enemy.direction == 3) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['zombieR1'] : enemyTextures['zombieR2'];}
if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(
enemyTexture,
enemy.x + XADD - offsetX,
enemy.y + YADD - offsetY,
enemy.width,
enemy.height
);
}
}else if (enemy.type == "spider") {
let enemyTexture;
drawEnemyHealthBar(enemy);
if (enemy.direction == 0) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['spiderU1'] : enemyTextures['spiderU2'];}
if (enemy.direction == 1) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['spiderD1'] : enemyTextures['spiderD2'];}
if (enemy.direction == 2) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['spiderL1'] : enemyTextures['spiderL2'];}
if (enemy.direction == 3) {
enemyTexture = enemy.animationFrame === 0 ? enemyTextures['spiderR1'] : enemyTextures['spiderR2'];}
if (enemyTexture.complete && enemyTexture.naturalWidth > 0) {
ctx.drawImage(
enemyTexture,
enemy.x + XADD - offsetX,
enemy.y + YADD - offsetY,
enemy.width,
enemy.height
);
}
}else if(enemy.type=="bunny"){
  drawEnemyHealthBar(enemy);
        switch (enemy.direction) {
            case 0: 
                enemyTexture = enemyTextures['bunn-up'];
                break;
            case 1: 
                enemyTexture = enemyTextures['bunn-down'];
                break;
            case 2: 
                enemyTexture = enemyTextures['bunn-left'];
                break;
            case 3: 
                enemyTexture = enemyTextures['bunn-right'];
                break;
        }
          ctx.drawImage(
  enemyTexture,
  enemy.x + XADD - offsetX, 
  enemy.y + YADD - offsetY, 
  enemy.width,
  enemy.height
);
        }
    });
    RENDEREDENEMIES2 = renderedEnemies
}  
function createDummyVectorIfNotNearby(block) {
  const globalX = block.x + parseInt(block.chunkX) * blockSize;
  const globalY = block.y + parseInt(block.chunkY) * blockSize;
  for (let dummy of renderedEnemies) {
   if(dummy.type=="dummyvector"){
    const dx = dummy.x - globalX;
    const dy = dummy.y - globalY;
      if (dx * dx + dy * dy <= 64 * 64) {
        return;
      }
    }
  }
  let dumvector = new EnemyNOR( globalX, globalY, 'dummyvector');
  renderedEnemies.push(dumvector);
}
let etherEventActive=false
let currentWave=0
let maxWaves=5
let waveEnemies=[]
let etherChunkKey=null
let etherBlockIndex=null
let waveInProgress=false
function spawnWave(){
if(currentWave>maxWaves){
transformToEthergate()
return
}
waveInProgress=true
for(let i=0;i<10;i++){
let pos=generateSpawnPosition()
let enemy=new Enemy(pos.x,pos.y,'ethoper')
enemy.speed=2
renderedEnemies.push(enemy)
waveEnemies.push(enemy)
}
TextPopUp("Wave "+currentWave+" / "+maxWaves+" started!")
}
function generateSpawnPosition(){
let minDist=Math.floor(Math.random()*12) +blockSize*5
let ex,ey
do{
ex=offsetX+(Math.random()<0.5?-1:1)*(minDist+Math.random()*minDist*2)
ey=offsetY+(Math.random()<0.5?-1:1)*(minDist+Math.random()*minDist*2)
}while(Math.abs(ex-offsetX)<minDist||Math.abs(ey-offsetY)<minDist)
return{x:ex,y:ey}
}
let nextWaveCountdown = 0
function checkWaveCleared(){
	if (nextWaveCountdown > 0) {
	nextWaveCountdown--
	if (nextWaveCountdown === 0) {
		currentWave++
		TextPopUp("Starting new wave...")
		spawnWave()
	}
}
if(!waveInProgress) return
waveEnemies = renderedEnemies.filter(e=>!e.dead&&e.type==='ethoper')
showTextInCanvas(waveEnemies.length+" left.")
if(waveEnemies.length===0){
    waveInProgress=false
    TextPopUp("Wave "+currentWave+" / "+maxWaves+" cleared!")
    if(currentWave<maxWaves){
        nextWaveCountdown=5
    } else {
        transformToEthergate()
    }
}}
function transformToEthergate(){
    if(etherChunkKey && etherBlockIndex != null){
        let blocks = chunks[etherChunkKey]
        if(blocks){
            for(let i=0;i<blocks.length;i++){
                let b=blocks[i]
                if(b && b.type==='etheractive'){
                    removeBlockAtPosition(b.x,b.y,'etheractive')
                    buildBlockAtPosition(b.x,b.y,'ethergate')
                    blocks[i]={x:b.x,y:b.y,type:'ethergate'}
                }
            }
            etherEventActive=false
            etherChunkKey=null
            etherBlockIndex=null
            waveInProgress=false
            TextPopUp("Ethergate has opened!")
        }
    }
}
function transformToActiveColl(){
    if(etherChunkKey && etherBlockIndex!=null){
        let blocks=chunks[etherChunkKey]
        if(blocks && blocks[etherBlockIndex]){
            let b=blocks[etherBlockIndex]
            if(b.type==='etheractive'){
                b.type='etheractive2'
            }
        }
        etherEventActive=false
        etherChunkKey=null
        etherBlockIndex=null
        waveInProgress=false
    }
}
function growTreeInVisibleChunks() {
    const radius = 95;
    const minX = Math.floor((offsetX ) / blockSize)-5;
    const maxX = Math.floor((offsetX ) / blockSize)+radius;
    const minY = Math.floor((offsetY ) / blockSize)-5;
    const maxY = Math.floor((offsetY ) / blockSize)+radius;
    const torchTypes = [
    "torch",
    "whitetorch",
    "orangetorch",
    "darktorch",
    "fluortorch",
    "limetorch",
    "purpletorch",
    "bluetorch"
];

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const chunkKey = `${x},${y}`;
            const chunkBlocks = chunks[chunkKey];
            if (!chunkBlocks) continue;
            chunkBlocks.forEach((block,index) => {
 if (Math.random() < 0.095 && Math.random() < 0.075) {
        if (block.type === 'lit_furnace') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'lit_furnace');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'furnace'); 
}}
if (isRaining&&Math.random() < 0.1 && Math.random() < 0.03) {
if (block.type === 'log0'){
const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
let xc=Math.floor(((globalX - offsetX) / 32) * 32)
let yc=Math.floor(((globalY - offsetY) / 32) * 32)
console.log(xc,yc)
if( !checkBlockAtPosition(xc,yc,"honey_mushrooms") && checkBlockAtPosition(xc,yc,"forestgrass")||checkBlockAtPosition(xc,yc,"forestgrasslayer") ){
buildBlockAtPosition(xc, yc, 'honey_mushrooms');
}
}}
if(Math.random()<0.5&&nightpower>2&&!etherEventActive){
if(block.type==='etherthing'){
const globalX=block.x+3+(parseInt(chunkKey.split(',')[0])*blockSize)
const globalY=block.y+3+(parseInt(chunkKey.split(',')[1])*blockSize)
removeBlockAtPosition(Math.floor(((globalX-offsetX)/32)*32),Math.floor(((globalY-offsetY)/32)*32),'etherthing')
buildBlockAtPosition(Math.floor(((globalX-offsetX)/32)*32),Math.floor(((globalY-offsetY)/32)*32),'etheractive')
etherEventActive=true
currentWave=1
etherChunkKey=chunkKey
etherBlockIndex=index
spawnWave()
}}else if(Math.random()<0.5&&nightpower<1){
if(block.type==='etheractive'){
const globalX=block.x+3+(parseInt(chunkKey.split(',')[0])*blockSize)
const globalY=block.y+3+(parseInt(chunkKey.split(',')[1])*blockSize)
removeBlockAtPosition(Math.floor(((globalX-offsetX)/32)*32),Math.floor(((globalY-offsetY)/32)*32),'etheractive')
buildBlockAtPosition(Math.floor(((globalX-offsetX)/32)*32),Math.floor(((globalY-offsetY)/32)*32),'etherthing')
}}
else if (inether && Math.random() < 0.11 && Math.random() < 0.2 && isRaining) {
 const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
        if (block.type === 'dirt' && checkBlockAtPositionOnlyDirt( Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32) )) {
           if(Math.random()<0.3){
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'etherwater'); 
           }else{
             buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'water'); 
           }
        }}
else if (!inether&&Math.random() < 0.11 && Math.random() < 0.2 && isRaining) {
 const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
        if (block.type === 'dirt' && checkBlockAtPositionOnlyDirt( Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32) )) {
           if(Math.random()<0.3){
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'water'); 
           }else{
             buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'shallowwater'); 
           }
        }}
else if (block.type === 'sandblock2' ) {
 const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
if (block.type === 'sandblock2' && checkBlockAtPositionOnlyWaterDirt( Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32) ) ) {
removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'sandblock2');
removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), checkBlockAtPositionOnlyWaterDirt(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32)));
buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'coast'); 
}}
 
else if (block.type === 'sand' ) {
 const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
if (block.type === 'sand' && checkBlockAtPositionOnlyWaterDirt( Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32) )) {
removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'sand');
removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), checkBlockAtPositionOnlyWaterDirt(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32)));
buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'coast'); 
}}
else if (torchTypes.includes(block.type) && isunderwater && Math.random()<0.5) {
    const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
    const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
    const worldX = Math.floor(((globalX - offsetX) / 32) * 32);
    const worldY = Math.floor(((globalY - offsetY) / 32) * 32);

    removeBlockAtPosition(worldX, worldY, block.type);
    buildBlockAtPosition(worldX, worldY, "extinguished_torch");
}
else if(isunderwater && Math.random()<0.5){
        if (block.type === 'lit_kiln') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'lit_kiln');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'kiln'); 
        }
        if (block.type === 'ignited_fiber') {
	const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
	const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
	removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'ignited_fiber');
	buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'fiber');
}
        if (block.type === 'campfire') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'campfire');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'extinguished_campfire'); 
        }
        if (block.type === 'lit_furnace') {
	const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
	const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
	removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'lit_furnace');
	buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'furnace');
}}
else if (Math.random() < 0.095 && Math.random() < 0.075) {
        if (block.type === 'lit_kiln') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'lit_kiln');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'kiln'); 
        }}else if (Math.random() < 0.075 && Math.random() < 0.075) {
        if (block.type === 'campfire') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'campfire');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'extinguished_campfire'); 
        }}else if (Math.random() < 0.075 && Math.random() < 0.075) {
        if (block.type === 'wildcarrot') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'wildcarrot');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'carrot2'); 
        }}  if (Math.random() < 0.075 && Math.random() < 0.075) {
        if (block.type === 'pumpkin1') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'pumpkin1');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'pumpkin2'); 
        }}else if (Math.random() < 0.085 && Math.random() < 0.085) {
        if (block.type === 'pumpkin2') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'pumpkin2');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'pumpkin3'); 
        }}
        if (Math.random() < 0.075 && Math.random() < 0.075) {
        if (block.type === 'melon1') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'melon1');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'melon2'); 
        }}else if (Math.random() < 0.085 && Math.random() < 0.085) {
        if (block.type === 'melon2') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'melon2');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'melon'); 
        }}else if (block.type === "dummy") {
  createDummyVectorIfNotNearby({
    x: block.x,
    y: block.y,
    chunkX: chunkKey.split(",")[0],
    chunkY: chunkKey.split(",")[1]
  });
}
        if (Math.random() < 0.075 && Math.random() < 0.075) {
        if (block.type === 'potato2') {
          const globalX = block.x + 3 + (parseInt(chunkKey.split(',')[0]) * blockSize);
          const globalY = block.y + 3 + (parseInt(chunkKey.split(',')[1]) * blockSize);
          removeBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'potato2');
          buildBlockAtPosition(Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32), 'potato'); 
        }}
       if(Math.random()<0.05&&Math.random()<0.09){
            if (block.type === 'hellsapling') {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'hellsapling');
                let treeStructure = [
                    { x: 0, y: 0, type: "helltree0" },    
                    { x: 0, y: -32, type: "helltree1" },
                    { x: 0, y: -64, type: "helltree2" }, 
                ];
                if (!chunks[chunkKey]) {
                    chunks[chunkKey] = [];
                }
                treeStructure.forEach((treeBlock) => {
                    chunks[chunkKey].push({
                        x: block.x + treeBlock.x,  
                        y: block.y + treeBlock.y,  
                        type: treeBlock.type       
                    });
                });
            }}
if(Math.random()<0.05&&Math.random()<0.05){
            if (block.type === 'abysssapling') {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'abysssapling');
                let treeStructure = [
                    { x: 0, y: 0, type: "abysstree0" },    
                    { x: 0, y: -32, type: "abysstree1" },
                    { x: 0, y: -64, type: "abysstree2" }, 
                ];
                if (!chunks[chunkKey]) {
                    chunks[chunkKey] = [];
                }
                treeStructure.forEach((treeBlock) => {
                    chunks[chunkKey].push({
                        x: block.x + treeBlock.x,  
                        y: block.y + treeBlock.y,  
                        type: treeBlock.type       
                    });
                });
            }}
            if(Math.random()<0.05&&Math.random()<0.09){
            if (block.type === 'palmsapling') {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'palmsapling');
                let treeStructure = [
                    { x: 0, y: 0, type: "palm1" },    
                    { x: 0, y: -32, type: "palm3" },
                    { x: 0, y: -64, type: "palm2" }, 
                ];
                if (!chunks[chunkKey]) {
                    chunks[chunkKey] = [];
                }
                treeStructure.forEach((treeBlock) => {
                    chunks[chunkKey].push({
                        x: block.x + treeBlock.x,  
                        y: block.y + treeBlock.y,  
                        type: treeBlock.type       
                    });
                });
            }}
            if(inether){
             if(Math.random()<0.05&&Math.random()<0.09){
            if (block.type === 'sapling') {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'sapling');
                let treeStructure = [
                    { x: 0, y: 0, type: "ethertree1" },    
                    { x: 0, y: -32, type: "ethertree2" },
                    { x: 0, y: -64, type: "ethertree3" }, 
                ];
                if (!chunks[chunkKey]) {
                    chunks[chunkKey] = [];
                }
                treeStructure.forEach((treeBlock) => {
                    chunks[chunkKey].push({
                        x: block.x + treeBlock.x,  
                        y: block.y + treeBlock.y,  
                        type: treeBlock.type       
                    });
                });
            }}
            }
          if(!inether && Math.random()<0.05&&Math.random()<0.09){
            if (block.type === 'sapling') {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'sapling');
                let treeStructure = [
                    { x: 0, y: 0, type: "pine0" },   
                    { x: 0, y: -32, type: "pine1" },  
                    { x: 0, y: -64, type: "pine2" },  
                    { x: 0, y: -96, type: "pine2" },  
                ];
if(checkBlockAtPosition(globalX-offsetX,globalY -offsetY,"snowgrass")||checkBlockAtPosition(globalX-offsetX ,globalY -offsetY,"snowgrass2")){
   treeStructure = [
    { x: 0, y: 0, type: "snowpine1" }, 
    { x: 0, y: -32, type: "snowpine2" }, 
    { x: 0, y: -64, type: "snowpine3" }, 
    { x: 0, y: -96, type: "snowpine3" }, 
];
}else{
                if (Math.random() < 0.43) {
                  treeStructure = [
                    { x: 0, y: 0, type: "tree0" }, 
                    { x: 0, y: -32, type: "tree1" }, 
                    { x: 0, y: -64, type: "tree2" },
                ];
                } else if (Math.random() < 0.37) {
                  treeStructure = [
                    { x: 0, y: 0, type: "birch0" }, 
                    { x: 0, y: -32, type: "birch1" }, 
                    { x: 0, y: -64, type: "birch2" },
                ];
                }else{}
}
                if (!chunks[chunkKey]) {
                    chunks[chunkKey] = [];
                }
                treeStructure.forEach((treeBlock) => {
                    chunks[chunkKey].push({
                        x: block.x + treeBlock.x, 
                        y: block.y + treeBlock.y, 
                        type: treeBlock.type      
                    });
                });
            }}else if(block.type === 'hook'){
 const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
let XADD = (zoomedDELTA / 3)
let YADD = (zoomedDELTA / 3)
const playerCenterX = player.x +offsetX -XADD + player.width / 2;
const playerCenterY = player.y +offsetY -YADD + player.height/2;
const dx = (globalX - playerCenterX) / blockSize;
const dy = (globalY - playerCenterY) / blockSize;
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance > 2.4) {
	removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'hook');
	addItem("fishing_rod",1);
	cannotmove = 0
	showTextInCanvas("You pulled your rod back!");
	return;
}
if ( checkBlockAtPositionOnlyWaterAndDirt( Math.floor(((globalX - offsetX) / 32) * 32), Math.floor(((globalY - offsetY) / 32) * 32) ) ) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                if (Math.random()<0.5&&Math.random()<0.05) {
                  showTextInCanvas(" something appeared " )
removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'hook');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'catchhook');
                }
            }else{
              showTextInCanvas("there is no any fish... ")
            }
}else if (block.type === 'catchhook') {
  const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
  const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
  if (Math.random() < 0.5 && Math.random() < 0.5 && Math.random() < 0.08) {
    const hasTallgrass = chunkBlocks.some(
      b => b.type === 'water' || b.type === 'water1'
    );
    if (hasTallgrass) {
      removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'catchhook');
      buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'hook');
      showTextInCanvas("ohh no fish run away!");
    }
  }
}else if(block.type === 'empty_black_elderberry'){
            if (Math.random()<0.2&&Math.random()<0.10) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition(globalX - offsetX, globalY - offsetY, 'empty_black_elderberry');
removeBlockAtPosition(globalX - offsetX, globalY -32 - offsetY, 'empty_black_elderberry2');
removeBlockAtPosition(globalX - offsetX, globalY -32 - offsetY, 'empty_black_elderberry');
removeBlockAtPosition(globalX - offsetX, globalY-32 - offsetY, 'empty_black_elderberry');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'black_elderberry');
chunks[chunkKey2].push({ 
            x: 0, 
            y: -32, 
            type: "black_elderberry2" 
        });
            }}}else if(block.type === 'palm1'){
if (Math.random()<0.05&&Math.random()<0.05) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
             let   x =globalX - offsetX
             let   y =globalY - offsetY
deleteFromChunk(x, y, ["palm1", "palm2","palm3"]);
deleteFromChunk(x, y, ["palm12", "coconutpalm", "palm32"]);
removeBlockAtPosition(x, y , "palm1");
removeBlockAtPosition(x, y , "palm12");
removeBlockAtPosition(x, y - (32), "palm3");
removeBlockAtPosition(x, y - (32 * 2), "palm2");
removeBlockAtPosition(x, y - (32), "palm32");
removeBlockAtPosition(x, y - (32 * 2), "coconutpalm");
                let treeStructure = [
                    { x: 0, y: 0, type: "palm12" },
                    { x: 0, y: -32, type: "palm32" },
                    { x: 0, y: -64, type: "coconutpalm" },
                ];
                if (!chunks[chunkKey]) {
                    chunks[chunkKey] = [];
                }
                treeStructure.forEach((treeBlock) => {
                    chunks[chunkKey].push({
                        x: block.x + treeBlock.x,
                        y: block.y + treeBlock.y,
                        type: treeBlock.type
                    });
                });
            }}}else if(block.type === 'mycelium'){
            if (Math.random()<0.04&&Math.random()<0.04) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'mycelium');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'kite1');
            }}}else if(block.type === 'emptyblackberry'){
            if (Math.random()<0.05&&Math.random()<0.05) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'emptyblackberry');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'blackberry');
            }}}else if(block.type === 'cactusempty'){
            if (Math.random()<0.05&&Math.random()<0.04) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'cactusempty');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'cactus');
            }}}else if(block.type === 'briarempty'){
            if (Math.random()<0.05&&Math.random()<0.04) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'briarempty');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'briar');
            }}}else if(block.type === 'thistleseeds'){
            if (Math.random()<0.03&&Math.random()<0.05) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'thistleseeds');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'thistle1');
            }}}else if(block.type === 'dandelion'){
            if (Math.random()<0.015&&Math.random()<0.011) {
 const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'dandelion');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'dandelion2');
            }}else if(block.type === 'dandelionseeds'){
            if (Math.random()<0.022&&Math.random()<0.06) {
              const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
              const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
              var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
              removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'dandelionseeds');
              buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'dandelion2');
            }}else if(block.type === 'rye_seeds'){
            if (Math.random()<0.03&&Math.random()<0.05) {
if (true) {
                const globalX = block.x + (parseInt(chunkKey.split(',')[0]) * blockSize);
                const globalY = block.y + (parseInt(chunkKey.split(',')[1]) * blockSize);
                var chunkKey2 = `${Math.floor((globalX+3)/32)},${Math.floor((globalY+3)/32)}`;
removeBlockAtPosition2(globalX - offsetX, globalY - offsetY, 'rye_seeds');
buildBlockAtPosition(globalX - offsetX, globalY - offsetY, 'rye1');
            }}}
        });
        }
    }
}
var by5=0
function isStayOn(type) {
    const collisionRadius = 32; 
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height; 
    const blockBelow = renderedBlocks.find(block => {
        const blockCenterX = block.x + blockSize / 2;
        const blockCenterY = block.y + blockSize / 2;
        const distance = Math.sqrt(
            (playerCenterX - blockCenterX) ** 2 + (playerCenterY - blockCenterY) ** 2
        );
        return distance <= collisionRadius && block.type === type;
    });
    return blockBelow;
}
const plants = ["dandelion", "grass", "grasslayer", "dandelion2", "forestgrasslayer", "curedgrasslayer","gras2","yellow","violet","thistle","toadstool","fern","daffodil","flax","myosotis","nettle","thistleseeds","kite","briar","briarempty",
"swampgrasslay","swampgrass","ethergrass2","ethergrass",
"forestgrass","forestgrasslayer",
]
let extrabuilder=["stones"]
let extra2builder=["coast","sandblock","sandblock2","desertsand","sand","ethersand2","ethersand"]
function isStandingOnWaterBuilderNonPlant() {
	const collisionRadius = 30;
	const playerCenterX = player.x + player.width / 2;
	const playerCenterY = player.y + player.height / 2;
	let foundSand = false;
 let foundCoast = false;
	for (const block of renderedBlocks) {
		const blockCenterX = block.x + blockSize / 2;
		const blockCenterY = block.y + blockSize / 2;
		const dx = playerCenterX - blockCenterX;
		const dy = playerCenterY - blockCenterY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance > collisionRadius) continue;
		if (plants.includes(block.type) || extrabuilder.includes(block.type)) continue;
 	if (["coast"].includes(block.type)) {
			foundCoast = true;
			continue;
		}
		if (extra2builder.includes(block.type)) {
			foundSand = true; 
			continue; 
		}
		if (waterBuilder.includes(block.type) && !extra2builder.includes(block.type) ) return true;
	}
	return foundCoast ? "coast" : foundSand ? "sand" : false;
}
function isStayOnVis(type) {
  const collisionRadius = 30; 
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height/2; 
let  blocks=[]
  const blockBelow = renderedBlocks.find(block => {
    const blockCenterX = block.x + blockSize / 2;
    const blockCenterY = block.y + blockSize / 2;
    const distance = Math.sqrt(
      (playerCenterX - blockCenterX) ** 2 + (playerCenterY - blockCenterY) ** 2
    );
    if(distance <= collisionRadius){
    blocks.push(block.type);
    }
  });
  let returnO=true
  for(let i=0; i<blocks.length; i++ ){
     if(blocks[i]!==type){
       returnO=false
     }
  }
  return returnO ;
}
function isStayOn2(type) {
    const collisionRadius = 32+ player.width /1.2; 
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height; 
    const blockBelow = renderedBlocks.find(block => {
        const blockCenterX = block.x + blockSize / 2;
        const blockCenterY = block.y + blockSize / 2;
        const distance = Math.sqrt(
            (playerCenterX - blockCenterX) ** 2 + (playerCenterY - blockCenterY) ** 2
        );
        return distance <= collisionRadius && block.type === type;
    });
    return blockBelow;
}
let isRaining = false;
let rainTextureIndex = 0;
const rainTextures = [
    "./rain1.png", "./rain2.png", "./rain3.png", "./rain4.png"
];
const bdrainTextures = [
  "./bdrain1.png", "./bdrain2.png", "./bdrain3.png", "./bdrain4.png"
];
const snowtextures = [
    "./snow1.png", "./snow2.png", "./snow3.png", "./snow4.png","./snow5.png","./snow6.png","./snow7.png"
];
const sandstormtextures = [
    "./sandstorm1.png", "./sandstorm2.png", "./sandstorm3.png"
];
const leavestextures = [
    "./leaves1.png", "./leaves2.png", "./leaves3.png","./leaves4.png", "./leaves5.png"
];
const hellparticles = [
    "./ashes1.png", "./ashes2.png", "./ashes3.png","./ashes4.png", "./ashes5.png", "./ashes6.png","./ashes7.png", "./ashes8.png"
];
const rainTextureChangeInterval = 2; 
const loadedbdRainTextures = bdrainTextures.map(src => {
  const img = new Image();
  img.src = getBase64Image(removeDotSlash(src), assets);
  return img;
});
const loadedRainTextures = rainTextures.map(src => {
    const img = new Image();
    img.src = getBase64Image(removeDotSlash(src),assets) ;
    return img;
});
const loadedleavestextures = leavestextures.map(src => {
  const img = new Image();
  img.src = getBase64Image(removeDotSlash(src),assets);
  return img;
});
const loadedsnowTextures = snowtextures.map(src => {
  const img = new Image();
  img.src = getBase64Image(removeDotSlash(src),assets);
  return img;
});
const loadedsandstormTxt = sandstormtextures.map(src => {
  const img = new Image();
  img.src = getBase64Image(removeDotSlash(src),assets);
  return img;
});
const loadedashesTxt = hellparticles.map(src => {
  const img = new Image();
  img.src = getBase64Image(removeDotSlash(src),assets);
  return img;
});
let leafChangeCounter = 0; 
const changeInterval = 3000; 
let anableleaves=1
function drawRainEffectOnBlocks() {
	  if (isStayOn("Hstone")|| isStayOn("Hstonelay")) {
	ctx.globalAlpha = 0.6;
	if (by5 % rainTextureChangeInterval === 0) {
		rainTextureIndex = (rainTextureIndex + 1) % loadedashesTxt.length;
	}
	if (rainTextureIndex >= loadedashesTxt.length) {
		rainTextureIndex = 0;
	}
	const currentRainTexture = loadedashesTxt[rainTextureIndex];
	let scaled = 1
	let scale = 1
	const rainTextureSize = blockSize * scale;
	const rainSize = blockSize * scaled;
	chunkPositions.forEach(chunk => {
		const adjustedX = Math.round(chunk.x) * scaled;
		const adjustedY = Math.round(chunk.y) * scaled;
		for (let x = adjustedX; x < adjustedX + chunk.width * scaled; x += rainSize) {
			for (let y = adjustedY; y < adjustedY + chunk.height * scaled; y += rainSize) {
				ctx.drawImage(currentRainTexture, x, y, rainTextureSize, rainTextureSize);
			}
		}
	});
	ctx.globalAlpha = 1.0;
}
  if(Math.random()<0.0015 && anableleaves==1){
    anableleaves=0
  }else if(anableleaves==0 && Math.random()<0.003){
    anableleaves=1
  }
  if(anableleaves==1&& Math.random()<0.015){
    playwindsound()
  }
  if (generateCave !== 1 && generateCaveForEther !== 1 && isinhouse !== 1&& isinhouse2 !== 1 && inhell !== 1 && (isStayOn("grass") || isStayOn("grasslayer")|| isStayOn("forestgrass")|| isStayOn("swampgrass")) &&( options.fancygraphic === 1 || (options.showleafes==1 && options.noleafes!==1 ) ) && anableleaves==1 && !isRaining) {
    ctx.globalAlpha = 0.1;
  if (by5 % rainTextureChangeInterval === 0) {
    rainTextureIndex = (rainTextureIndex + 1) % loadedleavestextures.length;
  }
  if (rainTextureIndex >= loadedleavestextures.length) {
    rainTextureIndex = 0;
  }
  const currentRainTexture = loadedleavestextures[rainTextureIndex]
  let scale = 1.0
    const rainTextureSize = blockSize*scale; 
    const scaled = 1.1; 
    chunkPositions.forEach(chunk => {
      const adjustedX = Math.round(chunk.x) * scaled;
      const adjustedY = Math.round(chunk.y) * scaled;
      for (let x = adjustedX; x < adjustedX + chunk.width * scaled; x += rainTextureSize) {
        for (let y = adjustedY; y < adjustedY + chunk.height * scaled; y += rainTextureSize) {
          if(Math.random()<0.7){
            ctx.drawImage(currentRainTexture, x*scaled, y*scaled, rainTextureSize, rainTextureSize);
          }
        }
      }
    });
    ctx.globalAlpha = 1.0;
  }
  if (true) {
  if (isStayOn("deadgrassfloor") || isStayOn("deadgrassfloor2") || isStayOn("Hstone")||isStayOn("Hstonelay") ) {
    function drawFog(ctx, width, height) {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.max(width, height) * 0.6;
fogOPACITY*=1.5 ;
if(fogOPACITY>=0.6){fogOPACITY=0.6}
      const fogGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, maxRadius
      );
ctx.globalAlpha=fogOPACITY;
      fogGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      fogGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
      fogGradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');  
      ctx.fillStyle = fogGradient;
      ctx.fillRect(0, 0, width, height);
ctx.globalAlpha=1;
    }
    drawFog(ctx, canvas.width, canvas.height);
  }else{
function drawFog(ctx, width, height) {
	const centerX = width / 2;
	const centerY = height / 2;
	const maxRadius = Math.max(width, height) * 0.6;
	if (fogOPACITY > 0.1) {
	fogOPACITY /= 2;
	if (fogOPACITY <= 0) { fogOPACITY = 0 }
	const fogGradient = ctx.createRadialGradient(
		centerX, centerY, 0,
		centerX, centerY, maxRadius
	);
	ctx.globalAlpha = fogOPACITY;
	fogGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
	fogGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
	fogGradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
	ctx.fillStyle = fogGradient;
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 1;
}}
drawFog(ctx, canvas.width, canvas.height);
  }
}
   if (generateCave !== 1 && generateCaveForEther !== 1  && isinhouse !== 1 && inhell !== 1 && (isStayOn("snowgrass") ||isStayOn("snowgrass2") )) {
  ctx.globalAlpha = 0.6;
  var currentRainTexture =0;
  if (!seed.startsWith("badseed")) {
  if (by5 % rainTextureChangeInterval === 0) {
    rainTextureIndex = (rainTextureIndex + 1) % loadedsnowTextures.length;
  }
  if (rainTextureIndex >= loadedsnowTextures.length) {
    rainTextureIndex = 0;
  }
  currentRainTexture = loadedsnowTextures[rainTextureIndex];
  }else   {
    if (by5 % (rainTextureChangeInterval + 2) === 0) {
  rainTextureIndex = (rainTextureIndex + 1) % loadedsandstormTxt.length;
}
if (rainTextureIndex >= loadedsandstormTxt.length) {
  rainTextureIndex = 0;
}
  ctx.globalAlpha = 0.4;
  currentRainTexture = loadedbdRainTextures[rainTextureIndex];
}
  let scaled = 1.2
  let scale = 1.2
  const rainTextureSize = blockSize * scale;
  const rainSize = blockSize * scaled;
  chunkPositions.forEach(chunk => {
    const adjustedX = Math.round(chunk.x) * scaled;
    const adjustedY = Math.round(chunk.y) * scaled;
    for (let x = adjustedX; x < adjustedX + chunk.width * scaled; x += rainSize) {
      for (let y = adjustedY; y < adjustedY + chunk.height * scaled; y += rainSize) {
        ctx.drawImage(currentRainTexture, x, y, rainTextureSize, rainTextureSize);
      }
    }
  });
  ctx.globalAlpha = 1.0;
}else if (generateCave !== 1 && generateCaveForEther !== 1  && isinhouse !== 1 && inhell == 1 ) {
  ctx.globalAlpha = 0.6;
  if (by5 % rainTextureChangeInterval === 0) {
    rainTextureIndex = (rainTextureIndex + 1) % loadedashesTxt.length;
  }
  if (rainTextureIndex >= loadedashesTxt.length) {
    rainTextureIndex = 0;
  }
  const currentRainTexture = loadedashesTxt[rainTextureIndex];
  let scaled = 1
  let scale = 1
  const rainTextureSize = blockSize * scale;
  const rainSize = blockSize * scaled;
  chunkPositions.forEach(chunk => {
    const adjustedX = Math.round(chunk.x) * scaled;
    const adjustedY = Math.round(chunk.y) * scaled;
    for (let x = adjustedX; x < adjustedX + chunk.width * scaled; x += rainSize) {
      for (let y = adjustedY; y < adjustedY + chunk.height * scaled; y += rainSize) {
        ctx.drawImage(currentRainTexture, x, y, rainTextureSize, rainTextureSize);
      }
    }
  });
  ctx.globalAlpha = 1.0;
}else if (generateCave !== 1 && generateCaveForEther !== 1  && inhell!==1&& isinhouse !== 1 && isStayOn("canyonsand")|| isStayOn("canyonsandlayer")) {
	}else if (generateCave !== 1 && generateCaveForEther !== 1  && inhell!==1&& isinhouse !== 1 && isStayOn("desertsand")) {
  ctx.globalAlpha = 0.8;
  if (by5 % (rainTextureChangeInterval+2) === 0) {
    rainTextureIndex = (rainTextureIndex + 1) % loadedsandstormTxt.length;
  }
if (rainTextureIndex >= loadedsandstormTxt.length) {
    rainTextureIndex = 0;
}
  var  currentRainTexture = loadedsandstormTxt[rainTextureIndex];
  let scaled = 1.2
let scale = 1.2
  if (seed.startsWith("badseed")) {
  ctx.globalAlpha = 0.4 ;
  currentRainTexture = loadedbdRainTextures[rainTextureIndex];
  scaled=1.55
  scale=1.4
}
  const rainTextureSize = blockSize * scale;
  const rainSize = blockSize * scaled;
  chunkPositions.forEach(chunk => {
    const adjustedX = Math.round(chunk.x) * scaled;
    const adjustedY = Math.round(chunk.y) * scaled;
    for (let x = adjustedX; x < adjustedX + chunk.width * scaled; x += rainSize) {
      for (let y = adjustedY; y < adjustedY + chunk.height * scaled; y += rainSize) {
        ctx.drawImage(currentRainTexture, x, y, rainTextureSize, rainTextureSize);
      }
    }
  });
  ctx.globalAlpha = 1.0;
} else if (isRaining && generateCave!==1 && generateCaveForEther !== 1 && inhell!==1&& isinhouse!==1 && isinhouse2 !== 1) {
      playRain()
        ctx.globalAlpha = 0.4; 
        if (by5 % rainTextureChangeInterval === 0) {
            rainTextureIndex = (rainTextureIndex + 1) % loadedRainTextures.length; 
        }
if (rainTextureIndex >= loadedRainTextures.length) {
    rainTextureIndex = 0;
}
        var currentRainTexture = loadedRainTextures[rainTextureIndex];
if(seed.startsWith("badseed")){
  currentRainTexture = loadedbdRainTextures[rainTextureIndex];
}
        let scaled=1.6
        let scale=1.3
        const rainTextureSize = blockSize * scale;
const rainSize = blockSize * scaled;
ctx.save()
if (inether) {
	ctx.filter = "hue-rotate(130deg)"
}
        chunkPositions.forEach(chunk => {
            const adjustedX = Math.round(chunk.x)*scaled;
            const adjustedY = Math.round(chunk.y)*scaled;
            for (let x = adjustedX; x < adjustedX + chunk.width*scaled; x += rainSize) {
                for (let y = adjustedY; y < adjustedY + chunk.height*scaled; y += rainSize) {
                    ctx.drawImage(currentRainTexture, x, y, rainTextureSize, rainTextureSize);
                }
            }
        });
ctx.restore()
        ctx.globalAlpha = 1.0;
    }else{
stopRain()
    }
}
let lightningActive = false;
let lightningDuration = 100; 
let lightningCooldown = 5000; 
let lastLightningTime = 0; 
let lightningOpacity = 0; 
let lightningFadeDuration = 100; 
let lightningState = 'fadeOut'; 
let lightningState2 = 'fadeOut';
let lightningActive2 = false;
let lightningDuration2 = 3000;
let lightningCooldown2 = 5000;
let lightningOpacity2 = 0;
let lightningFadeDuration2 = 2200;
let lightningTimer2 = 0;
let lightningState3 = 'fadeOut';
let lightningActive3 = false;
let lightningDuration3 = 1000;
let lightningCooldown3 = 1000;
let lightningOpacity3 = 0;
let lightningFadeDuration3 = 7000;
let lightningTimer3 = 0; 
function drawLightning2() {
  if (lightningActive2) {
    ctx.fillStyle = `rgba(255, 255, 255, ${clamp(lightningOpacity2,0,0.9) })`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
function drawLightning3() {
	if (lightningActive3) {
		ctx.fillStyle = `rgba(25, 25, 25, ${lightningOpacity3})`;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
}
function startLightning2() {
  lightningActive2 = true;
  lightningState2 = 'fadeIn';
  lightningOpacity2 = 0;
  lightningTimer2 = Date.now(); 
}
function startLightning3() {
	lightningActive3 = true;
	lightningState3 = 'fadeIn';
	lightningOpacity3 = 0;
	lightningTimer3 = Date.now(); 
}
function updateLightning2() {
  if (lightningActive2) {
    if (lightningState2 === 'fadeIn') {
      lightningOpacity2 += (0.9/ (lightningFadeDuration2 / frameDuration));
      if (lightningOpacity2 >= 1) {
        lightningOpacity2 = 0.7;
        lightningState2 = 'fadeOut';
      }
    } else if (lightningState2 === 'fadeOut') {
      lightningOpacity2 -= (1.5 / (lightningFadeDuration2 / frameDuration));
      if (lightningOpacity2 <= 0) {
        lightningOpacity2 = 0;
        lightningActive2 = false;
        lightningState2 = 'fadeIn';
      }
    }
  } else {
    if (Date.now() - lightningTimer2 >= lightningCooldown2) {
    }
  }
}
function updateLightning3() {
	if (lightningActive3) {
		if (lightningState3 === 'fadeIn') {
			lightningOpacity3 += (0.9 / (lightningFadeDuration3 / frameDuration));
			if (lightningOpacity3 >= 1) {
				lightningOpacity3 = 0.7;
				lightningState3 = 'fadeOut';
			}
		} else if (lightningState3 === 'fadeOut') {
			lightningOpacity3 -= (1.5 / (lightningFadeDuration3 / frameDuration));
			if (lightningOpacity3 <= 0) {
				lightningOpacity3 = 0;
				lightningActive3 = false;
				lightningState3 = 'fadeIn';
			}
		}
	} else {
		if (Date.now() - lightningTimer3 >= lightningCooldown3) {
		}
	}
}
        let hurtEffectActive = false;
        let hurtEffectOpacity = 0;
        const hurtEffectDuration = 1000; 
        const fadeInDuration = 500; 
        const fadeOutDuration = 500; 
        let hurtEffectStartTime=0;
        const hurtEffectImage = new Image();
        hurtEffectImage.src = './hurteffect.png';
        function startHurtEffect() {
            hurtEffectActive = true;
            hurtEffectOpacity = 0;
            requestAnimationFrame(updateHurtEffect);
        }
        function updateHurtEffect() {
            if (hurtEffectActive) {
                const currentTime = Date.now();
                if (hurtEffectOpacity < 0.7) {
                    hurtEffectOpacity += (1.0 / (fadeInDuration / 16)); 
                } else if (hurtEffectOpacity >= 0.7 && currentTime - hurtEffectStartTime < hurtEffectDuration) {
                } else {
                    if (hurtEffectOpacity > 0) {
                        hurtEffectOpacity -= (1.0 / (fadeOutDuration / 16));
                    } else {
                        hurtEffectActive = false; 
                    }
                }
                ctx.clearRect(0, 0, canvas.width, canvas.height); 
                ctx.globalAlpha = hurtEffectOpacity; 
                ctx.drawImage(hurtEffectImage, 0, 0, canvas.width, canvas.height); 
                ctx.globalAlpha = 1; 
                requestAnimationFrame(updateHurtEffect);
            }
        }
function drawLightning() {
    if (lightningActive && isRaining&& generateCave!==1 && generateCaveForEther !==1 && isinhouse!==1 && isinhouse2 !== 1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
    }
}
function updateLightning() {
    if (isRaining && lightningActive && generateCave!==1 && generateCaveForEther !==1 && isinhouse!==1) {
        if (lightningState === 'fadeIn') {
            lightningOpacity += (0.4 / (lightningFadeDuration / frameDuration));
            if (lightningOpacity >= 0.6) {
                lightningOpacity = 0.2; 
                lightningState = 'fadeOut'; 
            }
        } else if (lightningState === 'fadeOut') {
            lightningOpacity -= (0.05 / (lightningFadeDuration / frameDuration));
            if (lightningOpacity <= 0) {
                lightningOpacity = 0; 
                lightningActive = false; 
                lightningState = 'fadeIn'; 
            }
        }
    } else {
        const currentTime = Date.now();
        if (currentTime - lastLightningTime >= lightningCooldown) {
            if (Math.random() < 0.005) {
                lightningActive = true;
                lightningOpacity = 0; 
                if(isRaining && generateCave!==1 && generateCaveForEther !==1 && isinhouse!==1){
                playthundersound()
                }
                lastLightningTime = currentTime;
                lightningState = 'fadeIn'; 
            }
        }
    }
}
var toggleNightVison=false;  
function synchronizeVisibleChunks2() {
  if (Array.isArray(house2chunks)) {
  house2chunks = {}; 
}
  if(overworldChunks){
  if(renderedBlocks!==null&& renderedBlocks){
    renderedBlocks.forEach(block => {
        const x = block.x;
        const y = block.y;
        var suby=32;
        if (checkBlockAtOverWorldPosition2(x, y, "house_wall")||checkBlockAtOverWorldPosition2(x, y, "houseroof")||checkBlockAtOverWorldPosition2(x, y, "ryeroof")||checkBlockAtOverWorldPosition2(x, y, "brickhouse")||checkBlockAtOverWorldPosition2(x, y, "gypsumroof")||checkBlockAtOverWorldPosition2(x, y, "gypsumhouse")||checkBlockAtOverWorldPosition2(x, y, "door")||checkBlockAtOverWorldPosition2(x, y, "gypsumdoor") ){
removeBlockAtPosition2(x, y, "houseinside");
removeBlockAtPosition2(x, y, "houseinside");
 if (checkBlockAtPosition(x, y, "voidblock")) {
  removeBlockAtPosition2(x, y, "voidblock");
  if (!checkBlockAtPosition(x, y , "housegrass")) {
  buildBlockAtPositionBefore2(x, y , "housegrass");
}
}
if ( !(checkBlockAtOverWorldPosition2(x, y-suby, "house_wall") || checkBlockAtOverWorldPosition2(x, y-suby, "houseroof") || checkBlockAtOverWorldPosition2(x, y-suby, "ryeroof") || checkBlockAtOverWorldPosition2(x, y-suby, "brickhouse") || checkBlockAtOverWorldPosition2(x, y-suby, "gypsumroof") || checkBlockAtOverWorldPosition2(x, y-suby, "gypsumhouse") || checkBlockAtOverWorldPosition2(x, y-suby, "door") || checkBlockAtOverWorldPosition2(x, y-suby, "gypsumdoor")) ) {
if (checkBlockAtPosition(x, y-suby, "voidblock")) {
    removeBlockAtPosition2(x, y-suby, "voidblock"); }
  if( !checkBlockAtPosition(x, y-suby, "houseinside") ){
    removeBlockAtPosition2(x, y-suby, "houseinside");
    if(checkBlockAtPosition(x, y-suby, "housegrass")){
      removeBlockAtPosition2(x, y-suby, "housegrass");
    }
  buildBlockAtPositionBefore2(x, y-suby, "houseinside");
if( !checkBlockAtPosition(x, y-suby, "housegrass") ){
  buildBlockAtPositionBefore2(x, y-suby, "housegrass");
}
  }
}
} else {
if (!checkBlockAtPosition(x, y, "voidblock")) {
  buildBlockAtPositionBefore2(x, y, "voidblock");
  removeBlockAtPosition2(x, y, "housegrass");
  removeBlockAtPosition2(x, y, "houseinside");
}
        }
        if(checkBlockAtPosition(x, y, "stairsdown")){
        if (checkBlockAtHousePosition(x, y, "stairsup")) {
        }else{
            removeBlockAtPosition2(x, y, "stairsdown");
            removeBlockAtPosition2(x, y, "stairsdown");
        }
        }
        if (checkBlockAtHousePosition(x, y, "stairsup")) {
if (checkBlockAtPosition(x, y, "voidblock")) {
  removeBlockAtPosition2(x, y, "voidblock");
  if (!checkBlockAtPosition(x, y, "housegrass")) {
  buildBlockAtPositionBefore2(x, y, "housegrass");
}
}
  removeBlockAtPosition2(x, y, "stairsdown");
  buildBlockAtPosition(x, y, "stairsdown");
  if (checkBlockAtPosition(x, y, "stairsdown")) {
    if(!checkBlockAtPosition(x, y, "housegrass")){
  removeBlockAtPosition2(x, y, "voidblock");
  buildBlockAtPositionBefore2(x, y, "housegrass");
}}
        } else {
            if (checkBlockAtPosition(x, y, "door2")) {
if (checkBlockAtPosition(x, y, "voidblock")) {
  removeBlockAtPosition2(x, y, "voidblock");
  buildBlockAtPositionBefore2(x, y, "housegrass");
}
                removeBlockAtPosition2(x, y, "door2");
                removeBlockAtPosition2(x, y, "door2")
            }
        }
    });
}}}
function synchronizeVisibleChunks() {
  if (Array.isArray(housechunks)) {
  housechunks = {}; 
}
  if(renderedBlocks!==null&& renderedBlocks){
    renderedBlocks.forEach(block => {
        const x = block.x;
        const y = block.y;
        let suby=32
if (checkBlockAtOverWorldPosition2(x, y, "house_wall")||checkBlockAtOverWorldPosition2(x, y, "houseroof")||checkBlockAtOverWorldPosition2(x, y, "ryeroof")||checkBlockAtOverWorldPosition2(x, y, "brickhouse")||checkBlockAtOverWorldPosition2(x, y, "gypsumroof")||checkBlockAtOverWorldPosition2(x, y, "gypsumhouse")||checkBlockAtOverWorldPosition2(x, y, "door")||checkBlockAtOverWorldPosition2(x, y, "gypsumdoor") ){
removeBlockAtPosition2(x, y, "houseinside");
removeBlockAtPosition2(x, y, "houseinside");
 if (checkBlockAtPosition(x, y, "voidblock")) {
  removeBlockAtPosition2(x, y, "voidblock");
  if (!checkBlockAtPosition(x, y , "housegrass")) {
  buildBlockAtPositionBefore2(x, y , "housegrass");
}
}
if ( !(checkBlockAtOverWorldPosition2(x, y-suby, "house_wall") || checkBlockAtOverWorldPosition2(x, y-suby, "houseroof") || checkBlockAtOverWorldPosition2(x, y-suby, "ryeroof") || checkBlockAtOverWorldPosition2(x, y-suby, "brickhouse") || checkBlockAtOverWorldPosition2(x, y-suby, "gypsumroof") || checkBlockAtOverWorldPosition2(x, y-suby, "gypsumhouse") || checkBlockAtOverWorldPosition2(x, y-suby, "door") || checkBlockAtOverWorldPosition2(x, y-suby, "gypsumdoor")) ) {
if (checkBlockAtPosition(x, y-suby, "voidblock")) {
    removeBlockAtPosition2(x, y-suby, "voidblock"); }
  if( !checkBlockAtPosition(x, y-suby, "houseinside") ){
    removeBlockAtPosition2(x, y-suby, "houseinside");
    if(checkBlockAtPosition(x, y-suby, "housegrass")){
      removeBlockAtPosition2(x, y-suby, "housegrass");
    }
  buildBlockAtPositionBefore2(x, y-suby, "houseinside");
if( !checkBlockAtPosition(x, y-suby, "housegrass") ){
  buildBlockAtPositionBefore2(x, y-suby, "housegrass");
}
  }
}
}else {
            if (!checkBlockAtPosition(x, y, "voidblock")) {
                buildBlockAtPositionBefore2(x, y, "voidblock");
                removeBlockAtPosition2(x, y, "housegrass");
                removeBlockAtPosition2(x, y, "houseinside");
            }
        }
        if (checkBlockAtOverWorldPosition2(x, y, "door")||checkBlockAtOverWorldPosition2(x, y, "gypsumdoor")) {
if (checkBlockAtPosition(x, y, "voidblock")) {
  removeBlockAtPosition2(x, y, "voidblock");
  if (!checkBlockAtPosition(x, y, "housegrass")) {
  buildBlockAtPositionBefore2(x, y, "housegrass");
  }
}
  removeBlockAtPosition2(x, y, "door2");
  buildBlockAtPosition(x, y, "door2");
  if (checkBlockAtPosition(x, y, "door2")) {
    if(!checkBlockAtPosition(x, y, "housegrass")){
  removeBlockAtPosition2(x, y, "voidblock");
  buildBlockAtPositionBefore2(x, y, "housegrass");
}}
        } else {
            if (checkBlockAtPosition(x, y, "door2")) {
if (checkBlockAtPosition(x, y, "voidblock")) {
  removeBlockAtPosition2(x, y, "voidblock");
  buildBlockAtPositionBefore2(x, y, "housegrass");
}
                removeBlockAtPosition2(x, y, "door2");
                removeBlockAtPosition2(x, y, "door2")
            }
        }
    });
}}
function getVisibleChunks() {
    const visibleChunks = [];
    const chunkSize = blockSize * 1; 
    const startX = Math.floor((offsetX - canvas.width / 2) / chunkSize);
    const endX = Math.floor((offsetX + canvas.width / 2) / chunkSize);
    const startY = Math.floor((offsetY - canvas.height / 2) / chunkSize);
    const endY = Math.floor((offsetY + canvas.height / 2) / chunkSize);
    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            visibleChunks.push(`${x},${y}`);
        }
    }
    return visibleChunks;
}
function checkBlockAtOverWorldPosition(x, y, type) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const neighboringChunks = [
        `${chunkX},${chunkY}`, 
    ];
  for (let chunkKey of neighboringChunks) {
    let chunkBlocks = overworldChunks[chunkKey];
    if (!chunkBlocks) continue; 
    for (let i = 0; i < chunkBlocks.length; i++) {
      let block = chunkBlocks[i];
      if (block.type !== type) continue;
      let blockGlobalX = block.x + chunkX * blockSize;
      let blockGlobalY = block.y + chunkY * blockSize;
      if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
        return true;
      }
    }
  }
  return false; 
}
function checkBlockAtOverWorldPosition2(x, y, type) {
	const globalX = x + offsetX;
	const globalY = y + offsetY;
	const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
	const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
	const chunkX = Math.floor(snappedGlobalX / blockSize);
	const chunkY = Math.floor(snappedGlobalY / blockSize);
	const neighboringChunks = [
		`${chunkX},${chunkY}`,
	];
	for (let chunkKey of neighboringChunks) {
		let chunkBlocks = storelastdimension=="inether"? etherchunks[chunkKey]: overworldChunks[chunkKey];
		if (!chunkBlocks) continue;
		for (let i = 0; i < chunkBlocks.length; i++) {
			let block = chunkBlocks[i];
			if (block.type !== type) continue;
			let blockGlobalX = block.x + chunkX * blockSize;
			let blockGlobalY = block.y + chunkY * blockSize;
			if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
				return true;
			}
		}
	}
	return false;
}
function checkBlockAtHousePosition(x, y, type) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const neighboringChunks = [
        `${chunkX},${chunkY}`, 
    ];
  for (let chunkKey of neighboringChunks) {
    let chunkBlocks = housechunks[chunkKey];
    if (!chunkBlocks) continue; 
    for (let i = 0; i < chunkBlocks.length; i++) {
      let block = chunkBlocks[i];
      if (block.type !== type) continue;
      let blockGlobalX = block.x + chunkX * blockSize;
      let blockGlobalY = block.y + chunkY * blockSize;
      if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
        return true;
      }
    }
  }
  return false; 
}
const itemsAndDamage = {
  "pointed_stick": { dmg: 1, kill: ["voltary", "giantbat","duck"], boost:{ "bunny":-0.7},  duration: 80, cooldown: 80, range: 75},
  "bone_sword": { dmg: 1, kill: ["voltary"], boost:{ "giantbat":-0.6}, duration: 50, cooldown: 30, range: 75, random:[-0.5,0.5,0.2]},
  "long_spear": { dmg: 3, kill: ["shark"], boost:{ "giantbat":-0.5}, duration: 85, cooldown: 120, range: 80 },
  
  "stone_scyte": { dmg: 4, kill: ["shark"], boost:{ "giantbat":-0.5}, duration: 85, cooldown: 120, range: 80 },
  "knive": { dmg: 10, kill:[], duration: 85, cooldown: 120, range: 80 },
  
  "icesword": { dmg: 20, kill: ["shark"], boost:{ "giantbat":-0.5}, duration: 85, cooldown: 120, range: 80 },
"magicwand": { dmg: 20, kill: [], duration: 40, cooldown: 50, range: 73 },
"godwand": { dmg: 20, kill: [], duration: 150, cooldown: 600, range: 63 },
"greenwand": { dmg: 10, kill: [], duration: 40, cooldown: 50, range: 73 },
"magicwandofsharp": { dmg: 20, kill: [], duration: 40, cooldown: 50, range: 73 },
"hyperblastwand": { dmg: 20, kill: [], duration: 160, cooldown: 250, range: 73 },
"boomerang": { dmg: 0.0, kill: [], duration: 0, cooldown: 0, range: 80},
"titanium_boomerang": { dmg: 0.0, kill: [], duration: 0, cooldown: 0, range: 80},
"good_boomerang": { dmg: 0.0, kill: [], duration: 0, cooldown: 0, range: 80},
"hell_boomerang": { dmg: 0.0, kill: [], duration: 0, cooldown: 0, range: 80},
"draco_boomerang": { dmg: 0.0, kill: [], duration: 0, cooldown: 0, range: 80},
  "copper_spear": { dmg: 7, kill: [], duration: 50, cooldown: 50, range: 80 , boost:{ "giantbat":15} } ,
  "copper_sword": {dmg: 17, kill: [], boost: {"giantbat": 1,'zombie':2,"bunny": -0.3,"skellybones":-1}, duration: 70,cooldown: 40,  range: 85 , random:[-2,0,1]},
  "iron_spear": { dmg: 10, kill: [], duration: 100, cooldown: 50, range: 85 },
  "iron_sword": { dmg: 18, kill: [], duration: 50, cooldown: 70, range: 90 },
  "bow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 80 },
  "hellbow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "quantumbow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "rainbowbow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "dracobow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "moltenbow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "nightbow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "darkbow": { dmg: 2, kill: [], duration: 50, cooldown: 70, range: 83 },
  "iron_mace": { dmg: 25, kill: [], duration: 400, cooldown: 120, range: 65 },
  "silverlongsword": { dmg: 60, kill: [], boost:{ "voltary":-20, "spikegod":-20,"evileye":-20,"medusa":-20, "hellskull":20,"ethoper":200 }, duration: 60, cooldown: 150, range: 100, random:[-4,0,4], specialatk:5 },
  "titaniumsword": { dmg: 40, kill: [], duration: 40, cooldown: 50, range: 90 },
  "wolframaxe": { dmg: 50, kill: [], duration: 50, cooldown: 80, range: 90 , random:[0,5,1]},
  "uraniumaxe": { dmg: 60, kill: [], duration: 60, cooldown: 50, range: 90 },
  "osmiumsword": { dmg: 50, kill: [], duration: 40, cooldown: 50, range: 90 },
  "thundersword": { dmg: 75, kill: [], duration: 60, cooldown: 50, range: 95 },
  "nightsword": { dmg: 80, kill: [], duration: 60, cooldown: 50, range: 90 },
  "aquaspear": { dmg: 100, kill: [], duration: 50, cooldown: 70, range: 100 },
  "sharpmace": { dmg: 120, kill: [], duration: 50, cooldown: 100, range: 70 },
    "sharpsaw": { dmg: 120, kill: [], duration: 60, cooldown: 50, range: 90 },
    "hellsword": { dmg: 160, kill: [], duration: 60, cooldown: 50, range: 90 },
  "goodsword": { dmg: 200, kill: [], duration: 50, cooldown: 50, range: 95 },
  "fleshsaber": { dmg: 350, kill: [], duration: 20, cooldown: 100, range: 100 },
  "moltensword": { dmg: 360, kill: [], duration: 60, cooldown: 100, range: 100 },
  "goodmace": { dmg: 250, kill: [], duration: 100, cooldown: 200, range: 85 },
  "titaniummace": { dmg: 60, kill: [], duration: 50, cooldown: 150, range: 65 },
  "universesword": { dmg: 500, kill: [], duration: 20, cooldown: 100, range: 100 },
  "trueuniversesword": { dmg: 999, kill: [], duration: 80, cooldown: 100, range: 95 },
  "hypersword": { dmg: 1100, kill: [], duration: 80, cooldown: 100, range: 110 },
  "toxicsword": { dmg: 1000, kill: [], duration: 40, cooldown: 50, range: 120 },
  "rainbow": { dmg: 420, kill: [], duration: 20, cooldown: 100, range: 100 },
"truegodsword": { dmg: 3785320, kill: [], duration: 80, cooldown: 10, range: 100 },
"magiclanter": { dmg: 10, kill: [], duration: 20, cooldown: 100, range: 90 ,boost:{ "frozenghost":-2},},
  "stone_axe": { dmg: 0.6, kill: ["voltary", "giantbat","bunny"], boost:{ "wasp":-0.2},  duration: 80, cooldown: 80, range: 80},
  "pickaxe": { dmg: 0.4, kill: ["voltary", "giantbat","bunny"], boost:{ "wasp":-0.2},  duration: 80, cooldown: 80, range: 80},
};
var weaponSpearAnimation=["long_spear","iron_spear","copper_spear","aquaspear","magiclanter","pointed_stick","magicwand",'greenwand',"hyperblastwand",'magicwandofsharp',"godwand","bow","hellbow","nightbow","darkbow","quantumbow","rainbowbow","moltenbow","dracobow","knive"]
let activeWeapon = null;
let lastWeapon = null;
let directionOfSlash = 0
let weaponCooldown = false;
let rotationAngle = 0;
var cooldownatk=false;
function startWeaponRotation(weapon) {
  if (weaponCooldown) return; 
  activeWeapon = weapon;
  lastWeapon = weapon;
  weaponCooldown = true; 
  rotationAngle = 0; 
  setTimeout(() => {
    activeWeapon = null; 
    setTimeout(() => weaponCooldown = false, itemsAndDamage[weapon].cooldown); 
  }, itemsAndDamage[weapon].duration);
}
let cutindex=0;
let cutticks=0;
let hitticks=0;
let defaulthitticks=1;
let defaultCutTicks=1
let isCutting=0;
let sequenceCutTexture=["cut1","cut2","cut3","cut4","cut5","cut6","cut7"]
let sequenceHitTexture=["crit1","crit2","crit3","crit4","crit5","crit6"]
let hitshow=[]
function drawWeapon(ctx) {
  if (!activeWeapon) return; 
  const weaponData = itemsAndDamage[activeWeapon];
  const range = weaponData.range-40; 
  const playerCenterX = player.x + player.width * 2;
  const playerCenterY = player.y + player.height * 2;
  const canvasCenterX = playerCenterX - 32 - 15;
  const canvasCenterY = playerCenterY - 32 - 15;
  const weaponTexture = new Image();
  weaponTexture.src = getBase64Image(removeDotSlash(textureSources[activeWeapon]),assets);
  ctx.save();
  ctx.translate(canvasCenterX, canvasCenterY);
  ctx.rotate(rotationAngle);
  ctx.drawImage(weaponTexture, 0, -range, range, range); 
  ctx.restore();
  const duration = weaponData.duration;
  if (!weaponSpearAnimation.includes(activeWeapon)) {
    rotationAngle += (2 * Math.PI) / (duration / 16.67);
  }
}
function handleWeaponUse(weapon, x, y) {
  if (weapon && cooldownatk == false) {
    cooldownatk = true;
    activeWeapon = weapon;
    lastWeapon = weapon;
currentweapon=weapon
able1=0; able2=0; i1pp=0; i2pp=0;
    const playerCenterX = player.x + player.width * 2;
const playerCenterY = player.y + player.height * 2;
const canvasCenterX = playerCenterX - 32 ;
const canvasCenterY = playerCenterY - 32 ;
    const deltaX = x - canvasCenterX;
    const deltaY = y - canvasCenterY;
    rotationAngle = Math.atan2(deltaY, deltaX)+(90/2);
    directionOfSlash=rotationAngle;
    setTimeout(function () {
      cooldownatk = false;
    }, itemsAndDamage[activeWeapon].cooldown * 5);
    setTimeout(function() {
  activeWeapon = null
}, itemsAndDamage[activeWeapon].duration * 5) ;
  }else{
   lastWeapon = null;
  }
}
let currentweapon=null
let i1pp=0
let i2pp=0
let able1=0
let able2=0
function weaponTimeout(){
}
 let maxOxygen = 1000;  
let oxygen = 1000;     
function updateOxygen() {
    if (isunderwater === 1) {
        oxygen = Math.max(0, oxygen - 1.5);  
        if(oxygen<1){
          oxygen=0
          updateHealth(-0.5)
        }
    } else {
        oxygen = Math.min(maxOxygen, oxygen + 5);  
        if(oxygen>maxOxygen){
          oxygen=maxOxygen+1
        }
    }
}
function drawOxygenBar(ctx) {
    if (isunderwater === 1) {
        const barWidth = canvas.width * 0.5;  
        const barHeight = 10;  
        const barX = (canvas.width - barWidth) / 2;  
let barY = canvas.height -25 - barHeight - 10; 
if(options.rendermode == 6){ barY = canvas.height -60 - barHeight - 10; }
        const oxygenLevelWidth = (oxygen / maxOxygen) * barWidth;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = oxygen > 500 ? 'rgb(0,255,155)' : 'rgb(50,215,215)';
        ctx.fillRect(barX, barY, oxygenLevelWidth, barHeight);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}
var abletostart=0
var tickFix=0
var zoomedDELTA=0
var ZOOMSCALE =0
    let isUpdating = 0;
 let weponDelay=0
let fskip=0
let onbigbed=0
let currentBuff="none"


function getSpecialTexture(animation, frameIndex=0, buff="") {
    let key = "";
    if(buff!=="broom" && checkIfItems("invisiblearmourring",1)){buff=""}
    if (buff) key = buff + "_";
    key += animation + frameIndex;
    return specialTextures[key] || null;
}
function getSpecialKey(animation, frameIndex = 0, buff = "") {
	let key = "";
	if (buff) key = buff + "_";
	key += animation + frameIndex;
	return  key;
}
function updatePlayerAnimation() {
    const inWater = isPlayerInWater(); 
if(inWater ){
  if(checkIfItems("broom", 1) && isflying==1){
  }else{
  updateStamina(-0.2)
}}
    if (inWater || (checkIfItems("broom", 1) && isflying == 1)) {
        if (moveRight) {player.currentAnimation = 'inwater_moveright';lastDirection="right"}
        else if (moveLeft){ player.currentAnimation = 'inwater_moveleft';lastDirection="left"}
        else if (moveUp) {player.currentAnimation = 'inwater_moveup';lastDirection="up"}
        else if (moveDown) {player.currentAnimation = 'inwater_movedown';lastDirection="down"}
        playerSpeed =waterspeed 
        if (seed.startsWith("speed")) {
  playerSpeed = waterspeed * 1.5
}
    } else {
        playerSpeed = norspeed;
        if (seed.startsWith("speed")) {
  playerSpeed = norspeed * 1.5
}
        if (moveRight && moveUp) {player.currentAnimation = 'moveupright';lastDirection="up";}
        else if (moveLeft && moveUp) {player.currentAnimation = 'moveupleft';lastDirection="left";}
        else if (moveRight) {player.currentAnimation = 'moveright';lastDirection="right";}
        else if (moveLeft) {player.currentAnimation = 'moveleft';lastDirection="left";}
        else if (moveUp) {player.currentAnimation = 'moveup';lastDirection="up";}
        else if (moveDown){ player.currentAnimation = 'movedown';lastDirection="down";}
        else {
            if (player.currentAnimation.includes('move')) {
                if (player.currentAnimation === 'moveup'){ player.currentAnimation = 'stayup';
                lastDirection="up"
                }
                if (player.currentAnimation === 'moveupright'){ player.currentAnimation = 'stayupright';
                lastDirection="up"
                }
                if (player.currentAnimation === 'moveupleft'){ player.currentAnimation = 'stayupleft';
                lastDirection="up"
                }
                if (player.currentAnimation === 'moveleft'){ player.currentAnimation = 'stayleft';
                lastDirection="left"
                }
                if (player.currentAnimation === 'moveright'){ player.currentAnimation = 'stayright';
                lastDirection="right"
                }
                if (player.currentAnimation === 'movedown'){ player.currentAnimation = 'staydown';
                lastDirection="down"
                }
            }
        }
    }
    if ((moveLeft || moveRight || moveUp || moveDown) && !inWater && !(checkIfItems("broom", 1) && isflying==1)) {
        playFootstepSound();
        stopswimsound()
    } else if((moveLeft || moveRight || moveUp || moveDown)&& !(checkIfItems("broom", 1) && isflying==1)) {
        stopFootstepSound();
        playswimsound()
    }else{
      stopswimsound()
      stopFootstepSound()
    }
    let newTexture="";
    player.frameCounter++;
    if (player.frameCounter >= player.frameSpeed) {
        player.frameIndex = (player.frameIndex + 1) % player.textures[player.currentAnimation].length;
        player.frameCounter = 0;
    }
player.frameCounter2++;
if (player.frameCounter2 >= player.frameSpeed2) {
  player.frameIndex2 = (player.frameIndex2 + 1) % player.textures["waterstep"].length;
  player.frameCounter2 = 0;
}
if (player.frameIndex2 + 1 > player.textures["waterstep"].length) {
  player.frameIndex2 -= 1
}
let buff = "";
if (checkIfItems("dracobuff", 1)) buff = "dracobuff";
else if (checkIfItems("hellbuff", 1)) buff = "hellbuff";
else if (checkIfItems("titaniumbuff", 1)) buff = "titaniumbuff";
else if (checkIfItems("osmiumbuff", 1)) buff = "osmiumbuff";
 if (checkIfItems("broom", 1) && isflying == 1) buff = "broom";
newTexture = getSpecialTexture(player.currentAnimation, player.frameIndex, buff);
if (!newTexture) newTexture = player.texture; 
player.texture = newTexture;
player.stepstexture = newTexture;

 
const rules = [
    [[65,100,119], inoptions.tshirtcolor],
    [[49,59,65], inoptions.leggingscolor,[0,9,15,15]],
    [[133,105,73], inoptions.haircolor, [0,1,15,9]],
    [[133,105,73], inoptions.shoescolor, [0,8,15,15]],
    [[49,59,65], inoptions.eyescolor, [4,4,11,12]],
    [[227,216,145], inoptions.skincolor],
    [[20,23,25], inoptions.outlinecolor],
];
let recolored = recolorTexture(newTexture, rules);
player.texture = recolored;
player.stepstexture = recolored;
    nocliping = 0
if (isflying == 1) {
  nocliping = 1
}
if (options.noclip == 1) {
  nocliping = 1
}
} 
var unfixable=0
let isUpdating2 = false;
var zmiennaBruh=0
var lights=[]
var tickit=0;
var tickit2=0;
var radlight={a:100,b:3}
var by55=0;
function animateLights() {
}
var playerspeed2=0;
let options2={
	fightmode:0,
	dropany:0,
}
let border = null;
let dashOffset = 0;
function drawBorder() {
	if (!border) return;
	const shadowCanvas = document.createElement('canvas');
const dpi = 0.5;
shadowCanvas.width = canvas.width * dpi;
shadowCanvas.height = canvas.height * dpi;
const shadowCtx = shadowCanvas.getContext('2d');
shadowCtx.scale(dpi, dpi);
shadowCtx.fillStyle = 'rgba(0,0,0,0.9)';
shadowCtx.fillRect(border.x -200 - border.radius*2 - offsetX , border.y -200 - border.radius - offsetY, border.radius * 5 +200, border.radius * 5 +200);
shadowCtx.clearRect(border.x - border.radius - offsetX , border.y - border.radius - offsetY, border.radius *2, border.radius*2);
ctx.drawImage(shadowCanvas, 0, 0,canvas.width, canvas.height,);
	ctx.strokeStyle = 'red';
	ctx.lineWidth = 3;
	ctx.setLineDash([15, 15]);
	ctx.lineDashOffset = -dashOffset;
	ctx.strokeRect(border.x - border.radius - offsetX , border.y - border.radius - offsetY, border.radius *2, border.radius*2 );
	dashOffset += 2;
}
function setBorder(x, y, radius) {
	const playerCenterX = player.x + player.width * 2;
	const playerCenterY = player.y + player.height * 2;
	border = { x:Math.floor((x+playerCenterX)/32)*32, y:Math.floor((y+playerCenterY)/32)*32,radius:(radius*blockSize) };
}
function clampPosition(x, y) {
	if (!border) return { x, y };
	const minX = border.x - border.radius;
	const maxX = border.x + border.radius;
	const minY = border.y - border.radius;
	const maxY = border.y + border.radius;
	return {
		x: clamp(x,minX,maxX-32),
		y: clamp(y,minY,maxY-32)
	};
}
function removeBorder() {
	border = null;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}
let damageIndicators = [];
function drawDamageIndicators(ctx, canvas) {
  const now = Date.now();
  damageIndicators = damageIndicators.filter(indicator => {
    const lifeTime = now - indicator.createdAt;
    const duration = 1500; 
    if (lifeTime > duration) return false;
    const progress = lifeTime / duration;
    indicator.alpha = 1 - progress;        
    indicator.yOffset = -progress * 30;    
    ctx.save();
    ctx.globalAlpha = indicator.alpha;
    const barWidth = canvas.width * 0.4;
    const barHeight = 20;
    const barX = (canvas.width - barWidth) / 2;
    let barY = canvas.height - 5 - barHeight - 10;
    if(options.rendermode == 6){ barY = canvas.height -25 - barHeight - 10; }
    if(indicator.enemyHpMax!==Infinity){
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const hpRatio = indicator.enemyHp / indicator.enemyHpMax;
    ctx.fillStyle = "#00ddaa";
    ctx.fillRect(barX, barY, clamp(barWidth * hpRatio,0,""), barHeight);
    ctx.fillStyle = "white";
    ctx.font = '17px pffont';
    ctx.textAlign = "center";
    ctx.letterSpacing = "1px"; 
    ctx.fillText(
      `-${Math.floor(indicator.dealtDamage)}`, 
      canvas.width / 2, 
      barY + indicator.yOffset - 10
    );
    }
    ctx.restore();
    return true;
  });
}
let cursorX = -100;
let cursorY = -100;
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (!isTouchDevice) {
    canvas.addEventListener('mousemove', (evt) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        cursorX = (evt.clientX - rect.left) * scaleX;
        cursorY = (evt.clientY - rect.top) * scaleY;
    });
}
function drawPlusCursor(ctx, x, y) {
    const size = 5;  
    const thickness = 2; 
    ctx.globalAlpha=0.2
    ctx.save();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha=1
}
let tshirtcolor = [50, 50, 50];   
let leggingscolor = [30, 60, 70]; 
function recolorTexture(img, rules) {
  let c = document.createElement("canvas");
  let ctx = c.getContext("2d");
  c.width = img.width;
  c.height = img.height;
  ctx.drawImage(img, 0, 0);
  let imageData = ctx.getImageData(0, 0, c.width, c.height);
  let data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    let pixelIndex = i / 4;
    let x = pixelIndex % c.width;
    let y = Math.floor(pixelIndex / c.width);
    for (let rule of rules) {
      let fromColor = rule[0];
      let toColor   = rule[1];
      let range     = rule[2]; 
      let inRange = true;
      if (range) {
        let [x1,y1,x2,y2] = range;
        inRange = (x >= x1 && x <= x2 && y >= y1 && y <= y2);
      }
      if (inRange && r === fromColor[0] && g === fromColor[1] && b === fromColor[2]) {
        data[i]   = toColor[0];
        data[i+1] = toColor[1];
        data[i+2] = toColor[2];
        break; 
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  let newImg = new Image();
  newImg.src = c.toDataURL();
  return newImg;
}
let updatebars=20
let oneupdatebar=0;
let lvbar = document.getElementById("VlvBar");
let hungerbar = document.getElementById("Vhungerbar");
let thirstbar = document.getElementById("Vthirstbar");
function showBars() {
    hungerbar.classList.remove("hidden1");
    thirstbar.classList.remove("hidden1");
}
function hideBars() {
    hungerbar.classList.add("hidden1");
    thirstbar.classList.add("hidden1");
}
let stopMovement=0;
let stopMovementTicks=10;
let diedrespawn=0




function update() {
 ctx.letterSpacing = "1px"; 
	updateStats()
	if(currentTrack && !currentTrack.paused && isfading==0){
 currentTrack.volume = inoptions["musicvolume"]
	}
 if(activatedCheats){
	toggleNightVison=options.nightvision
}else{
	toggleNightVison=0
}
if(options.quickbutton!==0){  
	if(options.quickbutton==1 && options.quickbuttonselected==1){
		options2.fightmode=1
		options2.dropany=0
	}else if (options.quickbutton == 2 && options.quickbuttonselected == 1) {
	options2.dropany = 1
	options2.fightmode = 0
}else if (options.quickbutton == 3 && options.quickbuttonselected == 1) {
	options2.dropany = 0
	options2.fightmode = 1
}else if (options.quickbutton == 3 && options.quickbuttonselected !==1) {
	options2.dropany = 1
	options2.fightmode = 0
}else{
		options2.dropany=0
		options2.fightmode=0
	}
}else{
options2.dropany = 0
options2.fightmode = 0
}
  if(options.rendermode==1){ 
  canvas.style.transform=" translate(-50%,-50%) scale(100%,100%)"
  }else if (options.rendermode == 0) {
  canvas.style.transform = " translate(-50%,-50%) scale(110%,100%)"
  }else if (options.rendermode == 2) {
  canvas.style.transform = " translate(-50%,-50%) scale(120%,100%)"
  }else if (options.rendermode == 3) {
  canvas.style.transform = " translate(-50%,-50%) scale(130%,108%)"
}else if (options.rendermode == 4) {
  canvas.style.transform = " translate(-50%,-50%) scale(95%,100%)"
}else if (options.rendermode == 5) {
  canvas.style.transform = ` translate(-50%,-85% ) scale(150%,600%)`
}else if (options.rendermode == 6) {
  canvas.style.transform = ` translate(-50%,-55% ) scale(160%,140%)`
}else if (options.rendermode == 7) {
  canvas.style.transform = ` translate(-50%,-55% ) scale(100%,100%)`
  ctx.imageSmoothingEnabled = true;
}else if (options.rendermode == 9) {
  canvas.style.transform = ` translate(-50%,-55% ) scale(160%,100%)`
}else if (options.rendermode == 10) {
  canvas.style.transform = ` translate(-50%,-55% ) scale(160%,120%)`
}else if (options.rendermode == 11) {
	canvas.style.transform = ` translate(-50%,-55% ) scale(145%,120%)`
}else if (options.rendermode == 12) {
	canvas.style.transform = ` translate(-50%,-55% ) scale(123%,100%)`
}else{
  canvas.style.transform=" translate(-50%,-50%) scale(110%,100%)"
  }
  const healthBar = document.getElementById('healthBar');
const healthPercentage = (currentHP / maxHP) * 100;
healthBar.style.width = healthPercentage + '%';
   if(seed.startsWith("raining")){
     isRaining=true;
   }
  if(options.nomusic==undefined){ options.nomusic=0} 
  if(options.Fskipping){ options.Fskipping=0}
if (isUpdating) return; 
if(abletostart==1&&paused!==1 && unfixable==0){
    isUpdating = true;
}
    players[yourname].x=Math.floor(offsetX/32); players[yourname].y=Math.floor(offsetY/32);
    unfixable=0
    if(gametest==1){
        activatedCheats=1;
        options.creativemode=1;
        options.noclip=1;
    }
    let offsetboxGui="25px"
    fskip+=1;
    if(fskip>2){
        fskip=0
    }
    if(options.Fskipping==1){
          targetFPS = 10;
           speedmultiply=1.70
         frameDuration = 1000 / targetFPS;
    }else if (options.Fskipping !== 1) {
    targetFPS = 14;
    speedmultiply=1.60
    frameDuration = 1000 / targetFPS;
    }
    if(weponDelay>0){
        weponDelay-=1
    }
    
if(orbDisplay>0){
 orbDisplay--;
}else{
 lvbar.classList.add("hidden2");
}
    
    
 if(by5>14){
if(options.showfps){
  document.getElementById("fpsCounter").style.display="block"
}else{
  document.getElementById("fpsCounter").style.display="none"
}
   if (options.showuiinventory == 1) {
    updateInventory()
   }else{
     document.getElementById("a2slots").innerHtml=""
   }
   attackedenemy=[]
   if( !checkIfHasEnemy("trueuniversehead",1) && currentTrack == trueTrack ){
     playMusic()
  }  
         if (options.invertControls == 1) {
        document.getElementById("joystick").style.left = ""
        document.getElementById("joystick").style.right = offsetboxGui
        document.getElementById("Q1EQ").style.left = offsetboxGui
        document.getElementById("Q1EQ").style.right = ""
    } else {
        document.getElementById("joystick").style.left = offsetboxGui
        document.getElementById("joystick").style.right = ""
        document.getElementById("Q1EQ").style.left = ""
        document.getElementById("Q1EQ").style.right = offsetboxGui
    }
if(options.zoomout==1){
if (options.hyperzomout == 1) {
 zoomedDELTA = 100
}else if (options.biggerzoomout == 1) {
  zoomedDELTA = 53
}else{
zoomedDELTA= 37
}
  canvas.width=420+zoomedDELTA; canvas.height=350+zoomedDELTA;
  canvas.style.cursor = 'none !important';
  ctx = canvas.getContext('2d');
  if (options.rendermode !== 7) {
ctx.imageSmoothingEnabled = false;
}else{
ctx.imageSmoothingEnabled = true;
}
player.x = canvas.width / 2 - 2 ;
player.y = canvas.height / 2 + 6.7 ;
 }else{
  canvas.width=420; canvas.height=350;
  ctx = canvas.getContext('2d');
  if (options.rendermode !== 7) {
ctx.imageSmoothingEnabled = false;
}else{
  ctx.imageSmoothingEnabled = true;
}
zoomedDELTA=0
    player.x = canvas.width / 2 -2;
    player.y = canvas.height / 2 +6.7;
 }}
  if (isUpdating>1) {
      isUpdating=0
  }else if(paused!==1 && unfixable==0){
      multiplayerLoop()
      if(stopMovementTicks>0){
      	stopMovementTicks-=1
      }else {
      }
if(updatebars>1){
updatebars-=1
oneupdatebar=0
hideBars()
}else{
	if(oneupdatebar==0){
		oneupdatebar=1
	setTimeout(()=>{
		updatebars=60;
	},8000)
	updateHunger(-0.45);
	updateThirst(-0.8);
	showBars()
	}
}
if(currentThirst<=0){
	updateHealth2(-0.5)
}
if (currentHunger<=0) {
	updateHealth2(-0.5)
}
const startTime = performance.now();
 if(players[yourname]){
const playerCenterX = offsetX + canvas.width / 2 * 32 ;
const playerCenterY = offsetY + canvas.height / 2 * 32 ;
     players[yourname].x=playerCenterX
     players[yourname].y=playerCenterY
 }
    isUpdating += 1; 
    weaponTimeout()
  if( currentTrack !== trueTrack && checkIfHasEnemy("trueuniversehead",1)){
    playTrueTrack()
  }
 if(activatedCheats!==1){
   options.noclip=0
 }
 watertickcount += 1
if (watertickcount > 40) {
  watertickcount = 0
}
updateHurtEffect()
  if(abletostart==1){
if (checkIfItems("dracobuff", 1)) {
      updateHealth2(0.23)
  }else{
    if(checkIfItems("healthregenerator",1) && !checkIfItems("hellbuff",1)){
      updateHealth2(0.06);
    }
    if (checkIfItems("staminaregenerator", 1)) {
      updateStamina(0.08);
    }
if (checkIfItems("hellbuff", 1)) {
  updateHealth2(0.2)
}
if (checkIfItems("osmiumbuff", 1)) {
  if(currentBuff=="osmiumbuff"){
  updateHealth2(0.3)
  }
}
  }
if(checkIfItems("broom", 1) && isflying==1){
 updateStamina(-0.10)
playerSpeed = 6.5  
if (seed.startsWith("speed")) {
  playerSpeed = playerSpeed * 1.5
}
}else if (isflying == 1) {
  isflying = 0
} else if( checkIfItems("speedmedalion",1) ){
    playerSpeed=6 
    const inWater = isPlayerInWater();
if (inWater) {
  playerSpeed = waterspeed;
}
  }else{
    playerSpeed=5
    if (seed.startsWith("speed")) {
  playerSpeed = playerSpeed * 1.5
}
if (currentThirst < 20||currentHunger < 15) {
	playerSpeed = 3
}
    const inWater = isPlayerInWater();
    if(inWater){
    playerSpeed = waterspeed;
    if (seed.startsWith("speed")) {
    playerSpeed = playerSpeed * 1.5
    }
     if (currentThirst < 20||currentHunger < 15) {
   	playerSpeed = waterspeed/1.5
     }
    }
  }
  if( checkIfItems('compass',1)  ){
    showTextInCanvas2("X:"+Math.floor(offsetX/32)+" Y:"+Math.floor(offsetY/32) )
  }
  if(checkIfItems("healmedalion",1)){
    updateHealth2(0.04);
  }
    if (Array.isArray(housechunks)) {
  housechunks = {}; 
}
  canvas = document.getElementById('gameCanvas');
    updateDayNightCycle();
    by5++
    checkCaveEntranceOrExit(player.x, player.y);
    if(options.creativemode==1){
      currentHP=100
      currentStamina=100
      currentHunger=100;
      currentThirst=100;
    }
if((isStayOn("grass")||isStayOn("forestgrass")||isStayOn("swampgrass")||isStayOn("sand")||isStayOn("snowgrass")||isStayOn("snowgrass2"))&& nightpower<2.8){
if (Math.random() <= 0.021) {
if(!checkIfHasEnemy("butterflyyellow",3)&&!checkIfHasEnemy("butterflyred",3)&&!checkIfHasEnemy("butterflyblue",3)){
  const slimeTypes = [ "butterflyyellow","butterflyred","butterflyblue"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 8 * blockSize;
  function spawnEnemyNearPlayer() {
  if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance; } else { enemyX = offsetX; }
  if (Math.random() >= 0.3) { enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
  let bat = new Enemy(enemyX, enemyY, randomSlime);
  renderedEnemies.push(bat);
  bat.speed = 2.2
}
  spawnEnemyNearPlayer();
}}
}
if(isStayOn("deadgrassfloor")&& nightpower>=1){
      if (Math.random() <= 0.018) {
        if(!checkIfHasEnemy("ghost",2)){
  const slimeTypes = [ "ghost"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize ;
  function spawnEnemyNearPlayer() {
    const enemyX = Math.random() >= 0.3 ? offsetX + spawnDistance : offsetX - spawnDistance;
    const enemyY = Math.random() >= 0.3 ? offsetY + spawnDistance : offsetY - spawnDistance;
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed = 2.5
  }
  spawnEnemyNearPlayer();
}}
    }
    if(isStayOn("forestgrass")&& nightpower>=2.7){
      if (Math.random() <= 0.015) {
        if(!checkIfHasEnemy("ghost",2)){
  const slimeTypes = [ "ghost"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize ;
  function spawnEnemyNearPlayer() {
    const enemyX = Math.random() >= 0.3 ? offsetX + spawnDistance : offsetX - spawnDistance;
    const enemyY = Math.random() >= 0.3 ? offsetY + spawnDistance : offsetY - spawnDistance;
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed = 2.5
  }
  spawnEnemyNearPlayer();
}}
    }
if (Math.random() <= 0.02 && seed.startsWith("badseed") && isPlayerInWater() ) { 
        if(!checkIfHasEnemy("demon",3)){
  const slimeTypes = ["demon"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 8 * blockSize;
  function spawnEnemyNearPlayer() {
    const enemyX = Math.random() >= 0.3 ? offsetX + spawnDistance : offsetX - spawnDistance;
    const enemyY = Math.random() >= 0.3 ? offsetY + spawnDistance : offsetY - spawnDistance;
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed = 6
  }
  spawnEnemyNearPlayer();
}}
    if(isStayOn("forestgrass")&& nightpower>=2.0){
      if (Math.random() <= 0.021) {
        if(!checkIfHasEnemy("firefly",3)){
  const slimeTypes = [ "firefly"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 8 * blockSize;
  function spawnEnemyNearPlayer() {
    const enemyX = Math.random() >= 0.3 ? offsetX + spawnDistance : offsetX - spawnDistance;
    const enemyY = Math.random() >= 0.3 ? offsetY + spawnDistance : offsetY - spawnDistance;
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed = 2
  }
  spawnEnemyNearPlayer();
}}
    }
    if(inabyss==1){
      if(Math.random()<0.002){
        if(checkIfHasEnemy("abyssdevourerhead",2)){
        }else{
        createAbyssdevourer()
      }}
if (Math.random() <= 0.015) {
  const slimeTypes = ['voidguardian',"soulcat","skellybones","voidguardian"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 8.5 * blockSize;
  function spawnEnemyNearPlayer() {
    const enemyX = Math.random() >= 0.3 ? offsetX + spawnDistance : offsetX - spawnDistance;
    const enemyY = Math.random() >= 0.3 ? offsetY + spawnDistance : offsetY - spawnDistance;
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed=2
  }
  spawnEnemyNearPlayer();
}
    }
    if(isStayOn("fleshblock1")||isStayOn("fleshblock2")||isStayOn("fleshblock")){
if (Math.random() <= 0.015) {
  const slimeTypes = ['hellskull',"flesher","flesher"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  let spawnDistance = 9 * blockSize;
  if (randomSlime == "flesher") {
spawnDistance = 6* blockSize
}
  let enemyY; let enemyX;
  function spawnEnemyNearPlayer() {
if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance;  } else { enemyX = offsetX;}
if (Math.random() >= 0.3) {enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    if(randomSlime=="flesher"){
bat.speed=2.5
    }else{
    bat.speed=4.2
    }
  }spawnEnemyNearPlayer();}
      }
    if(inhell==1){
      if (Math.random() <= 0.008) {
  const slimeTypes = ['hellskull',"hellscourge",'hellskull','hellskull',"flesher"];
  let randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize;
  let enemyY; let enemyX;
  function spawnEnemyNearPlayer() {
if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance;  } else { enemyX = offsetX;}
if (Math.random() >= 0.3) {enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed=4.2
  }
  if(randomSlime!=="hellscourge" || checkIfHasEnemy("hellscourgehead",1)){randomSlime="hellskull"; spawnEnemyNearPlayer();}else{
    createHellScourge()
  }
      }
    }
    if(isunderwater==0 && inhell==0){
if (Math.random() <= 0.008) {
  const slimeTypes = ['greenslime', 'blueslime', 'pinkslime'];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize;
  let enemyY; let enemyX;
  function spawnEnemyNearPlayer() {
if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance;  } else { enemyX = offsetX;}
if (Math.random() >= 0.3) {enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed=2
  }
  spawnEnemyNearPlayer();
}
    if(generateCave==1 || generateCaveForEther ==1){
if (Math.random() <= 0.005) {
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'spider');
    const spawnDistance = 9 * blockSize;
    function spawnBatNearPlayer() {
        let batX, batY;
        if (Math.random() >= 0.3) {
            batX = offsetX + spawnDistance; 
        } else {
            batX = offsetX; 
        }
        if (Math.random() >= 0.3) {
            batY = offsetY + spawnDistance; 
        } else {
            batY = offsetY; 
        }
        let bat = new Enemy(batX, batY, 'spider');
        renderedEnemies.push(bat); 
    }
    spawnBatNearPlayer();
}
      if (Math.random() <= 0.003) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'skellybones');
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance; 
    } else {
      batX = offsetX; 
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance; 
    } else {
      batY = offsetY; 
    }
    let bat = new Enemy(batX, batY, 'skellybones');
    renderedEnemies.push(bat); 
  }
  spawnBatNearPlayer();
}
if (Math.random() <= 0.003) {
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'zombie');
    const spawnDistance = 9 * blockSize;
    function spawnBatNearPlayer() {
        let batX, batY;
        if (Math.random() >= 0.3) {
            batX = offsetX + spawnDistance; 
        } else {
            batX = offsetX; 
        }
        if (Math.random() >= 0.3) {
            batY = offsetY + spawnDistance; 
        } else {
            batY = offsetY; 
        }
        let bat = new Enemy(batX, batY, 'zombie');
        renderedEnemies.push(bat); 
    }
    spawnBatNearPlayer();
}
            if (Math.random() <= 0.007) {
        let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'giantbat');
        if(seed.startsWith("badseed")){
          bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'demonbat');
        }
        const spawnDistance = 9 * blockSize;
        function spawnBatNearPlayer() {
          let batX, batY;
          if (Math.random() >= 0.3) {
            batX = offsetX + spawnDistance; 
          } else {
            batX = offsetX; 
          }
          if (Math.random() >= 0.3) {
            batY = offsetY + spawnDistance; 
          } else {
            batY = offsetY; 
          }
          let bat = new Enemy(batX, batY, 'giantbat');
 if (seed.startsWith("badseed")) {
  bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'demonbat');
}
          renderedEnemies.push(bat); 
        }
        spawnBatNearPlayer();
      }
    }
    if(nightpower>=2){
        if (Math.random() <= 0.004) {
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'zombie');
    const spawnDistance = 9.5 * blockSize;
    function spawnBatNearPlayer() {
        let batX, batY;
        if (Math.random() >= 0.3) {
            batX = offsetX + spawnDistance; 
        } else {
            batX = offsetX; 
        }
        if (Math.random() >= 0.3) {
            batY = offsetY + spawnDistance; 
        } else {
            batY = offsetY; 
        }
        let bat = new Enemy(batX, batY, 'zombie');
        renderedEnemies.push(bat); 
    }
    spawnBatNearPlayer();
}
                  if (Math.random() <= 0.007) {
        let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'skellybones');
        const spawnDistance = 9.5 * blockSize;
        function spawnBatNearPlayer() {
          let batX, batY;
          if (Math.random() >= 0.3) {
            batX = offsetX + spawnDistance; 
          } else {
            batX = offsetX; 
          }
          if (Math.random() >= 0.3) {
            batY = offsetY + spawnDistance; 
          } else {
            batY = offsetY; 
          }
          let bat = new Enemy(batX, batY, 'skellybones');
          renderedEnemies.push(bat); 
        }
        spawnBatNearPlayer();
      }
      if (Math.random() <= 0.002 && curseofgos==1)  {
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance; 
    } else {
      batX = offsetX; 
    } 
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance; 
    } else {
      batY = offsetY; 
    }
    if(Math.random()<0.8){
    let bat = new Enemy(batX, batY, 'spary');
    renderedEnemies.push(bat);
    }else{
      let bat = new Enemy(batX, batY, 'skull');
renderedEnemies.push(bat);
    }
  }
  spawnBatNearPlayer();
}
if(!inether){
if(Math.random()<=0.007){
        let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'bat');
 if (seed.startsWith("badseed") && Math.random()<0.2) {
  bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'demonbat');
}
const spawnDistance = 9* blockSize;
function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
        batX =  offsetX + spawnDistance; 
    } else {
        batX = offsetX ; 
    }
    if (Math.random() >= 0.3) {
        batY = offsetY + spawnDistance; 
    } else {
        batY = offsetY ; 
    }
    let bat = new Enemy(batX, batY, 'bat');
     if (seed.startsWith("badseed") && Math.random() < 0.2) {
   bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'demonbat');
    }
    bat.speed=(Math.random()*2)+1.2
    renderedEnemies.push(bat); 
}
spawnBatNearPlayer();
      }
}else{
	if (inether && Math.random() <= 0.002) {
	let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'ethoper3');
	const spawnDistance = 9 * blockSize;
	function spawnBatNearPlayer() {
		let batX, batY;
		if (Math.random() >= 0.3) {
			batX = offsetX + spawnDistance; 
		} else {
			batX = offsetX; 
		}
		if (Math.random() >= 0.3) {
			batY = offsetY + spawnDistance; 
		} else {
			batY = offsetY; 
		}
		let bat = new Enemy(batX, batY, 'ethoper3');
		bat.speed = (Math.random() * 2) + 1.2
		renderedEnemies.push(bat); 
	}
	spawnBatNearPlayer();
}
}
    }
    if (inether && Math.random() <= 0.002) {
	let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'ethoper2');
	const spawnDistance = 9 * blockSize;
	function spawnBatNearPlayer() {
		let batX, batY;
		if (Math.random() >= 0.3) {
			batX = offsetX + spawnDistance; 
		} else {
			batX = offsetX; 
		}
		if (Math.random() >= 0.3) {
			batY = offsetY + spawnDistance; 
		} else {
			batY = offsetY; 
		}
		let bat = new Enemy(batX, batY, 'ethoper2');
		bat.speed = (Math.random() * 2) + 1.2
		renderedEnemies.push(bat); 
	}
	spawnBatNearPlayer();
}
   let chance5=0
    if(nightpower>2){
      chance5=0.0005
    }else{
      chance5=0.00005
    }
    if(generateCave==1 ||  generateCaveForEther ==1){
      chance5=0.0008
    }
    if ((Math.random() <= chance5 )) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'raven');
  const spawnDistance = 8 * blockSize;
  function spawnBatNearPlayer() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance; 
    } else {
      batX = offsetX; 
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance; 
    } else {
      batY = offsetY; 
    }
    let bat = new Enemy(batX, batY, 'raven');
    renderedEnemies.push(bat); 
  }
  spawnBatNearPlayer();
}
    if (Math.random() <= 0.003) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'wasp', 32, 32, 2);
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer2() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance; 
    } else {
      batX = offsetX; 
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance; 
    } else {
      batY = offsetY; 
    }
    let bat = new Enemy(batX, batY, 'wasp');
    bat.speed = 1.5
    renderedEnemies.push(bat); 
  }
  spawnBatNearPlayer2();
}else if (Math.random() <= 0.005) {
    let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'shark', 32, 32, 1);
    const spawnDistance = 9 * blockSize;
    function spawnBatNearPlayer2() {
        let batX, batY;
        if (Math.random() >= 0.3) {
            batX = offsetX + spawnDistance; 
        } else {
            batX = offsetX; 
        }
        if (Math.random() >= 0.3) {
            batY = offsetY + spawnDistance; 
        } else {
            batY = offsetY; 
        }
        let bat = new Enemy(batX, batY, 'shark');
        bat.speed = 1.5
        renderedEnemies.push(bat); 
    }
    spawnBatNearPlayer2();
}else if (Math.random() <= 0.005) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'duck', 32, 32, 1);
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer2() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance; 
    } else {
      batX = offsetX; 
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance; 
    } else {
      batY = offsetY; 
    }
    let bat = new Enemy(batX, batY, 'duck');
    bat.speed = 1.5
    renderedEnemies.push(bat); 
  }
  spawnBatNearPlayer2();
}else  if (Math.random() <= 0.002) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, 'bunny', 32, 32, 1);
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer2() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance; 
    } else {
      batX = offsetX; 
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance; 
    } else {
      batY = offsetY; 
    }
    let bat = new Enemy(batX, batY, 'bunny');
    bat.speed = 1.5
    renderedEnemies.push(bat); 
  }
  spawnBatNearPlayer2();
}}else if(inhell!==1){
  if (Math.random() <= 0.004) {
  let bat = new Enemy(8 * blockSize + offsetX, 8 * blockSize + offsetY, '1medusa', 32, 32, 1);
  const spawnDistance = 9 * blockSize;
  function spawnBatNearPlayer2() {
    let batX, batY;
    if (Math.random() >= 0.3) {
      batX = offsetX + spawnDistance;
    } else {
      batX = offsetX;
    }
    if (Math.random() >= 0.3) {
      batY = offsetY + spawnDistance;
    } else {
      batY = offsetY; 
    }
    let bat = new Enemy(batX, batY, '1medusa');
    bat.speed = 1.5
    renderedEnemies.push(bat); 
  }
  spawnBatNearPlayer2();
}
}
    playerX = offsetX; 
    playerY = offsetY;
let addY=0
if(onbigbed==1){
    addY=-15
}
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let previousOffsetX = offsetX;
    let previousOffsetY = offsetY;
    if(cannotmove!==1 || stopMovementTicks>0 ){
    let yx=[0,0]
    if (moveLeft) yx[1] = -(playerSpeed+playerspeed2)*speedmultiply ;
    if (moveRight) yx[1] = (playerSpeed+playerspeed2)*speedmultiply;
    if (moveUp) yx[0] = -(playerSpeed+playerspeed2)*speedmultiply;
    if (moveDown) yx[0] = (playerSpeed+playerspeed2)*speedmultiply;
    if((moveDown&&moveLeft )||(moveDown&&moveRight)||(moveUp&&moveLeft)||(moveUp&&moveRight) ){
     mod=(t)=>{return t/1.225};if(checkIfItems("axivector",1)){mod=(t)=>{return t}}
     let lepyx = [mod(yx[0]),mod(yx[1])];
     offsetX+=lepyx[1];offsetY+=lepyx[0]
    }else{
     offsetX+=yx[1];offsetY+=yx[0]
    }
    }
if(moveDown || moveUp || moveLeft || moveRight){
  updateStamina(-0.05)
}else{
  updateStamina(0.17)
}
    if (!moveDown && !moveUp && !moveRight && !moveLeft) {
        targetX = (Math.floor(offsetX / 32) * 32)+17 ; 
        targetY = (Math.floor(offsetY / 32) * 32)+10 ; 
 if (zmiennaBruh >= 0) {
  zmiennaBruh -= 1
}
    }else{
      zmiennaBruh=4
    }
offsetX=parseVar(offsetX,1)
offsetY=parseVar(offsetY,1)
    if (!moveDown && !moveUp && !moveRight && !moveLeft) {
        offsetX += parseVar((targetX - offsetX) * smoothingFactor,2);
        offsetY += parseVar((targetY - offsetY) * smoothingFactor,2);
        if (Math.abs(offsetX - targetX) < 0.1 && Math.abs(offsetY - targetY) < 0.1) {
            offsetX = parseVar(targetX,2);
            offsetY = parseVar(targetY,2);
 offsetX = (Math.floor(offsetX / 32) * 32) + 17;  
offsetY = (Math.floor(offsetY / 32) * 32) + 10;  
        }
    }
    if(zmiennaBruh<=0){ 
offsetX = (Math.floor(offsetX / 32) * 32) + 17;
offsetY = (Math.floor(offsetY / 32) * 32) + 10;
    }
  const playerCenterX = player.x + offsetX + player.width * 2;
const playerCenterY = player.y + offsetY + player.height * 2;
if (border) {
	pos = clampPosition(offsetX+player.x , offsetY+player.y)
offsetX = pos.x-player.x
offsetY = pos.y-player.y
}
    var { treesBelowPlayer, treesAbovePlayer } = drawChunks();
    let collision = checkCollisionWithRock(playerCenterX, playerCenterY);
    if (collision && ((warped!==1)||(generateCave==1)||(generateCaveForEther==1)) ) {
        offsetX = previousOffsetX;
        offsetY = previousOffsetY;
    }else if(((! collision)) && warped==1){
        warped=0;
    }
    if(checkIfHasEnemy("trueuniversehead",1)){
ctx.fillStyle = `rgba(0, 0, 0, 0.4)`;
ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (checkIfHasEnemy("insaneuniversegod", 1)) {
	ctx.fillStyle = `rgba(0, 0, 0, 0.4)`;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}
    drawEnemies()
  updateOthersAnimation()
  if(experimentalmultiplayer==1){
    for (const playerName in players) {
    const playerData = players[playerName];
    if (playerData.texture) {
        ctx.drawImage(playerData.texture, playerData.x - offsetX, playerData.y - offsetY, playerData.width, playerData.height);
        drawPlayerInfo(playerData,playerName); 
    }
}}
     if(player.texture){
    if(!(checkIfItems("broom", 1) && isflying==1)){
ctx.drawImage(player.texture, player.x, player.y+addY, player.width, player.height);
    }
    drawTreesAbovePlayer(treesAbovePlayer);
}else{
}
if(player.texture){
if ((checkIfItems("broom", 1) && isflying == 1)) {
    ctx.drawImage(player.texture, player.x, player.y + addY, player.width, player.height);
}
}else{
}
updateDamageTexts(ctx, offsetX, offsetY)
    if(by5>18){
growTreeInVisibleChunks()
if (etherEventActive && Math.random() < 0.9) {
	checkWaveCleared()
}
if (isinhouse == 1 && isinhouse2 !== 1 ) {
  synchronizeVisibleChunks()
}
if (isinhouse2 == 1 && isinhouse !== 1) {
  synchronizeVisibleChunks2()
}
by5=0
if(isStayOn("desertsand")){
  if (Math.random() <= 0.18) {
  const slimeTypes = ['desertelemental',"desert"];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize;
  let enemyY; let enemyX;
  function spawnEnemyNearPlayer() {
    if(randomSlime=="desert"){
      if(checkIfHasEnemy("desertscourgehead",3)){
      }else{
      createDesertScourge()
    }}else{
if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance;  } else { enemyX = offsetX;}
if (Math.random() >= 0.3) {enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed=4
  }}
  spawnEnemyNearPlayer();
}
}
if(isStayOn("snowgrass")||isStayOn("snowgrass2")){
  if (Math.random() <= 0.3) {
  const slimeTypes = ['frozenghost'];
  const randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize;
  let enemyY; let enemyX;
  function spawnEnemyNearPlayer() {
if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance;  } else { enemyX = offsetX;}
if (Math.random() >= 0.3) {enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed=2
  }
  spawnEnemyNearPlayer();
}
}
}

updatePlayerAnimation();
if (Math.random() < 0.04 && Math.random() < 0.008 && isRaining !== false) {
  isRaining = false
} 
if (Math.random() < 0.013 && Math.random() < 0.005 && isRaining !== true) {
  isRaining = true
}
drawWeapon(ctx)
if (cutindex < sequenceCutTexture.length-1) {
 if(lastWeapon && !weaponSpearAnimation.includes(lastWeapon)
 ){
 const weaponData = itemsAndDamage[lastWeapon];
const range = weaponData.range - 10;

const playerCenterX = player.x + player.width * 2;
const playerCenterY = player.y + player.height * 2;
const canvasCenterX = playerCenterX - 32 - 15;
const canvasCenterY = playerCenterY - 32 - 15;
const weaponTexture = new Image();
ctx.save();
ctx.translate(canvasCenterX, canvasCenterY);
ctx.rotate(directionOfSlash);
 cutticks--
 if (cutticks <= 0) {
  cutticks = defaultCutTicks;
  cutindex += 1
 }
 ctx.drawImage(specialTextures[sequenceCutTexture[cutindex]], 0, -range, range, range*2)
ctx.restore();
}
}
if(hitticks>0){ hitticks --;
}else{ hitticks = defaulthitticks; }
if( hitticks <= 0) {
if (hitshow.length > 0) {
 for (let i = 0; i < hitshow.length; i++) {
  let hit = hitshow[i];
  if (hit.frame < 5) {
   hit.frame++;
  }else{
   hitshow.splice(i,1)
  }
 }
}
}
if (hitshow.length > 0) {
 for (let i = 0; i < hitshow.length; i++) {
  let hit = hitshow[i];
   ctx.drawImage(specialTextures[sequenceHitTexture[hit.frame]], hit.x - offsetX, hit.y - offsetY, blockSize, blockSize)
 }
}
if (seed.startsWith("speed")) {
updateEnemies();updateEnemies();updateEnemies();
}else{
  updateEnemies();
}

updateLightning()
updateLightning2()
updateLightning3()
if(isunderwater==0&&inabyss==0){
drawRainEffectOnBlocks(); 
drawLightning(); 
}else if(isunderwater==1){
ctx.fillStyle = `rgba(0, 125, 255, 0.45)`;
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
const maxLightRadius = 150; 
const lightDecay = 0.0; 
if (checkIfItems("hallucinate", 1)) {
    ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.20)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateHealth2(-0.35);
} 
var adjW=0.1;
var adjH=0.135 ;
if(border!==null){
if (!checkIfHasEnemy("trueuniversehead", 1) ) {
	removeBorder()
}
}
  drawBorder()
if(!toggleNightVison){
if(options.lightplusplus!==1){
chunkPositions.forEach(chunk => {
    if(options.oldlight==0){
 if(isNearTorch(renderedBlocks, chunk.x, chunk.y)==true){ if(!checkIfHasEnemy("flesh",1)){
      }}else  if(isNearTorch(renderedBlocks, chunk.x, chunk.y)==0.5){ if(!checkIfHasEnemy("flesh",1) && inhell==0){
        if (isunderwater == 1) {
  darknessOpacity = (nightpower / maxNightpower) - 0.4
} else {
  darknessOpacity = nightpower / maxNightpower;
}
if (generateCave == 1|| generateCaveForEther == 1 || isinhouse == 1) {
  darknessOpacity = 0.85;
}
if (isinhouse == 1 || isinhouse2 == 1) {
  darknessOpacity = 0.70;
}
        ctx.fillStyle = `rgba(0, 0, 0, ${darknessOpacity-0.3})`;
        const adjustedX = Math.round(chunk.x) ;
const adjustedY = Math.round(chunk.y) ;
const adjustedWidth = chunk.width + adjW;
const adjustedHeight = chunk.height + adjH;
ctx.fillRect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
      }} else if ((!checkIfHasEnemy("flesh",1))) {
  let darknessOpacity = 0.85;
if(generateCave!==1 && generateCaveForEther!==1  && isinhouse!==1 ){
  if(isunderwater==1){
darknessOpacity = (nightpower / maxNightpower)-0.4
  }else{
darknessOpacity = nightpower / maxNightpower;
}
}else{
   darknessOpacity = 0.85;
}
if(inabyss){
  darknessOpacity = 0.55;
}
if (inhell==1) {
  darknessOpacity = 0.20;
}
if(darknessOpacity > 0.96){
  darknessOpacity = 0.97;
}
if (darknessOpacity > 0.94) {
  darknessOpacity = 0.94;
}
if (generateCave == 1|| generateCaveForEther == 1) {
    darknessOpacity = 0.955;
}
if (isinhouse == 1||isinhouse2 == 1) {
    darknessOpacity = 0.50;
}
if (inabyss==1 && Math.random() < 0.03) {
  ctx.fillStyle = `rgba(${Math.random()*10}, ${Math.random()*10}, ${Math.random()*10}, ${darknessOpacity + ((Math.random()*2-1)/5300)})`;
}else if(isRaining && Math.random()<0.025){
        ctx.fillStyle = `rgba(0, 0, 0, ${darknessOpacity})`;
}else{
  ctx.fillStyle = `rgba(0, 0, 0, ${darknessOpacity})`;
}
        const adjustedX = Math.round(chunk.x) ;
const adjustedY = Math.round(chunk.y) ;
        const adjustedWidth = chunk.width + adjW;
const adjustedHeight = chunk.height + adjH;
        ctx.fillRect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    }else{
    }
    if(checkIfHasEnemy("flesh",1)){
     ctx.fillStyle = `rgba(5, 5, 5, ${0.3+((Math.random()*2-1)/40)})`;
        const adjustedX = Math.round(chunk.x);
        const adjustedY = Math.round(chunk.y);
        const adjustedWidth = chunk.width + 0.2; 
        const adjustedHeight = chunk.height + 0.2; 
        ctx.fillRect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    }
}else{
    if(isNearTorch(renderedBlocks, chunk.x, chunk.y)==true){ if(!checkIfHasEnemy("flesh",1)){
      }}  else if ((!checkIfHasEnemy("flesh",1))) {
  let darknessOpacity = 0.85;
if(generateCave!==1 && generateCaveForEther!==1 && isinhouse!==1 ){
  if(isunderwater==1){
darknessOpacity = (nightpower / maxNightpower)-0.4
  }else{
darknessOpacity = nightpower / maxNightpower;
}
}else{
   darknessOpacity = 0.95 ;
}
if(inabyss){
  darknessOpacity = 0.55;
}
if (inhell==1) {
  darknessOpacity = 0.20;
}
if (darknessOpacity > 0.94) {
  darknessOpacity = 0.94;
}
if (generateCave == 1 || generateCaveForEther == 1) {
    darknessOpacity = 0.96;
}
if (isinhouse == 1 || isinhouse2 == 1) {
  darknessOpacity = 0.70;
}
if (inabyss==1 && Math.random() < 0.03) {
  ctx.fillStyle = `rgba(${Math.random()*10}, ${Math.random()*10}, ${Math.random()*10}, ${darknessOpacity + ((Math.random()*2-1)/4300)})`;
}else if(isRaining && Math.random()<0.025){
        ctx.fillStyle = `rgba(0, 0, 0, ${darknessOpacity})`;
}else{
  ctx.fillStyle = `rgba(0, 0, 0, ${darknessOpacity})`;
}
        const adjustedX = Math.round(chunk.x);
        const adjustedY = Math.round(chunk.y);
        const adjustedWidth = chunk.width+0.1; 
        const adjustedHeight = chunk.height + 0.135; 
        ctx.fillRect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    }else{
    }
    if(checkIfHasEnemy("flesh",1)){
     ctx.fillStyle = `rgba(5, 5, 5, ${0.3+((Math.random()*2-1)/40)})`;
        const adjustedX = Math.round(chunk.x);
        const adjustedY = Math.round(chunk.y);
        const adjustedWidth = chunk.width + 0.1; 
        const adjustedHeight = chunk.height + 0.1; 
        ctx.fillRect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    } 
}
});
 }else{
   tickit+=1;
   darknessOpacity = nightpower / maxNightpower;
   if (darknessOpacity > 0.59) {
  darknessOpacity = 0.59;
}
if (generateCave !== 1&& generateCaveForEther!==1  && isinhouse !== 1) {
  if (isunderwater == 1) {
    darknessOpacity = (nightpower / maxNightpower) - 0.4
  } else {
    darknessOpacity = nightpower / maxNightpower;
    if (darknessOpacity > 0.94) {
  darknessOpacity = 0.94;
}
  }
} else {
  darknessOpacity = 0.95;
}
if (inabyss) {
  darknessOpacity = 0.55;
}
if (inhell == 1) {
  darknessOpacity = 0.20;
}
if (darknessOpacity > 0.96) {
  darknessOpacity = 0.97;
} 
   if (isinhouse == 1 || isinhouse2 == 1) {
  darknessOpacity = 0.70;
}
voxelSize = 16;
chunkPositions.forEach(chunk => {
   lights = getLightPlusPlus(renderedBlocks, chunk.x, chunk.y);
});
const shadowCanvas = document.createElement('canvas');
const dpi = 0.5; 
shadowCanvas.width = canvas.width * dpi;
shadowCanvas.height = canvas.height * dpi;
const shadowCtx = shadowCanvas.getContext('2d');
 shadowCtx.scale(dpi, dpi); 
shadowCtx.fillStyle = `rgba(0, 0, 0, ${darknessOpacity})`;
shadowCtx.fillRect(0, 0, canvas.width, canvas.height);
function drawLightOnShadow(light) {
  const lightX = light.x / voxelSize;
  const lightY = light.y / voxelSize;
  const radius = light.radius + radlight.b;
  const power = light.power + radlight.a
  const startX = Math.floor(lightX - radius);
  const endX = Math.ceil(lightX + radius);
  const startY = Math.floor(lightY - radius);
  const endY = Math.ceil(lightY + radius);
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      let dx = x - lightX;
      let dy = y - lightY;
      let dist2 = dx * dx + dy * dy;
      if (dist2 < radius * radius) {
        let intensity = power / (dist2 + 1);
        let alpha = Math.min(intensity / 255, 1);
        if (alpha > 0.01) {
          let screenX = Math.round(x * voxelSize);
          let screenY = Math.round(y * voxelSize);
          if (
            screenX + voxelSize >= 0 &&
            screenY + voxelSize >= 0 &&
            screenX < canvas.width &&
            screenY < canvas.height
          ) {
            shadowCtx.globalCompositeOperation = 'destination-out';
            shadowCtx.globalAlpha = alpha;
            shadowCtx.fillStyle = 'rgba(0, 0, 0, 1)';
            shadowCtx.fillRect(screenX, screenY, voxelSize, voxelSize);
            shadowCtx.globalCompositeOperation = 'source-over';
            if(light.color){
            shadowCtx.fillStyle = light.color;
            shadowCtx.fillRect(screenX, screenY, voxelSize, voxelSize);
            }
          }
        }
      }
    }
  }
}
for (let light of lights) {
  if (tickit > 10&& tickit <21) {
  if(!(light.power-300<20)){
light.power += light.powerDirection * 150;
light.powerDirection *= -1;
}
} else if (tickit > 40) {
  tickit = 0;
}
  drawLightOnShadow(light);
}
ctx.globalAlpha = 1;
ctx.drawImage(shadowCanvas, 0, 0,canvas.width, canvas.height,);
}
}
    drawText();
    drawText2();
updateOxygen();
tickit2+=1;
drawOxygenBar(ctx);
if(checkIfItems("damageindicator",1)){
drawDamageIndicators(ctx, canvas)
} 
if(!checkIfHasEnemy("darkeye",1)&&!generateCave &&!generateCaveForEther && options.fancynight==1 &&!isinhouse&&!isinhouse2 && inhell!==1){
if(nightpower>2.3){
ctx.fillStyle = `rgba(5, 0, 220, 0.08)`;
ctx.fillRect(0, 0, canvas.width, canvas.height);
}else if (nightpower > 1.9) {
  ctx.fillStyle = `rgba(5, 5, 220, 0.07)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}else if (nightpower > 1.5 &&increasing) {
  ctx.fillStyle = `rgba(50, 40, 100, 0.05)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
} }
     if (options.fancygraphic !== 0) {
       if(inabyss!==1){
if (inhell == 1) {
  let torchX = canvas.width / 2
  let torchY = canvas.height / 2
  const gradient = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, maxLightRadius);
  gradient.addColorStop(0, `rgba(50, 0, 0, 0.1)`);
  gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(torchX + 32, torchY, maxLightRadius+300 + Math.random() * 150, 0, 2 * Math.PI);
  ctx.fill();
} else if (isunderwater==0) {
        let torchX = (canvas.width/2)+ 15
        let torchY = ( canvas.height/2)+ 15
        const gradient = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, maxLightRadius);
        gradient.addColorStop(0, `rgba(205, 150, 100, 0.23)`);
        gradient.addColorStop(0.5, 'rgba(205, 140, 50, 0.1)');
        gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(torchX+32, torchY, maxLightRadius + Math.random()*150, 0, 2 * Math.PI);
        ctx.fill();
}else{
  if( checkIfItems("hand_torch",1) || checkIfItems("magiclanter",1)){
let centerX = (canvas.width / 2) + 64+32+15;
let centerY = (canvas.height / 2) + 64+32+15;
const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.sqrt(centerX * centerX + centerY * centerY));
gradient.addColorStop(0, 'rgba(10, 10, 30, 0.04)');
gradient.addColorStop(0.7, 'rgba(10, 20, 80, 0.06)');
gradient.addColorStop(1, 'rgba(10, 50, 100, 0.05)');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
}      }}
if (options.fancygraphic !== 0) {
  if(inabyss!==1){
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.sqrt(centerX * centerX + centerY * centerY));
    if (!isStayOn("desertsand")) {
    if(nightpower<2&& generateCave!==1 && generateCaveForEther!==1){
    gradient.addColorStop(0, 'rgba(200, 200, 200, 0.05)');
gradient.addColorStop(0.6, 'rgba(20, 20, 0, 0.05)');
gradient.addColorStop(1, 'rgba(30, 30, 30, 0.3)');
}else {
  gradient.addColorStop(0, 'rgba(20, 20, 0, 0.1)');
gradient.addColorStop(0.3, 'rgba(20, 20, 0, 0.05)');
gradient.addColorStop(1, 'rgba(30, 20, 0, 0.5)');
}
}else{
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(0.4, 'rgba(55, 40, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(10, 10, 0, 0.9)');
}
if(inhell==1){
  gradient.addColorStop(0, 'rgba(20, 20, 0, 0.1)');
gradient.addColorStop(0.7, 'rgba(20, 20, 0, 0.35)');
gradient.addColorStop(1, 'rgba(30, 20, 0, 0.8)');
}
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}}
drawLightning3();
drawLightning2();
drawPlusCursor(ctx, cursorX, cursorY);
if (debuggingpoint) {
	ctx.fillStyle = "red"
	ctx.fillRect(debuggingpoint.x - offsetX, debuggingpoint.y - offsetY, 3, 3)
}
    const endTime = performance.now();
    const timeTaken = endTime - startTime;
    const timeToWait = Math.max(0, frameDuration - timeTaken);
setTimeout(function(){isUpdating = 0;isUpdating = false; update();  }, frameDuration); 
  }
}
} 
let hitboxShowEnabled = 0;  
let vartt=0
const CcBuilder = ["stone_floor", "fiber_floor","grasslayer","yellow","violet","thistle","clayblock","clayblock1","dandelion","toadstool","sandblock2","gypsumblock","glass","fern","planks_floor","log_floor","ashblock","ashfloor","brickfloor","dirt","daffodil","flax","myosotis","fiber_floor","bed1","magnetite","nettle","stone_floor","emeraldfloor","sapphirefloor","rubyfloor","opalblock","brickfloor","gypsum_dirt","violetfloor","brickfloor2","curedgrasslayer",",bed21","bed22"];
let notabletoreturn987444=0
function clearCaveWallsNearEntrance(entranceX, entranceY) {
const radius = 3 * blockSize;
    for (let x = entranceX - radius; x <= entranceX + radius; x += blockSize) {
        for (let y = entranceY - radius; y <= entranceY + radius; y += blockSize) {
            if (checkBlockAtPosition(x, y, "cavewall") ||
                checkBlockAtPosition(x, y, "cave_wall") ||
                checkBlockAtPosition(x, y, "broken_cavewall")) {
                removeBlockAtPosition(x, y, "cavewall");
                removeBlockAtPosition(x, y, "cave_wall");
                removeBlockAtPosition(x, y, "broken_cavewall");
            }
        }
    }
      if(!checkBlockAtPosition(entranceX,entranceY,"cave_escape")){
        buildBlockAtPosition(entranceX, entranceY, "cave_floor");
        buildBlockAtPosition(entranceX, entranceY, "cave_escape");
    }
}
function clearHellCaveWallsNearEntrance(entranceX, entranceY) {
  const radius = 4 * blockSize;
  for (let x = entranceX - radius; x <= entranceX + radius; x += blockSize) {
    for (let y = entranceY - radius; y <= entranceY + radius; y += blockSize) {
      if (checkBlockAtPosition(x, y, "hellwall") ||
        checkBlockAtPosition(x, y, "hellwall") ||
        checkBlockAtPosition(x, y, "basalt")) {
        removeBlockAtPosition(x, y, "hellwall");
        removeBlockAtPosition(x, y, "lava");
        removeBlockAtPosition(x, y, "hellwall");
removeBlockAtPosition(x, y, "basalt");
        removeBlockAtPosition(x, y, "moltenstone");
        buildBlockAtPosition(x, y, "hellcavestone");
      }
    }
  }
  if (!checkBlockAtPosition(entranceX, entranceY, "hell_escape")) {
    buildBlockAtPosition(entranceX, entranceY, "hellcavestone");
    buildBlockAtPosition(entranceX, entranceY, "hell_escape");
  }
}
function UNBUGclearCave(entranceX, entranceY) {
    const radius = 3 * blockSize;
    for (let x = entranceX - radius; x <= entranceX + radius; x += blockSize) {
        for (let y = entranceY - radius; y <= entranceY + radius; y += blockSize) {
if (checkBlockAtPosition(x, y, "cave_wall") ||checkBlockAtPosition(x, y, "broken_cavewall") ) {removeBlockAtPosition(x, y, "broken_cavewall");removeBlockAtPosition(x, y, "cave_wall");}
}}}
function UNBUGclearunderwaterChunk(entranceX, entranceY) {
    const radius = 3 * blockSize;
    for (let x = entranceX - radius; x <= entranceX + radius; x += blockSize) {
        for (let y = entranceY - radius; y <= entranceY + radius; y += blockSize) {
            if (checkBlockAtPosition(x, y, "underwatersandblock") ||
                checkBlockAtPosition(x, y, "aquawall") ||
                checkBlockAtPosition(x, y, "aquawall")) {
                removeBlockAtPosition(x, y, "underwatersandblock");
                removeBlockAtPosition(x, y, "aquawall");
                removeBlockAtPosition(x, y, "aquawall");
            }
        }}
if (!checkBlockAtPosition(entranceX, entranceY, "underwatersand")) {
  buildBlockAtPositionBefore(entranceX, entranceY, "underwatersand");
}
      if(!checkBlockAtPosition(entranceX,entranceY,"underwaterescape")){
        buildBlockAtPosition(entranceX, entranceY, "underwaterescape");
    }
}
function UNBUGclearEtherChunk(entranceX, entranceY) {
if (!checkBlockAtPosition(entranceX, entranceY, "ethergrass")) {
  buildBlockAtPositionBefore(entranceX, entranceY, "ethergrass");
}if(!checkBlockAtPosition(entranceX,entranceY,"ethergateback")){
buildBlockAtPosition(entranceX, entranceY, "ethergateback");
}
    const radius = 3 * blockSize;
    for (let x = entranceX - radius; x <= entranceX + radius; x += blockSize) {
        for (let y = entranceY - radius; y <= entranceY + radius; y += blockSize) {if (!checkBlockAtOverWorldPosition(x, y, "ethergate")) {
	removeBlockAtPosition(x, y, "ethergateback");
	removeBlockAtPosition(x, y, "ethergateback");
}
}}
}
function UNBUGclearabysschunks(entranceX, entranceY) {
    const radius = 3 * blockSize;
    for (let x = entranceX - radius; x <= entranceX + radius; x += blockSize) {
        for (let y = entranceY - radius; y <= entranceY + radius; y += blockSize) {
            if (checkBlockAtPosition(x, y, "abyssblock") ) {
                removeBlockAtPosition(x, y, "abyssblock");
                removeBlockAtPosition(x, y, "abyssblock");
            }
        }}
      if(!checkBlockAtPosition(entranceX,entranceY,"abyssescape")){
        buildBlockAtPosition(entranceX, entranceY, "abyssfloor");
        buildBlockAtPosition(entranceX, entranceY, "abyssescape");
    }
}
let houseBlockPositions = [];  
function collectHouseBlockPositions() {
  alldoors=[]
  doorsisthere=[]
  for (let block of renderedBlocks) {
    if (block.type == "door") {
  alldoors.push({ x: block.x, y: block.y })
 doorsisthere.push({ x: block.x, y: block.y })
}
if (block.type == "house_wall") {
  alldoors.push({ x: block.x, y: block.y })
}
}
}
function clearVoidBlocksInHouse() {
  for (let pos of doorsisthere) {
  if (checkBlockAtPosition(Math.floor((pos.x - offsetX) / 32) * 32, Math.floor((pos.y - offsetY) / 32) * 32, "voidblock")) {
    removeBlockAtPosition2(pos.x - offsetX, pos.y - offsetY, "voidblock");
    buildBlockAtPosition(pos.x - offsetX, pos.y - offsetY, "housegrass");
    buildBlockAtPosition(pos.x - offsetX, pos.y - offsetY, "door");
  }
}
    for (let pos of alldoors) {
        if (checkBlockAtPosition( Math.floor((pos.x-offsetX)/32)*32, Math.floor((pos.y-offsetY)/32)*32, "voidblock")) {
            removeBlockAtPosition2(pos.x-offsetX, pos.y-offsetY, "voidblock");
        }
    }
}
 var isinhill=0
 let warped=0
 function warpDimension(){
 if (inhell == 1) {
	hellchunks = chunks
	inhell = 0;
	chunks = overworldChunks;
	delayChangeDimension = 1
	setTimeout(function() {
		delayChangeDimension = 0
	}, 5000)
	overworldChunks = null;
	warped = 1
	delayChangeDimension = 1;
}else if (inether == 1) {
	etherchunks = chunks
	inether = 0;
	chunks = overworldChunks;
	delayChangeDimension = 1
	setTimeout(function() {
		delayChangeDimension = 0
	}, 5000)
	overworldChunks = null;
	warped = 1
	delayChangeDimension = 1;
}else if(inabyss==1){
abysschunks = chunks
warped=1
inabyss = 0;
chunks = overworldChunks;  
delayChangeDimension = 1
setTimeout(function() {
    delayChangeDimension = 0
}, 5000)
overworldChunks = null; 
delayChangeDimension = 1;
}else if (isunderwater == 1) {
    seachunks = chunks
    warped = 1
    isunderwater = 0;
    chunks = overworldChunks;
    delayChangeDimension = 1
    setTimeout(function() {
        delayChangeDimension = 0
    }, 5000)
    overworldChunks = null;
    delayChangeDimension = 1;
}
 }
function checkCollisionWithRock(playerX, playerY) {
	let XADD = -(zoomedDELTA / 4)
let YADD = -(zoomedDELTA / 4)
    let mercuryhurt=0;
    let lavahurt=0;
    let webslow=0;
    const collisionRadius = 28; 
    let collisionDetected = false;
    let defcollisionDetected = false;
    onbigbed=0;
for (let block of renderedBlocks) {
 if (block.type === 'mercuryliquid') {
    let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
    let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (hitboxShowEnabled == 1) {
        ctx.fillStyle = 'red';
        ctx.fillRect(block.x, block.y, blockSize, blockSize);
    }
    if (distance < collisionRadius) {
        mercuryhurt=1
        achievementget("Owie it hurts ;( ",0)
    }
}
if (block.type === 'magma' && isflying==0) {
	let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
	let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
	let distance = Math.sqrt(dx * dx + dy * dy);
	if (hitboxShowEnabled == 1) {
		ctx.fillStyle = 'red';
		ctx.fillRect(block.x, block.y, blockSize, blockSize);
	}
	if (distance < collisionRadius) {
		lavahurt = 1
		achievementget("Owie it hurts ;( ", 0)
	}
}
if (block.type === 'web') {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (hitboxShowEnabled == 1) {
    ctx.fillStyle = 'red';
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if (distance < collisionRadius) {
    webslow=1
  }else{
  }
}
   if (block.type === 'geyser') {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (hitboxShowEnabled == 1) {
    ctx.fillStyle = 'red';
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if (distance < collisionRadius*2) {
    oxygen = Math.min(maxOxygen, oxygen + 5);
  }
}
if (block.type === 'moltenstone') {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (hitboxShowEnabled == 1) {
    ctx.fillStyle = 'red';
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if (distance < collisionRadius ) {
    updateHealth2(-0.2)
  }
}
if (nocliping == 1 && options.noclip!==1) {
  if (block.type == 'voidblock' || block.type == "houseinside" || block.type == 'cave_wall' || block.type == 'cavewall' || block.type == 'broken_cavewall') {
    let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
    let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (hitboxShowEnabled == 1) {
      ctx.fillStyle = 'red';
      ctx.fillRect(block.x, block.y, blockSize, blockSize);
    }
    if (distance < collisionRadius - 2) {
      collisionDetected = true; 
    }
  }
}
if (nocliping == 0 && options.noclip == 0) {
 if (! (isStayOn2("hill1")|| isStayOn2("hill2")|| isStayOn2("hill3")) ) {
 isinhill = 0
 }
 if ( (block.type == 'hill1' || block.type == 'hill2' || block.type == 'hill3') && !checkIfItems("hill_climber",1)) {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy); 
  if (hitboxShowEnabled == 1) {
   ctx.fillStyle = 'red';
   ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if (diedrespawn && distance < collisionRadius - 5) {
	function randomOffset() {
		let ranges = [
			{ min: -32 * 15, max: -32 },
			{ min: 32, max: 32 * 15 }
		]
		let r = ranges[Math.floor(Math.random() * ranges.length)]
		return Math.floor(Math.random() * (r.max - r.min + 1)) + r.min
	}
	offsetX = offsetX + randomOffset()
	offsetY = offsetY + randomOffset()
	defcollisionDetected = true
} else if (distance < collisionRadius - 5) {
   let PrimoriaFaces = getFenceConnection(block.x+XADD,block.y+YADD,5)
  if( (PrimoriaFaces=="full" || PrimoriaFaces=="Cdl" || PrimoriaFaces== "Cdr" || PrimoriaFaces=="Cur" || PrimoriaFaces=="Cul" || PrimoriaFaces=="Culdr" || PrimoriaFaces=="Curdl" )  ){
  }else if (isinhill==0){
   collisionDetected = true; 
  }else if (isinhill==1){
  }
 }else{
 }}
}
if(  options.noclip!==1 ){
  if (block.type === 'voidblock' || block.type == "houseinside" ) {
                  if(delayChangeDimension!==1){
          let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
          let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (hitboxShowEnabled == 1) {
            ctx.fillStyle = 'red';
            ctx.fillRect(block.x, block.y, blockSize, blockSize);
          }
          if (distance < collisionRadius/2.5) {
if(isinhouse==1){
housechunks = chunks
}else if (isinhouse2 == 1) {
  house2chunks = chunks
}
showTextInCanvas("house warping bug fixed :)")
isinhouse = 0;
isinhouse2 = 0;
chunks = overworldChunks; 
delayChangeDimension = 1
setTimeout(function() {
  delayChangeDimension = 0
}, 5000)
overworldChunks = null; 
collisionDetected = true; 
          delayChangeDimension = 1;
        }}}
  if (block.type === 'cave_wall'||block.type === 'cavewall'||block.type === 'broken_cavewall' || block.type === 'broken_cavewall') {
                  if(delayChangeDimension!==1){
          let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
          let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (hitboxShowEnabled == 1) {
            ctx.fillStyle = 'red';
            ctx.fillRect(block.x, block.y, blockSize, blockSize);
          }
          if (distance < collisionRadius/2.5) {
showTextInCanvas("this cave is broken")
if (storelastdimension == "") {
	generateCave = 0;
	caveChunks = chunks;
	chunks = overworldChunks;
	overworldChunks = null;
} else if (storelastdimension == "inether") {
	generateCaveForEther = 0;
	inether = 1
	caveChunks2 = chunks;
	chunks = etherchunks
}
delayChangeDimension = 1
setTimeout(function() {
  delayChangeDimension = 0
}, 5000)
            collisionDetected = true; 
          delayChangeDimension = 1;
        }}}
}
    if (delayChangeDimension !== 1) {
        let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
        let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 20) { 
            if ((block.type === 'cave_entrance'||block.type === 'customcaveentrance'&&( generateCave === 0  || (storelastdimension=="inether" && generateCaveForEther==1) ) ) &&!checkBlockAtPosition(block.x+XADD,block.y+YADD, "cavebuilder")) {
                const blockAbove = renderedBlocks.find(b => 
                    b.x === block.x && b.y === block.y - blockSize
                );
              if (!blockAbove || !CcBuilder.includes(blockAbove.type) ) {
                  delayChangeDimension = 1;
        if(storelastdimension==""){
        	generateCave = 1;
        overworldChunks = { ...chunks }; 
        chunks = caveChunks;  UNBUGclearCave(block.x + XADD, block.y + YADD)
clearCaveWallsNearEntrance(block.x + XADD, block.y + YADD);
if (caveInstances.length > 0) {
	playMusic();
}
        }else if(storelastdimension=="inether"){
         generateCaveForEther = 1;
        inether = 0
        etherchunks = { ...chunks };
        chunks = caveChunks2;
        UNBUGclearCave(block.x + XADD, block.y + YADD)
clearCaveWallsNearEntrance(block.x + XADD, block.y + YADD);
        }
                    return;
               }
            } else if (block.type === 'cave_escape' && (generateCave === 1 || (storelastdimension=="inether" && generateCaveForEther==1) ) ) {
              UNBUGclearCave(block.x+XADD,block.y+YADD)
              delayChangeDimension = 1;
         if(storelastdimension==""){
        	generateCave = 0;
        	caveChunks = chunks;
        chunks = overworldChunks; 
        overworldChunks = null; 
if (caveInstances.length > 0) {
	playMusic();
}
        }else if(storelastdimension=="inether"){
         generateCaveForEther = 0; 
        inether = 1
        caveChunks2 = chunks;
        chunks = etherchunks
        }
                delayChangeDimension = 1;
                warped=1
                return;
            } else if (block.type === 'hell_entrance' || block.type === 'hell_entrance' && inhell === 0 && !checkBlockAtPosition(block.x + XADD, block.y + YADD, "cavebuilder")) {
	warped = 1
	const blockAbove = renderedBlocks.find(b =>
		b.x === block.x && b.y === block.y - blockSize
	);
	if (!blockAbove || !CcBuilder.includes(blockAbove.type)) {
		UNBUGclearCave(block.x + XADD, block.y + YADD)
		delayChangeDimension = 1;
		generateCave = 0;
		inhell = 1;
		caveChunks = { ...chunks };
		chunks = hellchunks;
		clearHellCaveWallsNearEntrance(block.x, block.y);
		playMusic()
		setTimeout(function() {
			hellchunks = chunks
			generateCave = 1;
			inhell = 0;
			chunks = caveChunks;
			setTimeout(function() {
				generateCave = 0;
				inhell = 1;
				caveChunks = { ...chunks };
				chunks = hellchunks;
				delayChangeDimension = 1;
				clearHellCaveWallsNearEntrance(block.x, block.y);
			}, 200)
		}, 200)
		return;
	}
}else if (block.type === 'ethergate'||block.type === 'ethergateback' && generateCave!==1 && isinhouse==0 &&!checkBlockAtPosition(block.x+XADD,block.y+YADD, "cavebuilder") ) {
  const blockAbove = renderedBlocks.find(b =>
    b.x === block.x && b.y === block.y - blockSize 
  );
  if (!blockAbove || !CcBuilder.includes(blockAbove.type)) {
    delayChangeDimension = 1;
if(inether==0){
 inether = 1;
overworldChunks = { ...chunks };
chunks = etherchunks;
storelastdimension="inether"
playMusic();
UNBUGclearEtherChunk(block.x+XADD,block.y+YADD)
}else{
 inether = 0;
 UNBUGclearEtherChunk(block.x+XADD,block.y+YADD)
etherchunks = { ...chunks };
chunks = overworldChunks;
storelastdimension=""
playMusic();
}
    return;
  }
} else if (block.type === 'hell_escape' && inhell === 1) {
  delayChangeDimension = 1;
  hellchunks= chunks
  generateCave = 1;
  inhell=0;
  chunks = caveChunks;
  delayChangeDimension = 1;
  playMusic()
setTimeout(function() {
  UNBUGclearCave(block.x,block.y)
}, 200);
  return;
}
        }
    }
if (delayChangeDimension !== 1) {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 5) { 
    if (block.type === 'underwaterescape' || block.type === 'underwaterentrance' && !checkBlockAtPosition(block.x,block.y, "water1") && generateCave !== 1 &&    isinhouse !== 1 && inabyss !== 1 && !checkBlockAtPosition(block.x+XADD,block.y+YADD, "cavebuilder") ) {
  const blockAbove = renderedBlocks.find(b =>
    b.x === block.x && b.y === block.y - blockSize 
  );
  if (!blockAbove || !CcBuilder.includes(blockAbove.type)) {
    delayChangeDimension = 1;
    if(isunderwater==0){
    isunderwater = 1;
    overworldChunks = { ...chunks };
    chunks = seachunks;
playMusic();
   UNBUGclearunderwaterChunk(block.x+XADD,block.y+YADD)
}else{
  isunderwater = 0;
seachunks = { ...chunks };
chunks = overworldChunks;
playMusic();
}
    return;
  }
}if (block.type === 'abyssescape' || block.type === 'abyssentrance' && isinhouse !== 1 ) {
  const blockAbove = renderedBlocks.find(b =>
    b.x === block.x && b.y === block.y - blockSize 
  );
  if (!blockAbove || !CcBuilder.includes(blockAbove.type)) {
    if (inabyss == 0) {
      delayChangeDimension = 1;
generateCave=0
UNBUGclearCave(block.x+XADD,block.y+YADD)
      caveChunks = { ...chunks };
      chunks = abysschunks;
      UNBUGclearabysschunks(block.x+XADD, block.y+YADD)
      setTimeout(function (){
        UNBUGclearabysschunks(block.x+XADD, block.y+YADD)
      },200);
      delayChangeDimension = 1;
      inabyss = 1;
      playMusic();
    } else {
      inabyss = 0;
generateCave=1
UNBUGclearCave(block.x,block.y)
      abysschunks = { ...chunks };
      chunks = caveChunks;
delayChangeDimension = 1;
    }
    return;
  }
}else if (block.type === 'door'||block.type === 'gypsumdoor'||block.type === 'door2' && generateCave!==1 && isinhouse==0) {
      const blockAbove = renderedBlocks.find(b =>
        b.x === block.x && b.y === block.y - blockSize 
      );
      if (!blockAbove || !CcBuilder.includes(blockAbove.type)) {
        if( !(isinhouse==1|| isinhouse2==1) ){
        delayChangeDimension = 1;
        if(storelastdimension==""){
        	isinhouse = 1;
        overworldChunks = { ...chunks }; 
        chunks = housechunks;  synchronizeVisibleChunks()
        }else if(storelastdimension=="inether"){
        isinhouse = 1;
        inether = 0
        etherchunks = { ...chunks };
        chunks = housechunks;
        synchronizeVisibleChunks()
        }
        showTextInCanvas("goto")
}
        return;
      }
    }else if (  block.type === 'door2' && generateCave !== 1 && isinhouse !== 0 && inabyss !== 1) {
    delayChangeDimension = 1;
    housechunks = chunks;
        if (storelastdimension == "") {
        	isinhouse = 0;
        	chunks = overworldChunks; 
        } else if (storelastdimension == "inether") {
        	inether = 1
        	isinhouse = 0;
        	chunks = etherchunks ;
        }
    delayChangeDimension = 1;
    showTextInCanvas("exit")
    return;
} if (block.type === 'stairsdown' || block.type === 'stairsup' && isinhouse == 1) {
    const blockAbove = renderedBlocks.find(b =>
        b.x === block.x && b.y === block.y - blockSize 
    );
    if (!blockAbove || !CcBuilder.includes(blockAbove.type)) {
        if (isinhouse2 == 0) {
            delayChangeDimension = 1;
            isinhouse = 0;
            isinhouse2 = 1;
            housechunks = { ...chunks };
            chunks = house2chunks;
            synchronizeVisibleChunks2()
            setTimeout(function() {
                synchronizeVisibleChunks2()
            }, 500);
            delayChangeDimension = 1;
        } else {
            isinhouse2 = 0;
            isinhouse = 1
            house2chunks = { ...chunks };
            chunks = housechunks;
            delayChangeDimension = 1;
        }
        return;
    }
}
  }
}
if(delayChangeDimension == 1){
vartt++
if(vartt>5000 ){
  vartt=0
  delayChangeDimension=0
  if (currentTrack == abyssumTrack) {
  playMusic()
}
}}
if (nocliping == 0) {
    if (block.type === 'tree0' || block.type === 'pine0' || block.type === 'birch0' || block.type === 'snowpine1' || block.type === 'helltree0' || block.type === 'abysstree0' || block.type === 'palm1' || block.type === 'palm12'|| block.type === 'ethertree1' || block.type === 'etherlog') {
  let playerRect = {
    x: player.x,
    y: player.y,
    width: player.width - 7,
    height: player.height - 7
  };
  let blockRect = {
    x: block.x,
    y: block.y,
    width: blockSize - 7,
    height: blockSize - 7
  };
  let collides = !(playerRect.x > blockRect.x + blockRect.width ||
    playerRect.x + playerRect.width < blockRect.x ||
    playerRect.y > blockRect.y + blockRect.height ||
    playerRect.y + playerRect.height < blockRect.y);
 blockRect = {
  x: block.x+8,
  y: block.y+8,
  width: blockSize - 25,
  height: blockSize - 25
};
let collides2 = !(playerRect.x > blockRect.x + blockRect.width ||
  playerRect.x + playerRect.width < blockRect.x ||
  playerRect.y > blockRect.y + blockRect.height ||
  playerRect.y + playerRect.height < blockRect.y);
 if (diedrespawn && collides) {
	function randomOffset() {
		let ranges = [
			{ min: -32 * 15, max: -32 },
			{ min: 32, max: 32 * 15 }
		]
		let r = ranges[Math.floor(Math.random() * ranges.length)]
		return Math.floor(Math.random() * (r.max - r.min + 1)) + r.min
	}
	offsetX = offsetX + randomOffset()
	offsetY = offsetY + randomOffset()
	defcollisionDetected = true
} else
if (collides2) {
  warped = 1; 
}else if (collides) {
  warped = 0;
  collisionDetected = true; 
}
}else if (block.type === 'rock' || block.type === 'log0' || block.type === 'tree0' || block.type === 'ethertree1' || block.type === 'house_wall' || block.type === 'gypsumhouse' || block.type === 'voidblock'|| block.type === 'houseinside' || block.type === 'empty_black_elderberry' || block.type === 'black_elderberry' || block.type === 'birch0' || block.type === 'snowpine1' || block.type === 'yew0' || block.type === 'pine0' || block.type === 'stone_wall' || block.type === 'log_wall' || block.type === 'log' || block.type === 'sapling' || block.type === 'brickwall' || block.type === 'gypsumblock' || block.type === 'planks' || block.type === 'cave_wall' || block.type === 'broken_cavewall' || block.type === 'rubyblock' || block.type === 'sapphireblock' || block.type === 'emeraldblock' || block.type === 'brickhouse' || block.type === 'underwatersandblock' || block.type === 'abyssblock' ||block.type === 'abyssblock2' || block.type === 'stonewithgypsum' || block.type === 'cavewallwithsalt' || block.type === 'fence' || block.type === 'table' || block.type === 'lamp' || block.type === 'hellwall' || block.type === 'hellwall2' || block.type === 'basalt' || block.type === 'granite' || block.type === 'statue1_1' || block.type === 'statue2_1' ||
  block.type === 'helllog' || block.type === 'abysslog' || block.type === 'helltree0' || block.type === 'abysstree0' || block.type === 'hellsapling' || block.type === 'abysssapling' || block.type === 'palmlog' || block.type === 'palm1' || block.type === 'palmsapling' || block.type === 'palm12' || block.type === 'can' || block.type === 'cinnabargeode' || block.type === 'fountain' || block.type === 'cauldron'|| block.type == "plantmaker"|| block.type == "randomrock1"|| block.type == "randomrock2"|| block.type == "chest"|| block.type == "pumpkin" ||block.type === 'coral1block' ||block.type === 'coral2block' 
  ||block.type === 'bookshelf' ||block.type === 'shelf' ||block.type === 'magma'||block.type === 'gravestone' ||block.type === 'godbench' ||block.type === 'canvas' 
) {
  let playerRect = {
    x: player.x,
    y: player.y,
    width: player.width - 7,
    height: player.height - 7
  };
  let blockRect = {
    x: block.x,
    y: block.y,
    width: blockSize - 7,
    height: blockSize - 7
  };
  let collides = !(playerRect.x > blockRect.x + blockRect.width ||
    playerRect.x + playerRect.width < blockRect.x ||
    playerRect.y > blockRect.y + blockRect.height ||
    playerRect.y + playerRect.height < blockRect.y);
  if (hitboxShowEnabled == 1) {
    ctx.fillStyle = 'red';
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if(diedrespawn && collides){
  function randomOffset(){
    let ranges=[
      {min:-32*15,max:-32},
      {min:32,max:32*15}
    ]
    let r=ranges[Math.floor(Math.random()*ranges.length)]
    return Math.floor(Math.random()*(r.max-r.min+1))+r.min
  }
    offsetX=offsetX+randomOffset()
    offsetY=offsetY+randomOffset()
    defcollisionDetected=true
  } else
  if (collides) {
    collisionDetected = true; 
  }
} 
}
        if (block.type === 'cactus'){
                      let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
            let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (hitboxShowEnabled == 1) { 
              ctx.fillStyle = 'red';
              ctx.fillRect(block.x, block.y, blockSize, blockSize);
            }
            if (distance < collisionRadius) {
achievementget("Owie it hurts ;( ",0)
              updateHealth(-1)
            }
        }
        if (block.type === 'bed1' || block.type === 'a1bed'||block.type === 'bed21' || block.type === 'bed22') {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (hitboxShowEnabled == 1) {
    ctx.fillStyle = 'red';
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if (distance < collisionRadius && (isunderwater==0 && inhell==0 && inabyss==0 )  ) {
    const playerCenterX2 = offsetX 
const playerCenterY2 = offsetY
if(isinhouse==1){
player.savedinworld="house"
}else{
player.savedinworld=""
}
    if(! isPlayerInWater() ){
player.spawnX = playerCenterX2;
player.spawnY = playerCenterY2;
achievementget("Time to break time", 1)
 if(langPlactive==1){
showTextInCanvas("ustawiono punkt odradzania czas pędzi")
}else{
    showTextInCanvas("spawn point set time is faster now" )
} 
    updateStamina(0.1)
    currentHP = Math.max(0, Math.min(maxHP, currentHP + 0.03));
const healthBar = document.getElementById('healthBar');
const healthPercentage = (currentHP / maxHP) * 100;
healthBar.style.width = healthPercentage + '%';
    updateDayNightCycle()
    updateDayNightCycle()
    updateDayNightCycle()
updateDayNightCycle()
  }else{
       if (langPlactive == 1) {
     showTextInCanvas("łużko na wodzie i ty niby myslisz że to zadziała :3 ")
 } else {
     showTextInCanvas("bed on water ? Bro you are thinking this will work :3 ")
 }
  }}
}   
;
if (  block.type === 'a1bed' ||block.type === 'bed21'|| block.type === 'bed22') {
  let dx = (player.x + player.width / 2) - (block.x + blockSize / 2);
  let dy = (player.y + player.height / 2) - (block.y + blockSize / 2);
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (hitboxShowEnabled == 1) {
    ctx.fillStyle = 'red';
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }
  if (distance < 15  ) {
    if(! isPlayerInWater() ){
onbigbed=1;
  }else{
  }}else{
  }
}
    }
if(webslow==1){
  playerspeed2=-4
}else{
  playerspeed2=0;
}
if(mercuryhurt==1){
    updateHealth2(-0.25)
}
if (lavahurt == 1) {
	updateHealth2(-2.25)
}
if (defcollisionDetected!==true) {
	diedrespawn = 0
}
    return collisionDetected; 
}
let currentText = "";  
let textTimeout = 0;   
let textX = 0;         
let textY = 0;         
function showTextInCanvas(text) {
    currentText = text;
    textX = canvas.width / 2;
    textY = canvas.height -30;
if (options.rendermode == 3) {
  textY = canvas.height -45;
}
if (options.rendermode == 6) {
  textY = canvas.height - 65;
}
    textTimeout = performance.now() + 4000;  
}
function drawText() {
    if (currentText !== "" && performance.now() < textTimeout) {
     ctx.letterSpacing = "1px"; 
        ctx.font = '13px pffont';
        ctx.fillStyle = "rgb(255,255,200)";
        ctx.textAlign = "center";
        
        ctx.fillText(currentText, textX, textY);
    }
}
let currentText2 = "";  
let textTimeout2 = 0;   
let textX2 = 0;         
let textY2 = 0;         
function showTextInCanvas2(text) {
    currentText2 = text;
    textX2 = 40;
textY2 =canvas.height -50;
if (options.rendermode == 3) {
  textY2 = canvas.height - 55;
}
if (options.rendermode == 6) {
  textY = canvas.height - 65;
}
    textTimeout2 = performance.now() + 4000;  
}
function drawText2() {
    if (currentText2 !== "" && performance.now() < textTimeout2) {
        ctx.font = '13px pffont';
        ctx.textAlign = "center";
        const textMetrics = ctx.measureText(currentText2);
        const textWidth = textMetrics.width;
        const textHeight = 10;
        ctx.fillStyle = "white";
        ctx.globalAlpha = 0.3;
        ctx.fillRect(textX2 - textWidth / 2 - 5, textY2 - textHeight, textWidth + 10, textHeight + 5);
        ctx.globalAlpha = 1
        ctx.fillStyle = "black";
        ctx.letterSpacing = "1px"; 
        ctx.fillText(currentText2, textX2, textY2);
    }
}
let lastTime = 0;
function mainLoop(timestamp) {
    const deltaTime = timestamp - lastTime; 
    lastTime = timestamp; 
    update(deltaTime); 
}
setTimeout(function() {
  requestAnimationFrame(mainLoop);
}, 13000);

let lastColor = "#000"
let lastDraw = null
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function canvasDrop(item){
    closeInventory()
    showMiniPaint(10,"", deepCopy(lastDraw), async function(drawing) {
        lastDraw = drawing
        let playerX = Math.floor((offsetX + player.x) / blockSize) * blockSize;
        let playerY = Math.floor((offsetY + player.y + 1) / blockSize) * blockSize;
        switch(lastDirection){
            case 'up': playerY -= blockSize; break
            case 'down': playerY += blockSize; break
            case 'left': playerX -= blockSize; break
            case 'right': playerX += blockSize; break
            case 'right-up': playerX += blockSize; playerY -= blockSize; break
            case 'left-up': playerX -= blockSize; playerY -= blockSize; break
        }
        const newBlock = {x: playerX/blockSize, y: playerY/blockSize, type: item}
        const chunkKey = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`
        if(!chunks[chunkKey]) chunks[chunkKey] = []
        chunks[chunkKey].push({x:0,y:0,type:item,draw:drawing})
    })
}
function canvasDrop2(item){
    closeInventory()
    showMiniPaint(16,"", deepCopy(lastDraw), async function(drawing) {
        lastDraw = drawing
        let playerX = Math.floor((offsetX + player.x) / blockSize) * blockSize;
        let playerY = Math.floor((offsetY + player.y + 1) / blockSize) * blockSize;
        switch(lastDirection){
            case 'up': playerY -= blockSize; break
            case 'down': playerY += blockSize; break
            case 'left': playerX -= blockSize; break
            case 'right': playerX += blockSize; break
            case 'right-up': playerX += blockSize; playerY -= blockSize; break
            case 'left-up': playerX -= blockSize; playerY -= blockSize; break
        }
        const newBlock = {x: playerX/blockSize, y: playerY/blockSize, type: item}
        const chunkKey = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`
        if(!chunks[chunkKey]) chunks[chunkKey] = []
        chunks[chunkKey].push({x:0,y:0,type:item,draw:drawing})
    })
}
function showMiniPaint(size, title, startDraw, callback){
    let overlay = document.createElement("div")
    overlay.style.cssText = `
        position:fixed;inset:0;
        background:#000;
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
    `
    let box = document.createElement("div")
    box.style.cssText = `
        background:#1b1b1b;
        border-radius:20px;
        padding:2vh 2vw;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:2vh;
        width:min(90vw,90vh);
        box-shadow:0 0 25px rgba(255,255,255,0.15);
    `
    let t = document.createElement("div")
    t.textContent = title
    t.style.cssText = `
        font-size:clamp(10px,3vw,11px);
        font-weight:600;
        color:#fff;
        text-align:center;
    `
    box.appendChild(t)

    const pixelCount = size
    let c = document.createElement("canvas")
    c.width = pixelCount
    c.height = pixelCount
    c.style.cssText = `
        width:70%;height:70%;
        min-width:120px;min-height:120px;
        max-width:90%;max-height:90%;
        image-rendering:pixelated;
        border:2px solid #444;
        border-radius:12px;
        background:#fff;
        cursor:crosshair;
        touch-action:none;
    `
    box.appendChild(c)
    let ctx = c.getContext("2d")

    let draw = startDraw ? startDraw : createEmptyDraw(pixelCount,pixelCount)
    let color = lastColor
    let painting = false

    function renderAll(){
    for(let x=0;x<pixelCount;x++){
        if (!draw[x]) draw[x] = {}; 
        for(let y=0;y<pixelCount;y++){
            ctx.fillStyle = draw[x][y] || "#c9c9c9";
            ctx.fillRect(x,y,1,1);
        }
    }
}

    renderAll()

function drawPixel(e) {
	let r = c.getBoundingClientRect()
	let scaleX = c.width / r.width
	let scaleY = c.height / r.height
	let x = Math.floor((e.clientX - r.left) * scaleX)
	let y = Math.floor((e.clientY - r.top) * scaleY)
	if (x >= 0 && x < pixelCount && y >= 0 && y < pixelCount) {
		if (pickerActive) {
			color = draw[x][y]
			lastColor = color
			pickerActive = false
			pickerBtn.style.opacity = "1"
		} else {
			draw[x][y] = color
		}
		renderAll()
	}
}

    c.onmousedown=e=>{painting=true;drawPixel(e)}
    c.onmouseup=()=>painting=false
    c.onmouseleave=()=>painting=false
    c.onmousemove=e=>{if(painting)drawPixel(e)}
    c.ontouchstart=e=>{painting=true;drawPixel(e.touches[0])}
    c.ontouchend=()=>painting=false
    c.ontouchmove=e=>{if(painting){drawPixel(e.touches[0]);e.preventDefault()}}


    let controls = document.createElement("div")
    controls.style.cssText=`
        display:flex;
        flex-wrap:wrap;
        gap:1vh;
        justify-content:center;
        align-items:center;
        font-size:8px;
    `

    let colorBtn = document.createElement("button")
    colorBtn.textContent = "Color"
    colorBtn.style.cssText = btnStyleDark()
    colorBtn.onclick = ()=>showColorPicker(v=>{color=v; lastColor=v})
    controls.appendChild(colorBtn)

    let eraseBtn = document.createElement("button")
    eraseBtn.textContent = "Eraser"
    eraseBtn.style.cssText = btnStyleDark()
    eraseBtn.onclick=()=>color="#c9c9c9"
    controls.appendChild(eraseBtn)

let pickerActive = false

let pickerBtn = document.createElement("button")
pickerBtn.textContent = "Picker"
pickerBtn.style.cssText = btnStyleDark()
pickerBtn.onclick = () => {
    pickerActive = !pickerActive
    pickerBtn.style.opacity = pickerActive ? "0.6" : "1"
}
controls.appendChild(pickerBtn)

    let clear = document.createElement("button")
    clear.textContent = "Clear"
    clear.style.cssText = btnStyleDark()
    clear.onclick=()=>{
        draw=createEmptyDraw(pixelCount,pixelCount)
        renderAll()
    }
    controls.appendChild(clear)

    let done = document.createElement("button")
    done.textContent = "Done"
    done.style.cssText = btnStyleAccent()
    done.onclick = ()=>{
        document.body.removeChild(overlay)
        callback(draw)
    }
    controls.appendChild(done)

    box.appendChild(controls)
    overlay.appendChild(box)
    document.body.appendChild(overlay)
}

function createEmptyDraw(w,h){
    let d={}
    for(let i=0;i<w;i++){
        d[i]={}
        for(let j=0;j<h;j++) d[i][j]="#c9c9c9"
    }
    return d
}

function btnStyleDark(){
    return `
        background:#2a2a2a;
        color:#fff;
        border:none;
        border-radius:10px;
        padding:5px 5px;
        font-size:16px;
        font-weight:600;
        cursor:pointer;
        transition:0.2s;
    `
}

function btnStyleAccent(){
    return `
        background:#fff;
        color:#000;
        border:none;
        border-radius:10px;
        padding:5px 5px;
        font-size:16px;
        font-weight:700;
        cursor:pointer;
        transition:0.2s;
    `
}

function showColorPicker(cb){
let overlay=document.createElement("div")
overlay.style.cssText=`
position:fixed;inset:0;
background:rgba(0,0,0,0.85);
display:flex;
align-items:center;
justify-content:center;
z-index:10000;
padding:10px;
box-sizing:border-box;
`
let box=document.createElement("div")
box.style.cssText=`
background:#1b1b1b;
border-radius:16px;
padding:16px;
display:flex;
flex-direction:column;
align-items:center;
gap:12px;
max-width:100%;
max-height:100%;
overflow:hidden scroll;
box-sizing:border-box;
`
let size=Math.min(window.innerWidth*0.7,window.innerHeight*0.5)
let pixelCanvas=document.createElement("canvas")
pixelCanvas.width=64
pixelCanvas.height=64
pixelCanvas.style.cssText=`
width:${size}px;
height:${size}px;
image-rendering:pixelated;
border-radius:12px;
border:2px solid #444;
cursor:crosshair;
touch-action:none;
`
box.appendChild(pixelCanvas)
let ctx=pixelCanvas.getContext("2d")
 

function hexToHsl(hex){
hex=hex.replace("#","")
if(hex.length===3)hex=hex.split("").map(x=>x+x).join("")
let r=parseInt(hex.substr(0,2),16)/255
let g=parseInt(hex.substr(2,2),16)/255
let b=parseInt(hex.substr(4,2),16)/255
let max=Math.max(r,g,b),min=Math.min(r,g,b)
let h,s,l=(max+min)/2
if(max===min){h=s=0}else{
let d=max-min
s=l>0.5?d/(2-max-min):d/(max+min)
switch(max){
case r:h=(g-b)/d+(g<b?6:0);break
case g:h=(b-r)/d+2;break
case b:h=(r-g)/d+4;break
}
h*=60
}
return {h:Math.round(h),s,s,l}
}

let last=hexToHsl(lastColor)
let hue=last.h
let selected={x:Math.round(last.s*63),y:63-Math.round(last.l*63),color:lastColor}


function renderPicker(){
for(let x=0;x<64;x++)for(let y=0;y<64;y++){
let s=x/63
let l=1-y/63
let rgb=hslToRgb(hue/360,s,l)
ctx.fillStyle=rgbToCss(rgb)
ctx.fillRect(x,y,1,1)
}
drawOutline()
}
function drawOutline(){
ctx.strokeStyle=isLight(selected.color)?"#000":"#fff"
ctx.lineWidth=0.1
ctx.strokeRect(selected.x-0.5,selected.y-0.5,1,1)
}
function isLight(hex){
let r=parseInt(hex[1]+hex[1],16)
let g=parseInt(hex[2]+hex[2],16)
let b=parseInt(hex[3]+hex[3],16)
let lum=0.2126*r+0.7152*g+0.0722*b
return lum>150
}
function pickColor(e){
let r=pixelCanvas.getBoundingClientRect()
let x=Math.floor((e.clientX-r.left)/r.width*64)
let y=Math.floor((e.clientY-r.top)/r.height*64)
x=Math.max(0,Math.min(63,x))
y=Math.max(0,Math.min(63,y))
selected.x=x
selected.y=y
let img=ctx.getImageData(x,y,1,1).data
selected.color=rgbToHex(img[0],img[1],img[2])
renderPicker()
updatePreview()
}
pixelCanvas.addEventListener("pointerdown",pickColor)
pixelCanvas.addEventListener("pointermove",e=>{if(e.buttons>0)pickColor(e)})
pixelCanvas.addEventListener("touchstart",e=>pickColor(e.touches[0]))
pixelCanvas.addEventListener("touchmove",e=>{pickColor(e.touches[0]);e.preventDefault()})
let hueSlider=document.createElement("input")
hueSlider.type="range"
hueSlider.min=0
hueSlider.max=360
hueSlider.value=0
hueSlider.style.cssText="width:90%"
hueSlider.value=hue
hueSlider.oninput=()=>{
hue=parseInt(hueSlider.value)
renderPicker()
pickColor({clientX:selected.x/pixelCanvas.width*pixelCanvas.getBoundingClientRect().width+pixelCanvas.getBoundingClientRect().left,
clientY:selected.y/pixelCanvas.height*pixelCanvas.getBoundingClientRect().height+pixelCanvas.getBoundingClientRect().top})
}
box.appendChild(hueSlider)
let bottomRow=document.createElement("div")
bottomRow.style.cssText=`
display:flex;
gap:12px;
align-items:center;
flex-wrap:wrap;
justify-content:center;
width:100%;
`
let preview=document.createElement("div")
preview.style.cssText=`
width:40px;
height:40px;
border-radius:8px;
border:2px solid #444;
background:${selected.color};
flex-shrink:0;
`
bottomRow.appendChild(preview)
let done=document.createElement("button")
done.textContent="Done"
done.style.cssText=`
background:#fff;color:#000;
border:none;border-radius:10px;
padding:10px 16px;
font-size:16px;font-weight:600;
cursor:pointer;
flex-shrink:0;
`
done.onclick=()=>{
document.body.removeChild(overlay)
cb(selected.color)
}
bottomRow.appendChild(done)
box.appendChild(bottomRow)
overlay.appendChild(box)
document.body.appendChild(overlay)
function updatePreview(){preview.style.background=selected.color}
function hslToRgb(h,s,l){
let a=s*Math.min(l,1-l)
let f=n=>{
let k=(n+h*12)%12
let color=l-a*Math.max(Math.min(k-3,9-k,1),-1)
return Math.round(color*255)
}
return {r:f(0),g:f(8),b:f(4)}
}
function rgbToCss(rgb){return`rgb(${rgb.r},${rgb.g},${rgb.b})`}
function rgbToHex(r,g,b){
let rh=Math.round(r/17).toString(16)
let gh=Math.round(g/17).toString(16)
let bh=Math.round(b/17).toString(16)
return "#"+rh+gh+bh
}

renderPicker()
updatePreview()
}




function singDrop(item) {
    closeInventory()
    showTextInput("type something",
        async function(text) {
    let playerX = Math.floor((offsetX + player.x) / blockSize) * blockSize;
    let playerY = Math.floor((offsetY + player.y + 1) / blockSize) * blockSize;
    switch (lastDirection) {
        case 'up':
            playerY -= blockSize;
            break;
        case 'down':
            playerY += blockSize;
            break;
        case 'left':
            playerX -= blockSize;
            break;
        case 'right':
            playerX += blockSize;
            break;
        case 'right-up':
            playerX += blockSize;
            playerY -= blockSize;
            break;
        case 'left-up':
            playerX -= blockSize;
            playerY -= blockSize;
            break;
    }
    const newBlock = {
        x: playerX / blockSize, 
        y: playerY / blockSize,
        type: item
    };
    const chunkKey = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
if (!chunks[chunkKey]) {
    chunks[chunkKey] = [];
}
chunks[chunkKey].push({ x: 0, y: 0, type: item , text:text});
});}
let debuggingpoint={}
function dropItemAtPlayerPosition2(item) {
    let XADD = (zoomedDELTA / 3)
let YADD = (zoomedDELTA / 3)
playerX = (Math.floor((offsetX + player.x + player.width / 2) / blockSize) * blockSize) - XADD;
playerY = (Math.floor((offsetY + player.y + player.height / 2) / blockSize) * blockSize) - YADD;
    switch (lastDirection) {
    case 'up':
        playerY -= blockSize;
        break;
    case 'down':
        playerY += blockSize;
        break;
    case 'left':
        playerX -= blockSize;
        break;
    case 'right':
        playerX += blockSize;
        break;
    case 'right-up':
        playerX += blockSize;
        playerY -= blockSize;
        break;
    case 'left-up':
        playerX -= blockSize;
        playerY -= blockSize;
        break;
}
var newBlock = {
    x: playerX / blockSize, 
    y: playerY / blockSize,
    type: item
};
var chunkKey = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
            TextPopUp("Go find your items !");
    playhitmp3()
    if (!chunks[chunkKey]) {
        chunks[chunkKey] = [];
    }
    chunks[chunkKey].push({x:0,y:0,type:item});
if(paused==1){
  paused=0
  update()
    paused=1
}
    updateInventory()
    updateCrafting()
}
var plantblocks=["pumpkin1","pumpkin2","pumpkin3","pumpkin","briarempty","briar","mycelium","blackberry","emptyblackberry","black_elderberry","black_elderberry_tree","melon1","melon2","melon","potato","carrot2","wildcarrot","cactus","cactusempty","kite1","dandelion","dandelionseeds","dandelion2"]
dropAll=false
function dropItemAtPlayerPosition(item) {
  updateInventory()
 if (activeChest) {
  if (!chestsData[`${activeChest[0]},${activeChest[1]}`]) {
    chestsData[`${activeChest[0]},${activeChest[1]}`] = [];
  }
  let chestItems = chestsData[`${activeChest[0]},${activeChest[1]}`];
  if (chestItems.length < 20) {  
    chestsData[`${activeChest[0]},${activeChest[1]}`].push( item );
    updateCrafting();
 } else {
   if(langPlactive){
    TextPopUp("Skrzynia jest pełna!");
   }else{
     TextPopUp("Chest is full!");
   }
    addItem(item,1)
  }
  return; 
}
 let XADD = (zoomedDELTA / 3)
let YADD = (zoomedDELTA / 3)
playerX = (Math.floor((offsetX + player.x + XADD / 2 + player.width / 2) / blockSize) * blockSize) - XADD;
playerY = (Math.floor((offsetY + player.y + YADD / 2 + player.height / 2) / blockSize) * blockSize) - YADD;
 switch (lastDirection) {
    case 'up':
        playerY -= blockSize;
        break;
    case 'down':
        playerY += blockSize;
        break;
    case 'left':
        playerX -= blockSize;
        break;
    case 'right':
        playerX += blockSize;
        break;
    case 'right-up':
        playerX += blockSize;
        playerY -= blockSize;
        break;
    case 'left-up':
        playerX -= blockSize;
        playerY -= blockSize;
        break;
}
var newBlock = {
    x: playerX / blockSize, 
    y: playerY / blockSize,
    type: item
};
var chunkKey = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
if(item=="chest"){
}
 let condition1=(item=="leafbowlwithcleanwater"||item=="bowl_with_water"|| item=="bucketwithcleanwater")
if ( (options.dropany == 1|| options2.dropany == 1  )&& !condition1 || dropAll ) {
	chunks[chunkKey].push({ x: 0, y: 0, type: item });
	if (paused == 1) {
		paused = 0
		update()
		paused = 1
	}
	return;
}
  if (chunks[chunkKey] && chunks[chunkKey].length > 13) {
        addItem(item, 1); 
        if (langPlactive == 1) {
            TextPopUp("maksymalna to 13.");
        } else {
            TextPopUp("max blocks on position is 13.");
        }
        return; 
    }
if (getPlants(chunkKey,item)) {
  addItem(item, 1); 
  if (langPlactive == 1) {
    TextPopUp("nie można zasadzić rośliny na roślinę!");
  } else {
    TextPopUp("You cant plant plant on plant!");
  }
  return;
}
    playhitmp3()
if (item == "whitewallpaperroller"  ) {
   item="whitewallpaper"
}
if (item == "redwallpaperroller") {
  item = "redwallpaper"
}
if (item == "bluewallpaperroller") {
  item = "bluewallpaper"
}
if (item == "limewallpaperroller") {
  item = "limewallpaper"
}
if (item == "blackberry-fruit") {
   	updateThirst(2)
    updateHealth(20)
    return;
}
if (item == "sing") {
    singDrop(item);
    return;
}
if (item == "canvas") {
	canvasDrop(item);
	return;
}
if (item == "cdb") {
	canvasDrop2(item);
	return;
}if (item == "cdba") {
	canvasDrop2(item);
	return;
}
if (item == "stonesing") {
    singDrop(item);
    return;
}
if (item == "textstone") {
    singDrop(item);
    return;
}
if (item == "gravestone") {
	singDrop(item);
	return;
}
if (item == "energybowl") {
  if (currentStamina > 80) {
  } else {
    updateStamina(80)
    dropItemAtPlayerPosition("bowl")
    return;
  }
}
if (item == "candy") {
  if (currentStamina > 95) {
  } else {
    updateStamina(40) 
    return;
  }
}
if(item=="bread"){
  updateHealth(90)
  updateHunger(20)
  return;
}
if (item == "healthbowl") {
    updateHealth(100)
    updateThirst(20)
    dropItemAtPlayerPosition("bowl")
    return;
}
if (item == "soup") {
    if(options.dropany==0){
        updateHealth(95)
        updateThirst(50)
        dropItemAtPlayerPosition("bowl")
        return;
    }
}
if (item == "coconut") {
    if(options.dropany==0){
        updateHealth(7)
        updateThirst(1)
        return;
}}
if (item == "carrot") {
    if(options.dropany==0){
        updateHealth(15)
        updateHunger(3)
        return;
}}
if (item == "chips") {
  if (options.dropany == 0) {
      updateHealth(25)
      updateHunger(5)
      return;
  }
}
if (item == "friedegg") {
        updateHealth(15)
        return;
}
if (item == "cigarettes") {
    if(options.dropany==0){
    issmoking=1
    cannotmove=1
    console.log(issmoking)
updateHealth(-5)
setTimeout(function (){
issmoking = 0
cannotmove = 0
},6000)
}}
if (item == "honey_mushrooms") {
    updateHealth(10)
    updateThirst(1)
    updateHunger(5)
    return;
}
if (item == "cooked_bunnmeat") {
	updateHealth(50)
	updateHunger(10)
	return;
}if (item == "apple") {
	updateHealth(13)
	updateHunger(5)
	updateThirst(5)
	return;
}else if (item == "silverapple") {
	updateHealth(35)
	updateHunger(8)
	updateStamina(9)
	updateThirst(8)
	return;
}if (item == "black_elderberries") {
    updateHealth(5)
    updateThirst(0.5)
    updateHunger(0.5)
    return;
}
if (item == "warporb") {
    if(!delayChangeDimension){
       if(options.dropany==0&&(inhell==1||inabyss==1||inether==1|| isunderwater==1)){ warpDimension(); 
         if (langPlactive == 1) {
           showTextInCanvas("zostałeś przetelportowany do normalnego\n świata");
       } else {
           showTextInCanvas("you are warped to overworld dimensions ");
       }
  return;
  }else{
    if (langPlactive == 1) {
             showTextInCanvas("błąd nie można zmienić świata ");
         } else {
             showTextInCanvas("err cannot change dimension ");
         }
  }
}}
if (item == "extrabag") {
  if(options.dropany==0){
  if (slots < 9) {
slots=9
return;
  } else {
 if (langPlactive == 1) {
    showTextInCanvas("już masz dodatkowe miejsce ekwipunku ")
} else {
    showTextInCanvas("you already have extra slot")
}
  }
}}
if (item == "larger_bag") {
  if(options.dropany==0){
  if (slots < 11) {
    slots = 11
    return;
  } else {
 if (langPlactive == 1) {
     showTextInCanvas("już masz dodatkowe miejsce ekwipunku ")
 } else {
     showTextInCanvas("you already have extra slot")
 }
  }
}}
if (item == "heavybag") {
  if(options.dropany==0){
  if (slots < 16) {
    slots = 16
 if (langPlactive == 1) {
     showTextInCanvas("to maksymalna ilość slotów ile można \n mieć :)")
 } else {
     showTextInCanvas("this is max slots you can have :)")
 }
    return;
  } else {
     if (langPlactive == 1) {
     showTextInCanvas("już masz maksymalny ekwipunek ")
 } else {
     showTextInCanvas("you already have max slot")
 }
  }
}}
if (item == "cooked_thistleroot") {
    updateHealth(15)
    updateThirst(2)
    updateHunger(3) 
    return;
}
if (item == "kite") {
    updateHealth(12)
    updateThirst(3)
    updateHunger(6)
    return;
}
if (item == "pumpkin") {
    updateHealth(15)
    updateHunger(8)
    return;
}if (item == "melonfruit") {
    updateHealth(16)
    updateThirst(10)
    updateHunger(7)
    return;
}
if (item == "briar-fruit") {
    updateHealth(10)
    updateThirst(2)
    updateHunger(3)
    return;
}
if (item == "bowl_with_water" && (options.dropany == 0 && options2.dropany == 0 && dropAll==0 ) ) {
    updateHealth(30)
    updateThirst(20)
    dropItemAtPlayerPosition("bowl")
    return;
}else if (item == "bowl_with_water") {
  addItem("bowl", 1)
  item = "shallowwater"
}
if (item == "leafbowlwithcleanwater" && (options.dropany == 0 && options2.dropany == 0 && dropAll==0 ) ) {
    updateHealth(20)
    updateThirst(20)
    dropItemAtPlayerPosition("leafbowl")
    return;
}else if (item == "leafbowlwithcleanwater") {
  addItem("leafbowl", 1)
  item = "shallowwater"
}
if (item == "bucketwithcwater" && (options.dropany == 0 && options2.dropany == 0 && dropAll==0 ) ) {
    updateHealth(50)
    updateThirst(40)
    dropItemAtPlayerPosition("bucket")
    return;
}else if (item == "bucketwithcwater") {
  addItem("bucket", 1)
  item = "shallowwater"
}
if (item == "cooked_salmon") {
    updateHealth(40)
    updateHunger(20)
    dropItemAtPlayerPosition("bone")
    return;
}
if (item == "cooked_trout") {
    updateHealth(30)
    updateHunger(20)
    dropItemAtPlayerPosition("bone")
    return;
}
 if (currentHP < 100 && item=="cactus_fruit") {
  updateHealth(20)
updateThirst(5)
updateHunger(3)
return;
} 
if (item == "bucketwithwater") {
	addItem("bucket", 1)
	item = "water1"
}
if (item == "lavabucket") {
	addItem("bucket", 1)
	item = "magma"
}
if (item == "bowl_with_seawater") {
    addItem("bowl",1)
    item="water1"
}
if (item == "bucketwithswampwater") {
	addItem("bucket", 1)
	item = "swampwater"
}
if (item == "leafbowlwithswampwater") {
	addItem("leafbowl", 1)
	item = "swampwater"
}
if (item == "bowl_with_swampwater") {
	addItem("bowl", 1)
	item = "swampwater"
}
if (item == "leafbowlwithwater") {
  addItem("leafbowl", 1)
  item = "water1"
}
if (item == "fishing_rod") {
  if(options.dropany==0){
cannotmove=1
  item = "hook"
}}
if (item == "mercurybottle" ) {
  if(options.dropany==0){
  item = "mercuryliquid"
  addItem("bottle",1);
}}
if (item == "itemfence") {
  if (options.dropany == 0) {
  item = "fence"
}
}
if (item == "itemroad") {
  if (options.dropany == 0) {
    item = "road"
  }
}
if (item == "black_elderberry_tree") {
  const newBlock1 = {
  x: playerX / blockSize, 
  y: playerY / blockSize,
  type: item
};
const chunkKey1 = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
if (!chunks[chunkKey1]) {
  chunks[chunkKey1] = [];
}
chunks[chunkKey1].push({ x: 0, y: 0, type: "black_elderberry" });
chunks[chunkKey1].push({ x: 0, y: -32, type: "black_elderberry2" });
    return;
}
if (item == "statue1") {
 const newBlock1 = {
  x: playerX / blockSize, 
  y: playerY / blockSize,
  type: item
 };
 const chunkKey1 = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
 if (!chunks[chunkKey1]) {
  chunks[chunkKey1] = [];
 }
 chunks[chunkKey1].push({ x: 0, y: 0, type: "statue1_1" });
 chunks[chunkKey1].push({ x: 0, y: -32, type: "statue1_2" });
 return;
}
if (item == "statue2") {
  const newBlock1 = {
    x: playerX / blockSize, 
    y: playerY / blockSize,
    type: item
  };
  const chunkKey1 = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
  if (!chunks[chunkKey1]) {
    chunks[chunkKey1] = [];
  }
  chunks[chunkKey1].push({ x: 0, y: 0, type: "statue2_1" });
  chunks[chunkKey1].push({ x: 0, y: -32, type: "statue2_2" });
  return;
}
if (item == "algae_item") {
 const newBlock1 = {
  x: playerX / blockSize, 
  y: playerY / blockSize,
  type: item
 };
 const chunkKey1 = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
 if (!chunks[chunkKey1]) {
  chunks[chunkKey1] = [];
 }
 chunks[chunkKey1].push({ x: 0, y: 0, type: "algae1" });
 chunks[chunkKey1].push({ x: 0, y: -32, type: "algae0" });
 chunks[chunkKey1].push({ x: 0, y: -64, type: "algae2" });
 return;
}
if (item == "lamptorch") {
  const newBlock1 = {
    x: playerX / blockSize, 
    y: playerY / blockSize,
    type: item
  };
  const chunkKey1 = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
  if (!chunks[chunkKey1]) {
    chunks[chunkKey1] = [];
  }
  chunks[chunkKey1].push({ x: 0, y: 0, type: "lamp" });
  chunks[chunkKey1].push({ x: 0, y: -32, type: "lamp2" });
  return;
}
if (item == "bed") {
    const newBlock1 = {
        x: playerX / blockSize, 
        y: playerY / blockSize,
        type: item
    };
    const chunkKey1 = `${Math.floor(newBlock.x)},${Math.floor(newBlock.y)}`;
    if (!chunks[chunkKey1]) {
        chunks[chunkKey1] = [];
    }
    if(lastDirection!=="left"&&lastDirection!=="right"){
    chunks[chunkKey1].push({ x: 0, y: 0, type: "a1bed" });
    chunks[chunkKey1].push({ x: 0, y: -32, type: "a2bed" });
    }else{
    chunks[chunkKey1].push({ x: 0, y: 0, type: "bed21" });
    chunks[chunkKey1].push({ x: -32, y: 0, type: "bed22" });
    }
    return;
}
    if (!chunks[chunkKey]) {
        chunks[chunkKey] = [];
    }
    chunks[chunkKey].push({x:0,y:0,type:item});
if(paused==1){
  paused=0
  update()
    paused=1
}
    updateInventory()
    updateCrafting()
}
function buildBlockAtPositionPlus(x, y, blockTypeToAdd,x2,y2) {
    let maxblocktorm = 2;
const globalX = Math.floor((x + offsetX) / 32) * 32;
const globalY = Math.floor((x + offsetX) / 32) * 32;
const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
const snappedGlobalX = snapToBlockGrid(globalX);
const snappedGlobalY = snapToBlockGrid(globalY);
const chunkX = Math.floor(snappedGlobalX / blockSize);
const chunkY = Math.floor(snappedGlobalY / blockSize);
const chunkKey = `${chunkX},${chunkY}`;
const distanceFromPlayer = Math.sqrt(
    (snappedGlobalX - offsetX) ** 2 + (snappedGlobalY - offsetY) ** 2
);
const chunkBlocks = chunks[chunkKey];
if (!chunkBlocks) {
    chunks[chunkKey] = [];
}
chunks[chunkKey].push({
    x: Math.floor(((snappedGlobalX - (chunkX * blockSize)) / 32) * 32)+x2,
    y: Math.floor(((snappedGlobalY - (chunkY * blockSize)) / 32) * 32)+y2,
    type: blockTypeToAdd
});
 alert( chunkKey )
    updateCrafting()
}
function buildBlockAtPosition(x, y, blockTypeToAdd) {
    let maxblocktorm = 2;
    const globalX = Math.floor((x + offsetX)/32)*32;
    const globalY = Math.floor((x + offsetX)/32)*32;
    const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
    const snappedGlobalX = snapToBlockGrid(globalX);
    const snappedGlobalY = snapToBlockGrid(globalY);
    const chunkX = Math.floor(snappedGlobalX / blockSize);
    const chunkY = Math.floor(snappedGlobalY / blockSize);
    const chunkKey = `${chunkX},${chunkY}`;
    const distanceFromPlayer = Math.sqrt(
        (snappedGlobalX - offsetX) ** 2 + (snappedGlobalY - offsetY) ** 2
    );
    const chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) {
        chunks[chunkKey] = [];
    }
    const blockExists = chunkBlocks.some(block => {
        const blockGlobalX = block.x + (chunkX * blockSize);
        const blockGlobalY = block.y + (chunkY * blockSize);
        if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
            if (block.type === "dirt" && blockTypeToAdd === "dirt") {
                customAlert("Nie można dodać bloku 'dirt' - już istnieje na tej pozycji.");
                return true; 
            }
            return true; 
        }
        return false;
    });
        chunks[chunkKey].push({ 
            x: Math.floor(((snappedGlobalX - (chunkX * blockSize))/32)*32), 
            y: Math.floor(((snappedGlobalY - (chunkY * blockSize))/32)*32), 
            type: blockTypeToAdd 
        });
    updateCrafting()
}
function buildBlockAtPositionBefore(x, y, blockTypeToAdd) {
    let maxblocktorm = 2;
    const globalX = x + offsetX;
    const globalY = y + offsetY;
    const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
    const snappedGlobalX = snapToBlockGrid(globalX);
    const snappedGlobalY = snapToBlockGrid(globalY);
    const chunkX = Math.floor(snappedGlobalX / blockSize);
    const chunkY = Math.floor(snappedGlobalY / blockSize);
    const chunkKey = `${chunkX},${chunkY}`;
    const distanceFromPlayer = Math.sqrt(
        (snappedGlobalX - offsetX) ** 2 + (snappedGlobalY - offsetY) ** 2
    );
    let chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) {
        chunks[chunkKey] = [];
        chunkBlocks = chunks[chunkKey]; 
    }
    const blockExists = chunkBlocks.some(block => {
        const blockGlobalX = block.x + (chunkX * blockSize);
        const blockGlobalY = block.y + (chunkY * blockSize);
        if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
            if (block.type === "dirt" && blockTypeToAdd === "dirt") {
                return true; 
            }
            return true; 
        }
        return false;
    });
    if ( true) {
        chunks[chunkKey].unshift({ 
            x: snappedGlobalX - (chunkX * blockSize), 
            y: snappedGlobalY - (chunkY * blockSize), 
            type: blockTypeToAdd 
        });
    }
    updateCrafting()
}
function buildBlockAtPositionBefore2(x, y, blockTypeToAdd) {
  let maxblocktorm = 2;
  const globalX = x + offsetX; 
  const globalY = y + offsetY;
  const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
  const snappedGlobalX = snapToBlockGrid(globalX);
  const snappedGlobalY = snapToBlockGrid(globalY);
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const chunkKey = `${chunkX},${chunkY}`;
  let chunkBlocks = chunks[chunkKey];
  if (!chunkBlocks) {
    chunks[chunkKey] = [];
    chunkBlocks = chunks[chunkKey]; 
  }
  const blockExists = chunkBlocks.some(block => {
    const blockGlobalX = block.x + (chunkX * blockSize);
    const blockGlobalY = block.y + (chunkY * blockSize);
    if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
      if (block.type === "dirt" && blockTypeToAdd === "dirt") {
        return true; 
      }
      return true; 
    }
    return false;
  });
  if (true) {
    chunks[chunkKey].unshift({
      x: snappedGlobalX - (chunkX * blockSize),
      y: snappedGlobalY - (chunkY * blockSize),
      type: blockTypeToAdd
    });
  }
}
function buildBlockAtPosition(x, y, blockTypeToAdd) {
  let maxblocktorm = 0;
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
  const snappedGlobalX = snapToBlockGrid(globalX);
  const snappedGlobalY = snapToBlockGrid(globalY);
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const chunkKey = `${chunkX},${chunkY}`;
  const distanceFromPlayer = Math.sqrt(
    (snappedGlobalX - offsetX) ** 2 + (snappedGlobalY - offsetY) ** 2
  );
  const chunkBlocks = chunks[chunkKey];
  if (!chunkBlocks) {
    chunks[chunkKey] = [];
  }
  chunks[chunkKey].push({ x: snappedGlobalX - (chunkX * blockSize), y: snappedGlobalY - (chunkY * blockSize), type: blockTypeToAdd });
}
function removeBlockAtPosition2(x, y, blockTypeToRemove) {
  let maxblocktorm = 0
const globalX = x + offsetX;
const globalY = y + offsetY;
const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
const snappedGlobalX = snapToBlockGrid(globalX);
const snappedGlobalY = snapToBlockGrid(globalY);
const chunkX = Math.floor(snappedGlobalX / blockSize);
const chunkY = Math.floor(snappedGlobalY / blockSize);
const chunkKey = `${chunkX},${chunkY}`;
const distanceFromPlayer = Math.sqrt(
  (snappedGlobalX - offsetX) ** 2 + (snappedGlobalY - offsetY) ** 2
);
const chunkBlocks = chunks[chunkKey];
if (!chunkBlocks) return; 
const blockToRemove = chunkBlocks.find(block => {
  const blockGlobalX = block.x + (chunkX * blockSize);
  const blockGlobalY = block.y + (chunkY * blockSize);
  return (
    blockGlobalX === snappedGlobalX &&
    blockGlobalY === snappedGlobalY &&
    block.type === blockTypeToRemove
  );
});
if (blockToRemove) {
  const index = chunkBlocks.indexOf(blockToRemove);
  if (index > -1) {
    if (maxblocktorm < 1) {
      chunkBlocks.splice(index, 1);
    }
    maxblocktorm++
  }
}
}
function removeBlockAtPosition(x, y, blockTypeToRemove) {
  playcollectsound()
  let maxblocktorm=0
    const globalX = x + offsetX;
    const globalY = y + offsetY;
    const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
    const snappedGlobalX = snapToBlockGrid(globalX);
    const snappedGlobalY = snapToBlockGrid(globalY);
    const chunkX = Math.floor(snappedGlobalX / blockSize);
    const chunkY = Math.floor(snappedGlobalY / blockSize);
    const chunkKey = `${chunkX},${chunkY}`;
    const distanceFromPlayer = Math.sqrt(
  (snappedGlobalX - offsetX) ** 2 + (snappedGlobalY - offsetY) ** 2
);
    const chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) return;  
    const blockToRemove = chunkBlocks.find(block => {
        const blockGlobalX = block.x + (chunkX * blockSize);
        const blockGlobalY = block.y + (chunkY * blockSize);
        return (
            blockGlobalX === snappedGlobalX &&
            blockGlobalY === snappedGlobalY &&
            block.type === blockTypeToRemove
        );
    });
    if (blockToRemove) {
        const index = chunkBlocks.indexOf(blockToRemove);
        if (index > -1) {
          if(maxblocktorm<1){
            chunkBlocks.splice(index, 1);
          }
          maxblocktorm++
        }
    }
}
function setblockatposition(x, y, blockTypeToSet) {
    const globalX = x + offsetX;
    const globalY = y + offsetY;
    const snapToBlockGrid = (value) => Math.floor(value / blockSize) * blockSize;
    const snappedGlobalX = snapToBlockGrid(globalX);
    const snappedGlobalY = snapToBlockGrid(globalY);
    const chunkX = Math.floor(snappedGlobalX / blockSize);
    const chunkY = Math.floor(snappedGlobalY / blockSize);
    const chunkKey = `${chunkX},${chunkY}`;
    const chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) {
        return; 
    }
    chunkBlocks.length = 0; 
    chunkBlocks.push({ x: 0, y: 0, type: blockTypeToSet });
}
function removeTree(x, y) {
    setblockatposition(x, y, "grass");
}
function igniteFiberAround(x, y, radius = 64) {
    for (let dx = -radius; dx <= radius; dx += blockSize) {
        for (let dy = -radius; dy <= radius; dy += blockSize) {
            const newX = x + dx;
            const newY = y + dy;
            if (checkBlockAtPosition(newX, newY, "fiber")) {
                removeBlockAtPosition(newX, newY, "fiber");
                buildBlockAtPosition(newX, newY, "ignited_fiber");
                return;
            }else{
  if (langPlactive == 1) {
         showTextInCanvas("nie ma tu żadnego włókna obok pługu ogniowego")
     } else {
         showTextInCanvas("there is no placed fiber around this friction kit")
     }
            }
        }
    }
}
 let lastHitEnemySoundTime = 0;
const hitEnemySoundCooldown = 100;
function removeBatAtPosition(x, y) {
    const weapon = checkIfPlayerHasAnyWeapon();
    cutticks=defaultCutTicks;
    hitticks=defaulthitticks;
    cutindex=0;
    if (!weapon) return;
    let playerCenterX = player.x + offsetX + player.width * 2 - 64;
    let playerCenterY = player.y + offsetY + player.height * 2 - 65;
    const range = itemsAndDamage[weapon].range;
    const now = performance.now(); 
    renderedEnemies.forEach(enemy => {
let XADD = (zoomedDELTA /3)
let YADD = (zoomedDELTA /3)
const dx = x - (enemy.x + XADD + enemy.width) + offsetX;
const dy = y - (enemy.y + YADD + enemy.height) + offsetY;
const distanceClick = Math.sqrt(dx * dx + dy * dy);
const distanceFromPlayer = Math.sqrt(
	((enemy.x + XADD + enemy.width / 2) - playerCenterX) ** 2 + ((enemy.y + YADD + enemy.height / 2) - playerCenterY) ** 2);
        if (distanceClick <= range && distanceFromPlayer <= range && (enemy.hp < (9999 * 99) || enemy.type=="dummyvector") ) {
            if (  now - lastHitEnemySoundTime >= hitEnemySoundCooldown) {
                lastHitEnemySoundTime = now;
                let slashsound6 = new Audio2(hitenemysound.src);
                slashsound6.volume = 0.12;
                slashsound6.play();
            }
        }
    });
 if(weapon=="godwand"){
 	if(options.shoot==1){
    updateStamina(-1)
  const typesof = ["godmagic"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle + Math.random()*0.5-0.25; bat.width=32;bat.height=32; ;renderedEnemies.push(bat); bat.speed=4
  } for (let i = 0; i < 30; i++) {
  setTimeout(function() {
    spawnEnemyNearPlayer();
  }, i * 25);
  }
}}else if(weapon=="hyperblastwand"){
	if (weponDelay < 2) {
	weponDelay = 15
	if(options.shoot==1){
updateStamina(-5)
  const typesof = ["hyperblast"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32;bat.height=32; ;renderedEnemies.push(bat); bat.speed=4
  } for (let i = 0; i < 20; i++) {
  setTimeout(function() {
    spawnEnemyNearPlayer();
  }, i * 45);
}
}
}
}else if(weapon=="magicwandofsharp"){
	if(options.shoot==1){
    updateStamina(-5)
  const typesof = ["magicsharp"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle ;renderedEnemies.push(bat); bat.speed=4
  } spawnEnemyNearPlayer();
}
} else if(weapon=="magicwand"){
	if(options.shoot==1){
    updateStamina(-3)
  const typesof = ["magic"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle ;renderedEnemies.push(bat); bat.speed=4
  } spawnEnemyNearPlayer();
}
}else if(weapon=="greenwand"){
	if(options.shoot==1){
    updateStamina(-5)
  const typesof = ["greenmagic"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer(dx,dy) {
    const enemyX = playerCenterX+dx; const enemyY = playerCenterY+dy;
    const spellangle = Math.atan2((enemyY - (playerCenterY)), (enemyX - (playerCenterX)));
    let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle ;renderedEnemies.push(bat); bat.speed=4
  } spawnEnemyNearPlayer(32,0); spawnEnemyNearPlayer(-32,0); spawnEnemyNearPlayer(0,32);spawnEnemyNearPlayer(0,-32); spawnEnemyNearPlayer(32,-32); spawnEnemyNearPlayer(32,32); spawnEnemyNearPlayer(-32,-32); spawnEnemyNearPlayer(-32,32);
}
}else if(weapon=="boomerang"){
	if(options.shoot==1){
    if(weponDelay<2){
        weponDelay=10
updateStamina(-2)
  const typesof = ["boomerang"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
  }  
    spawnEnemyNearPlayer();
    }
}
	}else if(weapon=="bow"){
    if(weponDelay<2){
updateStamina(-2)
let boostatk=0
if(options.shoot==1){
 if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=6
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }}
    }}else if(weapon=="nightbow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=25
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
    boostatk+=5
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=6
    boostatk+=16
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="darkbow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=40 
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
    boostatk+=5
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=6
    boostatk+=20
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="quantumbow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=60
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=2
    boostatk+=40
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=6
    boostatk+=30
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="hellbow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=60
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
    boostatk+=25
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=6
    boostatk+=30
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="dracobow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=330
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
    boostatk+=30
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=3
    boostatk+=30
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="rainbowbow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=220
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
    boostatk+=30
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=3
    boostatk+=30
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="moltenbow"){
    if(weponDelay<2){
updateStamina(-2);
let boostatk=140
if(options.shoot==1){
if(checkIfItems("hyperarrows",1)){
    useItemDurability2(-1,"hyperarrows")
    weponDelay=6; const typesof = ["hyperarrows"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  spawnEnemyNearPlayer();
    }else if(checkIfItems("goodarrows",1)){
    useItemDurability2(-1,"goodarrows")
    weponDelay=8
    boostatk+=25
  const typesof = ["goodarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("powerfullarrows",1)){
    useItemDurability2(-1,"powerfullarrows")
    weponDelay=3
    boostatk+=30
  const typesof = ["powerfullarrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }else if(checkIfItems("arrows",1)){
    useItemDurability2(-1,"arrows")
    weponDelay=10
  const typesof = ["arrow"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
    bat.atkplus=boostatk
  }  
    spawnEnemyNearPlayer();
    }
    }}
    }else if(weapon=="titanium_boomerang"){
    	if(options.shoot==1){
    if(weponDelay<2){
        weponDelay=6
updateStamina(-2)
  const typesof = ["titanium_boomerang"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
  }  
    spawnEnemyNearPlayer();
    }}}else if(weapon=="good_boomerang"){
    	if(options.shoot==1){
    if(weponDelay<2){
        weponDelay=6
updateStamina(-2)
  const typesof = ["good_boomerang"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
  }  
    spawnEnemyNearPlayer();
    }
}}else if(weapon=="hell_boomerang"){
	if(options.shoot==1){
    if(weponDelay<2){
        weponDelay=4
updateStamina(-2)
  const typesof = ["hell_boomerang"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
  }  
    spawnEnemyNearPlayer();
    }}
}else if(weapon=="draco_boomerang"){
	if(options.shoot==1){
    if(weponDelay<2){
        weponDelay=4
updateStamina(-1)
  const typesof = ["draco_boomerang"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer() {
    const enemyX = playerCenterX; const enemyY = playerCenterY;const spellangle = Math.atan2((y - (playerCenterY - offsetY)), (x - (playerCenterX - offsetX))); let bat = new Enemy(enemyX, enemyY, randomSpell); bat.angle = spellangle; bat.width=32+16;bat.height=32+16; ;renderedEnemies.push(bat); bat.speed=5
  }  
    spawnEnemyNearPlayer();
    }
}}
  if (cooldownatk==false) {
  	let XADD = (zoomedDELTA / 3)
let YADD = (zoomedDELTA / 3)
    handleWeaponUse(weapon,x+XADD,y+YADD)
  attackEnemyAtPosition(x, y)
  }else{
   lastWeapon=null
  }
}
function checkIfPlayerHasAnyWeapon() {
	for (const weapon in itemsAndDamage) {
		if (checkIfItems(weapon, 1)) {
			if (options.shoot==0 && isRangedWeapon(weapon)) continue;
			return weapon;
		}
	}
	lastWeapon=false
	return null;
}
function isRangedWeapon(weapon) {
	const rangedWeapons = [
		"magicwand", "greenwand", "magicwandofsharp", "hyperblastwand", "godwand",
		"boomerang", "titanium_boomerang", "good_boomerang", "hell_boomerang", "draco_boomerang",
		"bow", "hellbow", "darkbow", "nightbow", "moltenbow", "rainbowbow", "quantumbow","dracobow"
	];
	return rangedWeapons.includes(weapon);
}
 function dropsEnemyLoot(enemy,x,y){
  	 let playerCenterX = player.x + offsetX + player.width * 2;
let playerCenterY = player.y + offsetY + player.height * 2;
playerCenterX -= 32 + 32;
playerCenterY -= 32 + 33;
    const dx = x - (enemy.x + enemy.width) + offsetX;
    const dy = y - (enemy.y + enemy.height) + offsetY;
    const distanceClick = Math.sqrt(dx * dx + dy * dy);
    const distanceFromPlayer = Math.sqrt(
      (enemy.x - playerCenterX) ** 2 + (enemy.y - playerCenterY) ** 2
    );
    
    
        if (enemy.hp <= 0) {
          updateStamina(-1.5); 
 const typesof = ["orb"];
  const randomSpell = typesof[Math.floor(Math.random() * typesof.length)];function spawnEnemyNearPlayer(x,y) {
    let bat = new Enemy(x, y, randomSpell); bat.width=32;bat.height=32; ; renderedEnemies.push(bat);  bat.speed=1; bat.givexp = enemies[enemy.type].givexp||0.001
  } for (let i = 0; i < 1; i++) {
  setTimeout(function() {
    spawnEnemyNearPlayer( (enemy.x+Math.random()*2-1) , (enemy.y+Math.random()*2-1));
  }, i * 200);
  }
 hitshow.push({ frame: 0, x: enemy.x, y: enemy.y })

          
if(enemy.type=="spikegod"){
            let r = Math.floor((dx + player.x * 32) / 32)
let r2 = Math.floor((dy + player.y * 32) / 32)
             achievementget("No you're not a god ", 1)
            if(Math.random()<0.65){
              buildBlockAtPosition(r,r2,"nightgem")
            buildBlockAtPosition(r,r2,"evilsummoner")
            }else{
              buildBlockAtPosition(r, r2, "nightgem")
              buildBlockAtPosition(r,r2,"aquaticevent")
            }
if (Math.random() < 0.14) {
	buildBlockAtPosition(r, r2, "axivector")
}
            curseofgos=1
if (langPlactive == 1) {
    showTextInCanvas("dostałeś klątwę gos ...")
} else {
    showTextInCanvas("now after killing gos has a curse . .")
}
          }
if (enemy.type == "2medusa") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  buildBlockAtPosition(r, r2, "titaniumbar")
  playRandomMusic()
  achievementget("You beat it! <span style='color:cyan' > Aquatic Event</span>",2)
  if (Math.random() < 0.15) {
    showTextInCanvas("soul of sharp is rare item just try again ")
  } else {
    buildBlockAtPosition(r, r2, "soulofsharp")
  }
}
if (enemy.type == "flesher") {
    let r = Math.floor((dx + player.x * 32) / 32)
    let r2 = Math.floor((dy + player.y * 32) / 32)
    if (Math.random() < 0.021) {
        buildBlockAtPosition(r, r2, "titaniumbar")
        buildBlockAtPosition(r, r2, "hellessence")
    } else if (Math.random() < 0.021) {
        buildBlockAtPosition(r, r2, "hellgem")
    } else if (Math.random() < 0.020) {
        buildBlockAtPosition(r, r2, "warporb")
    }
}
if (enemy.type == "hellskull") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if (Math.random() < 0.005) {
    buildBlockAtPosition(r, r2, "titaniumbar")
    buildBlockAtPosition(r, r2, "hellessence")
    achievementget("The fragment of hell", 1)
  }else if (Math.random() < 0.030) {
  buildBlockAtPosition(r, r2, "hellgem")
}else if (Math.random() < 0.015) {
    buildBlockAtPosition(r, r2, "warporb")
} else {
    if (Math.random() < 0.5) {
  const slimeTypes = ['flesher'];
  let randomSlime = slimeTypes[Math.floor(Math.random() * slimeTypes.length)];
  const spawnDistance = 9 * blockSize;
  let enemyY; let enemyX;
  function spawnEnemyNearPlayer() {
if (Math.random() >= 0.3) { enemyX = offsetX + spawnDistance;  } else { enemyX = offsetX;}
if (Math.random() >= 0.3) {enemyY = offsetY + spawnDistance; } else { enemyY = offsetY; }
    let bat = new Enemy(enemyX, enemyY, randomSlime);
    renderedEnemies.push(bat);
    bat.speed=4.2
  }
 spawnEnemyNearPlayer();
}
  }
}
if (enemy.type == "flesh") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  buildBlockAtPosition(r, r2, "voltary_essence")
    buildBlockAtPosition(r, r2, "fleshvolume")
    playRandomMusic();
    achievementget("The flesh ", 1)
}
if (enemy.type == "flesher" && seed.startsWith("badseed")) {let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
   if(Math.random()<0.3){
  buildBlockAtPosition(r, r2, "thingeyes")
}achievementget("Bₗₒₒd wᵢₗₗ bₑ ₛₕₑd by ₜₕₒₛₑ wₕₒ ᵢs", 1)}
if (enemy.type == "soulcat") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if(Math.random()<0.2){
  buildBlockAtPosition(r, r2, "abyssgem")
  }  if (Math.random() < 0.005) {
    buildBlockAtPosition(r, r2, "warporb")
}
}
if (enemy.type == "skellybones") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if(Math.random()<0.11){
  buildBlockAtPosition(r, r2, "bone")
  }  if (Math.random() < 0.005) {
    buildBlockAtPosition(r, r2, "bone_sword")
}
}
if (enemy.type == "zombie") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if(Math.random()<0.008){
  buildBlockAtPosition(r, r2, "zombieflesh")
  } else if (Math.random() < 0.005) {
    buildBlockAtPosition(r, r2, "sapling")
} else if (Math.random() < 0.009) {
    buildBlockAtPosition(r, r2, "clay")
}else if (Math.random() < 0.021) {
  buildBlockAtPosition(r, r2, "sharpstone")
}
}
if (enemy.type == "spider") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if (Math.random() < 0.5) {
    buildBlockAtPosition(r, r2, "web")
  } else if (Math.random() < 0.02) {
    buildBlockAtPosition(r, r2, "web")
    buildBlockAtPosition(r, r2, "web")
  } 
}
if (enemy.type == "frozenghost") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if (Math.random() < 0.18) {
    buildBlockAtPosition(r, r2, "frozeningot")
  }
  if (Math.random() < 0.02) {
  buildBlockAtPosition(r, r2, "magicgem");
}
}
if (enemy.type == "insaneuniversegod") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  buildBlockAtPosition(r, r2, "universefragment")
  playRandomMusic();
  achievementget("Killed Universe !", 1)
}
if (enemy.type == "aquagod") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  buildBlockAtPosition(r, r2, "aquacore")
  achievementget("<span style='color:coral' >Gg Aquamarine..  </span>",2)
  if(Math.random()<0.5){
	buildBlockAtPosition(r, r2, "invisiblearmourring")
  }else{
    buildBlockAtPosition(r, r2, "aquacore")
  }
}
if (enemy.type == "ethoper2"||enemy.type == "ethoper3") {
let r = Math.floor((dx + player.x * 32) / 32)
let r2 = Math.floor((dy + player.y * 32) / 32)
if(Math.random()<0.3){
buildBlockAtPosition(r, r2, "ethersoul")
achievementget("A Soul ?", 0)
}
}
          if (enemy.type == "greenslime"||enemy.type == "blueslime"||enemy.type == "pinkslime") {
            let r = Math.floor((dx + player.x * 32) / 32)
            let r2 = Math.floor((dy + player.y * 32) / 32)
            if(Math.random()<0.15){
            buildBlockAtPosition(r, r2, "gel")
            achievementget("Something sticky is here ?", 0)
          }}
          if(enemy.type=="bunny"){
            let r = Math.floor((dx+player.x*32) /32)
            let r2 = Math.floor((dy+player.y*32) /32)
            if(Math.random()<0.8){
                achievementget("Bunny meat", 0)
            buildBlockAtPosition(r,r2,"bunnmeat")
          }}
if (enemy.type == "voltary") {
  let r = Math.floor((dx + player.x * 32) / 32)
let r2 = Math.floor((dy + player.y * 32) / 32)
 achievementget("First but not he last", 1)
 if (Math.random() < 0.6) {
  buildBlockAtPosition(r, r2, "voltary_essence")
}
if (Math.random() < 0.2) {
  buildBlockAtPosition(r, r2, "nightgem")
}
  buildBlockAtPosition(r, r2, "spikegod_essence")
   if(Math.random()<0.05){
     buildBlockAtPosition(r, r2, "thundersword")
   }
   if (Math.random() < 0.2) {
  buildBlockAtPosition(r, r2, "healthregenerator");
   }
   if(curseofgos==1){
       if (langPlactive == 1) {
    showTextInCanvas("usunięto klątwę gos ...")
} else {
    showTextInCanvas(" magically removed gos curse ")
}
   }
  curseofgos=0
}
if (enemy.type === "duck" && enemy.hp <= 0) {
    let r = Math.floor((dx + player.x * 32) / 32)
    let r2 = Math.floor((dy + player.y * 32) / 32)
if (Math.random() < 0.4) {
        buildBlockAtPosition(r, r2, "eggs");
}if (Math.random() < 0.2) {
    buildBlockAtPosition(r, r2, "eggshells");
}if (Math.random() < 0.4) {
    buildBlockAtPosition(r, r2, "feather");
}if (Math.random() < 0.2) {
    buildBlockAtPosition(r, r2, "rarefeather");
}if (Math.random() < 0.03) {
    buildBlockAtPosition(r, r2, "mythicfeather");
    achievementget("Ohh shiny feather", 0)
}
}
if (enemy.type === "raven" && enemy.hp <= 0) {
    let r = Math.floor((dx + player.x * 32) / 32)
    let r2 = Math.floor((dy + player.y * 32) / 32)
}
if (enemy.type === "trueuniversehead" && enemy.hp <= 0) {
  let r = Math.floor((dx + player.x * 32) / 32)
let r2 = Math.floor((dy + player.y * 32) / 32)
if (Math.random() < 0.3) {
    buildBlockAtPosition(r, r2, "universefragment");
}
  buildBlockAtPosition(r, r2, "trueuniverseorb");
  buildBlockAtPosition(r, r2, "statueofgods");
playRandomMusic();
achievementget("<span style='color: crimson;' > End Of The World </span>", 1)
  setTimeout(function() {
   if (langPlactive == 1) {
showTextInCanvas("to koniec..");
playRandomMusic();
setTimeout(function() {
    showTextInCanvas("ty graczu . ");
    setTimeout(function() {
        showTextInCanvas(" przeszedłeś tą grę");
        setTimeout(function() {
            showTextInCanvas("wspaniale choć to nie koniec");
            setTimeout(function() {
                showTextInCanvas("mam w planach dodać więcej rzeczy do tej gry");
                setTimeout(function() {
                    showTextInCanvas("więc możesz poczekać ");
setTimeout(function() {
    showTextInCanvas2("gra zrobiona przez : kashumy/Krystian");
}, 5000);
                }, 3000);
            }, 3000);
        }, 6000);
    }, 3000);
}, 3000);
       } else {
showTextInCanvas("that's it ..");
playRandomMusic();
setTimeout(function() {
showTextInCanvas("you . player ");
setTimeout(function() {
    showTextInCanvas(" beat this game.");
    setTimeout(function() {
        showTextInCanvas("its really awesome ! ... but this isn't end ");
        setTimeout(function() {
            showTextInCanvas("i will add more stuffs to this game ");
            setTimeout(function() {
                showTextInCanvas("so .. wait and enjoy ");
 setTimeout(function() {
    showTextInCanvas2("game created by : kashumy/Krystian");
}, 5000);
            }, 3000);
        }, 3000);
    }, 6000);
}, 3000);
}, 3000);
       }
  }, 3000);
  renderedEnemies = renderedEnemies.filter(e => e.type !== "trueuniversebody");
  renderedEnemies = renderedEnemies.filter(e => e !== enemy); 
}
if (enemy.type === "abyssdevourerhead" && enemy.hp <= 0) {
  let r = Math.floor((dx + player.x * 32) / 32)
let r2 = Math.floor((dy + player.y * 32) / 32)
  if (Math.random() < 0.015) {
    buildBlockAtPosition(r, r2, "warporb")
}
  if (Math.random() < 0.05) {
    buildBlockAtPosition(r, r2, "abysscore");
  }
  if (Math.random() < 0.010) {
  buildBlockAtPosition(r, r2, "healmedalion");
}}
if (enemy.type === "desertelemental" && enemy.hp <= 0) {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
if (Math.random() < 0.30) {
  buildBlockAtPosition(r, r2, "desertsoul");
}
  if (Math.random() < 0.010) {
    buildBlockAtPosition(r, r2, "magicgem");
  }
  if (Math.random() < 0.03) {
    buildBlockAtPosition(r, r2, "desertcore");
  }
  if (Math.random() < 0.03) {
  buildBlockAtPosition(r, r2, "healthregenerator");
}
}
if (enemy.type === "desertscourgehead" && enemy.hp <= 0) {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if (Math.random() < 0.05) {
    buildBlockAtPosition(r, r2, "speedmedalion");
  }
  if (Math.random() < 0.09) {
  buildBlockAtPosition(r, r2, "desertcore");
}
  return true;
  renderedEnemies = renderedEnemies.filter(e => e.type !== "desertscourgebody");
  renderedEnemies = renderedEnemies.filter(e => e !== enemy); 
}
if (enemy.type === "deepgodhead" && enemy.hp <= 0) {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  playRandomMusic();
  if (Math.random() < 0.8) {
    buildBlockAtPosition(r, r2, "aquagem");
    buildBlockAtPosition(r, r2, "coloressence")
  }
  if (Math.random() < 0.5) {
  buildBlockAtPosition(r, r2, "aquagem");
}
if (Math.random() < 0.5) {
  buildBlockAtPosition(r, r2, "aquagem");
}
  return true;
  renderedEnemies = renderedEnemies.filter(e => e.type !== "deepgodtorso");
  renderedEnemies = renderedEnemies.filter(e => e !== enemy);
}
if (enemy.type === "hellscourgehead" && enemy.hp <= 0) {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  if (Math.random() < 0.005) {
    buildBlockAtPosition(r, r2, "iron_bar");
  }
  if (Math.random() < 0.015) {
  buildBlockAtPosition(r, r2, "hellessence");
}
if (Math.random() < 0.02) {
  buildBlockAtPosition(r, r2, "bone");
}
  if (Math.random() < 0.003) {
    buildBlockAtPosition(r, r2, "speedmedalion");
  }
  return true;
  renderedEnemies = renderedEnemies.filter(e => e.type !== "hellscourgebody");
  renderedEnemies = renderedEnemies.filter(e => e !== enemy); 
}
if (enemy.type == "darkeye") {
  let r = Math.floor((dx + player.x * 32) / 32)
  let r2 = Math.floor((dy + player.y * 32) / 32)
  playRandomMusic()
  achievementget("<span style='color:red' > Evil is evil </span>",2)
   if (Math.random() < 0.2) {
  buildBlockAtPosition(r, r2, "nightgem")
}
  if (Math.random() < 0.7) {
    buildBlockAtPosition(r, r2, "evileye")
  }else{
    buildBlockAtPosition(r, r2, "nightgem")
    nightpower=1
    showTextInCanvas(" evil eye is rare try again")
  }
}
          return false; 
        }
    return true; 
 }
function addDamageIndicator(enemy, dealtDamage) {
  damageIndicators.push({
    enemyHpMax: enemy.hpMax , 
    enemyHp: enemy.hp,
    dealtDamage: dealtDamage,
    alpha: 1,            
    yOffset: 0,          
    createdAt: Date.now()
  });
}
function attackEnemyAtPosition(x, y) {
  let playerCenterX = player.x + offsetX + player.width * 2;
  let playerCenterY = player.y + offsetY + player.height * 2;
  playerCenterX -= 32 + 32;
  playerCenterY -= 32 + 33;
  const weapon = checkIfPlayerHasAnyWeapon();
  if (!weapon) return; 
  const range = itemsAndDamage[weapon].range; 
let fddg=0
  renderedEnemies = renderedEnemies.filter(enemy => {
let XADD = (zoomedDELTA/3)
let YADD = (zoomedDELTA/3 )
const dx = x - (enemy.x+XADD + enemy.width) + offsetX;
const dy = y - (enemy.y+YADD + enemy.height) + offsetY;
const distanceClick = Math.sqrt(dx * dx + dy * dy);
const distanceFromPlayer = Math.sqrt(
	((enemy.x + XADD + enemy.width / 2) - playerCenterX) ** 2 + ((enemy.y + YADD + enemy.height / 2) - playerCenterY) ** 2);
function RandomDamage(weapon) {
  const random = itemsAndDamage[weapon].random;
  if (!random) return 0; 
  let [min, max, step] = random;
  step = step || 1;
  const count = Math.floor((max - min) / step) + 1;
  const rndIndex = Math.floor(Math.random() * count);
  return min + rndIndex * step;
}
if (distanceClick <= range && distanceFromPlayer <= range) {
	if (enemy.hp < 9999 * 9999 || enemy.type=="dummyvector") {
		fddg = 1
	}
	
	if (checkIfItems(weapon, 1) && !itemsAndDamage[weapon].kill.includes(enemy.type)) {
		updateStamina(-0.5)
		if (itemsAndDamage[weapon].boost && itemsAndDamage[weapon].boost[enemy.type]) {
	if (enemy.specialhp  && enemy.specialhp > 0) {
	enemy.specialhp -= itemsAndDamage[weapon].specialatk
} else {
	let dmg = itemsAndDamage[weapon].dmg + itemsAndDamage[weapon].boost[enemy.type] + RandomDamage(weapon)
	enemy.hp -= dmg
 
	addDamageIndicator(enemy, dmg);
}
addDamageIndicator(enemy, itemsAndDamage[weapon].dmg + itemsAndDamage[weapon].boost[enemy.type] + RandomDamage(weapon) );
if(enemy.type=="dummyvector"){
DummyDamage(enemy, itemsAndDamage[weapon].dmg + itemsAndDamage[weapon].boost[enemy.type] + RandomDamage(weapon) )
}
		} else {
if (enemy.specialhp && enemy.specialhp > 0) {
	enemy.specialhp -= itemsAndDamage[weapon].specialatk ||  1 
} else {
	let dmg = itemsAndDamage[weapon].dmg + RandomDamage(weapon)
	enemy.hp -= dmg
	 
	addDamageIndicator(enemy, dmg);
}
if(enemy.type=="dummyvector"){
DummyDamage(enemy, itemsAndDamage[weapon].dmg + RandomDamage(weapon) )
}
		}
	} else {
		if (langPlactive == 1) {
			showTextInCanvas("ta broń nie działa na : " + enemy.type);
		} else {
			showTextInCanvas("current weapon doesn't work on this enemy: " + enemy.type);
		}
	}
}
return	dropsEnemyLoot(enemy,x,y);
  	});
  if(fddg==0){
    if(!(weapon=="magicwand"||weapon=="greenwand"||weapon=="magicwandofsharp"||weapon=="hyperblastwand"||weapon=="godwand"  ||weapon=="boomerang"||weapon=="titanium_boomerang"||weapon=="good_boomerang" ||weapon=="hell_boomerang"||weapon=="draco_boomerang"||weapon=="bow"||weapon=="hellbow"||weapon=="darkbow"||weapon=="nightbow"||weapon=="moltenbow"||weapon=="rainbowbow"||weapon=="quantumbow"||weapon=="dracobow")){
    playslash2()
  }}else{
   
  }
}
const floorblocks = ["stone_floor", "fiber_floor", "grasslayer", "yellow", "violet", "clayblock", "clayblock1", "dandelion", "toadstool", "sandblock2", "gypsumblock", "glass", "fern", "planks_floor", "log_floor", "ashblock", "ashfloor", "brickfloor", "daffodil","flax","myosotis" ,"fiber_floor", "bed1", "magnetite", "nettle", "stone_floor", "emeraldfloor", "sapphirefloor", "rubyfloor", "clayblock1", "clayblock","violetfloor","grass","toadstool","stones","thistle","ryeroof","houseroof","housewall","brickhouse","gelblock","gypsum_dirt","roadfloor","brickfloor2","road","deadgrassfloor2","grass2","forestgrasslayer","deadgrassfloor2","deadgrassfloor","forestgrass","forestgrasslayer","hill1","climbhill","gypsumroof","gypsumhouse","gypsumdoor","polishedfloor","snowgrass2","snowgrass","smooth_stone","blossomblock","curedgrasslayer","bed21","bed22","swampgrass","peatfloor","peat","ethergrass","ethergrass2","ethersand","ethersand2"];
function deleteFromChunk(x, y, types) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const chunkKey = `${chunkX},${chunkY}`;
  let chunkBlocks = chunks[chunkKey];
  if (!chunkBlocks) return;  
  for (let i = chunkBlocks.length - 1; i >= 0; i--) {
    let block = chunkBlocks[i];
    if (types.includes(block.type)) {
      chunkBlocks.splice(i, 1);   
    }
  }
}
function isBlockFloor(x, y) {
    if (options.dontbreakfloor === 1) {
        return floorblocks.includes(blockType); 
    }
    return false;  
}
var selectedslot = ""
var selectedslot2 = ""
function getBlockTypeAtPosition(x, y) {
    }
 var VISIBLEIDS=[]
let Delay=0
let touchTD;
var intrashcan=false
function process_target(e) {
  e.preventDefault()
  if (Delay == 1) {
    return;
  }
  Delay = 1
  setTimeout(function() {
    Delay = 0
  }, 500)
  if (!(checkIfHasEnemy("trueuniversehead", 1)) && !(checkIfHasEnemy("deepgodhead", 1)) && !(checkIfHasEnemy("flesh", 1)) && !(checkIfHasEnemy("voltary", 1))  && !(checkIfHasEnemy("insaneuniversegod", 1)) && !(checkIfHasEnemy("2medusa", 1)) && !(checkIfHasEnemy("darkeye", 1)) ) {
    if (!currentTrack || currentTrack.paused && isPlayingGame == 1) {
      playMusic();
    }
    if ((((isStayOn("grass") || isStayOn("water")) && !isStayOn("snowgrass") && !isStayOn("snowgrass2")) && isPlayingDesertMusic || isPlayingSnowyMusic) && !isPlayingForest) {
      stopDesertMusic();
    }
    if (isStayOn("water") && (isPlayingSnowyMusic || isPlayingForest)) {
      stopSnowyMusic();
    }
    checkPlayerOnDesertSand();
  } else {
    stopDesertMusic();
    stopSnowyMusic();
  }
  let scaledX = 0
  let scaledY = 0
 let clientX, clientY;
if (e.changedTouches) {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const touch = e.changedTouches[i];
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		if (touch.clientX && touch) {
			scaledX = (touch.clientX - rect.left) * scaleX + 15 - zoomedDELTA / 3;
			scaledY = (touch.clientY - rect.top) * scaleY + 15 - zoomedDELTA / 3;
			if (options.hyperzomout == 1 && options.zoomout == 1) {
				scaledX = (touch.clientX - rect.left) * scaleX + 15 - zoomedDELTA / 3;
				scaledY = (touch.clientY - rect.top) * scaleY + 15 - zoomedDELTA / 3;
			}
		}
	}
} else {
	const rect = canvas.getBoundingClientRect();
	scaledX = (e.clientX - rect.left) * (canvas.width / rect.width) + 15 - zoomedDELTA / 3;
	scaledY = (e.clientY - rect.top) * (canvas.height / rect.height) + 15 - zoomedDELTA / 3;
}
  const weapon = checkIfPlayerHasAnyWeapon();
  x = (Math.floor(scaledX / blockSize) * blockSize) - 5;
  y = (Math.floor(scaledY / blockSize) * blockSize) - 5;
 if (options.zoomout == 1 && options.hyperzomout == 1) {
  y = (Math.floor(scaledY / blockSize) * blockSize) 
  x = (Math.floor(scaledX / blockSize) * blockSize) 
}else if (options.zoomout == 1 && options.biggerzoomout == 1) {
    y = (Math.floor(scaledY / blockSize) * blockSize) 
    x = (Math.floor(scaledX / blockSize) * blockSize) 
  }
  removeBatAtPosition(scaledX, scaledY);
  if (options.fightmode == 1|| options2.fightmode == 1) {
    return;
  }
  let radius5 = 1.5 * blockSize
    playerCenterX = offsetX + canvas.width / 2 * 32 * 32 * 32*32;
    playerCenterY = offsetY + canvas.height / 2 * 32 * 32 * 32*32  ;
if (options.zoomout == 1 && options.hyperzomout == 1) {
 playerCenterX = offsetX   + (canvas.width- (zoomedDELTA/2) ) / 2 * 32 * 32 * 32 * 32;
 radius5 = 1.5  * blockSize
playerCenterY = offsetY + (canvas.height- (zoomedDELTA/2)  ) / 2 * 32 * 32 * 32 * 32; 
}
  const distX2 = Math.abs(playerCenterX / 32 / 32 / 32 /32- x);
  const distY2 = Math.abs(playerCenterY / 32 / 32 / 32 /32 - y);
  if (distX2 <= radius5 && distY2 <= radius5) {
}else{
  blockedsound()
return;
}
if(options.editblocks==1){
if (checkBlockAtPosition(x, y, "chest")) {
  let fuckingDataFunction = getKeyBlockAtPosition(x, y, "chest")
  activeChest = [fuckingDataFunction[0], fuckingDataFunction[1]]
  if (!chestsData[`${parseInt(fuckingDataFunction[0])},${parseInt(fuckingDataFunction[1])}`]) {
    chestsData[`${parseInt(fuckingDataFunction[0])},${parseInt(fuckingDataFunction[1])}`] = [];
  }
  openInventory2();
  return;
}
if (checkBlockAtPosition(x, y, "trashcan")) {
   intrashcan=true
  openInventory3();
  return;
}
}else {
if (checkBlockAtPosition(x, y, "chest") && checkEmptySlots(0)) {
  let fuckingDataFunction = getKeyBlockAtPosition(x, y, "chest")
 if (Array.isArray(chestsData[`${parseInt(fuckingDataFunction[0])},${parseInt(fuckingDataFunction[1])}`]) && chestsData[`${parseInt(fuckingDataFunction[0])},${parseInt(fuckingDataFunction[1])}`].length > 0) { 
   if(!langPlactive){
   TextPopUp("Clear Chest First ! ")
   }else{
TextPopUp("Pierw wyczyść skrzynkę ! ")
   }
   return; 
 }else{
 }
}
}
if(checkBlockAtPosition(x, y, "canvas")){
    let block = getBlockAtPosition(x, y, "canvas")
    if(block && block.draw){
        lastDraw = {}
        for(let i=0;i<10;i++){
            lastDraw[i] = {}
            for(let j=0;j<10;j++){
                lastDraw[i][j] = block.draw[i][j]
            }
        }
        lastColor = "#000" 
        TextPopUp("Current drawing loaded")
    }
}
if (checkBlockAtPosition(x, y, "cdb") && checkIfItems("cdbpicker", 1)) {
	let block = getBlockAtPosition(x, y, "cdb")
	if (block && block.draw) {
		lastDraw = {}
		for (let i = 0; i < 16; i++) {
			lastDraw[i] = {}
			for (let j = 0; j < 16; j++) {
				lastDraw[i][j] = block.draw[i][j]
			}
		}
		TextPopUp("Custom draw block drawing copied")
		return;
	}
}
if (checkBlockAtPosition(x, y, "cdba") && checkIfItems("cdbpicker", 1)) {
	let block = getBlockAtPosition(x, y, "cdba")
	if (block && block.draw) {
		lastDraw = {}
		for (let i = 0; i < 16; i++) {
			lastDraw[i] = {}
			for (let j = 0; j < 16; j++) {
				lastDraw[i][j] = block.draw[i][j]
			}
		}
		TextPopUp("Custom draw block drawing copied")
		return;
	}
}
let itemGet=0
const blockTypes = ["stones", "rock", "sticks", "nettle", "kite", "tallgrass", "yellow", "violet", "treebark", "toadstool", "fern", "shiny", "blackberry","stick","fiber","stone_axe","handrill-kit","blackberry-fruit","woodboard","briar","kite","whitewallpaper","redwallpaper","bluewallpaper","limewallpaper"];
if (["algae1"].some(tree => checkBlockAtPosition(x, y, tree))) {
 if (checkEmptySlots(1)) {
  updateStamina(-5)
  deleteFromChunk(x, y, ["algae1", "algae2", "algae0"])
  addItem("algae_item", 1);
 } else {
  showTextInCanvas("no space for algae ");
 }
 return;
}
if (["a1bed"].some(tree => checkBlockAtPosition(x, y, tree))) {
    if (checkEmptySlots(1)) {
        updateStamina(-5)
        deleteFromChunk(x, y, ["a1bed", "a2bed"])
        addItem("bed", 1);
    } else {
        showTextInCanvas("no space for bed ");
    }
    return;
}
if (["bed21"].some(tree => checkBlockAtPosition(x, y, tree))) {
  if (checkEmptySlots(1)) {
    updateStamina(-5)
    deleteFromChunk(x, y, ["bed21", "bed22"])
    addItem("bed", 1);
  } else {
    showTextInCanvas("no space for bed ");
  }
  return;
}
if (checkBlockAtPosition(x, y, "coalore") && checkEmptySlots(0)) {
  addItem("coal", 1)
  removeBlockAtPosition(x, y, "coalore")
  return;
}
if ( checkBlockAtPosition(x, y, "fence") && checkEmptySlots(0)) {
  addItem("itemfence",1)
  removeBlockAtPosition(x,y,"fence")
  return;
}
if (checkBlockAtPosition(x, y, "honey_mushrooms") && checkEmptySlots(0)) {
	addItem("honey_mushrooms", 1)
	removeBlockAtPosition(x, y, "honey_mushrooms")
	return;
}
if (checkBlockAtPosition(x, y, "log0") && checkEmptySlots(0)) {
  addItem("log", 1)
  removeBlockAtPosition(x, y, "log0")
  return;
}
if (checkBlockAtPosition(x, y, "road") && checkEmptySlots(0)) {
  addItem("itemroad", 1)
  removeBlockAtPosition(x, y, "road")
  return;
}
if (checkBlockAtPosition(x, y, "unknown") && checkEmptySlots(0)) {
if (checkIfItems("trueuniversespawner", 1)) {
  if (!checkIfHasEnemy("trueuniversebody", 1)) {
beforecreatedtrue=1
  deleteItems("trueuniversespawner", 1);
startLightning2()
achievementget("Summoning isn't a great idea ...", 0)
showTextInCanvas("No mercy ... ")
playTrueTrack()
selectedslot2=selectedslot
setTimeout(function(){
if(selectedslot2==selectedslot){
	setBorder(offsetX,offsetY,10) 
createTrueUniverse()
}
},8000)}}
if (checkIfItems("deepgodspawner", 1)) {
  if (!checkIfHasEnemy("deepgodhead", 1)) {
    if(isunderwater==1){
  deleteItems("deepgodspawner", 1);
startLightning2()
selectedslot    = 
showTextInCanvas(" ? ? ?  ")
setTimeout(function(){
createDeepgod()
playBoss1()
},12000)} else { showTextInCanvas("true aqua god can be only summoned underwater ")
  }
  }
  }
  if (checkIfItems("voltary_essence", 1)) {
  deleteItems("voltary_essence", 1); 
  let bat = new Enemy(offsetX + 64, offsetY - 32, 'voltary');
  isRaining = true;
  nightpower = 2
playBossVoltary()
  renderedEnemies.push(bat);
  showTextInCanvas("V O L T A R Y summoned ...")
  return;
}
if (checkIfItems("aquagodshell", 1)) {
  if(isunderwater==1){
  deleteItems("aquagodshell", 1); 
  setTimeout(function (){
  let bat = new Enemy(offsetX + 64, offsetY - 32, 'aquagod');
  isRaining = true;
  nightpower = 2
  renderedEnemies.push(bat);
  },1500);
  showTextInCanvas(" something screaming underwater ")
  return;
}else{
  showTextInCanvas(" you need be underwater to do that ")
}}
if (checkIfItems("universeechoes", 1)) {
  deleteItems("universeechoes", 1); 
  startLightning3()
  playBossWORLDEATER()
  setTimeout(function() {
    let bat = new Enemy(offsetX + 64, offsetY - 32, 'insaneuniversegod');
    isRaining = true;
    nightpower = 2
    renderedEnemies.push(bat);
  }, 11000);
  showTextInCanvas(" ... ");
  return;
}
if (checkIfItems("fleshdumbass", 1)) {
  deleteItems("fleshdumbass", 1); 
  let bat = new Enemy(offsetX + 64, offsetY - 32, 'flesh');
  isRaining = false;
  nightpower = 3
playBoss3()
  renderedEnemies.push(bat);
  showTextInCanvas("you feel hurt from inside of your flesh")
  return;
}else if (checkIfItems("evilsummoner", 1)) {
  deleteItems("evilsummoner", 1); 
  let bat = new Enemy(offsetX + 64, offsetY - 32, 'darkeye');
  isRaining = false;
  nightpower = 3
  renderedEnemies.push(bat);
  playBoss4()
  showTextInCanvas("darkeye is approaching . .")
  return;
}else if (checkIfItems("spikegod_essence", 1)) {
  deleteItems("spikegod_essence", 1); 
  let bat = new Enemy(offsetX + 64, offsetY - 32, 'spikegod');
  renderedEnemies.push(bat);
  showTextInCanvas("the god is approaching . . .")
  return;
}else if (checkIfItems("aquaticevent", 1)) {
  deleteItems("aquaticevent", 1);  
  let bat = new Enemy(offsetX + 64, offsetY - 32, '2medusa');
  renderedEnemies.push(bat);
  playBoss4()
  showTextInCanvas("aquatic even started kill `medusa  `. . .")
  return;
}else {
    removeBlockAtPosition(x, y, "unknown");
    addItem("unknown", 1);
  }
  return;
}
if (checkBlockAtPosition(x, y, "candy") && checkEmptySlots(0)) {
  if (currentStamina > 95) {
    addItem("candy", 1); 
    removeBlockAtPosition(x, y, "candy");
  } else {
    updateStamina(40)
    removeBlockAtPosition(x, y, "candy");
  }
  return;
}
if (checkBlockAtPosition(x, y, "dandelion2") && checkEmptySlots(0)) {
    removeBlockAtPosition(x, y, "dandelion2");
buildBlockAtPosition(x, y, "dandelion");
addItem("dandelionseeds",1)
  return;
}
if (checkBlockAtPosition(x, y, "energybowl") && checkEmptySlots(0)) {
  if (currentStamina > 95) {
    addItem("energybowl", 1); 
    removeBlockAtPosition(x, y, "energybowl");
  } else {
    updateStamina(90)
dropItemAtPlayerPosition("bowl")
    removeBlockAtPosition(x, y, "energybowl");
  }
  return;
}
if (checkBlockAtPosition(x, y, "healthbowl") && checkEmptySlots(0)) {
    addItem("healthbowl", 1); 
    removeBlockAtPosition(x, y, "healthbowl");
  return;
}
if (checkBlockAtPosition(x, y, "honey_mushrooms") && checkEmptySlots(0)) {
    addItem("honey_mushrooms", 1); 
    removeBlockAtPosition(x, y, "honey_mushrooms");
  return;
}
if (checkBlockAtPosition(x, y, "beer") && checkEmptySlots(0)) {
  addItem("beer", 1);
removeBlockAtPosition(x, y, "beer");
  return;
}
if (checkBlockAtPosition(x, y, "bread") && checkEmptySlots(0)) {
  addItem("bread", 1);
removeBlockAtPosition(x, y, "bread");
  return;
}
if (checkBlockAtPosition(x, y, "kite1") && checkEmptySlots(0)) {
  removeBlockAtPosition(x, y, "kite1");
  addItem("kite",1)
buildBlockAtPosition(x, y, "mycelium");
  return;
}
if (checkBlockAtPosition(x, y, "thistle1") && checkEmptySlots(0)) {
    addItem("thistle", 1); 
    removeBlockAtPosition(x, y, "thistle1");
    buildBlockAtPosition(x, y, "thistleseeds");
  return;
}
if (checkBlockAtPosition(x, y, "rye1") && checkEmptySlots(0)) {
    addItem("rye", 1); 
    removeBlockAtPosition(x, y, "rye1");
    buildBlockAtPosition(x, y, "rye_seeds");
  return;
}
if (checkBlockAtPosition(x, y, "cavewallwithsalt") && checkEmptySlots(0)) {
  addItem("salt", 1);
  removeBlockAtPosition(x, y, "cavewallwithsalt");
  return;
}
if (["lamp"].some(tree => checkBlockAtPosition(x, y, tree)) ) {
  if (checkEmptySlots(1)) { 
    updateStamina(-5)
    addItem("lamptorch", 1);
    deleteFromChunk(x, y, ["lamp", "lamp2"])
  } else {
    showTextInCanvas("no space ");
  }
  return;
}
if (["statue1_1"].some(tree => checkBlockAtPosition(x, y, tree))) {
 if (checkEmptySlots(1)) { 
  updateStamina(-5)
  addItem("statue1", 1);
  deleteFromChunk(x, y, ["statue1_1", "statue1_2"])
 } else {
  showTextInCanvas("no space ");
 }
 return;
}
if (["statue2_1"].some(tree => checkBlockAtPosition(x, y, tree))) {
  if (checkEmptySlots(1)) { 
    updateStamina(-5)
    addItem("statue2", 1);
    deleteFromChunk(x, y, ["statue2_1", "statue2_2"])
  } else {
    showTextInCanvas("no space ");
  }
  return;
}
if (["black_elderberry"].some(tree => checkBlockAtPosition(x, y, tree)) && checkIfItems("stone_axe",1)) {
  if (checkEmptySlots(1)) { 
    updateStamina(-5)
    addItem("black_elderberry_tree", 1);
    if (generateCave !== 1) {
} else {
}
deleteFromChunk(x,y,["black_elderberry","black_elderberry2"])
  } else {
    showTextInCanvas("no space ");
  }
  return;
} else if (["black_elderberry"].some(tree => checkBlockAtPosition(x, y, tree))) {
  if (checkEmptySlots(1)) { 
    updateStamina(-5)
    addItem("black_elderberries", 2);
    if(generateCave!==1){
    deleteFromChunk(x,y,["black_elderberry","black_elderberry2"])
    }else{
      deleteFromChunk(x,y,["black_elderberry","black_elderberry2"])
    }
    buildBlockAtPosition(x, y, "empty_black_elderberry");
    buildBlockAtPosition(x, y - 32, "empty_black_elderberry2");
  } else {
    showTextInCanvas("no space ");
  }
  return;
}
if (checkBlockAtPosition(x, y, "carrot2") && checkEmptySlots(1)) {
    addItem("carrot", 1);
    addItem("wildcarrot", 1);
    if(Math.random()<0.12){
        addItem("wildcarrot", 1);
    }
    removeBlockAtPosition(x, y, "carrot2")
    return;
}
if (checkBlockAtPosition(x, y, "pumpkin3") && checkEmptySlots(1)) {
    addItem("pumpkin", 1);
    addItem("pumpkin1", 1);
    if(Math.random()<0.12){
        addItem("pumpkin1", 1);
    }
    removeBlockAtPosition(x, y, "pumpkin3")
    return;
}
if (checkBlockAtPosition(x, y, "melon") && checkEmptySlots(1)) {
  addItem("melonfruit", 1);
  addItem("melon1", 1);
  if (Math.random() < 0.12) {
    addItem("melon1", 1);
    addItem("melonfruit", 1);
  }
  removeBlockAtPosition(x, y, "melon")
  return;
}if (checkBlockAtPosition(x, y, "potato") && checkEmptySlots(1)) {
  addItem("itempotato", 1);
  addItem("potato2", 1);
  if (Math.random() < 0.12) {
    addItem("potato2", 1);
    addItem("itempotato", 1);
  }
  removeBlockAtPosition(x, y, "potato")
  return;
}
Object.keys(allItems).forEach(itemName => {
  if (checkBlockAtPosition(x, y, itemName) && checkEmptySlots(0)) {
    if (itemName !== "blackberry-fruit" && itemName !== "briar-fruit" && itemName !== "grasslayer" && itemName !== "clayblock" && itemName !== "clayblock1" && itemName !== "sandblock2" && itemName !== "fireplow" && itemName !== "fireroll" && itemName !== "furnace"&& itemName !== "kiln"&& itemName!=="extinguished_campfire"&& itemName !== "magnetite"&& itemName !== "blackberry-fruit"&& itemName !== "cooked_thistleroot"&& itemName !== "cooked_bunnmeat"&& itemName !== "cooked_sharkmeat"&& itemName !== "briar-fruit"&& itemName !== "kite"&& itemName !== "rock"&& itemName !== "cave_wall"&& itemName !== "cavewall"&& itemName !== "black_elderberries"&& itemName !== "hill1"&& itemName !== "hill2"&& itemName !== "hill3"&& itemName !== "tallgrass"&& itemName !== "snowgrass2"&& itemName !== "forestgrasslayer"&& itemName !== "deadgrassfloor2"&& itemName !== "deadgrassfloor"&& itemName !== "cavedirt"&& itemName !== "pumpkin3" && itemName !== "melon"&& itemName !== "potato"&& itemName !== "log0" && itemName !== "whitewallpaper" && itemName !=="redwallpaper" && itemName !== "bluewallpaper"&& itemName !== "limewallpaper" && itemName !== "honey_mushrooms"  ) {
      addItem(itemName, 1); 
      removeBlockAtPosition(x, y, itemName); 
      itemGet=1
      return;
    }
  }
});
if (checkBlockAtPosition(x, y, "stonewithgypsum") && checkIfItems("pickaxe",1)&& checkEmptySlots(0)) {
  addItem("gypsum", 1);
  removeBlockAtPosition(x, y, "stonewithgypsum")
useItemDurability(-3)
  return;
}
if (checkBlockAtPosition(x, y, "diamante1") && checkIfItems("pickaxe", 1) && checkEmptySlots(0)) {
    addItem("diamante", 1);
    removeBlockAtPosition(x, y, "diamante1")
    useItemDurability(-4)
    achievementget("Diamonds !", 1)
    return;
}
if (checkBlockAtPosition(x, y, "abyssblock") && checkIfItems("pickaxe", 1) && checkEmptySlots(0)) {
  removeBlockAtPosition(x, y, "abyssblock");
  addItem("abyssblock2",1);
  useItemDurability(-2)
  return;
}
if (checkBlockAtPosition(x, y, "hook") ) {
  addItem("fishing_rod", 1);
  removeBlockAtPosition(x, y, "hook")
  cannotmove=0
  if (langPlactive == 1) {
    showTextInCanvas("nic nie bierze")
} else {
    showTextInCanvas("nothing catched")
}
  return;
}
if (checkBlockAtPosition(x, y, "catchhook") ) {
addItem("fishing_rod", 1);
removeBlockAtPosition(x, y, "catchhook")
cannotmove=0
if (Math.random() < 0.2) {
    achievementget("„Fish something”", 0)
  addItem("salmon", 1)
  showTextInCanvas("you catch salmon  ")
}else if (Math.random() < 0.5) {
    achievementget("„Fish something”", 0)
  addItem("trout", 1)
  showTextInCanvas("you catch trout  ")
}else {
  if (langPlactive == 1) {
      showTextInCanvas("było blisko ! spróbuj ponownie ")
  } else {
      showTextInCanvas("it was close ... try again")
  }
}
return;
}
if (checkBlockAtPosition(x, y, "pyritestone") && checkIfItems("pickaxe",1)&& checkEmptySlots(0)) {
  addItem("pyrite", 1);
  removeBlockAtPosition(x, y, "pyritestone")
  useItemDurability(-1)
  return;
}
if(  checkBlockAtPosition(x, y, "whitewallpaper") &&checkEmptySlots(0) ){
    removeBlockAtPosition(x, y, "whitewallpaper");  
    achievementget("Scratching the wallpaper ", 0)
    addItem("whitewallpaperroller",1)
return;
}
if (checkBlockAtPosition(x, y, "redwallpaper") && checkEmptySlots(0)) {
  removeBlockAtPosition(x, y, "redwallpaper");
  achievementget("Scratching the wallpaper ", 0)
  addItem("redwallpaperroller", 1)
  return;
}
if (checkBlockAtPosition(x, y, "bluewallpaper") && checkEmptySlots(0)) {
  removeBlockAtPosition(x, y, "bluewallpaper");
  achievementget("Scratching the wallpaper ", 0)
  addItem("bluewallpaperroller", 1)
  return;
}
if (checkBlockAtPosition(x, y, "limewallpaper") && checkEmptySlots(0)) {
  removeBlockAtPosition(x, y, "limewallpaper");
  achievementget("Scratching the wallpaper ", 0)
  addItem("limewallpaperroller", 1)
  return;
}
if(checkIfItems("pickaxe",1) && checkBlockAtPosition(x, y, "cave_wall")&&checkEmptySlots(0) ){
    removeBlockAtPosition(x, y, "cave_wall"); buildBlockAtPosition(x, y, "broken_cavewall");
    updateStamina(-4)
    achievementget("Caveman Journey", 0)
    addItem("stone",1)
useItemDurability(-3)
return;}
if(checkIfItems("pickaxe",1) && checkBlockAtPosition(x, y, "hellwall")&&checkEmptySlots(0) ){
    removeBlockAtPosition(x, y, "hellwall"); 
    updateStamina(-15)
    addItem("hellwall2",1)
    if(Math.random()<0.04){
      addItem("pyrite",1)
    }
useItemDurability(-8)
return;}
if (checkIfItems("cavemakingpickaxe", 1) && checkBlockAtPosition(x, y, "dirt") && checkEmptySlots(0)) {
    removeBlockAtPosition(x, y, "dirt");
    buildBlockAtPosition(x, y, "customcaveentrance");
allCaveEntrances.push([Math.floor((offsetX+(canvas.height/2))/32)*32,Math.floor((offsetY+(canvas.height/2))/32)*32])
achievementget("Just a Hole", 0)
    deleteItems("cavemakingpickaxe", 1);
    showTextInCanvas("your pickaxe broke");
    return;
}else if(checkIfItems("cavemakingpickaxe", 1)){
  showTextInCanvas("you can only make caves on DIRT ")
}
if (checkIfItems("pickaxe", 1) && checkBlockAtPosition(x, y, "customcaveentrance") && checkEmptySlots(2)) {
    removeBlockAtPosition(x, y, "customcaveentrance");
    buildBlockAtPosition(x, y, "dirt");
    addItem("cavemakingpickaxe", 1);
    showTextInCanvas("your pickaxe broke");
    return;
}else if(checkBlockAtPosition(x, y, "customcaveentrance")){
  showTextInCanvas(" use pickaxe to remove cave entrance ")
}
if(checkIfItems("pickaxe",1) && checkBlockAtPosition(x, y, "broken_cavewall")&& checkEmptySlots(0)){
    removeBlockAtPosition(x, y, "broken_cavewall"); 
    addItem("bigrock",1)
    useItemDurability(-2)
return;}
if (checkBlockAtPosition(x, y, "extinguished_campfire") ) {
if(checkIfItems("palmlog",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("palmlog",1)
    achievementget(" Fire won't last forever ", 0)
return;}else  if(checkIfItems("stick",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("stick",1)
    achievementget(" Fire won't last forever ", 0)
return;}else  if(checkIfItems("etherlog",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("etherlog",1)
    achievementget(" From The ether to fire ", 0)
return;}else if(checkIfItems("log",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("log",1)
    achievementget(" Fire won't last forever ", 0)
return;}else if(checkIfItems("treebark",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("treebark",1)
    achievementget(" Fire won't last forever ", 0)
return;} else if(checkIfItems("nettle",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("nettle",1)
    achievementget(" Fire won't last forever ", 0)
return;}else if(checkIfItems("birch-powder",1)){
    removeBlockAtPosition(x, y, "extinguished_campfire"); buildBlockAtPosition(x, y, "campfire");deleteItems("birch-powder",1)
    achievementget(" Fire won't last forever ", 0)
return;} else if(checkEmptySlots(1)){
  removeBlockAtPosition(x, y, "extinguished_campfire");
  if (langPlactive == 1) {
    showTextInCanvas("jeżeli masz materiały łatwopalne możesz zapalić ognisko ponownie")
} else {
    showTextInCanvas("if you have fuel like materials you can \n fire the campfire for crafting")
}
  addItem("extinguished_campfire", 1);
}else{
  if (langPlactive == 1) {
    showTextInCanvas("brak miejsca")
} else {
    showTextInCanvas("no space")
}
}
  return;
}
if (checkBlockAtPosition(x, y, "furnace") ) {
  if(checkIfItems("palmlog",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("palmlog",1)
return;} else  if(checkIfItems("etherlog",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("etherlog",1)
    achievementget(" From The ether to fire ", 0)
return;}else if(checkIfItems("longstick",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("longstick",1)
return;} else if(checkIfItems("stick",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("stick",1)
return;}else if(checkIfItems("log",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("log",1)
return;}else if(checkIfItems("treebark",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("treebark",1)
return;} else if(checkIfItems("coal",1)){
    removeBlockAtPosition(x, y, "furnace"); buildBlockAtPosition(x, y, "lit_furnace");deleteItems("coal",1)
return;} else if(checkEmptySlots(1)){
  removeBlockAtPosition(x, y, "furnace");
  if (langPlactive == 1) {
    showTextInCanvas("jeżeli masz materiały łatwopalne możesz zapalić piec ponownie")
} else {
    showTextInCanvas("if you have fuel like materials you can \n fire the furnace for crafting")
}
  addItem("furnace", 1);
}else{
  showTextInCanvas("no space for furnace ")
}
  return;
}
if (checkBlockAtPosition(x, y, "kiln") ) {
 if(checkIfItems("palmlog",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("palmlog",1)
return;} else if(checkIfItems("longstick",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("longstick",1)
return;} else  if(checkIfItems("etherlog",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("etherlog",1)
    achievementget(" From The ether to fire ", 0)
return;} else if(checkIfItems("stick",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("stick",1)
return;}else if(checkIfItems("log",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("log",1)
return;}else if(checkIfItems("treebark",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("treebark",1)
return;} else if(checkIfItems("coal",1)){
    removeBlockAtPosition(x, y, "kiln"); buildBlockAtPosition(x, y, "lit_kiln");deleteItems("coal",1)
return;} else if(checkEmptySlots(1)){
  removeBlockAtPosition(x, y, "kiln");
  if (langPlactive == 1) {
    showTextInCanvas("jeżeli masz materiały łatwopalne możesz zapalić kiln ponownie")
} else {
    showTextInCanvas("if you have fuel like materials you can \n fire the kiln for crafting")
}
  addItem("kiln", 1);
}else{
  showTextInCanvas("no space for kiln ")
}
  return;
}
    if (checkBlockAtPosition(x, y, "clayblock")&& checkEmptySlots(1)) {
  removeBlockAtPosition(x, y, "clayblock");
  addItem("clay", 2);
}
if (checkBlockAtPosition(x, y, "clayblock1")  && checkEmptySlots(1)) {
  removeBlockAtPosition(x, y, "clayblock1");
  addItem("clay", 2);
  return;
}
if (checkBlockAtPosition(x, y, "cactus") && checkEmptySlots(0)) {
if(Math.random()<0.5){
addItem("cactus_fruit", 1);
buildBlockAtPosition(x,y,"cactusempty");
removeBlockAtPosition(x, y, "cactus");
}else{
if (langPlactive == 1) {
    showTextInCanvas("cholera dostałeś obrażenia od kaktusa !")
} else {
    showTextInCanvas("damn you taken damage from penetration a cactus!")
}
  updateHealth(-4)
}
return;
}
    if (checkBlockAtPosition(x, y, "stones")&& checkEmptySlots(0)) {
        addItem("stone", Math.random() < 0.5 ? 1 : 2);  
        updateStamina(-1)
  removeBlockAtPosition(x, y, "stones")
  return;
    }
    if (checkBlockAtPosition(x, y, "sticks") && checkEmptySlots(0)) {
        const randomItem = Math.random() < 0.5 ? "stick" : (Math.random() < 0.6 ? "treebark" : "longstick");
        addItem(randomItem, 1);  
        updateStamina(-2)
  removeBlockAtPosition(x, y, "sticks")
  return;
    }
        if (checkBlockAtPosition(x, y, "gypsum_dirt") && checkEmptySlots(0)) {
      addItem("gypsum", 1); 
      removeBlockAtPosition(x, y, "gypsum_dirt")
      return;
    }
    if (checkBlockAtPosition(x, y, "rock")&& checkEmptySlots(0)) {
        addItem("bigrock", 1);  
        updateStamina(-4)
  removeBlockAtPosition(x, y, "rock")
  return;
    }
if (checkBlockAtPosition(x, y, "briar")&& checkEmptySlots(0)) {
  addItem("briar-fruit", 1); 
  buildBlockAtPosition(x,y,"briarempty");
  removeBlockAtPosition(x, y, "briar")
  return;
}
if (checkBlockAtPosition(x, y, "blackberry")&& checkEmptySlots(0)) {
  addItem("blackberry-fruit", 1); 
  buildBlockAtPosition(x,y,"emptyblackberry"); 
  removeBlockAtPosition(x, y, "blackberry")
  return;
}
if (checkBlockAtPosition(x, y, "blackberry-fruit") && checkEmptySlots(0)) {
  addItem("blackberry-fruit", 1);
removeBlockAtPosition(x, y, "blackberry-fruit");
  return;
}
if (checkBlockAtPosition(x, y, "cactus_fruit") && checkEmptySlots(0)) {
    addItem("cactus_fruit", 1); 
    removeBlockAtPosition(x, y, "cactus_fruit");
  return;
}if (checkBlockAtPosition(x, y, "black_elderberries") && checkEmptySlots(0)) {
  addItem("black_elderberries", 1);
removeBlockAtPosition(x, y, "black_elderberries");
  return;
}
if (checkBlockAtPosition(x, y, "cooked_bunnmeat") && checkEmptySlots(0)) {
  addItem("cooked_bunnmeat", 1);
removeBlockAtPosition(x, y, "cooked_bunnmeat");
  return;
}
if (checkBlockAtPosition(x, y, "cooked_salmon") && checkEmptySlots(0)) {
  addItem("cooked_salmon", 1);
removeBlockAtPosition(x, y, "cooked_salmon");
  return;
}
if (checkBlockAtPosition(x, y, "kite") && checkEmptySlots(0)) {
  addItem("kite", 1);
removeBlockAtPosition(x, y, "kite");
  return;
}
if (checkBlockAtPosition(x, y, "cooked_thistleroot") && checkEmptySlots(0)) {
  addItem("cooked_thistleroot", 1);
removeBlockAtPosition(x, y, "cooked_thistleroot");
  return;
}
if (checkBlockAtPosition(x, y, "briar-fruit") && checkEmptySlots(0)) {
  addItem("briar-fruit", 1);
removeBlockAtPosition(x, y, "briar-fruit");
  return;
}
if (checkBlockAtPosition(x, y, "fireplow") && checkEmptySlots(0)) {
  blockTypes.forEach(type => removeBlockAtPosition(x, y, type));
  if(Math.random()>0.1){
    addItem("fireplow", 1);
  removeBlockAtPosition(x, y, "fireplow");
  yourItems = yourItems.map(item => item === "fiber" ? "ignited_fiber" : item);
  igniteFiberAround(x, y, 64);
  return;
}else{
}
return;
}
if (checkBlockAtPosition(x, y, "fireroll") && checkEmptySlots(0)) {
  blockTypes.forEach(type => removeBlockAtPosition(x, y, type));
  if(Math.random()>0.9){
    addItem("fireroll", 1);
  removeBlockAtPosition(x, y, "fireroll");
  yourItems = yourItems.map(item => item === "fiber" ? "ignited_fiber" : item);
  igniteFiberAround(x, y, 64);
  return;
}else{
}
return;
}
if (checkBlockAtPosition(x, y, "swampwater") && checkEmptySlots(0) && checkIfItems("bucket", 1)) {
	achievementget("Water!", 0)
	removeBlockAtPosition(x, y, "swampwater");
	deleteItems("bucket", 1)
	updateStamina(-5);
	addItem("bucketwithswampwater", 1);
	buildBlockAtPositionBefore2(x, y, "dirt");
	return;
}
if (checkBlockAtPosition(x, y, "swampwater") && checkEmptySlots(0) && checkIfItems("leafbowl", 1)) {
	achievementget("Water!", 0)
	removeBlockAtPosition(x, y, "swampwater");
	deleteItems("leafbowl", 1)
	updateStamina(-5);
	addItem("leafbowlwithswampwater", 1);
	buildBlockAtPositionBefore2(x, y, "dirt");
	return;
}
if (checkBlockAtPosition(x, y, "swampwater") && checkEmptySlots(0) && checkIfItems("bowl", 1)) {
	achievementget("Water!", 0)
	removeBlockAtPosition(x, y, "swampwater");
	deleteItems("bowl", 1)
	updateStamina(-5);
	addItem("bowl_with_swampwater", 1);
	buildBlockAtPositionBefore2(x, y, "dirt");
	return;
}
if (checkBlockAtPosition(x, y, "shallowwater") && checkEmptySlots(0) && checkIfItems("leafbowl", 1)) {
  achievementget("Water!", 0)
  removeBlockAtPosition(x, y, "shallowwater");
  deleteItems("leafbowl", 1)
  updateStamina(-5);
  addItem("leafbowlwithcleanwater", 1);
  return;
}
if (checkBlockAtPosition(x, y, "shallowwater") && checkEmptySlots(0) && checkIfItems("bucket", 1)) {
	achievementget("Water!", 0)
	removeBlockAtPosition(x, y, "shallowwater");
	deleteItems("bucket", 1)
	updateStamina(-5);
	addItem("bucketwithcwater", 1);
	return;
}
if (checkBlockAtPosition(x, y, "magma") && checkEmptySlots(0) && checkIfItems("bucket", 1)) {
	achievementget("Lava!", 2)
	removeBlockAtPosition(x, y, "magma");
	deleteItems("bucket", 1)
	updateStamina(-5);
	addItem("lavabucket", 1);
	return;
}
if (checkBlockAtPosition(x, y, "shallowwater") && checkEmptySlots(0) && checkIfItems("bowl", 1)) {
  achievementget("Water!", 0)
  removeBlockAtPosition(x, y, "shallowwater");
  deleteItems("bowl", 1)
  updateStamina(-5);
  addItem("bowl_with_water", 1);
  return;
}

if (["ethertree1"].some(tree => checkBlockAtPosition(x, y, tree))) {
	if (checkIfItems("stone_axe", 1) && checkEmptySlots(3)) {
		achievementget("Cut down some trees", 0)
		updateStamina(-5)
		if (Math.random() < 0.2) {
			addItem("silverapple", 1);
			addItem("etherlog", 2);
		} else {
			addItem("etherlog", 3);
		}
		addItem("sapling", 1);
		if (Math.random() < 0.3) {
			addItem("treebark", 1);
		} else if (Math.random() < 0.6) {
			addItem("longstick", 1);
			addItem("sapling", 1);
		} else {
			addItem("stick", 1);
			addItem("sapling", 1);
		}
		deleteFromChunk(x, y, ["ethertree1", "ethertree2", "ethertree3"])
	} else {
		if (langPlactive == 1) {
			showTextInCanvas("potrzebne ci narzędzie")
		} else {
			showTextInCanvas("you need a tool ")
		}
	}
	return;
}

if (checkBlockAtPosition(x, y, "tallgrass")) {
  removeBlockAtPosition(x, y, "tallgrass");
  return;
}
if (checkBlockAtPosition(x, y, "deadgrass")) {
  removeBlockAtPosition(x, y, "deadgrass");
  buildBlockAtPositionBefore(x, y, "grass");
  return;
}
if (checkBlockAtPosition(x, y, "magnetite") && checkEmptySlots(0)) {
  removeBlockAtPosition(x, y, "magnetite");
  addItem("magnetite_powder", 1);
  updateStamina(-3)
  if (Math.random() < 0.2) {
  } else {
  }
  return;
}
if (["palm1"].some(tree => checkBlockAtPosition(x, y, tree))) {
    if (checkIfItems("stone_axe", 1) && checkEmptySlots(3)) {
        addItem("palmlog", 2);
        addItem("palmsapling", 1);
        if (Math.random() < 0.3) {
            addItem("palmsapling", 1);
        }
        deleteFromChunk(x, y, ["palm1", "palm2","palm3"]);
        deleteFromChunk(x, y, ["palm12", "coconutpalm", "palm32"]);
removeBlockAtPosition(x, y-(32), "palm3");
removeBlockAtPosition(x, y-(32*2), "palm2");
removeBlockAtPosition(x, y - (32), "palm32");
removeBlockAtPosition(x, y - (32 * 2), "coconutpalm");
}
    return;
}
if (["palm12"].some(tree => checkBlockAtPosition(x, y, tree))) {
    if ( checkEmptySlots(1)) {
        if (!checkBlockAtPosition2(x, y, "coconutpalm")) {
            addItem("coconut", 1);
            if (Math.random() < 0.5) {
                addItem("coconut", 1);
                achievementget("Coconut On the Coconut palm",0)
            }
            deleteFromChunk(x, y, ["palm1", "palm2","palm3"])
            deleteFromChunk(x, y, ["palm12", "coconutpalm", "palm32"]);
removeBlockAtPosition(x, y , "palm12");
removeBlockAtPosition(x, y - (32), "palm32");
removeBlockAtPosition(x, y - (32 * 2), "coconutpalm");
          buildBlockAtPosition(x,y,"palm1")
            buildBlockAtPosition(x,y-32,"palm3")
            buildBlockAtPosition(x,y-64,"palm2")
        }
    }
    return;
}
if (["abysstree0"].some(tree => checkBlockAtPosition(x, y, tree))) {
    if (checkIfItems("stone_axe", 1) && checkEmptySlots(3)) { 
        updateStamina(-5)
        addItem("abysssapling", 1);
        addItem("abysslog", 1);
        if (Math.random() < 0.5) {
            addItem("abysssapling", 1);
            addItem("abyssgel", 2);
        }  if (Math.random() < 0.6){
            addItem("abysswood", 1);
        }
        deleteFromChunk(x, y, ["abysstree0", "abysstree1", "abysstree2"])
    } else {
        if (langPlactive == 1) {
    showTextInCanvas("potrzebne ci narzędzie")
} else {
    showTextInCanvas("you need a tool ")
}
    }
    return;
}
if (["helltree0"].some(tree => checkBlockAtPosition(x, y, tree))) {
    if (checkIfItems("stone_axe", 1) && checkEmptySlots(3)) { 
        updateStamina(-5)
        addItem("hellsapling", 1);
addItem("helllog", 1);
        if (Math.random() < 0.5) {
            addItem("hellsapling", 1);
            addItem("hellwood", 1);
addItem("helllog", 1);
        }
        deleteFromChunk(x, y, ["helltree0", "helltree1", "helltree2"])
    } else {
        if (langPlactive == 1) {
    showTextInCanvas("potrzebne ci narzędzie")
} else {
    showTextInCanvas("you need a tool ")
}
    }
    return;
}
    if (["tree0"].some(tree => checkBlockAtPosition(x, y, tree))) {
        if (checkIfItems("stone_axe", 1) && checkEmptySlots(3)) {  
        achievementget("Cut down some trees", 0)
        updateStamina(-5)
if (Math.random() < 0.2) {
	addItem("apple", 1);
	addItem("log", 2);
}else{
addItem("log", 3);
}
            addItem("sapling", 1);
            if(Math.random()<0.3){
            addItem("treebark", 1);
            }else if (Math.random() < 0.6) {
	addItem("longstick", 1);
	addItem("sapling", 1);
}else{
addItem("stick", 1);
addItem("sapling", 1);
 } 
            deleteFromChunk(x,y,["tree0","tree1","tree2"])
        } else {
            if (langPlactive == 1) {
    showTextInCanvas("potrzebne ci narzędzie")
} else {
    showTextInCanvas("you need a tool ")
}
        }
        return;
    }
    if (["pine0"].some(tree => checkBlockAtPosition(x, y, tree))) {
  if (checkIfItems("stone_axe", 1) && checkEmptySlots(2)) { 
  achievementget("Cut down some trees", 0)
    addItem("log", 2);
    updateStamina(-5)
    addItem("resin", 1);
addItem("sapling", 1);
if (Math.random() < 0.3) {
  addItem("treebark", 1);
} else {
  addItem("stick", 1);
  addItem("sapling", 1);
}
deleteFromChunk(x,y,["pine0","pine1","pine2"])
}
      return;
    }
if (["birch0"].some(tree => checkBlockAtPosition(x, y, tree))) {
  if (checkIfItems("stone_axe", 1) && checkEmptySlots(2)) { 
      achievementget("Cut down some trees", 0)
addItem("log", 2); 
addItem("birch-powder", 1);
updateStamina(-5)
addItem("sapling", 1);
if (Math.random() < 0.3) {
  addItem("longstick", 1);
} else {
  addItem("stick", 1);
  addItem("sapling", 1);
}
deleteFromChunk(x,y,["birch0","birch1","birch2"])
}
  return;
}
if (["snowpine1"].some(tree => checkBlockAtPosition(x, y, tree))) {
  if (checkIfItems("stone_axe", 1) && checkEmptySlots(2)) {
    addItem("log", 2);
    updateStamina(-5)
    addItem("sapling", 1);
    if (Math.random() < 0.8) {
      addItem("longstick", 1);
    } else {
      addItem("stick", 1);
      addItem("sapling", 1);
    }
    deleteFromChunk(x, y, ["snowpine1", "snowpine2", "snowpine3"])
  }
  return;
}
if (checkBlockAtPosition(x, y, "deadgrassfloor") && checkEmptySlots(1)) {
  addItem("deadgrassfloor2", 2)
  removeBlockAtPosition(x, y, "deadgrassfloor");
  buildBlockAtPositionBefore2(x, y, "grass");
}
if (checkBlockAtPosition(x, y, "hill1") && checkEmptySlots(0) && checkIfItems("iron_shovel", 1)) {
 removeBlockAtPosition(x, y, "hill1");
 addItem("hill1", 1);
 updateStamina(-8)
 return;
}
if (checkBlockAtPosition(x, y, "hill2") && checkEmptySlots(0) && (checkIfItems("iron_shovel", 1)||checkIfItems("pickaxe", 1))) {
	removeBlockAtPosition(x, y, "hill2");
	addItem("hill2", 1);
	updateStamina(-10)
	return;
}
if (checkBlockAtPosition(x, y, "hill3") && checkEmptySlots(0) && (checkIfItems("iron_shovel", 1) || checkIfItems("pickaxe", 1))) {
	removeBlockAtPosition(x, y, "hill3");
	addItem("hill3", 1);
	updateStamina(-10)
	return;
}

if (checkBlockAtPosition(x, y, "mercuryliquid") && checkEmptySlots(0) && checkIfItems("bottle", 1)) {
    achievementget("Ohh good this metal is fluid", 0)
    removeBlockAtPosition(x, y, "mercuryliquid");
    deleteItems("bottle", 1)
    updateStamina(-5)
    addItem("mercurybottle", 1);
    return;
}
if (checkBlockAtPosition(x, y, "water") && checkEmptySlots(0) && checkIfItems("bucket", 1)) {
	achievementget("Water!", 0)
	removeBlockAtPosition(x, y, "water");
	deleteItems("bucket", 1)
	updateStamina(-5);
	addItem("bucketwithwater", 1);
	buildBlockAtPositionBefore2(x, y, "grass");
	return;
}
if (checkBlockAtPosition(x, y, "water1") && checkEmptySlots(0) && checkIfItems("bucket", 1)) {
	achievementget("Water!", 0)
	removeBlockAtPosition(x, y, "water1");
	deleteItems("bucket", 1)
	updateStamina(-5);
	addItem("bucketwithwater", 1);
	return;
}
if (checkBlockAtPosition(x, y, "water") && checkEmptySlots(0) && checkIfItems("bowl", 1)) {
  achievementget("Grab some water", 0)
  removeBlockAtPosition(x, y, "water");
  buildBlockAtPositionBefore2(x, y, "grass");
  deleteItems("bowl",1)
  updateStamina(-5)
  addItem("bowl_with_seawater", 1);
  return;
}
if (checkBlockAtPosition(x, y, "water1") && checkEmptySlots(0) && checkIfItems("bowl", 1)) {
  achievementget("Grab some water", 0)
  removeBlockAtPosition(x, y, "water1");
   updateStamina(-5)
  deleteItems("bowl", 1)
  addItem("bowl_with_seawater", 1);
  return;
}
if (checkBlockAtPosition(x, y, "water") && checkEmptySlots(0) && checkIfItems("leafbowl", 1)) {
  achievementget("Grab some water", 0)
  removeBlockAtPosition(x, y, "water");
  buildBlockAtPositionBefore2(x, y, "grass");
  deleteItems("leafbowl", 1)
  updateStamina(-5)
  addItem("leafbowlwithwater", 1);
  return;
}
if (checkBlockAtPosition(x, y, "water1") && checkEmptySlots(0) && checkIfItems("leafbowl", 1)) {
  achievementget("Grab some water", 0)
  removeBlockAtPosition(x, y, "water1");
  updateStamina(-5)
  deleteItems("leafbowl", 1)
  addItem("leafbowlwithwater", 1);
  return;
}
if (checkBlockAtPosition(x, y, "coast") && checkEmptySlots(0) && checkIfItems("leafbowl", 1))  {
	achievementget("Grab some water", 0)
	removeBlockAtPosition(x, y, "coast");
	buildBlockAtPositionBefore2(x, y, "sand");
	deleteItems("leafbowl", 1)
	addItem("leafbowlwithwater", 1);
	return;
}
if (checkBlockAtPosition(x, y, "coast") && checkEmptySlots(0) && checkIfItems("bucket", 1)) {
	achievementget("Grab some water", 0)
	removeBlockAtPosition(x, y, "coast");
buildBlockAtPositionBefore2(x, y, "sand");
deleteItems("bucket", 1)
addItem("bucketwithwater", 1);
	return;
}
if (checkBlockAtPosition(x, y, "coast") && checkEmptySlots(0) && checkIfItems("bowl", 1)) {
	achievementget("Grab some water", 0)
	removeBlockAtPosition(x, y, "coast");
	buildBlockAtPositionBefore2(x, y, "sand");
	deleteItems("bowl", 1)
	addItem("bowl_with_seawater", 1);
	return;
}
if(itemGet!==1){
if (checkBlockAtPosition(x, y, "cavedirt") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
  removeBlockAtPosition(x, y, "cavedirt");
  addItem("cavedirt", 1);
  achievementget(" Cave Robber", 0)
  updateStamina(-2)
  return;
}
if (checkBlockAtPosition(x, y, "forestgrasslayer") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
    removeBlockAtPosition(x, y, "forestgrasslayer");
    addItem("forestgrasslayer", 1);
    achievementget(" Go touch some grass ", 0)
    updateStamina(-2)
    return;
}if (checkBlockAtPosition(x, y, "deadgrassfloor2") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
    removeBlockAtPosition(x, y, "deadgrassfloor2");
    addItem("deadgrassfloor2", 1);
    achievementget(" Go touch some grass ", 0)
    updateStamina(-2)
    return;
}
if (checkBlockAtPosition(x, y, "grasslayer") && checkEmptySlots(0) && ( checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1) ) ) {
  removeBlockAtPosition(x, y, "grasslayer");
  addItem("grasslayer", 1);
  achievementget(" Go touch some grass ", 0)
  updateStamina(-2)
  return;
}
if (checkBlockAtPosition(x, y, "ethergrass") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
	removeBlockAtPosition(x, y, "ethergrass");
	addItem("ethergrass2", 1);
	buildBlockAtPositionBefore(x,y,"dirt")
	updateStamina(-2)
	return;
}
if (checkBlockAtPosition(x, y, "ethersand") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
	removeBlockAtPosition(x, y, "ethersand");
	addItem("ethersand2", 1);
	buildBlockAtPositionBefore(x, y, "ethergrass")
	updateStamina(-2)
	return;
}
if (checkBlockAtPosition(x, y, "ethergrass2") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
	removeBlockAtPosition(x, y, "ethergrass2");
	addItem("ethergrass2", 1);
	updateStamina(-2)
	return;
}

if ((checkBlockAtPosition(x, y, "peat")) && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
	updateStamina(-5)
	 removeBlockAtPosition(x, y, "peat");
	 if (Math.random() < 0.08) {
	buildBlockAtPositionBefore2(x, y, "hematite")
}
if (Math.random() < 0.04) {
	buildBlockAtPositionBefore2(x, y, "peatfloor")
}
		buildBlockAtPositionBefore2(x, y, "dirt");
addItem("peatfloor", 1);
}
if ((checkBlockAtPosition(x, y, "canyonsand")) && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) { 
	updateStamina(-5)
	removeBlockAtPosition(x, y, "canyonsand");
	if (Math.random() < 0.0001) {
		buildBlockAtPositionBefore2(x, y, "goldnugget")
	}else if (Math.random() < 0.001) {
	buildBlockAtPositionBefore2(x, y, "chalcopyrite")
}else if (Math.random() < 0.001) {
	buildBlockAtPositionBefore2(x, y, "uranium")
}
	buildBlockAtPositionBefore2(x, y, "dirt");
	if (Math.random() < 0.04) {
		buildBlockAtPositionBefore2(x, y, "canyonsandlayer")
	}
	addItem("canyonsandlayer", 1);
}
if ((checkBlockAtPosition(x, y, "Hstone")) && checkEmptySlots(0) && ( checkIfItems("iron_shovel", 1))) {
	updateStamina(-5)
	removeBlockAtPosition(x, y, "Hstone");
	if (Math.random() < 0.02) {
		buildBlockAtPositionBefore2(x, y, "hematite")
	}
	buildBlockAtPositionBefore2(x, y, "dirt");
	if (Math.random() < 0.04) {
		buildBlockAtPositionBefore2(x, y, "Hstonelay")
	}
	addItem("Hstonelay", 1);
}
  if ((checkBlockAtPosition(x, y, "swampgrass")) && checkEmptySlots(0) && ( checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1) )) {
  achievementget(" Go touch some grass ", 0)
  removeBlockAtPosition(x, y, "swampgrass");
  updateStamina(-2)
if (Math.random() < 0.08) {
  buildBlockAtPosition(x, y, "itemroad");
}
if (Math.random() < 0.15) {
  buildBlockAtPosition(x, y, "swampgrasslay");
}
  if(Math.random()<0.2){
  buildBlockAtPositionBefore2(x, y, "clayblock");
  }else   if (Math.random() < 0.05) {
    buildBlockAtPositionBefore2(x, y, "gypsum_dirt");
  }else if (Math.random() < 0.02) {
	buildBlockAtPositionBefore2(x, y, "hematite")
} else if (Math.random() < 0.03) {
  buildBlockAtPositionBefore2(x, y, "chalcopyrite")
}else if (Math.random() < 0.09) {
  buildBlockAtPositionBefore2(x, y, "stones")
}else if (Math.random() < 0.09) {
  buildBlockAtPositionBefore2(x, y, "bigrock")
}else if (Math.random() < 0.03) {
  buildBlockAtPositionBefore2(x, y, "salt")
} else if (Math.random() < 0.009) {
  buildBlockAtPositionBefore2(x, y, "potato2")
}else{ if (Math.random() < 0.5){
    buildBlockAtPositionBefore2(x, y, "swampgrasslay");}
}
addItem("swampgrasslay", 1);
buildBlockAtPositionBefore2(x, y, "dirt");
return;
}
  if ((checkBlockAtPosition(x, y, "grass")) && checkEmptySlots(0) && ( checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1) )) {
  achievementget(" Go touch some grass ", 0)
  updateStamina(-2)
if (Math.random() < 0.08) {
  buildBlockAtPosition(x, y, "itemroad");
}
if (Math.random() < 0.15) {
  buildBlockAtPosition(x, y, "grass2");
}
  if(Math.random()<0.2){
  buildBlockAtPositionBefore2(x, y, "clayblock");
  }else   if (Math.random() < 0.05) {
    buildBlockAtPositionBefore2(x, y, "gypsum_dirt");
  }else if (Math.random() < 0.08) {
	buildBlockAtPositionBefore2(x, y, "magnetite")
}else if (Math.random() < 0.005) {
	buildBlockAtPositionBefore2(x, y, "hematite")
}else if (Math.random() < 0.02) {
  buildBlockAtPositionBefore2(x, y, "chalcopyrite")
}else if (Math.random() < 0.09) {
  buildBlockAtPositionBefore2(x, y, "stones")
}else if (Math.random() < 0.09) {
  buildBlockAtPositionBefore2(x, y, "bigrock")
}else if (Math.random() < 0.03) {
  buildBlockAtPositionBefore2(x, y, "salt")
} else if (Math.random() < 0.009) {
  buildBlockAtPositionBefore2(x, y, "potato2")
}else{ if (Math.random() < 0.5){
    buildBlockAtPositionBefore2(x, y, "grasslayer");}
}
removeBlockAtPosition(x, y, "grass");
addItem("grasslayer", 1);
setTimeout(function (){
buildBlockAtPositionBefore2(x, y, "dirt");
},100)
return;
}
if (checkBlockAtPosition(x, y, "forestgrass") && checkEmptySlots(0) && ( checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1) )) {
  updateStamina(-2)
  if (Math.random() < 0.2) {
  buildBlockAtPosition(x, y, "itemroad");
}
  if(Math.random()<0.2){
  buildBlockAtPositionBefore2(x, y, "clayblock");
  }else   if (Math.random() < 0.05) {
    buildBlockAtPositionBefore2(x, y, "gypsum_dirt");
  }else if (Math.random() < 0.08) {
    buildBlockAtPositionBefore2(x, y, "magnetite")
}else if (Math.random() < 0.02) {
  buildBlockAtPositionBefore2(x, y, "chalcopyrite")
}else if (Math.random() < 0.009) {
	buildBlockAtPositionBefore2(x, y, "hematite")
}else if (Math.random() < 0.09) {
  buildBlockAtPositionBefore2(x, y, "stones")
}else if (Math.random() < 0.09) {
  buildBlockAtPositionBefore2(x, y, "bigrock")
}else if (Math.random() < 0.03) {
  buildBlockAtPositionBefore2(x, y, "salt")
}else if (Math.random() < 0.009) {
  buildBlockAtPositionBefore2(x, y, "potato2")
}else{ if (Math.random() < 0.5){
    buildBlockAtPositionBefore2(x, y, "forestgrasslayer");}
}
removeBlockAtPosition(x, y, "forestgrass");
addItem("forestgrasslayer", 1);
setTimeout(function (){
buildBlockAtPositionBefore2(x, y, "dirt");
},100)
return;
}
if (checkBlockAtPosition(x, y, "sand") && checkEmptySlots(0) && ( checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1) )) {
  removeBlockAtPosition(x, y, "sand");
  buildBlockAtPositionBefore2(x, y, "grass");
achievementget("Maybe its time to make glass?", 0)
  addItem("grains_of_sand", 1);
  return;
}
if (checkBlockAtPosition(x, y, "sandblock2") && checkEmptySlots(0) && ( checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1) )) {
  removeBlockAtPosition(x, y, "sandblock2");
  addItem("grains_of_sand", 1);
  return;
}
if (checkBlockAtPosition(x, y, "coast") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
	removeBlockAtPosition(x, y, "coast");
	buildBlockAtPositionBefore2(x, y, "water1");
	if(!checkBlockAtPosition(x, y, "dirt")){
		buildBlockAtPositionBefore2(x, y, "dirt");
	}
	addItem("grains_of_sand", 1);
	return;
}
if (checkBlockAtPosition(x, y, "snowgrass") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
    removeBlockAtPosition(x, y, "snowgrass");
buildBlockAtPositionBefore2(x, y, "grass");
    addItem("snowgrass2", 1);
    return;
}
if (checkBlockAtPosition(x, y, "snowgrass2") && checkEmptySlots(0) && (checkIfItems("stoneshovel", 1) || checkIfItems("iron_shovel", 1))) {
    removeBlockAtPosition(x, y, "snowgrass2");
    addItem("snowgrass2", 1);
    return;
}
}
}
function isPC() {
    const userAgent = navigator.userAgent;
    const isWindows = userAgent.includes("Windows");
    const isMac = userAgent.includes("Macintosh");
    const isLinux = userAgent.includes("Linux") && !userAgent.includes("Android"); 
    return isWindows || isMac || isLinux;
}
if (isPC()) { 
    canvas.addEventListener(
    "click",
    (e) => {
        process_target(e);
    });
} else {
    canvas.addEventListener(
    "touchstart",
    (e) => {
        process_target(e);
    });
}
function returnBlockAtPosition(x, y, type) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  if (floorblocks.includes(type) && options.dontbreakfloor == 1) {
    return false;
  }
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const neighboringChunks = [
    `${chunkX},${chunkY}`, 
  ];
  for (let chunkKey of neighboringChunks) {
    let chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) continue; 
    for (let i = 0; i < chunkBlocks.length; i++) {
      let block = chunkBlocks[i];
      if (block.type !== type) continue;
      let blockGlobalX = block.x + chunkX * blockSize;
      let blockGlobalY = block.y + chunkY * blockSize;
      if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
        return block;
      }
    }
  }
  return false; 
}
function getKeyBlockAtPosition(x, y, type) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  if (floorblocks.includes(type) && options.dontbreakfloor == 1) {
    return false;
  }
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const neighboringChunks = [
    `${chunkX},${chunkY}`, 
  ];
  for (let chunkKey of neighboringChunks) {
    let chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) continue; 
    for (let i = 0; i < chunkBlocks.length; i++) {
      let block = chunkBlocks[i];
      if (block.type !== type) continue;
      let blockGlobalX = block.x + chunkX * blockSize;
      let blockGlobalY = block.y + chunkY * blockSize;
      if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
        return [chunkX,chunkY];
      }
    }
  }
  return false; 
}
function getBlockAtPosition(x, y, type) {
	const globalX = x + offsetX;
	const globalY = y + offsetY;
	if (floorblocks.includes(type) && options.dontbreakfloor == 1) {
		return false;
	}
	const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
	const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
	const chunkX = Math.floor(snappedGlobalX / blockSize);
	const chunkY = Math.floor(snappedGlobalY / blockSize);
	const neighboringChunks = [
		`${chunkX},${chunkY}`,
	];
	for (let chunkKey of neighboringChunks) {
		let chunkBlocks = chunks[chunkKey];
		if (!chunkBlocks) continue;
		for (let i = 0; i < chunkBlocks.length; i++) {
			let block = chunkBlocks[i];
			if (block.type !== type) continue;
			let blockGlobalX = block.x + chunkX * blockSize;
			let blockGlobalY = block.y + chunkY * blockSize;
			if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
				return block;
			}
		}
	}
	return false;
}
function checkBlockAtPositionOnlyWaterDirt(x, y) {
	const globalX = x + offsetX;
	const globalY = y + offsetY;
	const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
	const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
	const chunkX = Math.floor(snappedGlobalX / blockSize);
	const chunkY = Math.floor(snappedGlobalY / blockSize);
	const chunkKey = `${chunkX},${chunkY}`;
	let chunkBlocks = chunks[chunkKey];
	if (!chunkBlocks) return true;
	let forwat1=true
	for (let i = 0; i < chunkBlocks.length; i++) {
		let block = chunkBlocks[i];
		let blockGlobalX = block.x + chunkX * blockSize;
		let blockGlobalY = block.y + chunkY * blockSize;
		if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
			if (block.type) {
if (block.type !== "dirt" && block.type !== "water1" && block.type !== "sandblock2" && block.type !== "sand") {
	forwat1=false;
}
				if (block.type == "water" || (block.type == "water1" && forwat1==true) ) {
					return block.type;
				}
			}
		}
	}
	return false;
}
function checkBlockAtPositionOnlyDirt(x, y) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const chunkKey = `${chunkX},${chunkY}`;
  let chunkBlocks = chunks[chunkKey];
  if (!chunkBlocks) return true;
  for (let i = 0; i < chunkBlocks.length; i++) {
    let block = chunkBlocks[i];
    let blockGlobalX = block.x + chunkX * blockSize;
    let blockGlobalY = block.y + chunkY * blockSize;
    if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
      if (block.type ) {
        if(block.type !== "dirt"){
        return false;
        }
      }
    }
  }
  return true;
}
function checkBlockAtPositionOnlyWaterAndDirt(x, y) {
	const globalX = x + offsetX;
	const globalY = y + offsetY;
	const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
	const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
	const chunkX = Math.floor(snappedGlobalX / blockSize);
	const chunkY = Math.floor(snappedGlobalY / blockSize);
	const chunkKey = `${chunkX},${chunkY}`;
	let chunkBlocks = chunks[chunkKey];
	if (!chunkBlocks) return true;
	for (let i = 0; i < chunkBlocks.length; i++) {
		let block = chunkBlocks[i];
		let blockGlobalX = block.x + chunkX * blockSize;
		let blockGlobalY = block.y + chunkY * blockSize;
		if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
			if (block.type) {
				if (block.type !== "dirt"&& block.type !== "water"&& block.type !== "water1"&&block.type !== "shallowwater" && block.type !== "swampwater"&& block.type !== "etherwater"&& block.type !== "hook") {
					return false;
				}
			}
		}
	}
	return true;
}
function checkBlockAtPosition(x, y, type) {
    const globalX = x + offsetX;
    const globalY = y + offsetY;
if(floorblocks.includes(type) && options.dontbreakfloor==1){
  return false;
}
    const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
    const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
    const chunkX = Math.floor(snappedGlobalX / blockSize);
    const chunkY = Math.floor(snappedGlobalY / blockSize);
    const neighboringChunks = [
        `${chunkX},${chunkY}`,   
    ];
    for (let chunkKey of neighboringChunks) {
        let chunkBlocks = chunks[chunkKey];
        if (!chunkBlocks) continue; 
        for (let i = 0; i < chunkBlocks.length; i++) {
            let block = chunkBlocks[i];
            if (block.type !== type) continue;
            let blockGlobalX = block.x + chunkX * blockSize;
            let blockGlobalY = block.y + chunkY * blockSize;
            if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
                return true;
            }
        }
    }
    return false;  
}
function getPlants(chunkKey2,type) {
let items22=0
    let chunkBlocks = chunks[chunkKey2];
    if (!chunkBlocks) return ; 
    for (let i = 0; i < chunkBlocks.length; i++) {
      let block = chunkBlocks[i];
      if ( ! plantblocks.includes( block.type ) ){ continue;}
      if( plantblocks.includes( type )){
        items22+=1
      }
    }
  return items22; 
}
function checkBlockAtPosition2(x, y, type) {
  const globalX = x + offsetX;
  const globalY = y + offsetY;
  const snappedGlobalX = Math.floor(globalX / blockSize) * blockSize;
  const snappedGlobalY = Math.floor(globalY / blockSize) * blockSize;
  const chunkX = Math.floor(snappedGlobalX / blockSize);
  const chunkY = Math.floor(snappedGlobalY / blockSize);
  const neighboringChunks = [
        `${chunkX},${chunkY}`, 
    ];
  for (let chunkKey of neighboringChunks) {
    let chunkBlocks = chunks[chunkKey];
    if (!chunkBlocks) continue; 
    for (let i = 0; i < chunkBlocks.length; i++) {
      let block = chunkBlocks[i];
      if (block.type !== type) continue;
      let blockGlobalX = block.x + chunkX * blockSize;
      let blockGlobalY = block.y + chunkY * blockSize;
      if (blockGlobalX === snappedGlobalX && blockGlobalY === snappedGlobalY) {
        return true;
      }
    }
  }
  return false; 
}
function checkEmptySlots(number) {
  const emptySlots = slots - yourItems.length;
  if (emptySlots <= number) {
    if (langPlactive == 1) {
    showTextInCanvas("'brak miejsca ")
} else {
    showTextInCanvas("'lack of space'")
}
    blockedsound()
    return false;
  }
  return true;
}
async function showsaves() {
    const saveNames2 = [];
    try {
        const db = await initDB(); 
        const transaction = db.transaction("gameStates", "readonly"); 
        const store = transaction.objectStore("gameStates");
        const allSavesRequest = store.getAll();
        allSavesRequest.onsuccess = function (event) {
            const gameStates = event.target.result;
            gameStates.forEach(gameState => {
                const slot = gameState.slot;
                if (slot !== undefined) {
                    saveNames2.push(slot); 
                }
            });
            document.getElementById('saveNamesList').innerText = saveNames.join(', ');
            document.getElementById('saveNamesModal').style.display = 'flex';
        };
        allSavesRequest.onerror = function (error) {
            console.log("Failed to fetch saved games from IndexedDB", error);
        };
    } catch (error) {
        customAlert("Error reading save data: " + error);
    }
}
function closeSaveNamesModal() {
    document.getElementById('saveNamesModal').style.display = 'none';
}
let inventoryOpen = false;
document.addEventListener('keydown', function(event) {
	const tag = event.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
    if (event.key === 'x' || event.key === 'X') { 
      if(activeChest){
closeInventory();
      }else{
        if (inventoryOpen) {
            closeInventory();
            inventoryOpen = false;
            advanced.style.display ="none"
        } else {
            openInventory();
            inventoryOpen = true;
        }
    }}
    if (event.key === 'q' || event.key === 'Q') {
     	const button = document.getElementById('quickbtn');
     	if(button.style.display=="none") return;
     	button.click();
    }
    if (event.key === 'z' || event.key === 'Z') {
   	const button = document.getElementById('quickbtn2');
   	if(button.style.display=="none") return;
   	button.click();
   }
    if (event.key === 'e' || event.key === 'E') {
   	const button = document.getElementById('shootbtn');
   	if(button.style.display=="none") return;
   	button.click();
   }
});
    var achievements = [];
    function achievementget(text, rank){ let cangive=1; for (var i = 0; i < achievements.length; i++) { if(achievements[i][1]==text){
        cangive=0;}
    } if(cangive==1){
    document.getElementById("achievement").style.display="block";document.getElementById("achievement").style.animation ="easeUp 2s";document.getElementById("achievementTEXT").innerHTML=text;
        if(rank==2){document.getElementById("achievementimg").style.backgroundImage="url('./platinum.gif')";}else if(rank){document.getElementById("achievementimg").style.backgroundImage="url('./diamond.gif')";}else{document.getElementById("achievementimg").style.backgroundImage="url('./coin.gif')";}
        setTimeout(function() {document.getElementById("achievement").style.animation = "easeUp2 2s"}, 4000)
        setTimeout(function (){document.getElementById("achievement").style.display="none"},5000)
       if(rank==2){achievements.push([2,text]);}else if(rank){achievements.push([1,text]);}else{achievements.push([0,text]);}
    }}
function openAchievmentsMenu(){
document.getElementById("allachievements").style.display="block";
document.getElementById("allachievements2").innerHTML=""
for (var i = 0; i < achievements.length; i++) {
let d=`
<div   
style="width:100%; height:30px; background:rgb(20,20,20); margin-top:5px;"
>
<pre style="margin-left:35px; margin-top: 0; position : absolute; color:white; width: calc(100% - 30px); white-space: pre-wrap; ">${achievements[i][1]}</pre>
<div style="width:30px; height:100%; background: rgb(50,50,50); background-size:100% 100%; image-rendering: pixelated;"><div style="width:30px; height:100%; background-image:`
if(achievements[i][0]==2){ d+= "url('./platinum.gif'); "; }else if(achievements[i][0]){ d+= "url('./diamond.gif'); "; }else{ d+= "url('./coin.gif');"; }
d+=`background-size:100% 100%; image-rendering: pixelated;" ></div></div>
</div>`;
document.getElementById("allachievements2").innerHTML+=d
}
}
document.getElementById('QuickButton').addEventListener('change', function() {
	const selectedOption = this.options[this.selectedIndex];
	const renderMode = selectedOption.value;
	options.quickbutton = parseInt(renderMode)
});
  document.getElementById('renderMode').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const renderMode = selectedOption.value;
    console.log(' renderer:', selectedOption.getAttribute('data-renderer'));
    options.rendermode=parseInt(renderMode)
  });
var curseofgos=0;
function exportData() {
    var gameState = {
        information :" Don't edit game file this is cheating !",curseofgos,offsetX,offsetY,increasing,isRaining,nightpower,slots,VISIBLEIDS,AVAILABLE_IDS,cannotmove,options: JSON.stringify(options),yourItemsDurabilities: JSON.stringify(yourItemsDurabilities),activatedCheats,currentHP,currentStamina,yourItems: JSON.stringify(yourItems),
        generateCave,inabyss,isunderwater,isinhouse,isinhouse2,inhell,
        overworldChunks: JSON.stringify(overworldChunks),
        hellchunks: JSON.stringify(hellchunks),
        houseChunks: JSON.stringify(housechunks),
        caveChunks: JSON.stringify(caveChunks),
        house2chunks: JSON.stringify(house2chunks),
        seachunks: JSON.stringify(seachunks),
        abysschunks: JSON.stringify(abysschunks),
        chunks: JSON.stringify(chunks),
        renderedEnemies: RENDEREDENEMIES2,
        oxygen,
        dayscount: surviveddays,
        spawnX: player.spawnX,
        spawnY: player.spawnY,
        dataChunksStructures: dataChunksStructures,
        savedinworld: player.savedinworld,
        achievements1: achievements,
    };
    if(APKversion==true){
        Toast("Saving Game data .. ")
    }
gameState=encodeData(JSON.stringify(gameState),2)
var dataok="pfWLDataV(1.5.8)"+gameState
    function downloadData() {
        if(APKversion==false){
    const blob = new Blob([JSON.stringify(dataok)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `world${Math.random()*200}.txt`;
    a.click();
    URL.revokeObjectURL(url);
        }else{
            InstallText(JSON.stringify(dataok),`world${Math.random()*200}.pfwld`)
        }
    }
    downloadData()
}
function encodeData(data, key) {
    let encoded = '';
    for (let i = 0; i < data.length; i++) {
        encoded += String.fromCharCode(data.charCodeAt(i) ^ key);
    }
    return encoded;
}
function decodeData(data, key) {
    return encodeData(data, key);
}
function exportData2() {
if (APKversion == true) {
    Toast("Exporting world data .. ")
}
    var codedata = {
        curseofgos, offsetX, offsetY, increasing, isRaining, nightpower, slots, VISIBLEIDS, AVAILABLE_IDS, cannotmove,
        options: JSON.stringify(options),
        yourItemsDurabilities: JSON.stringify(yourItemsDurabilities),
        activatedCheats, currentHP, currentStamina,
        yourItems: JSON.stringify(yourItems),
        renderedEnemies: RENDEREDENEMIES2,
        oxygen,
        dayscount: surviveddays,
        spawnX: player.spawnX,
        spawnY: player.spawnY,
        dataChunksStructures: dataChunksStructures,
        savedinworld: player.savedinworld,
        border: border,
	currentHunger: currentHunger,
	currentThirst: currentThirst,
	storelastdimension,
	stats:JSON.stringify(stats),
        achievements1: achievements,
        etherEventJson: {  etherEventActive:etherEventActive, currentWave:currentWave,  maxWaves:maxWaves , waveEnemies:waveEnemies,  etherChunkKey:etherChunkKey, etherBlockIndex:etherBlockIndex, waveInProgress:waveInProgress  },
    };
    var gameState = {
        generateCave, inabyss, isunderwater, isinhouse, isinhouse2, inhell,inether, generateCaveForEther,
        caveChunks2: JSON.stringify(caveChunks2),
        overworldChunks: JSON.stringify(overworldChunks),
        hellchunks: JSON.stringify(hellchunks),
        houseChunks: JSON.stringify(housechunks),
        caveChunks: JSON.stringify(caveChunks),
        house2chunks: JSON.stringify(house2chunks),
        chestsData: JSON.stringify(chestsData),
        seachunks: JSON.stringify(seachunks),
        abysschunks: JSON.stringify(abysschunks),
        chunks: JSON.stringify(chunks),
        etherchunks : JSON.stringify(etherchunks),
        seed
    };
    var World = JSON.stringify(gameState);
    var Infor = encodeData(JSON.stringify(codedata), 1);
    var dataok = [`1.5.8`, Infor, World]; 
    function downloadData() {
        if (!APKversion) {
            const blob = new Blob([JSON.stringify(dataok)], { type: 'application/json' }); 
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
const currentDate = new Date();
const day = String(currentDate.getDate()).padStart(2, '0');
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const year = currentDate.getFullYear();
const hours = String(currentDate.getHours()).padStart(2, '0');
const minutes = String(currentDate.getMinutes()).padStart(2, '0');
const seconds = String(currentDate.getSeconds()).padStart(2, '0');
const fileName = `worldsave(${day}-${month}-${year})(${hours}-${minutes}-${seconds}).pfd`;
            a.download = fileName
            a.click();
            URL.revokeObjectURL(url);
        } else {
const currentDate = new Date();
const day = String(currentDate.getDate()).padStart(2, '0');
const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
const year = currentDate.getFullYear();
const hours = String(currentDate.getHours()).padStart(2, '0');
const minutes = String(currentDate.getMinutes()).padStart(2, '0');
const seconds = String(currentDate.getSeconds()).padStart(2, '0');
const fileName = `worldsave(${day}-${month}-${year})(${hours}-${minutes}-${seconds}).pfd`;
InstallText(JSON.stringify(dataok), fileName);
        }
    }
    downloadData();
}
function loadData22(event) {
if (APKversion == true) {
    Toast("Loading primoria ferox data .. ")
}
    splashrandomize()
  updateTextMenuLoading()
  document.getElementById('loadingMenu').style.display = 'flex';
  document.getElementById('loadingMenu').innerHTML=""
  splashrandomize()
updateTextMenuLoading()
  abletostart = 1;
  setTimeout(function() {
    document.getElementById('MainMenu').style.display = 'none';
    document.getElementById('loadingMenu').style.display = 'none';
    if(paused==1){document.getElementById('advanced').style.display='block';}
    isUpdating = 0; update(); paused = 1; setTimeout(function(){paused=0; update() },1000);
  }, 2000);
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData) || parsedData[0] !== "1.5.8") {
            customAlert("Err: outdated savefile or not a pf 1.5.8 save file !");
            hideLoadingScreen();
            return;
        }
        const Infor = parsedData[1];
        const worldDataPart = parsedData[2];
        try {
            const decodedGameState = decodeData(Infor,1);
            var gameState = JSON.parse(decodedGameState);
            const worldData = JSON.parse(worldDataPart);
  gameState = Object.assign({}, gameState, worldData);
         updfixbug = 1
player.spawnY=0;
player.spawnX=0;
player.savedinworld="";
if (gameState.seed) {
  seed = gameState.seed
} else {
  seed = Math.floor(10 ** 15 + Math.random() * 9 * 10 ** 15).toString();
}
 
 
stats = { lv: 0 }
if (gameState.stats) {
	let stateShitOrSomething = JSON.parse(gameState.stats)
	if (stateShitOrSomething) {
		for (let key in stateShitOrSomething) {
			stats[key] = stateShitOrSomething[key];
		}
		updateStats()
	}
}
updateStats()
if (gameState.chestsData) {
  chestsData = JSON.parse(gameState.chestsData)
}
if (gameState.etherEventJson) {
	etherEventActive = gameState.etherEventJson['etherEventActive']
	currentWave = gameState.etherEventJson['currentWave']
	maxWaves = gameState.etherEventJson['maxWaves']
	waveEnemies = gameState.etherEventJson['waveEnemies']
	etherChunkKey = gameState.etherEventJson['etherChunkKey']
	etherBlockIndex = gameState.etherEventJson['etherBlockIndex']
	waveInProgress = gameState.etherEventJson['waveInProgress']
} else {
	etherEventActive = false
	waveInProgress = false;
	currentWave = 0;
	etherBlockIndex = null;
	etherChunkKey = null
	waveEnemies = []
}
if (gameState.currentHunger) {
	currentHunger =  gameState.currentHunger
}
if (gameState.currentThirst) {
	currentThirst = gameState.currentThirst
}
updateHunger(0);
updateThirst(0);
        if (gameState.border) {
        border=gameState.border
        }
        if (gameState.AVAILABLE_IDS) {
          AVAILABLE_IDS = gameState.AVAILABLE_IDS
        }
        if (gameState.VISIBLEIDS) {
          VISIBLEIDS = gameState.VISIBLEIDS
        }
if (gameState.achievements1 !== null && gameState.achievements1) {
    achievements = (gameState.achievements1);
} else {
    achievements = []
}
        inhell = 0; isinhouse = 0; isinhouse2 = 0; inabyss = 0; isunderwater = 0; inether = 0;
        curseofgos = gameState.curseofgos;
        offsetX = gameState.offsetX;
        offsetY = gameState.offsetY;
        increasing = gameState.increasing;
        isRaining = gameState.isRaining;
        nightpower = gameState.nightpower;
        slots = gameState.slots;
        cannotmove = gameState.cannotmove;
        options = JSON.parse(gameState.options);
        activatedCheats = gameState.activatedCheats;
        yourItemsDurabilities = JSON.parse(gameState.yourItemsDurabilities),
          currentHP = gameState.currentHP;
        currentStamina = gameState.currentStamina;
        generateCave = gameState.generateCave;
        yourItems = JSON.parse(gameState.yourItems);
        overworldChunks = JSON.parse(gameState.overworldChunks);
        housechunks = JSON.parse(gameState.houseChunks);
        caveChunks = JSON.parse(gameState.caveChunks);
        seachunks = JSON.parse(gameState.seachunks);
        abysschunks = JSON.parse(gameState.abysschunks);
        if (gameState.etherchunks) {
	etherchunks = JSON.parse(gameState.etherchunks);
}
        if (gameState.savedinworld) {
        player.savedinworld = (gameState.savedinworld);
        }
        if (gameState.hellchunks) {
          hellchunks = JSON.parse(gameState.hellchunks);
        }
        if (gameState.hellchunks) {
            hellchunks = JSON.parse(gameState.hellchunks);
        }
        if (gameState.house2chunks) {
            house2chunks = JSON.parse(gameState.house2chunks);
        }
        if (gameState.inhell) {
          inhell = gameState.inhell
        }
        if (gameState.isinhouse2) {
    isinhouse2 = gameState.isinhouse2
}
if (gameState.dayscount) {
    surviveddays = gameState.dayscount
}
 if (gameState.spawnX) {
            player.spawnX = gameState.spawnX
            player.spawnY = gameState.spawnY
        }
        if (typeof gameState.renderedEnemies === "string") {
          renderedEnemies = JSON.parse(gameState.renderedEnemies);
        } else {
          renderedEnemies = (gameState.renderedEnemies);
        }
        oxygen = gameState.oxygen;
        inabyss = gameState.inabyss;
        inether = gameState.inether;
        isunderwater = gameState.isunderwater;
        isinhouse = gameState.isinhouse;
        chunks = JSON.parse(gameState.chunks);
if (isinhouse2 == 1) {
    chunks = house2chunks;
}else if (inabyss == 1) {
	chunks = abysschunks;
}else if (inether == 1) {
	chunks = etherchunks;
}else if (isunderwater == 1) {
          chunks = seachunks;
        } else if (generateCave == 1) {
          chunks = caveChunks;
        } else if (isinhouse == 1) {
          chunks = housechunks;
        } else if (inhell == 1) {
          chunks = hellchunks;
        } else {
        }
        updateInventory();
        updateCrafting();
        setTimeout(() => {
          hideLoadingScreen(); 
          playMusic(); 
        }, 500); 
        setTimeout(function() {
          updfixbug = 0
        }, 1000)
document.querySelectorAll('button[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
document.querySelectorAll('div[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
        playMusic();
        } catch (error) {
            console.error("Error loading data: ", error);
            customAlert("Error loading data: " + error.message);
            hideLoadingScreen();
        }
    };
    reader.readAsText(file);
}
async function removeSaveFile(slot) {
    let slotHTML = `<span style="color:red;">${slot || "-"}</span>`;
    const confirmations = [
        `Are you sure to delete this game state on this slot ?`,
        `Are you really sure, bro? `,
        `Are you sure to delete this? You will not be able to undo this. `,
        `Jesteś pewien usunąć ten slot: ${slotHTML}?`,
        `Bist du sicher, diesen Slot: ${slotHTML} zu löschen? `,
        `Êtes-vous sûr de supprimer ce slot: ${slotHTML}? `,
        `¿Estás seguro de eliminar este slot: ${slotHTML}? `,
        `Sei sicuro di eliminare questo slot: ${slotHTML}? `,
        `Você tem certeza de excluir este slot: ${slotHTML}? `,
        `このスロット : ${slotHTML} を削除してもよろしいですか？ `,
        `<span style="color:yellow"> THIS IS THE LAST MESSAGE. ARE YOU SURE TO REMOVE THIS SLOT: ${slotHTML}</span>`
    ];
    const isCodeConfirmed = await confirmWithCode();
    if (!isCodeConfirmed) {
        return;
    }
    let confirmed = true;
    for (let i = 0; i < confirmations.length; i++) {
        confirmed = await new Promise((resolve) => {
            showModal(confirmations[i], function() {
                resolve(true);
            }, function() {
                resolve(false);
            });
        });
        if (!confirmed) {
            customAlert("Deletion cancelled.");
            return; 
        }
    }
    try {
        const db = await initDB();
        const transaction = db.transaction("gameStates", "readwrite");
        const store = transaction.objectStore("gameStates");
        const request = store.delete(slot);
        request.onsuccess = function() {
            customAlert("Save file in slot " + slot + " deleted successfully.");
            upadtegameslots()
        };
        request.onerror = function(event) {
            customAlert("Failed to delete save file: " + event.target.error.message);
        };
    } catch (error) {
        customAlert("Error while deleting save file: " + error);
    }
}
let currentConfirmationCode = "";
async function confirmWithCode() {
    currentConfirmationCode = generateRandomCode(6);
    return new Promise((resolve) => {
        document.getElementById("confirmationCode").textContent = currentConfirmationCode;
        document.getElementById("confirmationModal").style.display = "flex";
        document.getElementById("confirmCodeButton").onclick = function() {
            const userInput = document.getElementById("confirmationInput").value;
            if (userInput === currentConfirmationCode) {
                closeConfirmationModal();
                resolve(true);
            } else {
                customAlert("Incorrect code. Please try again.");
                resolve(false);
            }
        };
        document.getElementById("cancelCodeButton").onclick = function() {
            closeConfirmationModal();
            resolve(false);
        };
    });
}
function closeConfirmationModal() {
    document.getElementById("confirmationModal").style.display = "none";
}
function generateRandomCode(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
let activatedCheats = 0
let currentCheatCode = "";
function openCheatModal() {
    if (activatedCheats === 1) return;
    currentCheatCode = generateRandomCode(6);
    document.getElementById("cheatCode").textContent = currentCheatCode;
    document.getElementById("cheatModal").style.display = "flex";
}
function closeCheatModal() {
    document.getElementById("cheatModal").style.display = "none";
}
function generateRandomCode(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
function verifyCheatCode() {
    const userCode = document.getElementById("cheatInput").value;
    if (userCode === currentCheatCode) {
        activatedCheats = 1;
        localStorage.setItem('activatedCheats', '1');
        activateCheatButton();
        closeCheatModal();
    } else {
    }
}
function activateCheatButton() {
    const cheatButton = document.getElementById("cheatButton");
    cheatButton.style.opacity = "1.0";
    cheatButton.disabled = true; 
}
function toggleAndStyleButton(button) {
    const varName = button.getAttribute('data-var');
    if(varName!=="creativemode"&&varName!=="nightvision" &&varName!=="noclip" ){
    options[varName] = options[varName] === 0 ? 1 : 0;
    updateButtonStyle(button, options[varName]);
    }else{
      if(activatedCheats==1){
        options[varName] = options[varName] === 0 ? 1 : 0;
updateButtonStyle(button, options[varName]);
      }else{
        button.style.backgroundColor = "gray"
      }
}
}
function updateButtonStyle(button, value) {
  const varName = button.getAttribute('data-var');
  if(varName!=="creativemode"&&varName!=="nightvision" &&varName!=="noclip" ){
    button.style.backgroundColor = (value === 0||value === undefined) ? "darkred" : "green";
  }else{
    button.style.backgroundColor = value === 0 ? "grey" : "green";
  }
}
function toggleAdvanced() {
    const advanced = document.getElementById("advanced");
    advanced.style.display = (advanced.style.display === "none" || advanced.style.display === "") ? "flex" : "none";
}
document.addEventListener("DOMContentLoaded", () => {
    if (activatedCheats === 1) {
        activateCheatButton();
    }
});
function toggleadvanced() {
  const advanced = document.getElementById("advanced");
  advanced.style.display = (advanced.style.display === "none" || advanced.style.display === "") ? "flex" : "none";
}
var langEN = {
	items:{
	"wolfram":"tungsten",
	"wolframaxe":"tungsten axe",
	"sing":"sign",
	"stonesing":"stonesign", 
	}
}
var langPl = {
    items:{
chest: "Skrzynia",
    hellsapling: "Sadzonka piekieł",
    abysssapling: "Sadzonka otchłani",
    hell_boomerang: "Piekielny boomerang",
    hallucinate: "haludzyngi >:] ",
    a1bed: "Łóżko 1",
    a2bed: "Łóżko 2",
    can: "Puszka",
    carpet: "Dywan",
    polishedfloor: "Polerowana podłoga",
    road2: "Droga 2",
    candle: "Świeca",
    bed: "Łóżko",
    draco_boomerang: "Drako boomerang",
    helllog: "Piekielny pień",
    hellwood: "Piekielne drewno",
    abyssgel: "Żel otchłani",
    abysswood: "Drewno otchłani",
    abysslog: "Pień otchłani",
    hellgrass: "Piekielna trawa",
    hellplank: "Piekielna deska",
    abyssgrass: "Trawa otchłani",
    abyssplank: "Deska otchłani",
    warporb: "Kula teleportacyjna",
    titanium_boomerang: "Tytanowy boomerang",
    good_boomerang: "Dobry boomerang",
    boomerang: "Boomerang",
    dracobuff: "Draco buff",
    briarempty: "Dzika róża",
    iron_shovel: "Żelazna łopata",
    algae_item: "wodorosty",
    goldnugget: "Złoty nugget",
    leafbowl: "Miseczka z liści",
    leafbowlwithwater: "Miseczka z liści z wodą",
    leafbowlwithcleanwater: "Miseczka z liści z czystą wodą",
    statue2: "Statua 2",
    statue1: "Statua 1",
    blower: "Dmuchawa",
    kiln: "Piec",
    hill_climber: "Wspinacz wzgórz",
    hill1: "Wzgórze",
    climbhill: "Wejście Na Wzgórze",
    blueflower2: "Niebieski kwiat 2",
    redflower2: "Czerwony kwiat 2",
    deepblues: "kwiatek :)",
    lightwhite: "kozi kwaitek",
    grassdeco: " trawa",
    extinguished_campfire: "Wygaszone ognisko",
    cactusempty: "Kaktus",
    deadgrass: "Martwa trawa",
    godwand: "Różdżka boga",
    itemroad: "Droga",
    grass2: "Trawa 2",
    statueofgods: "Statua bogów",
    leaves: "Liście",
    deadgrassfloor2: "Podłoga z martwej trawy",
    healthregenerator: "Regenerator zdrowia",
    staminaregenerator: "Regenerator staminy",
    myosotis: "\nNiezapominajka",
    redanvil: "Czerwone kowadło",
    magicwand: "magiczna Różdżka",
    greenwand: "Zielona różdżka",
    magicwandofsharp: "Różdżka cięcia",
    hyperblastwand: "Różdżka hiperbłysków",
    forestgrasslayer: "Warstwa leśnej trawy",
    broom: "Miotła",
    blush: "Róż",
    curedgrasslayer:"Wyleczona Warstwa trawy",
    forestleaf: "Liść leśny",
    gravestone: "Nagrobek",
    moltensword: "Miecz Magmy",
    hellsword: "Piekielny miecz",
    knive: "Nóż",
    hellknive: "Piekielny nóż",
    aquagem: "Akwamaryna",
    darkore: "Ruda Ciemnoty",
    hellessence: "Piekielna esencja",
    celestialfragment: "Nieziemski Fragment",
    celestialspawner: "Przywołaj Niebiański ",
    roadfloor: "Droga",
    lamptorch: "Zwykła Lampa",
    granite: "Granit",
    basalt: "Bazalt",
    hellgem: "Piekielny klejnot",
    hellwall2: "Piekielna ściana",
    titaniumbuff:  "tytanowy buff",
    osmiumbuff:  "osm buff",
    hellbuff: "Piekielny buff",
    table: "Stół",
    compass: "Kompas",
    defensering: "Pierścień obrony",
    sing: "Tabliczka",
    stonesing: "Kamienna tabliczka",
    deepgodspawner: "Morska Bestia",
    itemfence: "Ogrodzenie",
    emptyblackberry: "Jeżyny",
    brickfloor2: "Podłoga z cegieł",
    godstatue: "Statua boga",
    icemedalion: "Lodowy medalion",
    speedmedalion: "Medalion prędkości",
    healmedalion: "Medalion uzdrawiający",
    magiclanter: "Magiczna latarnia",
    magicgem: "Magiczny klejnot",
    desertcore: "Rdzeń pustyni",
    geyser: "Gejzer",
    abysscore: "Rdzeń otchłani",
    icesword: "Lodowy miecz",
    frozeningot: "Zamarznięty ingot",
    snowflower: "Śnieżny kwiat",
    truegodsword: "Prawdziwy miecz boga",
    thistleseeds: "Nasiona ostu",
    gel: "Żel",
    abyssgem: "Klejnot otchłani",
    gelblock: "Blok żelu",
    crystal1: "Kryształ 1",
    crystal2: "Kryształ 2",
    crystal3: "Kryształ 3",
    universeechoes: "Echa wszechświata",
    trueuniversesword: "Prawdziwy miecz wszechświata",
    trueuniverseorb: "Prawdziwa kula wszechświata",
    seashiny: "Morskie klejnoty",
    aquacore: "Morski Rdzeń",
    aquagodshell: "Muszla boga wody",
    universesword: "Miecz wszechświata",
    universefragment: "Fragment wszechświata",
    shell: "Muszla",
    corruptioncore: "Rdzeń zepsucia",
    coral1: "Korala 1",
    coral2: "Korala 2",
    aquawall: "Ściana wody",
    echofabric: "Tkanina echa",
    echorocks: "Kamienie echa",
    aquaspear: "Wodna włócznia",
    blossomblock: "Blok kwiatowy",
    glowblossom: "Świecący kwiat",
    aquaore: "Ruda wody",
    corruptedchalcopyrite: "Zepsuty chalkopiryt",
    fleshvolume: "Objętość mięsa",
    fleshdumbass: "Zespawnuj Mięso",
    fleshsaber: "Miecz mięsa",
    coloressence: "Esencja kolorów",
    rainbow: "Miecz Tęcza",
    iron_mace: "Żelazny Buzdygan",
    nightgem: "Nocny klejnot",
    nightsword: "Nocny miecz",
    goodmace: "Dobry Buzdygan",
    goodsword: "Dobry miecz",
    thundersword: "Miecz Zeusa",
    evileye: "Oko Grozy",
    evilsummoner: "Przywołaj Zło",
    soulofsharp: "Dusza ostrości",
    aquaticevent: "Wydarzenie wodne",
    sharpsaw: "Ostra piła",
    sharpmace: "Ostra maczuga",
    dandelionseeds: "Nasiona mniszka",
    candy: "Cukierek",
    energybowl: "Miska energii",
    healthbowl: "Miska zdrowia",
    iron_sword: "Żelazny miecz",
    hypersword: "Hiper miecz",
    toxicsword:"Toksyczny Miecz",
    spikegod_essence: "Esencja boga kolców",
    voltary_essence: "Esencja voltary'ego",
    unknown: "Nieznana Statua",
    violetfloor: "Fioletowa podłoga",
    black_elderberry_tree: "Krzew Bzu",
    house_wall: "Ściana domu",
    gypsumhouse: "Dom gipsowy",
    gypsumdoor: "Drzwi gipsowe",
    gypsumroof: "Dach gipsowy",
    heavybag: "Ciężka torba",
    houseroof: "Dach domu",
    ryeroof: "Dach żyta",
    poppy: "Mak",
    brickhouse: "Ceglany dom",
    rockhouse: "Kamienny dom",
    door: "Drzwi",
    mycelium: "Grzybnia",
    rye_seeds: "Nasiona żyta",
    yeast: "Drożdże",
    beer: " Piwo ",
    bread_sample: "Forma chleba",
    black_elderberries: "CzarnyBez",
    fermentator: "Fermentor",
    flour: "Mąka",
    sugar: "Cukier",
    waterdrop: "Kropla wody",
    smoother: "Wygładzacz",
    bread: "Chleb",
    smooth_stone: "Gładki kamień",
    trout: "Pstrąg",
    gypsumfloor: "Podłoga gipsowa",
    cave_wall: "Ściana jaskini",
    rock: "Kamień",
    cooked_trout: "Usmażony pstrąg",
    rye: "Żyto",
    honey_mushrooms: "Opieńki",
    cinnabar: "Cynober",
    mercury: "Rtęć",
    pipette: "Pipeta",
    ilmenite: "Ilmenit/Tytan",
    salmon: "Łosoś",
    cooked_salmon: "Usmażony łosoś",
    fishing_rod: "Wędka",
    opal: "Opal ",
    opalblock: "Blok opalu ",
    emeraldblock: "Blok szmaragdu",
    sapphireblock: "Blok szafiru",
    rubyblock: "Blok rubinu",
    sapphirefloor: "Podłoga szafiru",
    rubyfloor: "Podłoga rubinu",
    emeraldfloor: "Podłoga szmaragdu",
    emerald: "Szmaragd ",
    glass: "Szkło",
    pyrite: "Piryt",
    pickaxe: "Kilof",
    cavemakingpickaxe: "Kilof",
    ruby: "Rubin",
    sapphire: "Szafir",
    bed1: "Łóżko 1",
    copper_sword:"Miedziany Miecz",
    cactus_fruit: "Owoc kaktusa",
    alchemy_table: "Stół alchemiczny",
    gypsum: "Gips",
    wood_manipulator: "Manipulator drewna",
    sulfur: "Siarka",
    grains_of_sand: "Ziarna piasku",
    planks: "Deski",
    planks_floor: "Podłoga z desek",
    gypsum_dirt: "Gipsowa ziemia",
    bone: "Kość",
    bone_sword: "Miecz z kości",
    bowl: "Miska",
    bowl_with_seawater: "Miska z wodą morską",
    bowl_with_water: "Miska z wodą",
    sandblock2: "Blok piasku ",
    gypsumblock: "Blok gipsowy",
    copper: "Miedź",
    chalcopyrite: "Chalkopiryt",
    bunnmeat: "Mięso królika",
    cooked_bunnmeat: "Usmażone mięso królika",
    iron: "Żelazo",
    iron_bar: "Żelazny stop",
    copper_bar: "Miedziany stop",
    extrabag: "Dodatkowa torba",
    fiber_fabric: "Tkanina",
    magnetite_powder: "Proszek magnetytu",
    coal: "Węgiel",
    iron_spear: "Żelazna włócznia",
    copper_spear: "Miedziana włócznia",
    anvil: "Kowadło",
    stonedirt: "Ziemia kamienista",
    larger_bag: "Większa torba",
    lit_furnace: "Rozpalony piec",
    furnace: "Piec",
    fiber: "Włókno",
    hand_torch: "Ręczna pochodnia",
    clayblock1: "Blok gliny",
    long_spear: "Długa włócznia",
    raw_sharkmeat: "Surowe mięso rekina",
    cooked_sharkmeat: "Usmażone mięso rekina",
    decrafter: "Defragmentator nwm?",
    sapling: "Sadzonka",
    grasslayer: "trawa",
    stoneshovel: "Kamienna łopata",
    clay: "Glina",
    clayblock: "Blok gliny",
    brick: "Cegła",
    brickwall: "Ceglana ściana",
    brickfloor: "Ceglana podłoga",
    ash: "Popiół",
    ashfloor: "Podłoga z popiołu",
    log_floor: "Podłoga z pnia",
    nettle: "Pokrzywa",
    bigrock: "Duży kamień",
    stone: "Kamień",
    sharpstone: "Ostry kamień",
    stick: "Patyk",
    longstick: "Długi patyk",
    woodboard: "Deska drewniana",
    treebark: "Kora drzewa",
    yew: "Cis",
    "briar-fruit": "Dzika Róża",
    kite: "Czubajka Kania",
    resin: "Żywica",
    ignited_fiber: "Rozpalone włókno",
    handdrill_kit: "Zestaw wiertarki ręcznej",
    fireroll: "Rolka ognia",
    cordage: "Sznur",
    dowel: "Kołek",
    log: "Pień",
    stone_axe: "Kamienna siekiera",
    stone_scyte: "Kamienna kosa",
    fireplow: "Pług ognia",
    birch_powder: "Proszek brzozowy",
    blackberry_fruit: "Owoc jeżyny",
    stone_floor: "Kamienna podłoga",
    stone_wall: "Kamienna ściana",
    fiber_floor: "Podłoga z włókna",
    log_wall: "Ściana z pnia",
    daffodil: "Żonkil",
    flax: "Len",
    fern: "Paprotka",
    trueuniversespawner: "PrawdziwyWszechświat",
    thistle: "Oset",
    toadstool: "Muchomor",
    violet: "Fiołek",
    yellow: "Żółty",
    dandelion: "Mniszek",
    torch: "Pochodnia",
    campfire: "Ognisko",
    ignited_fiber: "Rozpalone włókno",
    pointed_stick: "Spiczasty patyk",
    thistleroot: "Korzeń ostu",
    "blackberry-fruit":"Jeżyna",
    cooked_thistleroot: "Usmażony korzeń ostu",
    titaniumsword: "Tytanowy miecz",
    titaniummace: "Tytanowy Buzdygan",
    salt: "Sól",
    titaniumbar: "Tytan",
    osmiumbar:"Osm",
    osmiumsword:"Miecz z osmytu",
    titaniumdioxide: "Dwutlenek tytanu",
    coconut:"Kokos ",
    palmlog:"Drewno Palmowe",
    palmsapling:"Sadzonka Palmy",
    stonesing: " Kamienna Tabliczka",
    snowgrass2: "Śnieg",
    snowgrass: "Śnieg",
    bow: "łuk",
    arrows: "strzały", 
    powerfullarrows: "potężne strzały",
    goodarrows: "potężne strzały",
    hellbow: "piekielny łuk",
    quantumbow: " łuk kwantowy",
    moltenbow: "stopiony łuk",
    rainbowbow: "tęczowy łuk",
    nightbow: " łuk nocy ",
    darkbow: " łuk ciemnoty ",
    plantmaker:" Stuł Botaniczny",
    bottle:" Butelka",
    cauldron:" Kocioł",
    fountain:" Fontanna",
    nametag:" Znacznik",
    carrot:" Marchewka",
    shell1:" Muszla",shell2:" Muszla",shell3:" Muszla",
    wildcarrot1:" Marchew",
    soup:" Zupa ",
    textstone:" Kamień z tekstem",
    stairsup:" Schody ",
    itempotato:"Kartofel",
    litpumpkin: "Dynia Świecąca",
    chips: "Czipsy",
    potato: "Kartofel",
    potato2: "Kartofel",
    bluetorch: "Niebieska Pochodnia",
    skull: "Czaszka",
    melonfruit: "Arbuz",
  melon: "Arbuz",
  melon2: "Arbuz",
  melon1: "Arbuz",
  nametag: "Znacznik",
  melonsword: "Arbuzowy miecz",
  trashcan: "Śmietnik",
  pumpkin1: "Dynia",
  pumpkin2: "Dynia",
  pumpkin3: "Dynia",
  pumpkin: "Dynia",
  corruptedthing: "Skarzone coś",
  thingeyes: "Oczy czegoś",
fluortorch:"Fluorowa Pochodnia",
  "window": "Okno",
  windows: "Okna",
  book: "Książka",
  bookshelf: "Regał z książkami",
  shelf: "Szafka",
  web: "Pajeczyna",
  silnik: "Jedwab",
  carnallite: "Karnalit",
  pyrolusite: "Pyrulozyt ",
  epsomite: "Epsomit",
  barite: "Baryl",
  anhydrite: "Anhydryt",
  hematite: "Hematyt",
  calcite: "Kalcyt",
  fluorite: "Fluoryt",
  bluewallpaperroller: "Niebieska tapeta",
  redwallpaperroller: "Czerwona tapeta",
  whitewallpaperroller: "Biala tapeta",
  limewallpaperroller: "Zielona tapeta",
  desertsoul: "Dusza pustynna",
  orangetorch: "Pomarańczowa pochodnia",
  limetorch: "Limonkowa pochodnia",
  darktorch: "Ciemna pochodnia",
  whitetorch: "Biala pochodnia",
  purpletorch: "Fioletowa pochodnia",
  feather: "Piurko",
  rarefeather: "Rzadkie Piurko",
  mythicfeather: "Mityczne Piurko",
  abyssblock2:"Blok Czeluści ",
  bucket:"Wiadro",
  bucketwithcwater:"Wiadro z wodą ",
  bucketwithwater:"Wiadro z wodą ",
  lavabucket:"Wiadro z lawą",
  uraniumaxe:" Uranowa Siekiera",
  dummy:"Kukiełka",
  cavebuilder:"Zabudowywacz jaskin",
  heather:"Wrzos",
  lysimachis:"Lizymachia",
  lily:"Lilia",
  hyperarrows:"Hiper Strzały ",
  enchantedarrows :"Enczantowane Strzały ",
  dracobow:"Drako Łuk",
  etherthing:"Rzecz Etheru",
  etheractive2:"Aktywny Ether",
  ethergate:"Brama do Etheru",
  apple:"Jabłko",
  silverapple:"Srebne Jabłko",
  cdbpicker:"Próbnik CDB",
  canvas:"Płutno"
}};
        var slots = 8;  
        var allItems = { 
         
        	cdb:"./cdb.png",
        	loom:"./loom.png",
        	cdba:"./cdb.png",
        	cdbpicker:"./custompicker.png",
        	godbench:"./godbench.png",
        	canvas:"./canvas.png",
        	nullblock:"./null.png",
         shield:"./shield.png",
etherlog: "./ethertree1.png",
	 silverapple:"./silverapple.png",
	ethercrystals: "./ethercrystals.png",
	etherflowers: "./etherflowers.png",
etherthing: "./etherthings1.png",
	etheractive2: './etheractive1.png',
	ethergate: "./ethergate1.png",
	apple: "./apple.png",
	ethersoul: "./ethersoul1.png",
	etherbricks: "./etherbricks.png",
	ethergrass2: "./ethergrass.png",
	ethersand2: "./ethersand.png",
 dracobow:"./dracobow.png",
	canyonsandlayer: "./canyonsand.png",
	hill3: "./canyonchunk.png",
	Cgrass: "./Cgrass1.png",
tin: './tin.png',
 tinore: './tinore.png',
 nitre: './nitre.png',
 damageindicator: './damageindicator.png',
 dummy: './dummy.png',
lysimachia: './lysimachia.png',
	heather: './heather.png',
	flowerpollen: './flowerpollen1.png',
bucket: './bucket.png',
	bucketwithcwater: './bucketwithcleanwater.png',
	bucketwithwater: './bucketwithwater.png',
	bucketwithswampwater: './bucketwithwater.png',
	lavabucket: './lavabucket.png',
Hstonelay: './Hstonefloor.png',
        hill2: './stonechunk.png',
lily: "./lily.png",
	 leafbowlwithswampwater: './leafbowlwithcleanwater.png',
	bowl_with_swampwater: './bowl_with_water.png',
	peatfloor: "./peat.png",
	swampiris: "./swampiris.png",
	swampgrasslay:"./swampgrass.png",
	stonehill: "./Hstonefloor.png",
	silver: "./silver.png",
	graygrass: "./graygrass1.png",
	 mud:"./mud.png",
	galena: "./galena.png",
	 
	silverlongsword: "./silverlongsword.png",
copper_sword:"./copper-sword.png",
torch: './torch.png',
extinguished_torch:"./extinguished_torch.png",
fluortorch:"./fluortorch1.png",
orangetorch: "./desertorch1.png",
	darktorch: "./darktorch1.png",
	whitetorch: "./whitetorch1.png",
	limetorch: "./limetorch1.png",
	purpletorch: "./purpletorch1.png",
	bluetorch: "./bluetorch1.png",
	lamptorch:"./lamp2.png",
	litpumpkin: "./litpumpkin.png",
	candle: "./candle.png",
	crystal6: "./crystal6.png",
	crystal1: "./crystal1.png",
	crystal2: "./crystal2.png",
	crystal3: "./crystal3.png",
	campfire: './campfire.png',
	ignited_fiber: './embered_fiber.png',
	axivector: "./axivector.png",
	invisiblearmourring: "./ring1.png",
abyssblock2:"./abyssblock.png",
  'window': "./window.png",
  windows: "./windows.png",
  book: "./book.png",
  bookshelf: "./bookshelf.png",
  shelf: "./shelf.png",
coral1block: "./coral1block.png",
  coral2block: "./coral2block.png",
  coral1floor: "./coral1floor.png",
  coral2floor: "./coral2floor.png",
web:"./web.png",
  silk:"./silk.png",
  carnallite :"./carnallite.png",
  pyrolusite:"./pyrolusite.png",
  epsomite:"./epsomite.png",
  barite:"./barite.png",
  anhydrite:"./anhydrite.png",
  hematite:"./hematite.png",
  calcite:"./calcite.png",
  fluorite:"./fluorite.png",
  bluewallpaperroller:"./bluewallpaperroller.png",
  limewallpaperroller: "./limewallpaperroller.png",
  redwallpaperroller:"./redwallpaperroller.png",
  whitewallpaperroller: "./whitewallpaperroller.png",
desertsoul:"./desertsoul.png",

  
  ghostsapling: "./ghostsapling.png",
  ghosttree1: "./ghosttree1.png",
  ghosttree2: "./ghosttree2.png",
  musicbox: "./musicbox.png",
  disc1: "./disc1.png",
  disc2: "./disc2.png",
itempotato: "./itempotato.png",
  
  chips: "./chips.png",
  potato: "./potato.png",
  potato2: "./potato2.png",
log0: "./log0.png",

skull:"./skull.png",
  melonfruit: "./melonfruit.png",
  melon: "./melon.png",
  melon2: "./melon2.png",
  melon1: "./melon1.png",
  nametag: "./nametag.png",
  melonsword: "./melonsword.png",
trashcan: "./trashcan.png",
  pumpkin1: "./pumpkin1.png",
  pumpkin2: "./pumpkin2.png",
  pumpkin3: "./pumpkin3.png",
  pumpkin: "./pumpkin.png",
        corruptedthing: "./corruptedthing.png",
  thingeyes: "./thingeyes.png",
lit_kiln:"./lit_kiln1.png",
chest: "./chest.png",
cavebuilder: "./cavebuilder.png",
wolframite:"./wolframite.png",
  wolframaxe:"./wolframaxe.png",
  uraniumaxe:"./uraniumaxe.png",
  wolfram:"./wolfram.png",
zombieflesh:"./flesh.png",
  cavedirt:"./cavedirt.png",
  randomrock1:"./randomrock1.png",
  randomrock2:"./randomrock2.png",
osm: "./osm.png",
  osmiumbar: "./osmiumbar.png",
  osmiumbuff: "./osmiumbuff.png",
  osmiumsword: "./osmiumsword.png",
  osmium: "./osmium.png",
  uranium: "./uranium.png",
  toxicsword: "./toxicsword.png",
carrot: "./carrot.png",
sushi: "./sushi.png",
shell1: "./shell1.png",
shell2: "./shell2.png",
shell3: "./shell3.png",
wildcarrot: "./wildcarrot1.png",
soup: "./soup.png",
stairsup: "./stairsup.png",
bottle: "./bottle.png",
plantmaker: "./plantmaker.png",
    cauldron: "./cauldron1.png",
    fountain: "./fountain1.png",
    textstone: "./textstone.png",
    nametag: "./nametag.png",
tallgrass: "./grass2.png",
bush: "./bush.png",
plantmaker: "./plantmaker.png" ,
    mercurybottle: "./mercurybottle.png",
     bow: "./bow.png",
     nightbow: "./nightbow.png",
     darkbow: "./darkbow.png",
     arrows: "./arrow.png",
     "hyperarrows": "./hyperarrow.png",
     "enchantedarrows": "./enchantedarrow.png",
     powerfullarrows:"./powerfullarrow.png",
     goodarrows: "./goodarrow.png",
     rainbowbow: "./rainbowbow.png",
    quantumbow: "./quantumbow.png",
    moltenbow: "./moltenbow.png",
     hellbow: "./hellbow.png",
    eggs: "./eggs.png",
    eggshells: "./eggshells.png",
    friedegg: "./friedegg.png",
    feather: "./feather.png",
    rarefeather: "./rarefeather.png",
    mythicfeather: "./mythicfeather.png",
    calciumacetylide: "./calciumacetylide.png",
    cigarettes: "./cigarettes.png",
    diamante: "./diamante.png",
    cinnabargeode: "./cinnabargeode.png",
        palmlog: "./palm1.png",
    coconut: "./coconut.png",
    palmsapling: "./palmsapling.png",
    stonesing: "./stonesing.png",
hellsapling: "./hellsapling.png",
abysssapling: "./abysssapling.png",
snowgrass2:"./snowgrass.png",
hell_boomerang: "./hell_boomerang.png",
hallucinate: "./hallucinate1.png",
a1bed: "./1bed.png",
    a2bed: "./2bed.png",
    can: "./can.png",
    carpet: "./carpet.png",
    polishedfloor: "./polishedfloor.png",
    road2: "./road2.png",
    
    bed:"./bed.png",
    draco_boomerang: "./draco_boomerang.png",
    helllog: "./helltree0.png",
    hellwood: "./hellwood.png",
    abyssgel: "./abyssgel.png",
    abysswood: "./abysswood.png",
    abysslog: "./abysstree0.png",
hellgrass: "./hellgrass1.png",
    hellplank: "./hellplank1.png",
    abyssgrass: "./abyssgrass1.png",
    abyssplank: "./abyssplank1.png",
    warporb: "./warporb1.png",
     titanium_boomerang:"./titanium_boomerang.png",
     good_boomerang:"./good_boomerang.png",
    boomerang: './boomerang.png',
    dracobuff: './dracobuff.png',
briarempty: './briarempty.png',
iron_shovel: './iron_shovel.png',
algae_item: './algae_item.png',
 goldnugget: './goldnugget.png',
 leafbowl: './leafbowl.png',
 leafbowlwithwater: './leafbowlwithwater.png',
 leafbowlwithcleanwater: './leafbowlwithcleanwater.png',
statue2: './statue2_2.png',
 statue1: './statue1_2.png',
 blower: './blower.png',
 kiln: './kiln.png',
hill_climber: './hill_climber.png',
hill1: './chunk.png',
climbhill: './climbhill.png',
 blueflower2: './blueflower2.png',
 redflower2: './redflower2.png',
deepblues: './deepblues.png',
 lightwhite: './lightwhite.png',
grassdeco: './grassdeco1.png',
extinguished_campfire: './extinguished_campfire1.png',
 cactusempty: './cactusempty.png',
  deadgrass: './dead grass.png',
  godwand: './godwand.png',
  itemroad: './road.png',
  grass2:"./grass2none.png",
  statueofgods: './statueofgods1.png',
  leaves: './leaves.png',
  deadgrassfloor2: './deadgrass.png',
        healthregenerator: './healthregenerator.png',
        staminaregenerator: './staminaregenerator.png',
        myosotis:"./Myosotis.png",
        redanvil: './redanvil.png',
        magicwand: './magicwand.png',
        greenwand:"./greenwand.png",
        magicwandofsharp: './wandofsharp.png',
  hyperblastwand: './hyperblastwand.png',
        forestgrasslayer:"./forestgrass.png",
        curedgrasslayer:"./grass.png",
        broom: './broom.png',
        blush: './forestblush.png',
  forestleaf: './forestleaf.png',
  gravestone: './gravestone.png',
        moltensword: './moltensword.png',
  hellsword: './hellsword.png',
  knive: './knive.png',
  hellknive: './hellknive.png',
        aquagem: './aquagem.png',
  darkore: './darkore.png',
  hellessence: './hellessence.png',
  celestialfragment: './celestialfragment.png',
  celestialspawner: './celestialspawner.png',
  darkore: './darkore.png',
        roadfloor:"./roadfloor.png",
        
  granite: './granite.png',
  basalt: './basalt.png',
        hellgem:"./hellgem.png",
        hellwall2:"./hellwall1.png",
        titaniumbuff:"./titaniumbuff.png",
        hellbuff:"./hellbuff.png",
        table:"./table.png",
  compass:"./compass.png",
  defensering:"./defensering.png",
  sing:"./sing.png",
  deepgodspawner:"./deepgodspawner.png",
  itemfence: "./itemfence.png",
  emptyblackberry: "./emptyblackberry.png",
  brickfloor2: "./brickfloor2.png",
  godstatue: "./godstatue.png",
  icemedalion: "./icemedalion.png",
  speedmedalion: "./speedmedalion.png",
  healmedalion: "./cursedmedalion.png",
  magiclanter: "./magiclantern.png",
  magicgem: "./magicgem.png",
  desertcore: "./desertcore.png",
geyser:"./geyser1.png",
abysscore:"./coreofabyss.png",
icesword:"./icesword.png",
frozeningot: "./frozeningot.png",
  snowflower: "./snowflower.png",
truegodsword:"./truegodsword.png",
thistleseeds:"./thistleseeds.png",
gel: "./gel.png",
abyssgem:"./abyssgem.png",
  gelblock: "./gelfloor.png",

universeechoes:"./universeechoes.png",
trueuniversesword:"./trueuniversesword.png",
trueuniverseorb:"./trueuniverseorb.png",
seashiny: "./seashiny.png",
  aquacore: "./aquacore.png",
  aquagodshell: "./aquagodshell.png",
        universesword:"./universesword.png",
  universefragment:"./universefragment.png",
  shell:"./shell.png",
  corruptioncore:"./corruptioncore.png",
  coral1:"./coral1.png",
  coral2:"./coral2.png",
  aquawall:"./aquawall1.png",
  echofabric:"./echofabric.png",
  echorocks:"./echorocks.png",
  aquaspear:"./aquaspear.png",
  blossomblock:"./blossomblock.png",
  glowblossom:"./glowblossom.png",
  aquaore:"./aquaore.png",
  corruptedchalcopyrite:"./corruptedchalcopyrite.png",
fleshvolume:"./fleshvolume.png",
  fleshdumbass:"./fleshdumbass.png",
  fleshsaber:"./fleshsaber.png",
  coloressence:"./colorsessence.png",
rainbow:"./rainbow.png",
        iron_mace: './iron-mace.png',
        nightgem: "./nightgem.png",
  nightsword: "./nightsword.png",
  goodmace: "./godmace.png",
  goodsword: "./godsword.png",
  thundersword: "./thundersword.png",
        evileye: "./evileye.png",
  evilsummoner: "./evilsummoner.png",
  soulofsharp: "./soulofsharp.png",
  aquaticevent: "./aquaticevent.png",
  soulofsharp: "./soulofsharp.png",
  sharpsaw: "./sharpsaw.png",
  sharpmace: "./sharpmace.png",
        dandelionseeds:"./dandelionseeds.png",
        candy: "./candy.png",
  energybowl: "./energybowl.png",
  healthbowl: "./healthbowl.png",
hypersword:"./hypersword.png",
  iron_sword: './iron-sword.png',
  spikegod_essence: './spikegodspawner.png',
  voltary_essence: './voltaryspawner.png',
  unknown: './unknown1.png',
  violetfloor: './violetfloor.png',
        black_elderberry_tree: './black_elderberry_tree.png',
        house_wall: './housewall.png',
        gypsumhouse: './gypsumhouse.png',
    gypsumdoor: './gypsumdoor.png',
    gypsumroof: './gypsumroof.png',
        heavybag: './heavybag.png',
        houseroof: './rooftop.png',
        ryeroof: './ryeroof.png',
  poppy: './poppy.png',
  brickhouse: './brickhouse.png',
  rockhouse: './rockhouse.png',
  table: './table.png',
  door: './door.png',
  mycelium: './mycelium.png',
  rye_seeds: './rye_seeds.png',
  yeast: './yeast.png',
  beer: './beer.png',
  bread_sample: './bread_sample.png',
  black_elderberries: './black_elderberries.png',
  fermentator: './fermentator.png',
  flour: './flour.png',
  sugar: './sugar.png',
  waterdrop: './waterdrop.png',
  fermentator: './fermentator.png',
  smoother: './smoother.png',
  bread: './bread.png',
  smooth_stone: './smooth-stone.png',
        trout: './trout.png',
        gypsumfloor: './gypsumfloor.png',
        cave_wall: './cavewall.png',
       rock: './rock.png',
  cooked_trout: './cooked_trout.png',
        rye: './rye.png',
  flour: './flour.png',
  honey_mushrooms: './honey-mushroom.png',
        cinnabar: './cinnabar.png',
  mercury: './mercury.png',
  pipette: './pipete.png',
  ilmenite: './ilmenite.png',
  salmon: './salmon.png',
  cooked_salmon: './cooked_salmon.png',
  fishing_rod: "./fishing_rod.png",
        opal: './opal1.png',
  opalblock: './opalblock1.png',
  emeraldblock: './emeraldblock.png',
  sapphireblock: './sapphireblock.png',
  rubyblock: './rubyblock.png',
  sapphirefloor: './sapphirefloor.png',
  rubyfloor: './rubyfloor.png',
  emeraldfloor: './emeraldfloor.png',
  emerald: './emerald.png',
        glass: './glass.png',
        pyrite : './pyrite.png',
        pickaxe: './pickaxe.png',
        cavemakingpickaxe: './great-cave-making-pickaxe.png',
  ruby: './ruby.png',
  sapphire: './sapphire.png',
        bed1: './fiberbed.png',
  cactus_fruit: './cactus-fruit.png',
        alchemy_table: './alchemy_table.png',
  gypsum: './gypsum.png',
  wood_manipulator: './wood_manipulator.png',
  sulfur: './sulfur.png',
  grains_of_sand: './sand2.png',
  planks: './planks.png',
  planks_floor: './planks_floor.png',
  gypsum_dirt: './gypsum_dirt.png',
  bone: './bone.png',
  bone_sword: './bone_sword.png',
  bowl: './bowl.png',
  bowl_with_seawater: './bowl_with_seawater.png',
  bowl_with_water: './bowl_with_water.png',
  sandblock2: './sandblock.png',
  gypsumblock: './gypsumblock.png',
        copper: './copper.png',
        chalcopyrite: './chalcopyrite.png',
        bunnmeat: './bunnmeat.png',
  cooked_bunnmeat: './cooked_bunnmeat.png',
iron: './iron.png',
iron_bar: './iron-bar.png',
copper_bar: './copper-bar.png',
copper: './copper.png',
extrabag: './extra-bag.png',
fiber_fabric: './fiber-fabric.png',
magnetite_powder: './magnetite-powder.png',
coal: './coal.png',
iron_spear: './iron-spear.png',
copper_spear: './copper-spear.png',
anvil: './anvil.png',
  stonedirt: './dirt-with-stones.png',
  larger_bag: './larger-bag.png',
  lit_furnace: './lit_furnace.png',
  furnace: './furnace.png',
"fiber": "./fiber.png",
hand_torch: './hand-torch.png',
  magnetite: './magnetite.png',
"clayblock1": "./clayblock.png",
long_spear: './long-spear.png',
  raw_sharkmeat: './raw_sharkmeat.png',
  cooked_sharkmeat: './cooked_sharkmeat.png',
coal: './coal.png',
decrafter  :"./decrafter.png",
sapling  :"./sapling.png",
"grasslayer": "./grass.png",
"stoneshovel": "./shovel.png",
clay: './clay.png',
clayblock: './clayblock.png',
brick: './brick.png',
brickwall: './brickwall.png',
brickfloor: './brickfloor.png',
ash: './ash1.png',
ashfloor: './ashblock.png',
"log_floor": "./log_floor.png",
            "nettle": "./nettle.png",
            "bigrock": "./largerock.png",
            "stone": "./stones.png",
            "sharpstone": "./sharpstone.png",
            "stick": "./sticks.png",
            "longstick": "./longstick.png",
            "woodboard": "./board.png",
            "treebark": "./treebark.png",
            "yew": "./yew-fruit.png",
            "briar-fruit": "./briar-fruit.png",
            "kite": "./kite.png",
            "resin": "./resin.png",
"woodboard": "./board.png",
"handdrill-kit": "./handdrill.png",
"fireroll": "./fireroll.png",
"cordage": "./cordage.png",
"dowel": "./dowel.png",
"log": "./tree0.png",
"stone_axe": "./stone_axe.png",
"stone_scyte": "./stone_scyte.png",
"fireplow": "./fireplow.png",
"birch-powder": "./birch-powder.png",
"blackberry-fruit": './blackberry-fruit.png',
stone_floor: './stone_floor.png',
  stone_wall: './stone_wall.png',
  fiber_floor: './fiber_floor.png',
  log_wall: './log_wall.png',
  daffodil: './daffodil.png',
  flax: './flax0.png',
  fern: './fern.png',
  trueuniversespawner:"./trueuniversespawner.png",
  thistle: './thistle.png',
  toadstool: './toadstool.png',
  violet: './violet.png',
  yellow: './yellow.png',
  dandelion: './dandelion.png',
  pointed_stick: './pointed_stick.png',
  thistleroot: './thistleroot.png',
  cooked_thistleroot: './cooked_thistleroot.png',
  titaniumsword: "./titaniumsword.png",
  titaniummace: "./titaniummace.png",
  salt: './salt.png',
  titaniumbar: './titaniumbar.png',
  titaniumdioxide: './titaniumdioxide.png',
        };
let defaultAllItems = { ...allItems }
for (const [name, src] of Object.entries(allItems)) {
  let src2 = removeDotSlash(src)
  allItems[name] = getBase64Image(src2, assets); 
}
var recipes = {
"fiber": [["treebark", "treebark"]],
"fishing_rod": [["longstick", "cordage","cordage","sharpstone"]],
"bed1": [["fiber_fabric","fiber_fabric"]],
"sandblock2": [["grains_of_sand"]],
"long_spear": [["longstick", "pointed_stick","sharpstone","cordage"]],
"torch": [["resin", "stick","ignited_fiber"]], 
"decrafter": [["stone", "woodboard","woodboard","stone","woodboard"]],
"campfire": [["stone", "stone","ignited_fiber"]],
"log_floor": [["log", "log","log"]],
"sharpstone": [["stone","bigrock"]],
"fireplow": [["longstick", "woodboard"]],
"woodboard": [["log", "sharpstone"]],
"pointed_stick": [["longstick", "sharpstone"]],
"fireroll": [["fiber", "fiber","woodboard","woodboard","birch-powder"]],
"stone_floor": [["stone", "stone", "stone"  ]],
"log_wall": [["log", "log", "log"]],
"stone_wall": [["bigrock", "bigrock", "bigrock", ]],
"cordage": [["fiber", "treebark"]],
"stone_axe": [["longstick", "sharpstone","cordage"]],
"stoneshovel": [["longstick", "sharpstone","cordage","cordage"]],
"thistleroot": [["thistle"]],
"brickwall": [["clay", "brick", "brick"]],
"brickfloor": [["clay", "brick", "brick"]],
"clayblock1": [["clay", "clay"]],
"ashfloor": [["ash", "ash","ash"]],
"extrabag": [["fiber_fabric", "fiber_fabric","fiber_fabric"]],
"wood_manipulator":[["iron_bar","woodboard","log_wall","log_wall"]],
"gypsumfloor":[["gypsum"]],
"fermentator": [["bowl", "fiber_fabric", "fiber_fabric"]],
"flour": [["rye", "rye"]],
"opalblock": [["opal"]],
"emeraldblock": [["emerald"]],
"sapphireblock": [["sapphire"]],
"rubyblock": [["ruby"]],
"emeraldfloor": [["emerald"]],
"sapphirefloor": [["sapphire"]],
"rubyfloor": [["ruby"]],
"gypsum_dirt": [["gypsum"]],
"bone_sword": [["bone","bone","bone","sharpstone"]],
"gypsum": [["gypsum_dirt"]],
"leafbowl": [["forestleaf","forestleaf"]], 
"gelblock": [["gel","gel","gel"]],
"boomerang": [["woodboard","woodboard","gelblock","gelblock"]],
"hill_climber": [["longstick","longstick","woodboard","stick","cordage"]],
"climbhill": [["hill1", "grasslayer"]],
"blower": [["woodboard", "stick","stick","woodboard"]],
"loom": [["woodboard", "cordage","cordage","web"]],
"warporb": [["abyssgel", "abyssgel", "abyssgem", "abyssgem"],["helllog","hellgem","hellwood"],["aquaore","echorocks","geyser"],["etherflowers","ethersoul","ethersoul"] ],
"hellplank": [["hellwood", "helllog"]],
"abyssplank": [["abysswood", "abysslog"]],
"sing": [["woodboard", "woodboard","longstick"]],
"stonesing": [["bigrock", "woodboard","longstick"]],
"carpet": [["fiber", "poppy"]],
"hallucinate": [["toadstool","gel"]],
"bed": [["bed1","poppy"]],
"bow": [["longstick","cordage","cordage"]],
"arrows": [["stick","feather","sharpstone"]],
"goodarrows": [["stick","rarefeather","sharpstone"]],
"powerfullarrows": [["stick","mythicfeather","sharpstone"]],
"hyperarrows": [["powerfullarrows","mythicfeather","rarefeather"]],
"plantmaker": [["woodboard","grasslayer","yellow","woodboard"]],
"litpumpkin": [["pumpkin","ignited_fiber"]],
"chest": [["woodboard","log","woodboard","woodboard","woodboard"]],
"bluetorch": [["glowblossom","stick"]],
"trashcan": [["chest","iron_bar","wolfram"]],
};
let godrecipes={
}
for(let key in allItems){
godrecipes[key]=[[""]];
}
        var badseedrecipesplus = {
          "plantmaker": [["woodboard","grasslayer","corruptedthing","woodboard"]],
          "corruptedthing":[["thingeyes","thingeyes","thingeyes"]],
          "curedgrasslayer":[["grasslayer","corruptedthing"]]
        }
var godstatuerecipes = {
"etherthing": [["anvil","aquagem","nightgem","evileye"]],
}
        var canbedecrafted=["brickwall","clayblock1","ashfloor","cordage","fiber","fireplow","stone_wall","fiber_floor","torch","campfire","brickfloor","fireroll","decrafter","log_floor","log_wall","sharpstone","pointed_stick","thistleroot","woodboard","hand_torch","stoneshovel","stone_axe","iron_spear","copper_spear","fiber_fabric","extrabag","cavemakingpickaxe","pickaxe","opalblock","emeraldblock","emeraldfloor","sapphireblock","sapphirefloor","rubyfloor","rubyblock","planks","planks_floor","houseroof","house_wall","furnace","kiln","campfire","decrafter","log_floor","log_wall","stone_floor","gelblock","aquaspear","goodsword","universesword","sharpsaw","nightsword","fleshsaber","goodmace","truegodsword","trueuniversesword","iron_mace","iron_sword","sharpmace","aquagodshell","deepgodspawner","voltary_essence",
        "fleshdumbass","housewall","houseroof","housefloor","planks_floor","planks","table","titaniumbuff","titaniumsword","lamptorch","brickfloor2","trueuniversespawner","deepgodspawner","hellbuff","hellsword","moltensword","knive","hellknive","magicwand","magicwandofsharp","hyperblastwand","greenwand","blower","forestleaf","titanium_boomerang","boomerang","good_boomerang","gypsumroof","gypsumhouse","gypsumdoor","sing","hallucinate","stonesing","dracobuff","plantmaker","cauldron","titaniumbar","fountain","textstone","stairsup","hypersword","osmiumbar","osmiumsword","osmiumbuff","toxicsword","leafbowl", "wolframaxe","uraniumaxe","chest","cavebuilder","bluetorch","trashcan","broom","arrows","hyperarrows","bed","bed1","sing","ignited_fiber","gelblock","litpumpkin","orangetorch","darktorch","whitetorch","limetorch","purpletorch","coral1block","coral2block","coral1floor","coral2floor","copper_sword","silverlongsword","bow","compass","loom","cdb","cdba","canvas"
        ]
var plantmakerrecipes = {
    "grasslayer": [["gelblock"]],
    "hill3": [["gelblock","gelblock"]],
    "hill2": [["gelblock","gelblock"]],
    "hill1": [["gelblock","gelblock"]],
"grass2": [["gel","gel","gel","gel","gel"]],
"peatfloor": [["gel","gel","gel","gel","gel"]],
    "roadfloor": [["gel","gel","gel"]],
    "log0": [["log"]],
    "road2": [["gel","gel","gel","gel"]],
    "thistle": [["gel","gel","gel","gel"]],
    "swampgrasslay": [["gelblock"]],
    "Hstonelay": [["gelblock"]],
    "canyonsandlayer": [["gelblock"]],
    "grasslayer": [["gelblock"]],
    "deadgrassfloor2": [["gelblock"]],
    "sandblock2": [["gelblock"]],
    "snowgrass2": [["gelblock","gel"]],
    "yellow": [["gel","gel"]],
    "deepblues": [["gel","gel","gel"]],
    "poppy": [["gel","gel","gel","gel"]],
    "redflower2": [["gel","gel"]],
    "blueflower2": [["gel","gel"]],
    "myosotis": [["gel","gel","gel"]],
    "grassdeco": [["gel","gel","gel"]],
    "blush": [["gel","gel","gel"]],
    "mud": [["gel","gel","gel"]],
    "forestgrasslayer": [["gel","gel","gel"]],
    "nettle": [["gel","gel","gel"]],
    "flax": [["gel","gel","gel"]],
    "fern": [["gel","gel","gel"]],
    "flowerpollen": [["gel","gel"]],
    "swampiris": [["gel","gel","gel"]],
    "lysimachia": [["gel","gel","gel"]],
    "heather": [["gel","gel","gel"]],
    "violet": [["gel","gel","gel"]],
    "daffodil": [["gel","gel"]],
    "tallgrass": [["gel"]],
    "toadstool": [["gel","gel","gel"]],
    "snowflower": [["gel","gel"]],
    "blossomblock": [["yellow","glowblossom"]],
    "rock": [["bigrock"]],
    "gravestone": [["bigrock","gel","sing"]],
}
var campfirerecipes = {
"cooked_thistleroot": [["thistleroot"]],
"ignited_fiber": [["fiber"]],
"candle": [["resin","treebark","glass"]],
"roadfloor":[["stone"]],
 "candy": [["sugar"]],
 "energybowl": [["sugar", "dandelion", "bowl_with_water"]],
"furnace": [["bigrock","bigrock","brick","brick","blower"]],
"kiln": [["bigrock","bigrock","clay","ash"]],
"copper": [["chalcopyrite","coal"]],
"coal": [["stick"]],
"hand_torch": [["torch","torch","torch"]],
"torch": [["extinguished_torch"]],
"ash": [["stick"]],
"cooked_bunnmeat": [["bunnmeat"]],
"cooked_salmon": [["salmon"]],
"cooked_trout": [["trout"]],
"sugar": [["thistleroot","thistleroot"],["cooked_thistleroot","cooked_thistleroot"],["dandelion","dandelion","dandelion"],["blackberry-fruit"],["briar-fruit","briar-fruit"]],
"rye_seeds":[["rye","rye"]],
"bowl_with_water": [["bowl_with_seawater"]],
"leafbowlwithcleanwater": [["leafbowlwithwater"]],
"bucketwithcwater": [["bucketwithwater"]],
"friedegg": [["eggs"]],
"fluortorch": [["stick","gel","fluorite"]] ,
}
var loomrecipes = {
"fiber_fabric":[["fiber","fiber","fiber"]],
"silk": [["web", "web", "web"]],
"sapphire":[["ruby"]] ,"ruby":[["emerald"]],"emerald":[["sapphire"]]  
}
var wood_manipulator_recipes = {
  "treebark": [["log","log"]],
  "itemfence": [["log","stick"]],
  "table": [["log","stick","stick","log"]],
"planks_floor": [["log","log"]],
"planks": [["planks_floor","log"]],
"stick": [["log","log","log","log"]],
"door": [["house_wall", "house_wall","longstick"]],
"house_wall": [["planks", "planks"]],
"houseroof": [["house_wall","log"]],
"ryeroof": [["houseroof","rye","rye"]],
"violetfloor": [["violet", "planks_floor"]],
"gypsumhouse": [["house_wall", "gypsum"]],
"gypsumroof": [["houseroof", "gypsum"]],
"gypsumdoor": [["door", "gypsum"]],
"polishedfloor": [["bigrock","sharpstone"]],
"stairsup": [["bigrock", "bigrock","bigrock"]],
"fiber_floor": [["fiber"]],
"coral1block": [["coral1","coral1","gel"]],
"coral2block": [["coral2","coral2","gel"]],
"coral1floor": [["coral1","coral1"]],
"coral2floor": [["coral2","coral2"]],
"bluewallpaperroller":[["fiber","blueflower2"]],
"limewallpaperroller":[["fiber","grassdeco"]],
"redwallpaperroller":[["fiber","redflower2"]],
"whitewallpaperroller":[["fiber","bone"]],
"book":[["fiber_fabric"]],
"bookshelf":[["book","log"]],
"shelf":[["log","woodboard","log"]],
"dummy":[["log","woodboard","log","iron_bar","tin"]],
"canvas":[["log","longstick","silk","fiber_fabric"]],
"cdb":[["silk","silk"]],
"cdba":[["cdb","silk"]],
"cdbpicker":[["glass","glass","stick"]]
}
var furnacerecipes = {
 "tin": [["tinore", "coal"]],
"copper": [["chalcopyrite", "coal"]],
"cooked_salmon": [["salmon"]],
 "candy":[["sugar","sugar"]],
 "energybowl":[["sugar","dandelion","bowl_with_water"]],
"healthbowl":[["briar-fruit","bowl_with_water"]],
"cooked_trout": [["trout"]],
"brickhouse":[["brick","brick"]],
"pickaxe": [["longstick", "iron_bar"]],
"iron_shovel": [["longstick", "iron_bar","cordage"]],
"cavemakingpickaxe": [["pickaxe", "iron_bar"]],
  "ignited_fiber": [["fiber"]],
  "copper_bar": [["copper", "copper"]],
"iron": [["magnetite_powder", "magnetite_powder", "magnetite_powder",], ["pyrite"],["hematite","hematite","hematite"]],
  "iron_bar": [["iron", "iron" ]],
  "anvil": [["iron_bar","iron_bar","iron_bar"]],
"cooked_bunnmeat": [["bunnmeat"]],
"glass": [["grains_of_sand"]],
"gypsumblock": [["gypsum","gypsum"]],
"bowl": [["clay","clay","clay","clay","clay","clay"]],
"bucket": [["iron_bar","wolfram","cordage"]] ,
"bowl_with_water": [["bowl_with_seawater"]],
"leafbowlwithcleanwater": [["leafbowlwithwater"]],
"bucketwithcwater": [["bucketwithwater"]],
"bread":[["bread_sample"]],
"titaniumbar": [["titaniumdioxide","salt"]],
"friedegg": [["eggs"]],
"cauldron": [["bigrock","iron_bar"]],
"fountain": [["bigrock","stick"]],
"wolfram": [["wolframite", "coal"]],
"cavebuilder":[["bigrock","bigrock","sharpstone"]],
"smooth_stone":[["bigrock","sharpstone"]],
"chips": [["itempotato","salt"]],
"limetorch": [["torch","gel"]] ,
"purpletorch": [["torch","violet"]],
"whitetorch": [["torch","frozeningot"]] ,
"darktorch": [["torch","abyssgel"]] ,
"orangetorch": [["torch","desertsoul"]] ,
"silverlongsword": [["iron_sword","silver","silver","silver"]],
}
var cauldronrecipes = {
    "bowl": [["clay", "clay", "clay", "clay", "clay", "clay"]],
    "bowl_with_water": [["bowl_with_seawater"]],
    "cooked_salmon": [["salmon"]],
    "candy": [["sugar", "sugar"]],
    "energybowl": [["sugar", "dandelion", "bowl_with_water"]],
    "healthbowl": [["briar-fruit", "bowl_with_water"]],
    "soup": [["carrot","carrot", "bowl_with_water", "thistleroot"]],
    "friedegg": [["eggs"]],
}
var kiln_recipes = {
  "brick": [["clay", "ash"]],
  "brickfloor2": [["clay", "clay"]],
"statue1": [["bigrock", "clay", "clay", "log"]],
"statue2": [["bigrock", "clay", "clay", "log"]],
  "brickwall": [["clay", "brick", "brick", "brick"]],
  "brickfloor": [["clay", "brick", "brick", "brick"]],
  "bowl": [["clay","clay","clay","clay","clay","clay"]],
  "bowl_with_water": [["bowl_with_seawater"]],
"bread": [["bread_sample"]],
"ignited_fiber": [["fiber"]],
"cooked_salmon": [["salmon"]],
"candy": [["sugar", "sugar"]],
"energybowl": [["sugar", "dandelion", "bowl_with_water"]],
"healthbowl": [["briar-fruit", "bowl_with_water"]],
"textstone": [["bigrock", "woodboard","sharpstone"]],
"window":[["glass"]],
"windows":[["glass","glass"]]
}
var unknownrecipes={
  "voltary_essence": [["emeraldblock", "sapphireblock", "rubyblock", "ilmenite"]],
  "aquaticevent": [["evilsummoner", "abyssgem", "aquaore"]],
  "evilsummoner": [["aquaticevent", "abyssgem", "echorocks"]],
"aquagodshell": [["aquaore", "voltary_essence"]],
 "fleshdumbass": [["voltary_essence", "evileye"]],
 "deepgodspawner": [["aquaore", "aquacore", "fleshvolume"]],
 "universeechoes": [["aquagodshell","evilsummoner","aquaticevent","fleshdumbass","voltary_essence","spikegod_essence"]],
 "trueuniversespawner": [["universefragment","universeechoes","aquagem","aquagem"]],
}
var anvilrecipes = {
"iron_spear": [["iron_bar", "longstick"]],
"alchemy_table": [["iron_bar", "log"]],
"redanvil":[["anvil","evileye","magicgem"]],
"cavemakingpickaxe": [["pickaxe"]],
"copper_spear": [["copper_bar", "longstick"]],
"larger_bag": [["extrabag", "extrabag"]],
"heavybag": [["larger_bag", "larger_bag"]],
"rock": [["bigrock"]],
"unknown": [["emeraldblock","sapphireblock","rubyblock","anvil"]],
"compass":[["iron_bar","iron_bar","magnetite_powder","bowl_with_water"]],
"titanium_boomerang":[["boomerang","titaniumbar","titaniumbar","titaniumbar"]],
"good_boomerang":[["titanium_boomerang","soulofsharp","soulofsharp","fleshvolume",]],
"hell_boomerang":[["good_boomerang","hellessence","fleshvolume","desertcore"]],
"lamptorch": [["torch","iron_bar","longstick"]],
"copper_sword": [["copper_bar","copper_bar","copper_spear"]],
"iron_sword": [["iron_bar","iron_bar","iron_spear"]],
"titaniumsword": [["titaniumbar","titaniumbar","iron_sword"]],
"osmiumsword": [["osmiumbar","osmiumbar","iron_sword"]],
"wolframaxe": [["wolfram","titaniumbar","titaniumbar","iron_bar","longstick"]],
"uraniumaxe": [["uranium","uranium","wolframaxe","longstick"]],
"titaniumbuff": [["titaniumbar","titaniumbar","titaniumbar","evileye","evileye"]],
"osmiumbuff": [["osmiumbar","osmiumbar","osmiumbar","evileye","soulofsharp"]],
"hellbuff": [["titaniumbuff","hellgem","hellessence","evileye","evileye"]],
"dracobuff": [["universefragment","hellbuff","coloressence"]],
"titaniummace": [["titaniumbar","titaniumbar","iron_mace"]],
"iron_mace": [["iron_bar","iron_bar","iron_spear"]],
"sharpsaw": [["nightsword","evileye"]],
"hellsword": [["sharpsaw","evileye","hellessence","hellessence"]],
"dracobow": [["rainbowbow", "universefragment","hellgem"]],
"rainbowbow": [["moltenbow", "coloressence","soulofsharp"]],
"moltenbow": [["hellbow", "fleshvolume","hellessence"]],
"quantumbow": [["hellbow", "soulofsharp","hellgem"]],
"hellbow": [["darkbow", "hellgem","hellessence"]],
"nightbow": [["bow", "evileye","nightgem","nightgem"]],
"darkbow": [["nightbow", "soulofsharp","soulofsharp"]],
"sharpmace": [["titaniummace","evileye","osmiumbar"]],
"nightsword": [["nightgem","nightgem","nightgem","nightgem","nightgem","titaniumsword"]],
"aquaspear": [["nightsword","aquaore","aquaore","aquaore"]],
"goodsword": [["nightgem","evileye","evileye","soulofsharp","soulofsharp","sharpsaw"]],
"goodmace": [["nightgem","evileye","evileye","soulofsharp","soulofsharp","sharpmace"]],
"fleshsaber": [["goodsword","fleshvolume","evileye"]],
"moltensword": [["fleshsaber","hellgem","hellessence","hellessence","evileye"]],
"rainbow": [["moltensword","goodsword","coloressence","evileye"]],
"universesword": [["universefragment","rainbow","moltensword"]],
"draco_boomerang":[["hell_boomerang","soulofsharp","fleshvolume","universefragment","desertcore","aquacore"]],
"trueuniversesword": [["trueuniverseorb","trueuniverseorb","universesword"]],
"can": [["titaniumbar"]],
"bottle": [["glass", "glass"]],
"damageindicator": [["tin","iron_bar","glass","iron_bar"]],
}
var redanvilrecipes={
  "broom":[["longstick","magicgem","speedmedalion","evileye","soulofsharp","hellgem"]],
  "magiclanter": [["magicgem","desertcore","abysscore","frozeningot","hand_torch","hand_torch"]],
  "greenwand": [["magicgem","stick","frozeningot","soulofsharp","forestleaf"]],
  "magicwand": [["magicgem","greenwand","abysscore","frozeningot","soulofsharp","desertcore"]],
  "magicwandofsharp": [["magicwand","magicgem","soulofsharp","soulofsharp","fleshvolume","fleshvolume"]],
  "hyperblastwand": [["magicwandofsharp","magicgem","magicgem","universefragment","coloressence"]],
  "hypersword":[["trueuniversesword","desertcore","fleshvolume"]],
  "toxicsword":[["trueuniversesword","uranium","uranium","uranium","uranium"]]
}
let itemsDurabilities = { "pickaxe":90 , "arrows": 32 , "goodarrows": 50,"powerfullarrows": 50, "hyperarrows": 120 };
let yourItemsDurabilities = []; 
var alchemy_tableRecipes = {
  "sulfur": [["gypsum", "coal","coal"]],
  "titaniumdioxide": [["ilmenite"]],
  "mercurybottle": [["bottle","cinnabar","cinnabar"]],
  "cinnabargeode": [["cinnabar","cinnabar","cinnabar"]],
  "titaniumdioxide": [["ilmenite"]],
  "osmiumbar":[["ilmenite","osmium"]]
}
var fermentatorRecipes = {
"yeast": [["flour", "sugar", "bowl_with_water"]],
"bread_sample": [["flour", "yeast", "flour"]],
"beer": [["yeast", "bowl_with_water", "sugar","sugar"]],
}
function checkIfItems2(item, amount) {
    let existingItem = yourItemsDurabilities.find(d => d.name === item);
    if (!existingItem) {
        if (itemsDurabilities[item] !== undefined) {
            yourItemsDurabilities.push({ name: item, durability: itemsDurabilities[item] });
        } else {
            console.log(`Durability not defined for item: ${item}`);
        }
    }
}
function checkIfItemsAndDurabilities() {
  if(yourItemsDurabilities!==undefined && yourItemsDurabilities && yourItemsDurabilities!==null){
    yourItems.forEach(item => {
        if(item=="bow"|| item=="hellbow"||item=="rainbowbow"||item=="dracobow"|| item=="moltenbow"||item=="quantumbow"|| item=="darkbow"){
            item="arrows"
        checkIfItems2(item, 1); 
        }else{
            checkIfItems2(item, 1);
        }
    });
}else{
  yourItemsDurabilities=[]
}
}
function checkIfItemsAndDurabilities2(item) {
    if (yourItemsDurabilities !== undefined && yourItemsDurabilities && yourItemsDurabilities !== null) {
        yourItems.forEach(item => {
                checkIfItems2(item, 1); 
        });
    } else {
        yourItemsDurabilities = []
    }
}
let totalAmountUsed=-9999;
let totalAmountUsed2=-9999;
function useItemDurability(amount) {
    checkIfItemsAndDurabilities();
    for (let i = 0; i < yourItemsDurabilities.length; i++) {
        let item = yourItemsDurabilities[i];
        if(item.name =="pickaxe"){
            if (item.durability ) {
                item.durability -= -amount;
            }
            if (item.durability <= 0) {
                updateInventory(); 
                item.durability = 0; 
                yourItemsDurabilities=[]
deleteItems(item.name, 1);
if (langPlactive == 1) {
    showTextInCanvas("' zepsuł ci się kilof ")
} else {
    showTextInCanvas("'your pickaxe broke")
}
            }
        }
    }
    if (totalAmountUsed < amount) {
        return; 
    }
    let nextItemName = yourItems.find(item => !yourItemsDurabilities.some(d => d.name === item));
    if (nextItemName) {
        let nextItemDurability = itemsDurabilities[nextItemName];
        if (nextItemDurability !== undefined) {
            yourItemsDurabilities.length = 0; 
            yourItemsDurabilities.push({ name: nextItemName, durability: nextItemDurability });
        } else {
            console.log(`Durability not defined for item: ${nextItemName}`);
        }
    }
}
function useItemDurability2(amount,name) {
    checkIfItemsAndDurabilities2(name);
    for (let i = 0; i < yourItemsDurabilities.length; i++) {
        let item = yourItemsDurabilities[i];
        if (item.name  == name) {
            if (item.durability) {
                item.durability -= -amount;
            }
            if (item.durability <= 0) {
                updateInventory();
                item.durability = 0;
                yourItemsDurabilities = []
                deleteItems(item.name, 1);
                if (langPlactive == 1) {
                    showTextInCanvas("straciłeś strzały")
                } else {
                    showTextInCanvas("you lost arrows")
                }
            }
        }
    }
    if (totalAmountUsed < amount) {
        return;
    }
    let nextItemName = yourItems.find(item => !yourItemsDurabilities.some(d => d.name === item));
    if (nextItemName) {
        let nextItemDurability = itemsDurabilities[nextItemName];
        if (nextItemDurability !== undefined) {
            yourItemsDurabilities.length = 0;
            yourItemsDurabilities.push({ name: nextItemName, durability: nextItemDurability });
        } else {
            console.log(`Durability not defined for item: ${nextItemName}`);
        }
    }
}
function isNearPlanter(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
        if (block.type === 'plantmaker') {
            const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
            const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
            if (distanceX <= radius5 && distanceY <= radius5) {
                nearDecrafter = true;
            }
        }
    });
    return nearDecrafter;
}
function isNearDecrafter(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
        if (block.type === 'decrafter') {
            const distanceX = Math.abs((block.x +offsetX)- playerCenterX);
            const distanceY = Math.abs((block.y +offsetY)- playerCenterY);
            if (distanceX <= radius5 && distanceY <= radius5) {
                nearDecrafter = true;
            }
        }
    });
    return nearDecrafter;
}
function isNearUnknown(playerX, playerY) {
  let radius5 = 2 * blockSize;
  const playerCenterX = offsetX + canvas.width / 2;
  const playerCenterY = offsetY + canvas.height / 2;
  let nearDecrafter = false;
  renderedBlocks.forEach(block => {
    if (block.type === 'unknown') {
      const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
      const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
      if (distanceX <= radius5 && distanceY <= radius5) {
        nearDecrafter = true;
      }
    }
  });
  return nearDecrafter;
}
function isNearRedanvil(playerX, playerY) {
  let radius5 = 2 * blockSize;
  const playerCenterX = offsetX + canvas.width / 2;
  const playerCenterY = offsetY + canvas.height / 2;
  let nearDecrafter = false;
  renderedBlocks.forEach(block => {
    if (block.type === 'redanvil') {
      const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
      const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
      if (distanceX <= radius5 && distanceY <= radius5) {
        nearDecrafter = true;
      }
    }
  });
  return nearDecrafter;
}
function isNearFermentator(playerX, playerY) {
  let radius5 = 2 * blockSize;
  const playerCenterX = offsetX + canvas.width / 2;
  const playerCenterY = offsetY + canvas.height / 2;
  let nearDecrafter = false;
  renderedBlocks.forEach(block => {
    if (block.type === 'fermentator') {
      const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
      const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
      if (distanceX <= radius5 && distanceY <= radius5) {
        nearDecrafter = true;
      }
    }
  });
  return nearDecrafter;
}
function isNearFurnace(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
      if (block.type === 'lit_furnace') {
        const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
        const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
        if (distanceX <= radius5 && distanceY <= radius5) {
          nearDecrafter = true;
        }
      }
    });
    return nearDecrafter;
}
function isNearCauldron(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
        if (block.type === 'cauldron') {
            const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
            const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
            if (distanceX <= radius5 && distanceY <= radius5) {
                nearDecrafter = true;
            }
        }
    });
    return nearDecrafter;
}
function isNearWoodManipulator(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
      if (block.type === 'wood_manipulator') {
        const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
        const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
        if (distanceX <= radius5 && distanceY <= radius5) {
          nearDecrafter = true;
        }
      }
    });
    return nearDecrafter;
}
function isNearAlchemyTable(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
      if (block.type === 'alchemy_table') {
        const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
        const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
        if (distanceX <= radius5 && distanceY <= radius5) {
          nearDecrafter = true;
        }
      }
    });
    return nearDecrafter;
}
function isNearAnvil(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
      if (block.type === 'anvil') {
        const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
        const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
        if (distanceX <= radius5 && distanceY <= radius5) {
          nearDecrafter = true;
        }
      }
    });
    return nearDecrafter;
}
function isNearGodBench(playerX, playerY) {
	if(options.creativemode==0) return false ;
	let radius5 = 2 * blockSize;
	const playerCenterX = offsetX + canvas.width / 2;
	const playerCenterY = offsetY + canvas.height / 2;
	let nearDecrafter = false;
	renderedBlocks.forEach(block => {
		if (block.type === 'godbench') {
			const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
			const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
			if (distanceX <= radius5 && distanceY <= radius5) {
				nearDecrafter = true;
			}
		}
	});
	return nearDecrafter;
}

function deconstructItem(item) {
    let recipe = null;
    const recipeSources = [
        recipes,
        campfirerecipes,
        godstatuerecipes,
        furnacerecipes,
        alchemy_tableRecipes,
        wood_manipulator_recipes,
        anvilrecipes ,
        unknownrecipes,
        redanvilrecipes,
        fermentatorRecipes,
        kiln_recipes,
        plantmakerrecipes,
        cauldronrecipes,
        badseedrecipesplus,
        loomrecipes,
        godrecipes,
    ];
    for (let source of recipeSources) {
        if (source[item] && source[item][0] !== undefined) {
            recipe = source[item][0];
            break; 
        }
    }
    if (recipe) {
        deleteItems(item, 1); 
        recipe.forEach(material => {
            dropItemAtPlayerPosition(material);  
        });
        console.log(item + " has been deconstructed into its components.");
    } else {
        console.log("This item cannot be deconstructed.");
    }
}
var aschest=0;
var ininventory=0
inventoryScrollY=0;
let scrollInterval=false;
document.getElementById("crafting").addEventListener("wheel", e => { e.currentTarget.scrollBy(0, e.deltaY); e.preventDefault(); });

function openInventory() {
 offsetX = (Math.floor(offsetX / 32) * 32) + 17;  
offsetY = (Math.floor(offsetY / 32) * 32) + 10; 
 

          if(options.autopause==1){
          paused=1
          }else{
            paused=0
          }
          ininventory=1
            document.getElementById("inventory").style.visibility = "visible";
            document.getElementById("inventory").style.pointerEvents = "all";
            updateInventory();
            updateCrafting();
        }
let activeChest = false;         
let chestItems = [];             
const chestMaxItems = 20;        
function openInventory2() {
    if (!activeChest) return; 
    document.getElementById("inventory").style.visibility = "visible";
    document.getElementById("inventory").style.pointerEvents = "all";
updateCrafting(); updateInventory();
}
function openInventory3() {
    document.getElementById("inventory").style.visibility = "visible";
    document.getElementById("inventory").style.pointerEvents = "all";
updateCrafting(); updateInventory();
}
        function closeInventory() {
          activeChest=false;
          intrashcan=false;
           ininventory=0
           if(options.showuiinventory==1){
             updateInventory()
           }
if (options.autopause == 1) {
  paused = 1
  setTimeout(function(){paused=0; update() },300);
} else {
  paused = 1
  setTimeout(function(){paused=0; update() },300);
}
            document.getElementById("inventory").style.visibility = "hidden";
            document.getElementById("inventory").style.pointerEvents = "none";
        }
        function addItem(item, amount) {
            for (let i = 0; i < amount; i++) {
                if (yourItems.length < slots+5) {
                    yourItems.push(item);
                } else {
                    console.log("Not enough space!");
                    return;
                }
            }
            updateInventory();
            updateCrafting();
        }
        function deleteItems(item, amount) {
            let deleted = 0;
            for (let i = 0; i < yourItems.length && deleted < amount; i++) {
                if (yourItems[i] === item) {
                    yourItems.splice(i, 1);
                    i--;  
                    deleted++;
                }
            }
            updateInventory();
        }
        let achievementsfromcrafting={
            "iron_bar":["Metal century",0],
            "chest":["Storing data inside",0],
            "cavebuilder":["Damn, I'll finally plug the hole",0],
            "yellow":["Botanics !",0],
            "climbhill":["You've conquered the summit. Now it's time to climb Mount Everest.",2],
            "campfire":["It Warms you up",2],
            "copper_bar":["<span style='color:orange;' > Copper age</span>",0],
            "fermentator":["It smells bad",1],
            "beer":["Dont drunk yourself",0],
            "bottle":["<span style='color:lime;' > Bottle </span>",1],
            "wood_manipulator":["Wood is everywhere",2],
            "gelblock":["So sticky",0],
            "titaniumsword":["Fast sword !",0],
            "grasslayer":["<span style='color:lime;' > Get a grass </span>",2],
            "iron_sword":["Iron is really useful ",0],
            "silverlongsword":["Maybe it has hidden usage ?",0],
            "fishing_rod":["Its time to catch a fish",0],
            "broom":["Harry Potter?",1],
            "greenwand":["Hagrid ?",2],
            "door":["<span style='color:yellow;' > Its Time to build a house</span>",0],
            "titaniumbuff":["Buff yourself ",0],
            "osmiumbuff":["Kinda Like Hellbuff?",0],
            "hellbuff":["Made in hell",2],
            "dracobuff":["Made in heaven",1],
            "titaniumbar":["Light and hard metal ",0],
            "boomerang":["BANG ! ",0],
            "cooked_bunnmeat":["Cook something",0],
            "cooked_salmon":["Cook something",0],
            "cooked_trout":["Cook something",0],
            "arrows":["Time to shoot something",0],
            "hyperarrows":["More Arrows More Inventory",0],
            "hellbow":["Bow from Hell ",2],
            "moltenbow":["<span style='color: orange;' >Kawaii Ist So </span><span style='color:red;' > Hot</span>",2], 
            "sing":["You don't have to be a poet to write",0],
            "bed":["This is a comfortable bed !",0],
            "warporb":["Go to the overworld ..",0],
            "draco_boomerang":["<span style='color:pink;' >Draco Boomerang</span>",1],
            "moltensword":["<span style='color:orange;' >IT BURNS !!</span>",2],
            "lamptorch":["From torch to lamp",0],
            "magiclanter":["Magic is everywhere",2],
            "torch":["Its glowing !",0],
            "trueuniversesword":["<span style='color:#AACCEE;' >Sword from heaven </span>",1],
            "compass":["<span style='color:cyan;' >Never get lost </span>",2],
            "friedegg":["Du bist <span style='color:red;' >heiss</span>",0],
            "energybowl":["I need more <span style='color:yellow;' >Energy</span> for coding",0],
            "pickaxe":[" <span style='color:yellow;' >Time</span> to mine",0],
            "decrafter":[" <span style='color:pink;' >Reverse</span> Engineering",2],
            "soup":[" <span style='color:pink;' >Mmm</span> Yummy ;)",2],
            "evilsummoner":["<span style='color:red;' > Feeling the evil inside </span>",0],
        }
        function craftItem(item) {
    let TheItem = item;
 
if(item=="yeast"){
  dropItemAtPlayerPosition("bowl")
}
    const recipeGroups = [
        recipes,
        campfirerecipes,
        anvilrecipes,
        godstatuerecipes,
        furnacerecipes,
        wood_manipulator_recipes,
        alchemy_tableRecipes,
        fermentatorRecipes,
        unknownrecipes,
        redanvilrecipes,
        kiln_recipes,
        plantmakerrecipes,
        cauldronrecipes,
        badseedrecipesplus,
        loomrecipes,
        godrecipes,
    ];
    let recipesList = null;  
    let canCraft = false;
    let selectedRecipe = null;
    for (let group of recipeGroups) {
        recipesList = group[`${TheItem}`];  
        if (recipesList) {
            console.log(`Available recipes for ${TheItem} in current group: ${JSON.stringify(recipesList)}`);
            for (let recipe of recipesList) {
                console.log(`Checking recipe: ${JSON.stringify(recipe)}`); 
                if (canCraftRecipe(recipe)||options.creativemode==1) {
                    canCraft = true;
                    
                    selectedRecipe = recipe;  
                    break;  
                }
            }
        }
        if (canCraft&&options.creativemode!==1) {
            break;  
        }
    }
    if (canCraft && selectedRecipe ) {
        let ingredientsCount = {};  
        selectedRecipe.forEach(reqItem => {
            ingredientsCount[reqItem] = (ingredientsCount[reqItem] || 0) + 1;
        });
        for (let reqItem in ingredientsCount) {
            console.log(`Deleting ${ingredientsCount[reqItem]} of ${reqItem}`); 
            deleteItems(reqItem, ingredientsCount[reqItem]);
        }
if (achievementsfromcrafting[TheItem]) {
    let achievement = achievementsfromcrafting[TheItem];
        achievementget(achievement[0], achievement[1]); 
}
        addItem(TheItem, 1);
        console.log(`${TheItem} crafted!`);
    } else if (options.creativemode==1){
      addItem(TheItem, 1);
    }else{
        blockedsound();
        console.log(`Not enough items to craft ${TheItem}`);
    }
    updateCrafting();
}
function canCraftRecipe(recipe) {
    for (let reqItem of new Set(recipe)) {
        const requiredQuantity = recipe.filter(item => item === reqItem).length;
        if (!checkIfItems(reqItem, requiredQuantity)) {
            return false;
        }
    }
    return true; 
}
function checkIfItems(item, quantity) {
    return yourItems.filter(inventoryItem => inventoryItem === item).length >= quantity;
}
function deleteItems(item, quantity) {
    let deleted = 0;
    for (let i = 0; i < yourItems.length && deleted < quantity; i++) {
        if (yourItems[i] === item) {
            yourItems.splice(i, 1);
            i--;  
            deleted++;
        }
    }
    updateInventory();
}
function checkIfItems(item, quantity) {
    return yourItems.filter(inventoryItem => inventoryItem === item).length >= quantity;
}
let autoclose = 1; 
let selectedSlot = 0; 
let slotsCount = slots; 
function highlightSelectedSlot() {
    if ( options.showuiinventory == 1 && ininventory==0 && !isTouchDevice) {
        const slotElements = document.querySelectorAll("#a2slots .slot");
        slotElements.forEach((slot, i) => {
            slot.style.backgroundColor = i === selectedSlot ? "#004949" : "";
        });
    }
}
if (!isTouchDevice) {
    canvas.addEventListener("wheel", e => {
    	   slotsCount = slots; 
        selectedSlot += e.deltaY > 0 ? 1 : -1;
        if (selectedSlot < 0) selectedSlot = slotsCount - 1;
        if (selectedSlot >= slotsCount) selectedSlot = 0;
        highlightSelectedSlot();
        e.preventDefault(); 
    },{ once: true });
    
    document.addEventListener("keydown", e => {
    	const tag = event.target.tagName.toLowerCase();
if (tag === 'input' || tag === 'textarea') return;

if (e.key === "ArrowDown") {
	scrollInterval = setInterval(() => {
		crafting.scrollBy(0, 5);
	}, 10);
	e.preventDefault();
} else if (e.key === "ArrowUp") {
	scrollInterval = setInterval(() => {
		crafting.scrollBy(0, -5);
	}, 10);
	e.preventDefault();
}

if (e.key === "ArrowRight") {
	selectedSlot++;
	if (selectedSlot >= slots) selectedSlot = 0;
	highlightSelectedSlot();
	e.preventDefault();
} else if (e.key === "ArrowLeft") {
	selectedSlot--;
	if (selectedSlot < 0) selectedSlot = slots - 1;
	highlightSelectedSlot();
	e.preventDefault();
}
        if (e.code === "KeyC" || e.code=="c"|| key.code=="C") {
const item = yourItems[selectedSlot];
if (item) {
let i = item ;
if (yourItems[i] == "broom" && options.dropany==0 && options2.dropany == 0 && dropAll==0 ) {if (isflying == 0) {
item = "";isflying = 1;if (langPlactive == 1) {
    showTextInCanvas(".. latasz na miotle")
} else {
    showTextInCanvas("you are flying now")
}closeInventory();return;} else {
isflying = 0;item = "";if (langPlactive == 1) {
    showTextInCanvas(".. już nie latasz ")
} else {
    showTextInCanvas("you are on land now")
}closeInventory();return; }} else {dropItemAtPlayerPosition(yourItems[i]);} updateStamina(-5); yourItems.splice(i, 1); updateInventory(); updateCrafting();
miniMenu.style.display = "none";if (autoclose !== 0) { closeInventory(); }
            }
        }
    },{ once: true });
}
let touchMoved=false;
let slotevent=null
function updateInventory() {
    var slotsContainer = document.getElementById("slots");
    var slotsContainer2 = document.getElementById("a2slots");
    slotsContainer2.innerHTML = "";
    slotsContainer.innerHTML = "";  
autoclose=options.autoclose
if(options.quickbutton!==0){
	document.getElementById("quickbtn").style.display="block"
	let sequence=["none","FightMode","DropAny","UseAndFight"]
	document.getElementById("quickbtn").innerText=sequence[options.quickbutton]
	if(sequence[options.quickbutton]=="UseAndFight"||sequence[options.quickbutton]=="DropAny"){document.getElementById("quickbtn2").style.display="block"}else{document.getElementById("quickbtn2").style.display="none"}
	if(dropAll){ document.getElementById("quickbtn2").style.background="green" }else {document.getElementById("quickbtn2").style.background="red" }
}else{
	document.getElementById("quickbtn").style.display="none"
	 document.getElementById("quickbtn2").style.display="none"
	 if(dropAll){ document.getElementById("quickbtn2").style.background="green" }else {document.getElementById("quickbtn2").style.background="red" }
}
if(checkIfItems("bow",1)||checkIfItems("nightbow",1)||checkIfItems("darkbow",1)||checkIfItems("hellbow",1)||checkIfItems("quantumbow",1)||checkIfItems("moltenbow",1) ||checkIfItems("rainbowbow",1)    
	||checkIfItems("magicwand",1)||checkIfItems("greenwand",1)||checkIfItems("magicwandofsharp",1) ||checkIfItems("hyperblastwand",1) ||checkIfItems("godwand",1) 
	||checkIfItems("boomerang",1) ||checkIfItems("titanium_boomerang",1) ||checkIfItems("good_boomerang",1) ||checkIfItems("hell_boomerang",1) ||checkIfItems("draco_boomerang",1)
){
    document.getElementById("shootbtn").style.display="block"
    document.getElementById("quickbtn").style.top="25px"
    if(options.showuiinventory==1){
      document.getElementById("shootbtn2").style.display="block"
    }
}else{
    document.getElementById("shootbtn").style.display="none"
    document.getElementById("shootbtn2").style.display="none"
    document.getElementById("quickbtn").style.top="5px"
}
    for (let i = 0; i < slots; i++) {
        const slot = document.createElement("div");
        slot.classList.add("slot");
        slot.style.position = "relative"; 
        if (yourItems[i]) {
            const itemImg = document.createElement("img");
            if(allItems[yourItems[i]]){
            itemImg.src = allItems[yourItems[i]];
            }else{
           itemImg.src = allItems[yourItems["nullblock"]];
            }
            itemImg.classList = "itemImg";
            const itemName = document.createElement("div");
            itemName.classList.add("slot-name");
if (weaponsitems.includes(yourItems[i])) {
	itemName.style.color = "aqua"
} else if (craftingtools.includes(yourItems[i])) {
	itemName.style.color = "yellow"
}else if (eatable.includes(yourItems[i])) {
	itemName.style.color = "lime"
}
            if(langPl.items[yourItems[i]] && langPlactive==1){
            itemName.innerText = langPl.items[yourItems[i]]
            }else{
            itemName.innerText = yourItems[i];
if (langEN.items[yourItems[i]] && langPlactive == 0 ) {
	itemName.innerText = langEN.items[yourItems[i]]
}
            }
            const miniMenu = document.createElement("div");
            miniMenu.classList.add("mini-menu");
            miniMenu.style.position = "absolute";
            miniMenu.style.bottom = "-100%"; 
            miniMenu.style.left = "50%";
            miniMenu.style.transform = "translateX(-50%)";
            miniMenu.style.backgroundColor = "#333"; 
            miniMenu.style.zIndex="2"
            miniMenu.style.color = "#fff"; 
            miniMenu.style.padding = "5px";
            miniMenu.style.borderRadius = "5px";
            miniMenu.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
            miniMenu.style.zoom="0.8"
            miniMenu.style.display = "none"; 
            const dropButton = document.createElement("button");
            dropButton.innerText = "Drop/Use";
            dropButton.style.backgroundColor = "#444";
            dropButton.style.border = "none";
            dropButton.style.color = "#fff";
            dropButton.style.padding = "5px";
            dropButton.style.margin = "2px";
            dropButton.style.cursor = "pointer";
            dropButton.style.borderRadius = "3px";
dropButton.addEventListener("touchstart", () => {
if (yourItems[i] == "broom" && options.dropany==0 && options2.dropany == 0 && dropAll==0 ) {if (isflying == 0) {
item = "";isflying = 1;if (langPlactive == 1) {
    showTextInCanvas(".. latasz na miotle")
} else {
    showTextInCanvas("you are flying now")
}closeInventory();return;} else {
isflying = 0;item = "";if (langPlactive == 1) {
    showTextInCanvas(".. już nie latasz ")
} else {
    showTextInCanvas("you are on land now")
}closeInventory();return; }} else {dropItemAtPlayerPosition(yourItems[i]);} updateStamina(-5); yourItems.splice(i, 1); updateInventory(); updateCrafting();
miniMenu.style.display = "none";if (autoclose !== 0) { closeInventory(); }
});
            const removeButton = document.createElement("button");
            removeButton.innerText = "Remove";
            removeButton.style.backgroundColor = "#444";
            removeButton.style.border = "none";
            removeButton.style.color = "#fff";
            removeButton.style.padding = "5px";
            removeButton.style.margin = "2px";
            removeButton.style.cursor = "pointer";
            removeButton.style.borderRadius = "3px";
            removeButton.addEventListener("click", () => {
                const confirmDiv = document.createElement("div");
                confirmDiv.classList.add("confirm-modal");
                confirmDiv.style.position = "fixed";
                confirmDiv.style.top = "50%";
                confirmDiv.style.left = "50%";
                confirmDiv.style.transform = "translate(-50%, -50%)";
                confirmDiv.style.backgroundColor = "#333";
                confirmDiv.style.color = "#fff";
                confirmDiv.style.padding = "10px";
                confirmDiv.style.borderRadius = "8px";
                confirmDiv.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                confirmDiv.innerHTML = `
                    <div>Are you sure you want to do this action?</div>
                    <button id="yes-btn" style="background-color: #444; color: #fff; padding: 5px; margin: 5px; border: none; cursor: pointer; border-radius: 3px;">Yes</button>
                    <button id="no-btn" style="background-color: #444; color: #fff; padding: 5px; margin: 5px; border: none; cursor: pointer; border-radius: 3px;">No</button>
                `;
                document.body.appendChild(confirmDiv);
                confirmDiv.querySelector("#yes-btn").addEventListener("click", () => {
                    yourItems.splice(i, 1);
                    updateInventory();
                    document.body.removeChild(confirmDiv);
if (autoclose !== 0){ closeInventory();}
                });
                confirmDiv.querySelector("#no-btn").addEventListener("click", () => {
                    document.body.removeChild(confirmDiv);
                });
            });
            miniMenu.appendChild(dropButton);
            miniMenu.appendChild(removeButton);
if(options.quickinventory==0){
            slot.addEventListener("click", () => {
                miniMenu.style.display = miniMenu.style.display === "none" ? "block" : "none";
            });
}else{
if(slotevent){
slot.removeEventListener("touchstart",slotevent)
}
slotevent = slot.addEventListener("touchstart",(e)=>{
  let startX=e.touches[0].clientX
  let startY=e.touches[0].clientY
  let moved=false

  const onMove=(ev)=>{
    let dx=ev.touches[0].clientX-startX
    let dy=ev.touches[0].clientY-startY
    if(Math.abs(dx)>1||Math.abs(dy)>1){
      moved=true
    }
  }

  const onEnd=()=>{
    if(!moved){
      if(intrashcan==true){
        yourItems.splice(i,1)
        updateInventory()
        updateCrafting()
        showTextInCanvas("Deleted item ! ")
      }else{
        if(yourItems[i]=="broom"&&options.dropany==0&&options2.dropany==0&&dropAll==0){
          if(isflying==0){
            item=""
            isflying=1
            if(langPlactive==1){
              showTextInCanvas(".. latasz na miotle")
            }else{
              showTextInCanvas("you are flying now")
            }
            closeInventory()
            cleanup()
            return
          }else{
            isflying=0
            item=""
            if(langPlactive==1){
              showTextInCanvas(".. już nie latasz")
            }else{
              showTextInCanvas("you are on land now")
            }
            closeInventory()
            cleanup()
            return
          }
        }else{
          dropItemAtPlayerPosition(yourItems[i])
        }
        updateStamina(-5)
        yourItems.splice(i,1)
        updateInventory()
        updateCrafting()
        miniMenu.style.display="none"
        if(autoclose!==0){
          closeInventory()
        }
      }
    }
    cleanup()
  }

  const cleanup=()=>{
  }

slot.addEventListener("touchmove", onMove, { once: true })
slot.addEventListener("touchend", onEnd, { once: true })
},{ once: true })


}
            slot.appendChild(itemImg);
            slot.appendChild(itemName);
            slot.appendChild(miniMenu);
        }
        slot1=slot
        slotsContainer.appendChild(slot1);
if (options.showuiinventory == 1 && ininventory==0 && !activeChest && !intrashcan) {
  if(options.invertControls!==1){
    document.getElementById("slotsContainer2").style.left = "auto"
document.getElementById("slotsContainer2").style.right = "0px"
  slotsContainer2.appendChild(slot1);
  document.getElementById("statesBar").style.top = "45px"
  }else{
    document.getElementById("slotsContainer2").style.left = "0px"
document.getElementById("slotsContainer2").style.right = "auto"
document.getElementById("statesBar").style.top = "5px"
  slotsContainer2.appendChild(slot1);
  }
  if(options.invertBars==1){
  	document.getElementById("statesBar").style.top = "40px"
  	document.getElementById("statesBar").style.left = "5px"
  	document.getElementById("statesBar").style.right = "auto"
  }
}else{
	if (options.invertControls !== 1) {
	document.getElementById("statesBar").style.top = "5px"
} else {
	document.getElementById("statesBar").style.top = "5px"
}
if (options.invertBars == 1) {
	document.getElementById("statesBar").style.top = "40px"
	document.getElementById("statesBar").style.left = "5px"
	document.getElementById("statesBar").style.right = "auto"
}
}
    }
    highlightSelectedSlot();
}
        function canCraft(recipe) {
            const neededItems = [...recipe];
            const inventoryCopy = [...yourItems];
            for (let i = 0; i < neededItems.length; i++) {
                const index = inventoryCopy.indexOf(neededItems[i]);
                if (index !== -1 ||options.creativemode==1) {
                    inventoryCopy.splice(index, 1);  
                } else {
                    return false;  
                }
            }
            return true;
        }
function isNearCampfire(playerX, playerY) {
    let radius5 = 2 * blockSize;
    const playerCenterX = offsetX + canvas.width / 2;
    const playerCenterY = offsetY + canvas.height / 2;
    let nearDecrafter = false;
    renderedBlocks.forEach(block => {
      if (block.type === 'campfire') {
        const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
        const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
        if (distanceX <= radius5 && distanceY <= radius5) {
          nearDecrafter = true;
        }
      }
    });
    return nearDecrafter;
}
function isNearLoom(playerX, playerY) {
	let radius5 = 2 * blockSize;
	const playerCenterX = offsetX + canvas.width / 2;
	const playerCenterY = offsetY + canvas.height / 2;
	let nearDecrafter = false;
	renderedBlocks.forEach(block => {
		if (block.type === 'loom') {
			const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
			const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
			if (distanceX <= radius5 && distanceY <= radius5) {
				nearDecrafter = true;
			}
		}
	});
	return nearDecrafter;
}
function isNearGodstatue(playerX, playerY) {
	let radius5 = 2 * blockSize;
	const playerCenterX = offsetX + canvas.width / 2;
	const playerCenterY = offsetY + canvas.height / 2;
	let nearDecrafter = false;
	renderedBlocks.forEach(block => {
		if (block.type === 'statueofgods') {
			const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
			const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
			if (distanceX <= radius5 && distanceY <= radius5) {
				nearDecrafter = true;
			}
		}
	});
	return nearDecrafter;
}
function isNearKiln(playerX, playerY) {
 let radius5 = 2 * blockSize;
 const playerCenterX = offsetX + canvas.width / 2;
 const playerCenterY = offsetY + canvas.height / 2;
 let nearDecrafter = false;
 renderedBlocks.forEach(block => {
  if (block.type === 'lit_kiln') {
   const distanceX = Math.abs((block.x + offsetX) - playerCenterX);
   const distanceY = Math.abs((block.y + offsetY) - playerCenterY);
   if (distanceX <= radius5 && distanceY <= radius5) {
    nearDecrafter = true;
   }
  }
 });
 return nearDecrafter;
}
let showAllRecipes = false;  
function toggleAllRecipes() {
    showAllRecipes = !showAllRecipes;  
    updateCrafting();  
}
function canCraft(recipe) {
    const inventoryCopy = [...yourItems];  
    for (const requiredItem of recipe) {
        const index = inventoryCopy.indexOf(requiredItem);
        if (index !== -1) {
            inventoryCopy.splice(index, 1);  
        } else {
            return false;  
        }
    }
    return true;  
}
function canCraftAny(recipeVariants) {
    return recipeVariants.some(variant => canCraft(variant));  
}
var currentPage = 1
var recipesPerPage = 20
var chestsData={};
let eatable = [
  "candy",
  "bread",
  "healthbowl",
  "soup",
  "coconut",
  "carrot",
  "chips",
  "friedegg",
  "honey_mushrooms",
  "cooked_bunnmeat",
  "black_elderberries",
  "cooked_thistleroot",
  "kite",
  "pumpkin",
  "melonfruit",
  "briar-fruit",
  "bowl_with_water",
  "leafbowlwithcleanwater",
  "bucketwithcwater",
  "cooked_salmon",
  "cooked_trout",
  "cactus_fruit",
  "blackberry-fruit"
]
let craftingtools=["lit_furnace","furnace","campfire","anvil","redanvil","extinguished_campfire","plantmaker","cauldron","kiln","unknown","alchemy_table","fermentator","wood_manipulator","loom","godbench","decrafter"]
let weaponsitems = Object.keys(itemsAndDamage)
function updateCrafting() { 
 	const craftingContainer = document.getElementById("crafting")
craftingContainer.innerHTML = ""
let activeRecipes = { ...recipes }
if (seed.startsWith("badseed")) activeRecipes = { ...recipes, ...badseedrecipesplus }
if (isNearFurnace(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...furnacerecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Odkryto Piec</h3>";
	} else {
		craftingContainer.innerHTML += "<h3>Discovered the Furnace!</h3>";
	}
}
if (isNearCauldron(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...cauldronrecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Kocioł Ugotuj coś !</h3>";
	} else {
		craftingContainer.innerHTML += "<h3 style='color: pink' >Cauldron Cook something !</h3>";
	}
}
if (isNearCampfire(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...campfirerecipes };
	 
	if (inether && !generateCave) {
    campfirerecipes = {
        ...loomrecipes,
        "log": [["etherlog"]]
    };
} else {
    delete campfirerecipes["log"];
}
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Jest tu naprawdę ciepło ..</h3>";
	} else {
		craftingContainer.innerHTML += "<h3>It's really nice and hot</h3>";
	}
}
if (isNearLoom(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...loomrecipes };
	if (inether && !generateCave) {
    loomrecipes = {
        ...loomrecipes,
        "sapphire": [["ruby"]],
        "ruby": [["emerald"]],
        "emerald": [["sapphire"]]
    };
} else {
    delete loomrecipes["sapphire"];
    delete loomrecipes["ruby"];
    delete loomrecipes["emerald"];
}

	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Twórz Tkaniny...</h3>";
	} else {
		craftingContainer.innerHTML += "<h3>Make Fabrics...</h3>";
	}
}
if (isNearGodstatue(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...godstatuerecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "-";
	} else {
		craftingContainer.innerHTML += "-";
	}
}
if (isNearPlanter(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...plantmakerrecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3 style='color:lime;'>Zieolony świat</h3>";
	} else {
		craftingContainer.innerHTML += "<h3 style='color:lime;'>World is Green</h3>";
	}
}
if (isNearKiln(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...kiln_recipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Twarde Cegły</h3>";
	} else {
		craftingContainer.innerHTML += "<h3>Hard Bricks!</h3>";
	}
}
if (isNearUnknown(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...unknownrecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "Nieznana Statua służy do przywolywania bossów <h3 style='color:red'> Ważne: Nie klikaj w go gdy trzymasz spawner bossa to może go przywołać gdy nie jesteś jeszcze na to gotowy</h3>";
	} else {
		craftingContainer.innerHTML += "Unknown is an ancient statue for summoning ancient bosses. <h3 style='color:red'> Note: Do not click it while you are holding special summons that you can craft because this can summon a boss while you're not ready for it. Make a save first before the boss.</h3>";
	}
}
if (isNearRedanvil(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...redanvilrecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "Możesz stworzyć <h3 style='color:yellow'>Magiczne przedmioty</h3>";
	} else {
		craftingContainer.innerHTML += "You can craft <h3 style='color:yellow'>Magic items</h3>";
	}
}
if (isNearAlchemyTable(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...alchemy_tableRecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Jesteś doświadczonym alchemikiem ;) </h3>";
	} else {
		craftingContainer.innerHTML += "<h3>You are a skilled alchemist :)</h3>";
	}
}
if (isNearFermentator(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...fermentatorRecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Choduj kolonie bakterii :) </h3>";
	} else {
		craftingContainer.innerHTML += "<h3>You can farm a bacteria colony's ;) </h3>";
	}
}
if (isNearWoodManipulator(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...wood_manipulator_recipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Urzywasz manipulatora drewna :) </h3>";
	} else {
		craftingContainer.innerHTML += "<h3>Using Wood Manipulator Station :)</h3>";
	}
}
if (isNearAnvil(player.x, player.y)) {
	activeRecipes = { ...activeRecipes, ...anvilrecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Kowadło twórz bronie i zbroje!</h3>";
	} else {
		craftingContainer.innerHTML += "<h3>Forge weapons and armor at the Anvil!</h3>";
	}
}
if (isNearGodBench(player.x, player.y)) {
	activeRecipes = { ...godrecipes };
	if (langPlactive == 1) {
		craftingContainer.innerHTML += "MOŻESZ STWORZYĆ WSZYSTKO W TRYBIE KREATYWNYM";
	} else {
		craftingContainer.innerHTML += "YOU CAN CRAFT ANYTHING IN CREATIVE";
	}
}
if(options.creativemode){
	activeRecipes = { ...activeRecipes , "godbench":[["godbench"]] };
}
if (isNearDecrafter(player.x, player.y)) {
		if (langPlactive == 1) {
		craftingContainer.innerHTML += "<h3>Od Kraftuj przedmioty</h3>";
	}else{
	craftingContainer.innerHTML = "<h3>Decraft Items</h3>";
	}
	canbedecrafted.forEach(item => {
		if (yourItems.includes(item)) {
			const recipeDiv = document.createElement("div")
			recipeDiv.classList.add("recipe")
			recipeDiv.addEventListener("click", function() { deconstructItem(item) })
			const recipeImg = document.createElement("img")
			recipeImg.src = allItems[item] || "" 
			recipeDiv.appendChild(recipeImg)
			const recipeNameDiv = document.createElement("div")
			recipeNameDiv.classList.add("recipe-name")
			if (weaponsitems.includes(item)) {
				recipeNameDiv.style.color = "aqua"
			} else if (craftingtools.includes(item)) {
				recipeNameDiv.style.color = "yellow"
			} else if (eatable.includes(item)) {
				recipeNameDiv.style.color = "lime"
			}
			recipeNameDiv.innerText = langPlactive == 1 && langPl.items[item] ? langPl.items[item] : (langEN.items[item] && langPlactive == 0 ? langEN.items[item] : item)
			recipeDiv.appendChild(recipeNameDiv)
			craftingContainer.appendChild(recipeDiv)
		}
	})
}
let allRecipeNames = Object.keys(activeRecipes)
let visibleRecipes = allRecipeNames.filter(recipeName => {
	const recipeVariants = activeRecipes[recipeName]
	return canCraftAny(recipeVariants) || showAllRecipes
})
let pages = []
for (let i = 0; i < visibleRecipes.length; i += recipesPerPage) {
	pages.push(visibleRecipes.slice(i, i + recipesPerPage))
}
let totalPages = pages.length
 	currentPage=clamp(currentPage,1,totalPages)
  if (activeChest && Array.isArray(activeChest) && activeChest.length >= 2) {
    let chestKey = `${activeChest[0]},${activeChest[1]}`
    if (!chestsData[chestKey]) return
    let container = document.createElement("div")
    container.className = "slots2"
    for (let i = 0; i < 20; i++) {
      let slot = document.createElement("div")
      slot.className = "chestslot"
      let slotName = document.createElement("span")
      slotName.classList.add("chestslot-name")
if (weaponsitems.includes(slotName)) {
	slotName.style.color = "aqua"
} else if (craftingtools.includes(slotName)) {
	slotName.style.color = "yellow"
}else if (eatable.includes(slotName)) {
	slotName.style.color = "lime"
}
      let item = chestsData[chestKey][i]
      if (item) {
        let img = document.createElement("img")
        img.src = allItems[item] || ""
        slot.dataset.item = JSON.stringify([chestKey, i])
        slot.addEventListener("click", function () {
          let [ck, index] = JSON.parse(slot.dataset.item)
          if (chestsData[ck] && chestsData[ck][index] !== undefined) {
            if (checkEmptySlots(0)) {
              addItem(chestsData[ck][index], 1)
              chestsData[ck].splice(index, 1)
              updateCrafting()
            } else {
              if (!langPlactive) TextPopUp("no space")
              else TextPopUp("Brak miejsca")
            }
          }
        })
        slot.appendChild(img)
        slotName.innerHTML = langPlactive == 1 && langPl.items[item] ? langPl.items[item] : (langEN.items[item] && langPlactive == 0 ? langEN.items[item] : item)
      } else slotName.innerHTML = ""
      slot.appendChild(slotName)
      container.appendChild(slot)
      craftingContainer.appendChild(container)
    }
    return
  }
if (!isNearDecrafter(player.x, player.y)) {
let recipesToShow = pages[currentPage - 1] || []
  recipesToShow.forEach(recipeName => {
    const recipeVariants = activeRecipes[recipeName]
    const canCraftRecipe = canCraftAny(recipeVariants)
    const recipeDiv = document.createElement("div")
    recipeDiv.classList.add("recipe")
if (!canCraftRecipe && showAllRecipes) {
	recipeDiv.style.opacity = "0.5";
	if (options.creativemode == 1) {
		recipeDiv.style.opacity = "1";
	}
}
    if (canCraftRecipe || showAllRecipes) {
      recipeDiv.addEventListener("click", () => { if (canCraftRecipe || options.creativemode == 1) craftItem(recipeName) })
      const recipeImg = document.createElement("img")
      recipeImg.src = allItems[recipeName] || ""
      recipeDiv.appendChild(recipeImg)
      const recipeNameDiv = document.createElement("div")
      recipeNameDiv.classList.add("recipe-name")
      recipeNameDiv.innerText = langPlactive == 1 && langPl.items[recipeName] ? langPl.items[recipeName] : (langEN.items[recipeName] && langPlactive == 0 ? langEN.items[recipeName] : recipeName)
if (weaponsitems.includes(recipeName)) {
	recipeNameDiv.style.color = "aqua"
} else if (craftingtools.includes(recipeName)) {
	recipeNameDiv.style.color = "yellow"
}else if (eatable.includes(recipeName)) {
	recipeNameDiv.style.color = "lime"
}
recipeDiv.appendChild(recipeNameDiv)
      const itemsContainer = document.createElement("div")
      itemsContainer.style.display = "flex"
      itemsContainer.style.flexWrap = "wrap"
      recipeVariants.forEach(variant => {
        const variantDiv = document.createElement("div")
        variantDiv.classList.add("recipe-variant")
        if (variant) variant.forEach(item => {
          const itemImg = document.createElement("img")
          itemImg.src = allItems[item] || ""
          itemImg.style.width = "30px"
          itemImg.style.marginRight = "5px"
          const itemName = document.createElement("span")
          itemName.style.marginRight = "15px"
          itemName.innerText = langPlactive == 1 && langPl.items[item] ? langPl.items[item] : (langEN.items[item] && langPlactive == 0 ? langEN.items[item] : item)
          variantDiv.appendChild(itemImg)
          variantDiv.appendChild(itemName)
        })
        itemsContainer.appendChild(variantDiv)
      })
      recipeDiv.appendChild(itemsContainer)
      craftingContainer.appendChild(recipeDiv)
    }
  })
}
  if (intrashcan) craftingContainer.innerHTML = langPlactive == 1 ? "<h1 style='color:red;' >Kliknij Slot by usnąć z niego przedmiot (item)! </h1>" : "<h1 style='color:red;' >Click Any slot to remove item from it</h1>"
  const navContainer = document.createElement("div")
  navContainer.style.display = "flex"
  navContainer.style.alignItems = "center"
  navContainer.style.justifyContent = "center"
  navContainer.style.marginTop = "10px"
  navContainer.style.gap = "10px"
  const prevButton = document.createElement("button")
  prevButton.innerText = "<"
  prevButton.style = `
  background-color: #222;
  color: #fff;
  border: 2px solid #444;
  padding: 5px 5px;
  font-size: 16px;
  font-weight: bold;
`;
  prevButton.onclick = () => { currentPage--; updateCrafting(); craftingContainer.scrollTop = craftingContainer.scrollHeight }
  const pageInfo = document.createElement("span")
  pageInfo.innerText = `Page ${currentPage}/${totalPages}`
  const nextButton = document.createElement("button")
  nextButton.innerText = ">"
  nextButton.onclick = () => { currentPage++; updateCrafting(); craftingContainer.scrollTop = craftingContainer.scrollHeight }
nextButton.style = `
  background-color: #222;
  color: #fff;
  border: 2px solid #444;
  padding: 5px 5px;
  font-size: 16px;
  font-weight: bold;
`;
  navContainer.appendChild(prevButton)
  navContainer.appendChild(pageInfo)
  navContainer.appendChild(nextButton)
  craftingContainer.appendChild(navContainer)
}
document.getElementById("crafting").addEventListener("scroll",function(){
  if(ininventory==1&& document.getElementById("crafting").scrollTop!==0){
  inventoryScrollY= document.getElementById("crafting").scrollTop  
  } 
}) 
        openInventory();
        closeInventory()
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("GameSaveDB",2);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("gameStates")) {
        db.createObjectStore("gameStates", { keyPath: "slot" });
      }
    };
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    request.onerror = function(event) {
      reject(new Error("Failed to open IndexedDB: " + (event.target.error?.message || event.target.error || event.target.errorCode)));
    };
  });
}
function resetDB() {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase("GameSaveDB");
    deleteRequest.onsuccess = () => resolve();
    deleteRequest.onerror = (e) => reject(e);
  });
}



function showModal(message, onConfirmCallback) {
    const modal = document.getElementById('checkModal');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    modalMessage.innerHTML = message; 
    confirmBtn.onclick = function() {
        onConfirmCallback(); 
        closeModal(); 
    };
    cancelBtn.onclick = function(){
const modal = document.getElementById('checkModal');
modal.style.display = 'none'; 
    }
    modal.style.display = 'flex'; 
}
function showTextInput(message, onConfirmCallback) {
    const modal = document.getElementById('checkModal2');
    const modalMessage = document.getElementById('modalMessage2');
    const confirmBtn = document.getElementById('confirmBtn2');
const input = document.getElementById('input2');
    modalMessage.innerHTML = message; 
    confirmBtn.onclick = function() {
        if(input.value){
        onConfirmCallback(input.value);  
        closeModal2(); 
        closeInventory();
        }
    };
    modal.style.display = 'flex'; 
}
function closeModal() {
    const modal = document.getElementById('checkModal');
    modal.style.display = 'none'; 
}
function closeModal2() {
    const modal = document.getElementById('checkModal2');
    modal.style.display = 'none'; 
}
async function loadGameState(slot) {
  if(lightningActive2){
    customAlert("can't load game state when boss is loading "); return;
  }
    showModal("Are you sure you want to end this game to load save?", async function() {
        showLoadingScreen(); 
try {
      const db = await initDB();
      const transaction = db.transaction("gameStates", "readonly");
      const store = transaction.objectStore("gameStates");
      const request = store.get(slot);
      request.onsuccess = function(event) {
        selectedslot=slot
        const gameState = event.target.result;
        if (!gameState) {
          customAlert("No save found in slot " + slot);
          hideLoadingScreen(); 
          return;
        }
        updfixbug = 1
if (gameState.seed) {
  seed = gameState.seed
} else {
  seed = Math.floor(10 ** 15 + Math.random() * 9 * 10 ** 15).toString();
}
if (gameState.storelastdimension) {
	storelastdimension = gameState.storelastdimension
}
 
 
stats = { lv: 0 }
if (gameState.stats) {
	let stateShitOrSomething = JSON.parse(gameState.stats)
	if (stateShitOrSomething) {
		for (let key in stateShitOrSomething) {
			stats[key] = stateShitOrSomething[key];
		}
		updateStats()
	}
}
 updateStats()
        if (gameState.AVAILABLE_IDS) {
          AVAILABLE_IDS = gameState.AVAILABLE_IDS
        }
        if (gameState.VISIBLEIDS) {
          VISIBLEIDS = gameState.VISIBLEIDS
        }
if (gameState.achievements1 !== null && gameState.achievements1) {
    achievements = (gameState.achievements1);
} else {
    achievements = []
}
if (gameState.currentHunger) {
	currentHunger =  gameState.currentHunger
}
if (gameState.currentThirst) {
	currentThirst = gameState.currentThirst
}
if(gameState.etherEventJson){
	etherEventActive = gameState.etherEventJson['etherEventActive']
	currentWave = gameState.etherEventJson['currentWave']
	maxWaves = gameState.etherEventJson['maxWaves']
	waveEnemies = gameState.etherEventJson['waveEnemies']
	etherChunkKey = gameState.etherEventJson['etherChunkKey']
	etherBlockIndex = gameState.etherEventJson['etherBlockIndex']
	waveInProgress = gameState.etherEventJson['waveInProgress']
}else{
	etherEventActive = false
waveInProgress = false;
currentWave = 0;
etherBlockIndex = null;
etherChunkKey = null
waveEnemies = []
}
updateHunger(0);
updateThirst(0);
if(gameState.chestsData){
  chestsData=JSON.parse(gameState.chestsData)
}
        inhell = 0; isinhouse = 0; isinhouse2 = 0; inabyss = 0; isunderwater = 0; inether = 0; generateCaveForEther=0;
        curseofgos = gameState.curseofgos;
        offsetX = gameState.offsetX;
        offsetY = gameState.offsetY;
        increasing = gameState.increasing;
        isRaining = gameState.isRaining;
        nightpower = gameState.nightpower;
        slots = gameState.slots;
        cannotmove = gameState.cannotmove;
        if (gameState.border) {
        border=gameState.border
        }
 if (options) {
    let gameStateOptions = JSON.parse(gameState.options);
    Object.keys(options).forEach(key => {
        if (!(key in gameStateOptions)) {
            gameStateOptions[key] = options[key];
        }
    });
    options = gameStateOptions;
    if(options.quickbutton){document.getElementById('QuickButton').value=options.quickbutton}
}
        activatedCheats = gameState.activatedCheats;
        yourItemsDurabilities = JSON.parse(gameState.yourItemsDurabilities),
          currentHP = gameState.currentHP;
        currentStamina = gameState.currentStamina;
        generateCave = gameState.generateCave;
        yourItems = JSON.parse(gameState.yourItems);
        overworldChunks = JSON.parse(gameState.overworldChunks);
        housechunks = JSON.parse(gameState.houseChunks);
        caveChunks = JSON.parse(gameState.caveChunks);
        seachunks = JSON.parse(gameState.seachunks);
if(gameState.caveChunks2){
	caveChunks2=JSON.parse(gameState.caveChunks2)
}
if (gameState.generateCaveForEther) {
	generateCaveForEther = gameState.generateCaveForEther
}
if(gameState.etherchunks){
etherchunks = JSON.parse(gameState.etherchunks);
}
if (gameState.inether) {
	inether = gameState.inether
}
        abysschunks = JSON.parse(gameState.abysschunks);
        if (gameState.savedinworld) {
        player.savedinworld = (gameState.savedinworld);
        }
        if (gameState.hellchunks) {
          hellchunks = JSON.parse(gameState.hellchunks);
        }
        if (gameState.hellchunks) {
            hellchunks = JSON.parse(gameState.hellchunks);
        }
        if (gameState.house2chunks) {
            house2chunks = JSON.parse(gameState.house2chunks);
        }
        if (gameState.inhell) {
          inhell = gameState.inhell
        }
        if (gameState.isinhouse2) {
    isinhouse2 = gameState.isinhouse2
}
if (gameState.dayscount) {
    surviveddays = gameState.dayscount
}
 if (gameState.spawnX) {
  player.spawnX = gameState.spawnX
  player.spawnY = gameState.spawnY
} else {
  player.spawnX = 0
  player.spawnY = 0
}
        if (typeof gameState.renderedEnemies === "string") {
          renderedEnemies = JSON.parse(gameState.renderedEnemies);
        } else {
          renderedEnemies = (gameState.renderedEnemies);
        }
        oxygen = gameState.oxygen;
        inabyss = gameState.inabyss;
        isunderwater = gameState.isunderwater;
        isinhouse = gameState.isinhouse;
        chunks = JSON.parse(gameState.chunks);
if (isinhouse2 == 1) {
    chunks = house2chunks;
}else if (inabyss == 1) {
    chunks = abysschunks;
} else if (inether == 1) {
    chunks = etherchunks;
}else if (isunderwater == 1) {
          chunks = seachunks;
        } else if (generateCave == 1) {
          chunks = caveChunks;
        } else if (isinhouse == 1) {
          chunks = housechunks;
        } else if (inhell == 1) {
          chunks = hellchunks;
        } else {
        }
        updateInventory();
        updateCrafting();
        setTimeout(() => {
          hideLoadingScreen(); 
          playMusic(); 
        }, 500); 
        setTimeout(function() {
          updfixbug = 0
        }, 1000)
document.querySelectorAll('button[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
document.querySelectorAll('div[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
        playMusic();
      };
options.shoot=1
      request.onerror = function(event) {
        customAlert("Failed to load game: " + event.target.errorCode);
        hideLoadingScreen(); 
      };
    } catch (error) {
      customAlert("Error: " + error);
      hideLoadingScreen(); 
    }
    });
}
async function loadGameState3(slot) {
    showLoadingScreen(); 
    try {
      const db = await initDB();
      const transaction = db.transaction("gameStates", "readonly");
      const store = transaction.objectStore("gameStates");
selectedslot=slot
      const request = store.get(slot);
      request.onsuccess = function(event) {
        selectedslot=slot
        const gameState = event.target.result;
        if (!gameState) {
          customAlert("No save found in slot " + slot);
          hideLoadingScreen(); 
          return;
        }
        updfixbug = 1
if (gameState.seed) {
  seed = gameState.seed
} else {
  seed = Math.floor(10 ** 15 + Math.random() * 9 * 10 ** 15).toString();
}
if (gameState.storelastdimension) {
	storelastdimension = gameState.storelastdimension
}
stats = { lv: 0 }
if (gameState.stats) {
	let stateShitOrSomething = JSON.parse(gameState.stats)
	if (stateShitOrSomething) {
		for (let key in stateShitOrSomething) {
			stats[key] = stateShitOrSomething[key];
		}
		updateStats()
	}
}
updateStats()
        if (gameState.AVAILABLE_IDS) {
          AVAILABLE_IDS = gameState.AVAILABLE_IDS
        }
        if (gameState.VISIBLEIDS) {
          VISIBLEIDS = gameState.VISIBLEIDS
        }
if (gameState.achievements1 !== null && gameState.achievements1) {
    achievements = (gameState.achievements1);
} else {
    achievements = []
}
if (gameState.currentHunger) {
	currentHunger =  gameState.currentHunger
}
if (gameState.currentThirst) {
	currentThirst = gameState.currentThirst
}
if(gameState.etherEventJson){
	etherEventActive = gameState.etherEventJson['etherEventActive']
	currentWave = gameState.etherEventJson['currentWave']
	maxWaves = gameState.etherEventJson['maxWaves']
	waveEnemies = gameState.etherEventJson['waveEnemies']
	etherChunkKey = gameState.etherEventJson['etherChunkKey']
	etherBlockIndex = gameState.etherEventJson['etherBlockIndex']
	waveInProgress = gameState.etherEventJson['waveInProgress']
}else{
	etherEventActive = false
waveInProgress = false;
currentWave = 0;
etherBlockIndex = null;
etherChunkKey = null
waveEnemies = []
}
updateHunger(0);
updateThirst(0);
if(gameState.chestsData){
  chestsData=JSON.parse(gameState.chestsData)
}
        inhell = 0; isinhouse = 0; isinhouse2 = 0; inabyss = 0; isunderwater = 0; inether = 0; generateCaveForEther=0;
        curseofgos = gameState.curseofgos;
        offsetX = gameState.offsetX;
        offsetY = gameState.offsetY;
        increasing = gameState.increasing;
        isRaining = gameState.isRaining;
        nightpower = gameState.nightpower;
        slots = gameState.slots;
        cannotmove = gameState.cannotmove;
        if (gameState.border) {
        border=gameState.border
        }
 if (options) {
    let gameStateOptions = JSON.parse(gameState.options);
    Object.keys(options).forEach(key => {
        if (!(key in gameStateOptions)) {
            gameStateOptions[key] = options[key];
        }
    });
    options = gameStateOptions;
    if(options.quickbutton){document.getElementById('QuickButton').value=options.quickbutton}
}
        activatedCheats = gameState.activatedCheats;
        yourItemsDurabilities = JSON.parse(gameState.yourItemsDurabilities),
          currentHP = gameState.currentHP;
        currentStamina = gameState.currentStamina;
        generateCave = gameState.generateCave;
        yourItems = JSON.parse(gameState.yourItems);
        overworldChunks = JSON.parse(gameState.overworldChunks);
        housechunks = JSON.parse(gameState.houseChunks);
        caveChunks = JSON.parse(gameState.caveChunks);
        seachunks = JSON.parse(gameState.seachunks);
if(gameState.caveChunks2){
	caveChunks2=JSON.parse(gameState.caveChunks2)
}
if (gameState.generateCaveForEther) {
	generateCaveForEther = gameState.generateCaveForEther
}
if(gameState.etherchunks){
etherchunks = JSON.parse(gameState.etherchunks);
}
if (gameState.inether) {
	inether = gameState.inether
}
        abysschunks = JSON.parse(gameState.abysschunks);
        if (gameState.savedinworld) {
        player.savedinworld = (gameState.savedinworld);
        }
        if (gameState.hellchunks) {
          hellchunks = JSON.parse(gameState.hellchunks);
        }
        if (gameState.hellchunks) {
            hellchunks = JSON.parse(gameState.hellchunks);
        }
        if (gameState.house2chunks) {
            house2chunks = JSON.parse(gameState.house2chunks);
        }
        if (gameState.inhell) {
          inhell = gameState.inhell
        }
        if (gameState.isinhouse2) {
    isinhouse2 = gameState.isinhouse2
}
if (gameState.dayscount) {
    surviveddays = gameState.dayscount
}
 if (gameState.spawnX) {
  player.spawnX = gameState.spawnX
  player.spawnY = gameState.spawnY
} else {
  player.spawnX = 0
  player.spawnY = 0
}
        if (typeof gameState.renderedEnemies === "string") {
          renderedEnemies = JSON.parse(gameState.renderedEnemies);
        } else {
          renderedEnemies = (gameState.renderedEnemies);
        }
        oxygen = gameState.oxygen;
        inabyss = gameState.inabyss;
        isunderwater = gameState.isunderwater;
        isinhouse = gameState.isinhouse;
        chunks = JSON.parse(gameState.chunks);
if (isinhouse2 == 1) {
    chunks = house2chunks;
}else if (inabyss == 1) {
    chunks = abysschunks;
} else if (inether == 1) {
    chunks = etherchunks;
}else if (isunderwater == 1) {
          chunks = seachunks;
        } else if (generateCave == 1) {
          chunks = caveChunks;
        } else if (isinhouse == 1) {
          chunks = housechunks;
        } else if (inhell == 1) {
          chunks = hellchunks;
        } else {
        }
        updateInventory();
        updateCrafting();
        setTimeout(() => {
          hideLoadingScreen(); 
          playMusic(); 
        }, 500); 
        setTimeout(function() {
          updfixbug = 0
        }, 1000)
document.querySelectorAll('button[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
document.querySelectorAll('div[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
        playMusic();
      };
options.shoot=1
      request.onerror = function(event) {
        customAlert("Failed to load game: " + event.target.errorCode);
        hideLoadingScreen(); 
      };
    } catch (error) {
      customAlert("Error: " + error);
      hideLoadingScreen(); 
    }
}
let savedtimes = 0;
let saveTimer = null;
async function saverest(slot) {
	if (!saveTimer) {
		savedtimes = 1;
		saveTimer = setInterval(() => {
			if (savedtimes >= 5) {
				achievementget("Uhm...saving ONE time is enough, y'know?", 1);
				clearInterval(saveTimer);
				saveTimer = null;
			}
			savedtimes = 0;
		}, 30000);
	}
	savedtimes++;
	try {
		 
		const db = await initDB();
		const transaction = db.transaction("gameStates", "readwrite");
const store = transaction.objectStore("gameStates");
		if (saveNames.includes(slot)) {
			showModal("Are you sure to overwrite this game?", async function() {
				await saveToDB(db, store, slot);
				customAlert("Game saved successfully in slot " + slot);
			});
		} else {
			await saveToDB(db, store, slot);
			customAlert("Game saved successfully in slot " + slot);
		}
	} catch (error) {
		customAlert("Failed to save game: " + error);
	}
}
async function saveGameState(slot) {
	if (beforecreatedtrue == 1) { showModal("You CANT save Your game when boss isn't on screen !", function() {}); return; }
	if (checkIfHasEnemy("trueuniversehead", 1)) {
		showModal("You are Fighting with TRUE UNIVERSE, saving isn't a good idea?", function() { saverest(slot) });
		return;
	}
	saverest(slot)
}
async function saveToDB(db, store, slot) {
    const transaction = db.transaction("gameStates", "readwrite");
    const storeWrite = transaction.objectStore("gameStates");
    const gameState = {
        slot,
        curseofgos,
        stats:JSON.stringify(stats),
        offsetX,
        offsetY,
        increasing,
        isRaining,
        nightpower,
        slots,
        VISIBLEIDS,
        AVAILABLE_IDS,
        cannotmove,
        options: JSON.stringify(options),
        yourItemsDurabilities: JSON.stringify(yourItemsDurabilities),
        activatedCheats,
        currentHP,
        currentHunger,
        currentThirst,
        currentStamina,
        generateCave,
        generateCaveForEther,
        caveChunks2:JSON.stringify(caveChunks2),
        yourItems: JSON.stringify(yourItems),
        overworldChunks: JSON.stringify(overworldChunks),
        hellchunks: JSON.stringify(hellchunks),
        houseChunks: JSON.stringify(housechunks),
        caveChunks: JSON.stringify(caveChunks),
        house2chunks: JSON.stringify(house2chunks),
        seachunks: JSON.stringify(seachunks),
        etherchunks: JSON.stringify(etherchunks),
        abysschunks: JSON.stringify(abysschunks),
        renderedEnemies: (RENDEREDENEMIES2),
        oxygen,
        inabyss,
        isunderwater,
        isinhouse,
        isinhouse2,
        inhell,
        inether,
        dayscount: surviveddays,
        chestsData: JSON.stringify(chestsData),
        spawnX: player.spawnX,
        spawnY: player.spawnY,
        chunks: JSON.stringify(chunks),
        dataChunksStructures,
        savedinworld: player.savedinworld,
        achievements1: achievements,
        seed,
        border,
        storelastdimension,
        etherEventJson: {  etherEventActive:etherEventActive, currentWave:currentWave,  maxWaves:maxWaves , waveEnemies:waveEnemies,  etherChunkKey:etherChunkKey, etherBlockIndex:etherBlockIndex, waveInProgress:waveInProgress  }
    };
    storeWrite.put(gameState);
    upadtegameslots()
}
function showLoadingScreen() {
    const loadingScreen = document.createElement("div");
    loadingScreen.id = "loadingScreen";
    loadingScreen.style.position = "fixed";
    loadingScreen.style.top = "0";
    loadingScreen.style.left = "0";
    loadingScreen.style.width = "100%";
    loadingScreen.style.height = "100%";
    loadingScreen.style.opacity = "0.5";
    loadingScreen.style.backgroundColor = "black";
    loadingScreen.style.zIndex = "9";
    loadingScreen.style.display = "flex";
    loadingScreen.style.justifyContent = "center";
    loadingScreen.style.alignItems = "center";
    loadingScreen.style.color = "white";
    loadingScreen.style.fontSize = "13px";
    loadingScreen.style.fontFamily = "'pffont'";
    loadingScreen.textContent = "be patient, loading can take some time ...";
    document.body.appendChild(loadingScreen);
    updateTextMenuLoading()
    splashrandomize()
}
function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
        loadingScreen.remove();
    }
}
  function loadGameState2(slot) {
    showModal("Are you sure to load olddata.slot this is unstable in newest versions", async function() {
  if(slot==undefined ){
    slot=""
  }
selectedslot=slot
  inabyss=0
  housechunks={}
  chunks={}
  overworldChunks={}
  caveChunks={}
  updfixbug=1
  seachunks={}
  renderedEnemies=[]
  isinhouse=0
  isunderwater=0
  generateCave=0
  abysschunks={}
  inabyss=0
if(isunderwater==1){
  isunderwater = 0;
}
if(localStorage.getItem('entities'+slot)){
renderedEnemies = JSON.parse(localStorage.getItem('entities'+slot))
}
    increasing=false
    const generatesea = localStorage.getItem('generatesea'+slot);
    let generateabyss = 0;
    if(localStorage.getItem('generateabyss'+slot)){
     generateabyss = parseInt(localStorage.getItem('generateabyss'+slot))
    }else{
      generateabyss =0
    }
    const storedsea = localStorage.getItem('seachunks'+slot);
    const storedabyss = localStorage.getItem('abysschunks'+slot);
    const storedPlayerX = localStorage.getItem('playerX'+slot);
    const storedPlayerY = localStorage.getItem('playerY'+slot);
    nightpower=localStorage.getItem('nightcycle'+slot)
    if(localStorage.getItem('options'+slot)){
    options=JSON.parse(localStorage.getItem('options'+slot))
    }
notabletoreturn987444=1
if(localStorage.getItem('oxygenlevel'+slot)) {
oxygen=parseInt(localStorage.getItem('oxygenlevel'+slot))
}
    if(localStorage.getItem('rainingcycle'+slot)){
      if(localStorage.getItem('rainingcycle'+slot)==true || localStorage.getItem('rainingcycle'+slot)=="true"){
    isRaining=true ;
      }else{
isRaining=false ;
      }
    }
    if(localStorage.getItem('Hp'+slot)){
      if(localStorage.getItem('Hp'+slot)!==null){
    currentHP=parseFloat(localStorage.getItem('Hp'+slot))
        const healthBar = document.getElementById('healthBar');
        const healthPercentage = (currentHP / maxHP) * 100;
        healthBar.style.width = healthPercentage + '%';
}}
    if(localStorage.getItem('slots'+slot)){
      if(localStorage.getItem('Hp'+slot)!==null){
    slots=parseFloat(localStorage.getItem('slots'+slot))
}}
if(localStorage.getItem('curseofgos'+slot)){
      if(localStorage.getItem('curseofgos'+slot)!==null){
    curseofgos=parseFloat(localStorage.getItem('curseofgos'+slot))
}}
if(localStorage.getItem('cheatsanabled'+slot)){
      if(localStorage.getItem('cheatsanabled'+slot)!==null){
    activatedCheats =parseFloat(localStorage.getItem('cheatsanabled'+slot))
}}
if(localStorage.getItem('cannotmove'+slot)){
      if(localStorage.getItem('cannotmove'+slot)!==null){
    cannotmove=parseFloat(localStorage.getItem('cannotmove'+slot))
}}
setTimeout(function (){
if (localStorage.getItem('increasing' + slot)) {
  if((localStorage.getItem('increasing' + slot))==true){
    increasing=true
  }
}
},2000)
if (localStorage.getItem('St'+slot)) {
  if (localStorage.getItem('St'+slot) !== null) {
    currentStamina = parseFloat(localStorage.getItem('St'+slot))
}}
    setTimeout(function (){
      increasing=true
    },5000)
    if (storedPlayerX !== null && storedPlayerY !== null) {
        offsetX = Infinity
        offsetY = Infinity 
    }
setTimeout(function(){
      if (storedPlayerX !== null && storedPlayerY !== null) {
      offsetX = parseFloat(storedPlayerX);
      offsetY = parseFloat(storedPlayerY);
    }
},200)
    const storedItems = localStorage.getItem('youritems'+slot);
    if (storedItems !== null) {
        yourItems = JSON.parse(storedItems);
        updateInventory();
updateCrafting();
    }
    const storedChunks = localStorage.getItem('chunks'+slot);
    if (storedChunks !== null) {
        chunks = JSON.parse(storedChunks);
        overworldChunks = chunks
    }
    const storedCave = localStorage.getItem('InCave'+slot);
const cavechunksg = localStorage.getItem('cave'+slot);
if (storedCave !== null && cavechunksg !== null) {
    if(storedabyss.length>5){
  abysschunks =JSON.parse(storedabyss);
  }
    setTimeout(function () {
      if (generateabyss == 1) { 
  playMusic();
  overworldChunks = JSON.parse(localStorage.getItem('overworldChunks'));
  chunks = JSON.parse(storedabyss);
  delayChangeDimension = 1;
  caveChunks = JSON.parse(cavechunksg);
  seachunks=JSON.parse(storedsea);
  if (localStorage.getItem('house' + slot) !== null) {
    housechunks = JSON.parse(localStorage.getItem('house' + slot))
  }
  inabyss = 1;
            setTimeout(function () {
                delayChangeDimension = 0;
            }, 5000);
} else  if(generatesea==1){
        isunderwater=1
        overworldChunks = JSON.parse(localStorage.getItem('overworldChunks'));
        abysschunks =JSON.parse(storedabyss);
        delayChangeDimension = 1;
        chunks = JSON.parse(storedsea);
        caveChunks = JSON.parse(cavechunksg);
      if (localStorage.getItem('house' + slot) !== null) {
        housechunks = JSON.parse(localStorage.getItem('house' + slot))
      }
setTimeout(function() {
  delayChangeDimension = 0;
}, 5000);
      } else {
        if(storedsea && storedsea!==null){
        seachunks= JSON.parse(storedsea);
        }
          if (localStorage.getItem('house' + slot) !== null) {
              housechunks = JSON.parse(localStorage.getItem('house' + slot))
            }
        if (parseInt(storedCave) == 1) {
            renderedEnemies = [];
            chunks = JSON.parse(cavechunksg); 
            generateCave = 1;
            if (localStorage.getItem('house' + slot) !== null) {
  housechunks = JSON.parse(localStorage.getItem('house' + slot))
            }
            delayChangeDimension = 1;
            setTimeout(function () {
                delayChangeDimension = 0;
            }, 5000);
        } else if (parseInt(storedCave) == 0) {
            caveChunks = JSON.parse(cavechunksg);
            generateCave = 0;
            delayChangeDimension = 1;
            setTimeout(function () {
                delayChangeDimension = 0;
            }, 5000);
            if (localStorage.getItem('isinhouse'+slot) !== 1) {
            }
            if(localStorage.getItem('isinhouse'+slot)){
  if(localStorage.getItem('house'+slot)){
      if(localStorage.getItem('house'+slot)!==null){
    housechunks = JSON.parse(localStorage.getItem('house'+slot))
    if (localStorage.getItem('isinhouse'+slot) == 1) {
  delayChangeDimension = 1;
 overworldChunks = JSON.parse(storedChunks);
  isinhouse = 1;
  chunks = housechunks;
  setTimeout(function() {
    synchronizeVisibleChunks()
    overworldChunks = JSON.parse(storedChunks);
  }, 100);
}}
}}
        }
        setTimeout(function (){notabletoreturn987444=0},2000)
      }
    }, 500);
    if (Array.isArray(housechunks)) {
  housechunks = {}; 
}
}
if (paused == 1) {
  paused = 0
  update()
  paused = 1
}
setTimeout(function() {
  updfixbug = 0
}, 1000)
document.querySelectorAll('button[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
document.querySelectorAll('div[data-var]').forEach(button => {
	const varName = button.getAttribute('data-var');
	updateButtonStyle(button, options[varName]);
});
playMusic();
});
}
    function updateMovement(direction, isActive) {
        switch (direction) {
            case 'up-left':
                moveLeft = isActive;
                moveUp = isActive;
                break;
            case 'up':
                moveUp = isActive;
                break;
            case 'up-right':
                moveRight = isActive;
                moveUp = isActive;
                break;
            case 'left':
                moveLeft = isActive;
                break;
            case 'empty':
                break;
            case 'right':
                moveRight = isActive;
                break;
            case 'down-left':
                moveLeft = isActive;
                moveDown = isActive;
                break;
            case 'down':
                moveDown = isActive;
                break;
            case 'down-right':
                moveRight = isActive;
                moveDown = isActive;
                break;
        }
    }
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', () => {
            updateMovement(button.dataset.direction, true);
        });
        button.addEventListener('touchend', () => {
            updateMovement(button.dataset.direction, false);
        });
        button.addEventListener('touchend', () => {
            updateMovement(button.dataset.direction, false);
        });
    });
const joystick = document.getElementById('joystick');
const thumb = document.getElementById('thumb');
let joystickActive = false;
let thumbOffsetX = 0,
  thumbOffsetY = 0;
let currentTouchIndex = null; 
let secondTouchIndex = null; 
function roundToNearest(degrees, roundTo = 10) {
  return Math.round(degrees / roundTo) * roundTo;
}
const activeTouches = {}; 
joystick.addEventListener('touchstart', (e) => {
  if (joystickActive) return;
  joystickActive = true;
  for (let i = 0; i < e.touches.length; i++) { 
    const touch = e.touches[i];
    const joystickRect = joystick.getBoundingClientRect();
    if(touch.clientX && touch.clientX!==undefined){
    if (
      touch.clientX >= joystickRect.left &&
      touch.clientX <= joystickRect.right &&
      touch.clientY >= joystickRect.top &&
      touch.clientY <= joystickRect.bottom
    ) {
      currentTouchIndex = touch.identifier; 
      activeTouches[currentTouchIndex] = { x: touch.clientX, y: touch.clientY };
      thumb.style.display = 'block';
      thumbOffsetX = touch.clientX - joystickRect.left - 20;
      thumbOffsetY = touch.clientY - joystickRect.top - 20;
      thumb.style.left = `${thumbOffsetX}px`;
      thumb.style.top = `${thumbOffsetY}px`;
    }
  }}
});
joystick.addEventListener('touchmove', (e) => {
  if (!joystickActive || currentTouchIndex === null) return;
  let touch = e.touches[currentTouchIndex];
  if (e.touches.length > 1 && secondTouchIndex === null) {
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const joystickRect = joystick.getBoundingClientRect();
      if(touch.clientX && touch.clientX!==undefined){
      if (
        touch.clientX >= joystickRect.left &&
        touch.clientX <= joystickRect.right &&
        touch.clientY >= joystickRect.top &&
        touch.clientY <= joystickRect.bottom
      ) {
        currentTouchIndex = i; 
        break;
      }
    }}
  }
  const joystickRect = joystick.getBoundingClientRect();
  let deltaX = 0
let deltaY = 0
  if(touch.clientX){
   deltaX = touch.clientX - joystickRect.left - 35;
   deltaY = touch.clientY - joystickRect.top - 35;
  }
  let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI; 
  angle = roundToNearest(angle, 10);
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance > 30) {
    thumbOffsetX = 30 * Math.cos(angle * Math.PI / 180); 
    thumbOffsetY = 30 * Math.sin(angle * Math.PI / 180); 
  } else {
    thumbOffsetX = deltaX;
    thumbOffsetY = deltaY;
  }
  thumb.style.left = `${thumbOffsetX + 35 +30/2}px`; 
  thumb.style.top = `${thumbOffsetY + 35 +30/2}px`; 
  moveLeft = thumbOffsetX < -14
  moveRight = thumbOffsetX >14
  moveUp = thumbOffsetY < -14
  moveDown = thumbOffsetY > 14
});
joystick.addEventListener('touchend', (e) => {
  if (!joystickActive) return;
jebacszkole=0
jebacszkole5=0
  joystickActive = false;
  thumb.style.display = 'none'; 
  thumb.style.left = '20px'; 
  thumb.style.top = '20px';
  thumbOffsetX = 0; 
  thumbOffsetY = 0; 
  moveLeft = moveRight = moveUp = moveDown = false;
  currentTouchIndex = null;
  secondTouchIndex = null;
});
document.addEventListener('keydown', (e) => {
	const tag = event.target.tagName.toLowerCase();
if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 'a') moveLeft = true;
    if (e.key === 'd') moveRight = true;
    if (e.key === 'w') moveUp = true;
    if (e.key === 's') moveDown = true;
});
document.addEventListener('keyup', (e) => {
	const tag = event.target.tagName.toLowerCase();
if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 'a') moveLeft = false;
    if (e.key === 'd') moveRight = false;
    if (e.key === 'w') moveUp = false;
    if (e.key === 's') moveDown = false;
}); 
  let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
function updateFPS() {
    const now = performance.now();
    frameCount++;
    const deltaTime = now - lastFrameTime;
    if (deltaTime >= 1000) { 
        fps = (frameCount / deltaTime) * 1000;
        frameCount = 0;
        lastFrameTime = now;
        document.getElementById('fpsCounter').textContent = `FPS: ${fps.toFixed(1)}`;
    }
    requestAnimationFrame(updateFPS); 
}
updateFPS();
if(document.getElementById("profiler")){
function profilerLoop_profiler123(){requestAnimationFrame(profilerLoop_profiler123)}
profilerLoop_profiler123()

const profiler_profiler123=document.getElementById("profiler")
const content_profiler123=document.getElementById("profiler-content")
const resizeHandle_profiler123=document.getElementById("profiler-resize")

profiler_profiler123.style.cssText="position:absolute;top:0;left:0;width:250px;height:200px;background:rgba(0,0,0,0.85);color:#0f0;font:12px monospace;z-index:9999;overflow:hidden;display:none;user-select:text !important;"

const styleSel=document.createElement("style")
styleSel.textContent="#profiler,#console-panel::selection{background:blue;color:#fff}"
document.head.appendChild(styleSel)


const console_profiler123=document.createElement("div")
console_profiler123.id="console-panel"
console_profiler123.style.cssText="position:fixed;bottom:0;left:0;width:250px;height:200px;background:#111;color:#0f0;font:12px monospace;z-index:9999;overflow:auto;display:none;white-space:pre-wrap;user-select:text !important;"
document.body.appendChild(console_profiler123)

const nav_profiler123=document.createElement("div")
nav_profiler123.style.cssText="position:fixed;bottom:200px;left:0;display:flex;z-index:10000;"
const btnProfiler=document.createElement("button")
btnProfiler.textContent="Profiler"
btnProfiler.style.cssText="padding:4px 8px;background:#333;color:#0f0;border:none;cursor:pointer;"
const btnConsole=document.createElement("button")
btnConsole.textContent="Console"
btnConsole.style.cssText="padding:4px 8px;background:#333;color:#0f0;border:none;cursor:pointer;"
nav_profiler123.appendChild(btnProfiler)
nav_profiler123.appendChild(btnConsole)
document.body.appendChild(nav_profiler123)
nav_profiler123.addEventListener("touchstart", e => {
 draggingNav = true
 let z = parseFloat(document.body.style.zoom) || 1
 navOffsetX = (e.touches[0].clientX / z) - nav_profiler123.offsetLeft
 navOffsetY = (e.touches[0].clientY / z) - nav_profiler123.offsetTop
})
nav_profiler123.addEventListener("touchmove", e => {
 if (draggingNav) {
  e.preventDefault()
  let z = parseFloat(document.body.style.zoom) || 1
  let x = (e.touches[0].clientX / z) - navOffsetX
  let y = (e.touches[0].clientY / z) - navOffsetY
  x = Math.max(0, Math.min(x, document.documentElement.clientWidth/z - nav_profiler123.offsetWidth))
  y = Math.max(0, Math.min(y, document.documentElement.clientHeight/z - nav_profiler123.offsetHeight))
  nav_profiler123.style.left = (x / document.documentElement.clientWidth * (100*z)) + "%"
  nav_profiler123.style.top = (y / document.documentElement.clientHeight * (100*z) ) + "%"
  nav_profiler123.style.bottom = "auto"
 }
}, { passive: false })

 

let currentPanel=null
function showPanel(panel){
 if(currentPanel===panel){
  profiler_profiler123.style.display="none"
  console_profiler123.style.display="none"
  currentPanel=null
  return
 }
 profiler_profiler123.style.display="none"
 console_profiler123.style.display="none"
 if(panel==="profiler")profiler_profiler123.style.display="block"
 if(panel==="console")console_profiler123.style.display="block"
 currentPanel=panel
}
btnProfiler.onclick=()=>showPanel("profiler")
btnConsole.onclick=()=>showPanel("console")


const timings_profiler123={}
let fps_profiler123=0,last_profiler123=performance.now(),frames_profiler123=0
const skip_profiler123 = [
 "some", "filter", "map", "reduce", "forEach", "find", "findIndex",
 "slice", "splice", "push", "pop", "shift", "unshift", "concat", "join",
 "indexOf", "includes", "every", "sort", "reverse", "__proto__", "constructor","replace",
 "loadAsync"
]

function wrapFunctions_profiler123(obj_profiler123, name_profiler123 = "") {
 for (let key_profiler123 in obj_profiler123) {
  if (skip_profiler123.includes(key_profiler123)) continue
  try {
   let val_profiler123 = obj_profiler123[key_profiler123]
   if (typeof val_profiler123 === "function" && !val_profiler123.__wrapped) {
    obj_profiler123[key_profiler123] = function(...a_profiler123) {
     let t1 = performance.now(),
      r
     try {
      r = val_profiler123.apply(this, a_profiler123)
     } catch (e) {
      const div = document.createElement("div")
      div.style.color = "red"
      div.textContent = `${e.message} @${e.stack||""}`
      console_profiler123.appendChild(div)
      console_profiler123.scrollTop = console_profiler123.scrollHeight
      throw e
     }
     let t2 = performance.now()
     timings_profiler123[(name_profiler123 ? name_profiler123 + "." : "") + key_profiler123] = (t2 - t1).toFixed(2)
     return r
    }
    obj_profiler123[key_profiler123].__wrapped = true
   }
  } catch (e) {}
 }
}
if(window.JSZip){
 skip_profiler123.push(...Object.keys(JSZip.prototype))
 skip_profiler123.push("JSZip") 
}

wrapFunctions_profiler123(window)
const observer_profiler123=new MutationObserver(()=>wrapFunctions_profiler123(window))
observer_profiler123.observe(document,{childList:true,subtree:true})

function renderProfiler_profiler123(){
 if(profiler_profiler123.style.display=="block"){
 let h="FPS: "+fps_profiler123+"<br>"
 let entries=Object.entries(timings_profiler123)
 entries.sort((a,b)=>parseFloat(b[1])-parseFloat(a[1]))
 for(let [k,v] of entries){
   h+=`<span style="color:green">${k}</span>: ${v}ms<br>`
 }
 content_profiler123.innerHTML=h
}}

var ttgl34_ui5tyFrtVghyjk_67=0
function trackFPS_profiler123(){
 if(ttgl34_ui5tyFrtVghyjk_67){
  if(currentPanel==="profiler")profiler_profiler123.style.display="block"
  nav_profiler123.style.display="block"
 }else{
  profiler_profiler123.style.display="none"
  nav_profiler123.style.display="none"
  requestAnimationFrame(trackFPS_profiler123)
  return
 }
 frames_profiler123++
 let now=performance.now()
 if(now-last_profiler123>=1000){
  fps_profiler123=frames_profiler123
  frames_profiler123=0
  last_profiler123=now
 }
 requestAnimationFrame(trackFPS_profiler123)
}
trackFPS_profiler123()
setInterval(renderProfiler_profiler123,500)

const header_profiler123=document.getElementById("profiler-header")
let dragging=false,offsetX=0,offsetY=0
header_profiler123.addEventListener("touchstart",e=>{
 dragging=true
 let z=parseFloat(document.body.style.zoom)||1
 offsetX=(e.touches[0].clientX/z)-profiler_profiler123.offsetLeft
 offsetY=(e.touches[0].clientY/z)-profiler_profiler123.offsetTop
})
document.addEventListener("touchmove",e=>{
 if(dragging){
  e.preventDefault()
  let z=parseFloat(document.body.style.zoom)||1
  let x=(e.touches[0].clientX/z)-offsetX
  let y=(e.touches[0].clientY/z)-offsetY
  x=Math.max(0,Math.min(x,(document.documentElement.clientWidth+2)/z-profiler_profiler123.offsetWidth))
  y=Math.max(0,Math.min(y,(document.documentElement.clientHeight+2)/z-profiler_profiler123.offsetHeight))
  profiler_profiler123.style.left=x+"px"
  profiler_profiler123.style.top=y+"px"
 }
},{passive:false})
document.addEventListener("touchend",()=>dragging=false)

let resizing=false,startX=0,startY=0,startW=0,startH=0
resizeHandle_profiler123.addEventListener("touchstart",e=>{
 resizing=true
 let z=parseFloat(document.body.style.zoom)||1
 startX=e.touches[0].clientX/z
 startY=e.touches[0].clientY/z
 startW=profiler_profiler123.offsetWidth
 startH=profiler_profiler123.offsetHeight
 e.stopPropagation()
})
document.addEventListener("touchmove",e=>{
 if(resizing){
  e.preventDefault()
  let z=parseFloat(document.body.style.zoom)||1
  let nw=startW+(e.touches[0].clientX/z-startX)
  let nh=startH+(e.touches[0].clientY/z-startY)
  nw=Math.max(100,Math.min(nw,(document.documentElement.clientWidth+2)/z-profiler_profiler123.offsetLeft))
  nh=Math.max(50,Math.min(nh,(document.documentElement.clientHeight+2)/z-profiler_profiler123.offsetTop))
  profiler_profiler123.style.width=nw+"px"
  profiler_profiler123.style.height=nh+"px"
 }
},{passive:false})
document.addEventListener("touchend",()=>resizing=false)
const origLog=console.log
console.log=function(...args){
 origLog.apply(console,args)
 const msg=args.map(a=>(typeof a==="object"?JSON.stringify(a):a)).join(" ")
 const div=document.createElement("div")
 div.style.color="#0f0"
 div.textContent=msg
 console_profiler123.appendChild(div)
 console_profiler123.scrollTop=console_profiler123.scrollHeight
}


window.addEventListener("error", e => {
 const div = document.createElement("div")
 div.style.color = "red"
 div.textContent = `${e.message} @${e.filename}:${e.lineno}:${e.colno}`
 console_profiler123.appendChild(div)
 console_profiler123.scrollTop = console_profiler123.scrollHeight
})

window.addEventListener("unhandledrejection", e => {
 const div = document.createElement("div")
 div.style.color = "orange"
 div.textContent = `UnhandledPromiseRejection: ${e.reason}`
 console_profiler123.appendChild(div)
 console_profiler123.scrollTop = console_profiler123.scrollHeight
})
}

function toggleDebug(){
 ttgl34_ui5tyFrtVghyjk_67=ttgl34_ui5tyFrtVghyjk_67==0?1:0
}
