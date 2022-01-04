import * as THREE from "../build/three.module.js";
import {renderer, state, Listens, CurrentCamera, IsVR, IsPointer,CurrentScene,keyStates} from "./main.js";

export function initMainScene() {
    CurrentScene[0].background = new THREE.Color(0x88ccff);
    CurrentCamera[0].rotation.order = 'YXZ';
    const CanvasObject = document.getElementById("canvas");
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(CanvasObject.width, CanvasObject.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    CanvasObject.appendChild(renderer.domElement);
    if (!IsVR)
        CanvasObject.appendChild(state.domElement)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(400, 200, 300);
    CurrentScene[0].add(directionalLight);
    // 平行光2
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight2.position.set(-400, -200, -300);
    CurrentScene[0].add(directionalLight2);
    //环境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    CurrentScene[0].add(ambient);
    BindEventInMainScene();
    window.addEventListener('resize', onWindowResize);
}

export function onWindowResize() {
    CurrentCamera[0].aspect = window.innerWidth / window.innerHeight;
    CurrentCamera[0].updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function BindEventInMainScene() {
    const pointer = document.getElementById("pointer_center");
    if (IsPointer) {
        pointer.style.visibility = "visible"
    } else {
        pointer.style.visibility = "hidden"
    }

    let event1 = {//行走
        name: 'keydown',
        key(event) {
            keyStates[event.code] = true;
        },
        type: "document"
    }
    document.addEventListener(event1.name, event1.key);
    Listens.push(event1)
    let event2 = {//行走
        name: 'keyup',
        key(event) {
            keyStates[event.code] = false;
        },
        type: "document"
    }
    document.addEventListener(event2.name, event2.key);
    Listens.push(event2)
    let event3 = {//锁定鼠标
        name: 'mousedown',
        key(event) {
            document.body.requestPointerLock();
        },
        type: "document"
    }
    if (IsPointer) {
        document.addEventListener(event3.name, event3.key);
        Listens.push(event3)
    }

    let event4 = {//改变方向
        name: 'mousemove',
        key(event) {
            if (document.pointerLockElement === document.body) {

                CurrentCamera[0].rotation.y -= event.movementX / 500;
                CurrentCamera[0].rotation.x -= event.movementY / 500;

            }
        },
        type: "document"
    }
    if (IsPointer) {
        document.addEventListener(event4.name, event4.key);
        Listens.push(event4)
    }
}

export function initMapScene() {
    if(IsVR){
        CurrentCamera[0].position.set(0, 10, 10);

        CurrentCamera[0].lookAt(new THREE.Vector3(0, 0, 0))
    }else{
        CurrentCamera[0].position.set(0, 80, 100);
        CurrentCamera[0].lookAt(new THREE.Vector3(0, 0, 0))
    }
    const path = './素材/Img/MapSceneImg/Sky_cube';
    const format = '.jpg';
    const urls = [
        path + 'right' + format, path + 'left' + format,
        path + 'top' + format, path + 'bottom' + format,
        path + 'front' + format, path + 'back' + format,
    ]
    CurrentScene[0].background = new THREE.CubeTextureLoader().load(urls);
}

export function initTranScene() {
    CurrentCamera[0].position.set(0, 80, 100);
    CurrentCamera[0].lookAt(new THREE.Vector3(0, 0, 0))
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(400, 200, 300);
    CurrentScene[0].add(directionalLight);
}
