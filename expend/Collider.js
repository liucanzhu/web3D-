import * as THREE from "../build/three.module.js";
import {Octree} from "../jsm/math/Octree.js";
import {Capsule} from "../jsm/math/Capsule.js";

export class Collider {
    constructor(OriginCameraPosition) {
        this.clock = new THREE.Clock();
        this.GRAVITY = 30;
        this.STEPS_PER_FRAME = 0.5;//调成0.5 符合人的正常行走
        this.worldOctree = new Octree();
        this.playerCollider = new Capsule( new THREE.Vector3( 0, 0.35, 0 ), new THREE.Vector3( 0,1, 0), 0.35 );
        this.playerCollider.translate(OriginCameraPosition[0]);
        this.OriginCameraPosition =OriginCameraPosition;
        this.playerVelocity = new THREE.Vector3();
        this.playerDirection = new THREE.Vector3();
        this.playerOnFloor = false;
    }
    GetOriginCameraPosition(){
        return this.OriginCameraPosition[0];
    }
    playerCollitions() {
        const result = this.worldOctree.capsuleIntersect( this.playerCollider );
        this.playerOnFloor = false;
        if ( result ) {
            this.playerOnFloor = result.normal.y > 0;
            if ( ! this.playerOnFloor ) {
                this.playerVelocity.addScaledVector( result.normal, - result.normal.dot( this.playerVelocity ) );//将playerVelocity和damping的倍数添加到此向量
            }
            //将碰撞机位置更新到相机位置
            this.playerCollider.translate( result.normal.multiplyScalar( result.depth ));//.multiplyScalar(s)将此向量乘以标量s。
        }
    }
    updatePlayer( deltaTime ,camera) {
        if ( this.playerOnFloor ) {
            const damping = Math.exp( - 10 * deltaTime ) - 1;
            this.playerVelocity.addScaledVector( this.playerVelocity, damping );//将playerVelocity和damping的倍数添加到此向量
        } else {
            this.playerVelocity.y -= this.GRAVITY * deltaTime;
        }
        const deltaPosition = this.playerVelocity.clone().multiplyScalar( deltaTime );
        this.playerCollider.translate( deltaPosition );
        this.playerCollitions();//控制物体穿透检测
        //相加跟随移动
        camera.position.copy( this.playerCollider.end );
        this.OriginCameraPosition[0] = camera.position.clone();
    }
    getForwardVector(camera) {

        camera.getWorldDirection( this.playerDirection );
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
        return this.playerDirection;
    }
    getSideVector(camera) {
        camera.getWorldDirection( this.playerDirection );
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
        this.playerDirection.cross( camera.up );
        return this.playerDirection;
    }
    controls( deltaTime ,keyStates,camera) {
        const speed = 50;
        if ( this.playerOnFloor ) {

            if ( keyStates[ 'KeyW' ] ) {
                this.playerVelocity.add( this.getForwardVector(camera).multiplyScalar( speed * deltaTime ) );
            }
            if ( keyStates[ 'KeyS' ] ) {
                this.playerVelocity.add( this.getForwardVector(camera).multiplyScalar( - speed * deltaTime ) );
            }
            if ( keyStates[ 'KeyA' ] ) {
                this.playerVelocity.add( this.getSideVector(camera).multiplyScalar( - speed * deltaTime ) );
            }
            if ( keyStates[ 'KeyD' ] ) {
                this.playerVelocity.add( this.getSideVector(camera).multiplyScalar( speed * deltaTime ) );
            }
        }
    }
    update(camera,keyStates){
        const deltaTime = Math.min( 0.02, this.clock.getDelta() ) / this.STEPS_PER_FRAME;
        this.controls( deltaTime ,keyStates,camera);
        this.updatePlayer( deltaTime ,camera);

    }
}


