import * as THREE from "../build/three.module.js";
import {GUI} from "../jsm/libs/dat.gui.module.js";
import Stats from "../jsm/libs/stats.module.js";
import {MainSceneClass} from "./MainScene.js";
import {MapSceneClass} from "./MapScene.js";
import {BindEventInMainScene, onWindowResize} from "./init.js";
import {TranSceneClass} from "./TranScene.js";
import {XR} from "./XR.js";

let IsVR = false;//是否加载VR
let IsPointer = true;//是否加载鼠标锁定
const renderer = new THREE.WebGLRenderer({antialias: true});
let MainScene = new THREE.Scene();
let MapScene = new THREE.Scene();
let TranScene = new THREE.Scene();
MainScene.name = "MainScene";
MapScene.name = "MapScene";
TranScene.name = "TranScene";
const k = window.innerWidth / window.innerHeight
const MapCamera = new THREE.PerspectiveCamera(75, k, 0.1, 1000);
const MainCamera = new THREE.PerspectiveCamera(75, k, 0.1, 1000);
const TranCamera = new THREE.PerspectiveCamera(75, k, 0.1, 1000);
let UserCamera = new THREE.PerspectiveCamera(75, k, 0.1, 1000);//适配VR
let CurrentScene = [MainScene];
let CurrentCamera = [MainCamera];
let state = null;
let gui = null;
let keyStates = {};
let Listens = [];
let mapScene = null;
let mainScene = null;
let tranScene = null;
let IsCreateMapScene = false;
let IsCreateMainScene = true;
let IsCreateTranScene = false;
const User = new THREE.Group();
let VR = null;
let OriginCameraPosition = [new THREE.Vector3(29.6, 3.4, -7.476)];//起始坐标 5,3.4,-21.476
const Secelt = document.querySelector(".main");
const InterButton = document.querySelector("#Internet");
const VRButton = document.querySelector("#VR");

const Loading = document.querySelector("#loading");
const LoadText = document.querySelector(".loadText")

const ProgressText = document.querySelector(".shadow")
const Progressbackground = document.querySelector(".bar");

const PointerCenter = document.querySelector("#pointer_center");

let TweenText = null;
let TweenDiv = null;
let TweenProgress = null;
const DisplayLoad = (event) => {
    if (event.path[0].className === "Internet") {
        IsVR = false;
        IsPointer = true;
        gui = new GUI();
        state = new Stats();
    } else if (event.path[0].className === "VR") {
        IsVR = true;
        IsPointer = false;
        VR = new XR();

    }
    Secelt.style.display = "none";
    Loading.style.display = "block"
    const text = ["Loading", "Loading.", "Loading..", "Loading..."]
    let textObject = {
        time: 0
    }
    let ProgressValue = {
        value: 0
    }
    InterButton.removeEventListener("click", DisplayLoad);
    VRButton.removeEventListener("click", DisplayLoad);
    TweenText = TweenLite.to(textObject, {
        duration: 3,
        time: 4,
        repeat: -1,
        ease: Linear.easeNone,
        onUpdate: function () {
            LoadText.innerHTML = text[Math.floor(textObject.time)];
        },
    })
    TweenDiv = TweenLite.to(".load", {
        duration: 3,
        rotation: "+=360",
        ease: Linear.easeNone,
        repeat: -1,
    });
    TweenProgress = TweenLite.to(ProgressValue, {
        value: 101,
        duration: 3,
        onStart: function () {
            console.log("开始加载...");
            var createDiv = document.createElement("div");
            createDiv.id = "canvas";
            createDiv.style.width = "100%";
            createDiv.style.height = "100%";
            document.body.appendChild(createDiv);

            mainScene = new MainSceneClass(OriginCameraPosition);
        },
        onUpdate: function () {
            ProgressText.innerHTML = Math.floor(ProgressValue.value) + "%";
            Progressbackground.style["clip-path"] = `polygon(0% 0, ${ProgressValue.value}% 0, ${ProgressValue.value}% 100%, 0 100%)`;
        },
        onComplete: function () {
            Loading.style.display = "none"
            TweenText.kill();
            TweenDiv.kill();
            TweenProgress.kill();
            if (IsPointer) {
                PointerCenter.style.display = "block";
            }
            console.log("完成加载...")
            if (IsVR) {
                User.add(UserCamera);
                CurrentScene[0].add(User);
                renderer.setAnimationLoop(animate);
            } else {
                animate();
            }
            onWindowResize();
        }
    })
}
InterButton.addEventListener("click", DisplayLoad);
VRButton.addEventListener("click", DisplayLoad);

