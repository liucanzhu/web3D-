import * as THREE from "../build/three.module.js";
import * as BAS from "./bas.module.js";
import {Geometry} from "../jsm/deprecated/Geometry.js";

export class BASMesh {
    constructor( PictureMesh = null, type = "") {
        this.Picture = PictureMesh;//图片碎片化切换效果 or 图片碎片化渐隐效果
        this.type = type;//图片碎片化渐隐效果
        this.PictureName = PictureMesh.name;//传进来的Mesh的name
    }

    createMesh(arg) {
        if (this.type === "Card") {
            this.createMeshOfCard(arg);
        } else if (this.type === "Picture") {
            this.createMeshOfPicture(arg);
        }
    }
    createTween(otherFun = null){
        if (this.type === "Card") {
            this.createTweenOfCard(otherFun );
        } else if (this.type === "Picture") {
            this.createTweenOfPicture(otherFun );
        }
    }

    createMeshOfPicture(arg) {
        let width = arg.width;//图片宽度
        let height = arg.height;//图片高度
        let img = arg.image;//图片纹理
        let PathImgMethod = arg.PathImgMethod;//动画方式 "in" or "out"
        let extendX = arg.extendX;//图片动画范围
        let extendY = arg.extendY;//图片动画范围
        let extendZ = arg.extendZ;//图片动画范围
        let fragmentX =arg.fragmentX || width *20;//x分段
        let fragmentY =arg.fragmentY || height *20;//y分段
        const that = this;
        let PlaneGeometry = new THREE.PlaneGeometry(width, height, fragmentX, fragmentY);
        PlaneGeometry = new Geometry().fromBufferGeometry(PlaneGeometry);
        BAS.Utils.separateFaces(PlaneGeometry);
        const BasGeometry = new BAS.ModelBufferGeometry(PlaneGeometry, {
            //将此设置为true将存储顶点相对于其所在面的位置
            //这样，可以更容易地围绕其自身中心旋转和缩放面
            localizeFaces: true,
            //将此设置为true将为阵列中的每个面存储一个质心
            computeCentroids: true
        });//预制几何面
        // 缓冲UV，以便正确映射纹理
        BasGeometry.bufferUvs();
        const LocalDelay = BasGeometry.createAttribute("aDelay", 2);//延迟
        const minDuration = 0.8;
        const maxDuration = 1.2;
        const maxDelayX = 0.9;
        const maxDelayY = 0.125;
        const stretch = 0.11;
        const allTime = maxDuration + maxDelayX + maxDelayY + stretch;
        for (let i = 0, offset = 0; i < BasGeometry.faceCount; i++) {
            let centroid = BasGeometry.centroids[i];
            let currentFaceDuration = THREE.Math.randFloat(minDuration, maxDuration);
            const delayX = THREE.Math.mapLinear(centroid.x, -width * 0.5, width * 0.5, 0.0, maxDelayX);
            let delayY;
            if (PathImgMethod === "in") {
                delayY = THREE.Math.mapLinear(Math.abs(centroid.y), 0, height * 0.5, 0.0, maxDelayY);
            } else {
                delayY = THREE.Math.mapLinear(Math.abs(centroid.y), 0, height * 0.5, maxDelayY, 0.0);
            }
            for (let j = 0; j < 3; j++) {
                LocalDelay.array[offset] = delayX + delayY + (Math.random() * stretch * currentFaceDuration);
                LocalDelay.array[offset + 1] = currentFaceDuration;
                offset += 2;
            }
        }
        BasGeometry.createAttribute("aStartPosition", 3, function (data, i) {
            BasGeometry.centroids[i].toArray(data);
        })
        BasGeometry.createAttribute("aEndPosition", 3, function (data, i) {
            BasGeometry.centroids[i].toArray(data);
        })
        let LocalControls0 = BasGeometry.createAttribute("aControls0", 3);
        let LocalControls1 = BasGeometry.createAttribute("aControls1", 3);
        const Controls0 = new THREE.Vector3();
        const Controls1 = new THREE.Vector3();
        let data = [];
        for (let i = 0; i < BasGeometry.faceCount; i++) {

            let centroid = BasGeometry.centroids[i];
            let signY = Math.sign(centroid.y);//返回参数的正负号
            Controls0.x = THREE.Math.randFloat(0.6, 0.9) * extendX;
            Controls0.y = signY * Math.sin(centroid.y) * THREE.Math.randFloat(0.3, 0.6) * extendY;
            Controls0.z = THREE.Math.randFloatSpread(extendZ);

            Controls1.x = THREE.Math.randFloat(0.6, 0.9) * extendX;
            Controls1.y = -signY * Math.cos(centroid.y) * THREE.Math.randFloat(0.1, 0.9) * extendY;
            Controls1.z = THREE.Math.randFloatSpread(extendZ);
            if (PathImgMethod === "in") {
                Controls0.subVectors(centroid, Controls0);
                Controls1.subVectors(centroid, Controls1);
            } else {
                Controls0.addVectors(centroid, Controls0);
                Controls1.addVectors(centroid, Controls1);
            }

            BasGeometry.setFaceData(LocalControls0, i, Controls0.toArray(data));
            BasGeometry.setFaceData(LocalControls1, i, Controls1.toArray(data));
        }
        const texture = new THREE.Texture();
        texture.minFilter = THREE.NearestFilter;
        const BasMaterial = new BAS.BasicAnimationMaterial({
            flatShading: true,//阴影
            uniforms: {
                uTime: {
                    type: 'f',
                    value: 0.0
                },
            },
            //uniformValues:{}用来放平常我们创建材质时放置的那些属性，目前已被弃用，更新为和Three js 一样发的用法，直接放在参数里
            metalness: 1.0,
            roughness: 1.0,
            transparent: true,
            map: texture,
            //上面三排原本是放入uniformValues中的，现在可以直接放在参数里
            //下面我们来了解一下vertexFunctions
            vertexFunctions: [
                BAS.ShaderChunk['cubic_bezier'],
                BAS.ShaderChunk['ease_cubic_in'],//将一些缓冲值动画函数写入到着色器中
                BAS.ShaderChunk['ease_cubic_out'],
                BAS.ShaderChunk['ease_cubic_in_out'],
                BAS.ShaderChunk['ease_back_out'],
                BAS.ShaderChunk['quaternion_rotation'],
            ],//按名思意，他应该是去声明一些VertexFunction，应该是内置函数
            //vertexParameters 对应的是顶点着色器的变量声明部分，与shaderMaterial不同，目前我的理解应该是他将VertexShader分为声明部分以及main部分，并做增添而不是直接替换
            vertexParameters: [
                'uniform float uTime;',
                'attribute vec3 aStartPosition;',
                'attribute vec3 aEndPosition;',
                'attribute vec3 aControls0;',
                'attribute vec3 aControls1;',
                'attribute vec2 aDelay;',
            ],
            vertexPosition: [
                'float tProgress = clamp(uTime - aDelay.x, 0.0, aDelay.y) / aDelay.y;',//tTime 是BAS内置着色器的内置变量用来用纸一个动画的时间
                (PathImgMethod === 'in' ? 'transformed *= tProgress;' : 'transformed *= 1.0 - tProgress;'),
                'transformed += cubicBezier(aStartPosition, aControls0, aControls1, aEndPosition, tProgress);',//transformed 也是BAS内置变量
            ],//vertexPosition 这是与上面对应的main部分
        })
        this.Picture.geometry = BasGeometry;
        this.Picture.material = BasMaterial;

        this.Picture.allTime = allTime;
        this.Picture.frustumCulled = false;
    }

    createTweenOfPicture(otherFun) {
        console.log(this.Picture.material);
        const that =this;
        if (this.Picture.tween) {
            this.Picture.tween.kill();
        }
        let options = {
            time: 0.0,
        }
        this.Picture.tween = new TimelineLite();
        this.Picture.tween.fromTo(options, 3.0, {time: 0.0}, {
            time: this.Picture.allTime,
            ease: Power0.easeInOut,
            onUpdate: function () {
                that.Picture.material.uniforms['uTime'].value = options.time
            },
            onComplete:function () {
                if(otherFun)
                otherFun();
            }
        });
    }

    createMeshOfCard(arg) {

    }
    createTweenOfCard(otherFun){

    }
}