function animate() {
    if (CurrentScene[0].name === "MainScene") {
        if (IsCreateMapScene) {
            if(IsVR){
                VR.ReInit();
                CurrentScene[0].add(User)
            }
            let li_e = [];
            if (Listens.length !== 0) {
                Listens.forEach(function (e) {
                    if (e.type === "windowByMap")
                        window.removeEventListener(e.name, e.key);
                    if (e.type === "windowByMain") {
                        li_e.push(e);
                        window.addEventListener(e.name, e.key);
                    }
                })
            }
            MapScene.children.forEach(function (e) {
                if(e.type==="Mesh"){
                    e.geometry?.dispose();
                    e.material?.dispose();
                }

                MapScene.remove(e);
            })
            MapScene = new THREE.Scene();
            mapScene = null;
            IsCreateMapScene = false;
            Listens = [];
            Listens.concat(Listens, li_e);
            BindEventInMainScene();
            if(IsVR){
                User.remove(UserCamera);
                UserCamera =  new THREE.PerspectiveCamera(75, k, 0.1, 1000);
                UserCamera.position.copy(new THREE.Vector3(0,0,0));
                UserCamera.lookAt(new THREE.Vector3(0,0,0));
                User.add(UserCamera);
            }
        }
        mainScene.animate();
    } else if (CurrentScene[0].name === "MapScene") {
        if (!IsCreateMapScene) {
            if(IsVR){
                VR.ReInit();
                CurrentScene[0].add(User)
            }
            mapScene = new MapSceneClass();
            TranScene.children.forEach(function (e) {
                console.log(e);
                TranScene.remove(e);
                if(e.type==="Mesh"){
                    e.geometry.dispose();
                    e.material.dispose();
                }


            })
            TranScene = new THREE.Scene();
            tranScene = null;
            IsCreateTranScene = false;
            IsCreateMapScene = true;
            if(IsVR){
                User.remove(UserCamera);
                UserCamera =  new THREE.PerspectiveCamera(75, k, 0.1, 1000);
                UserCamera.position.copy(new THREE.Vector3(0,0,0));
                UserCamera.lookAt(new THREE.Vector3(0,0,0));
                User.add(UserCamera);
            }

        }
        mapScene.animate();
    } else if (CurrentScene[0].name === "TranScene") {
        if (!IsCreateTranScene) {
            if(IsVR){
                VR.ReInit();
                CurrentScene[0].add(User)
            }

            tranScene = new TranSceneClass( true);
            Listens.forEach(function (e) {
                if (e.type === "document")
                    document.removeEventListener(e.name, e.key);
                if (e.type === "windowByMain") {
                    window.removeEventListener(e.name, e.key);
                }
                if (e.type === "canvas") {
                    const canvas = document.getElementById("#canvas");
                    canvas.removeEventListener(e.name, e.key);
                }
            })
            if(IsVR){
                User.remove(UserCamera);
                UserCamera =  new THREE.PerspectiveCamera(75, k, 0.1, 1000);
                UserCamera.position.copy(new THREE.Vector3(0,0,0));
                UserCamera.lookAt(new THREE.Vector3(0,0,0));
                User.add(UserCamera);
            }

            IsCreateTranScene = true;
        }
        tranScene.animate();
    }
    if (!IsVR) {
        requestAnimationFrame(animate);
    }
}

export {
    MainScene,
    MapScene,
    CurrentScene,
    MapCamera,
    MainCamera,
    CurrentCamera,
    renderer,
    state,
    gui,
    Listens,
    IsCreateMapScene,
    IsCreateMainScene,
    TranCamera,
    TranScene,
    User,
    UserCamera,
    IsVR,
    IsPointer,
    keyStates,
    mainScene,
    VR,
}
