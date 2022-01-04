import * as THREE from "../build/three.module.js"
export function CreatFlyLine(Points = [], FlyPointSpeed =3, TrailLineSpace = 4000,
                             FlyPointSpace = 100, FlyPointSize = 2, TrailLineOpacity = 1,
                             FlyPointStartPointIndex = 0, FlyPointEndPointIndex = 300, TrailLineColor = '#006666',
                             FlyPointHeadColor = '#006666', FlyPointBackColor = '#fff200',TrailLineSize=0.05,
                             IsAsymptotic =false,FlyLineAsymptoticSpeed=15) {
    //Points是要传入的坐标
    //FlyPointSpeed 表示更新点的快慢
    //TrailLineSpace 是线要分成多少段 分段越多那个动的点就越慢
    //FlyPointSpace 飞点由多少个点组成
    //FlyPointSize 表示飞点的大小
    //TrailLineOpacity 表示飞线的透明度
    //FlyPointStartPointIndex 表示从飞线的第几个点开始截取
    //FlyPointEndPointIndex 表示截取的飞点的数量
    //TrailLineColor 表示飞线的颜色
    //FlyPointHeadColor 表示飞点头的颜色
    //FlyPointBackColor 表示飞点尾的颜色
    //渐近使用以下参数
    //TrailLineSize 表示飞线中个点的大小(点生成线时使用)
    //FlyLineAsymptoticSpeed 表示飞线渐近生成的速度
    //IsAsymptotic 是否渐近生成轨迹线
    function CreatTrailLine(Points, TrailLineOpacity, TrailLineColor, TrailLineSpace,TrailLineSize) {
        const geometry = new THREE.BufferGeometry();//创建一个缓冲类几何体
        Points = new THREE.CatmullRomCurve3(Points);
        const SpacedPoints = Points.getSpacedPoints(TrailLineSpace);
        geometry.setFromPoints(SpacedPoints);
        const material = new THREE.PointsMaterial({
            color: TrailLineColor,
            transparent: true,
            opacity: TrailLineOpacity,
            size:TrailLineSize,
            depthWrite:false,
            depthTest:false
        });
        const TrailLine = new THREE.Points(geometry, material);
        TrailLine.renderOrder=998;
        return [TrailLine, SpacedPoints];
    }
    const TrailLineObject = CreatTrailLine(Points, TrailLineOpacity, TrailLineColor, TrailLineSpace*Points.length,TrailLineSize);
    const Group = new THREE.Group();
    let TrailLinePoints =TrailLineObject[1];
    if(!IsAsymptotic) Group.add(TrailLineObject[0]);//直接生成一整条轨迹线
    //实现方法 取一条线上的部分点
    //将线转换为点来实现
    const FlyPoints = new THREE.CatmullRomCurve3(TrailLinePoints.slice(FlyPointStartPointIndex, FlyPointStartPointIndex + FlyPointEndPointIndex)).getSpacedPoints(FlyPointSpace);
    const FlyPointGeometry = new THREE.BufferGeometry();
    FlyPointGeometry.setFromPoints(FlyPoints);
    //实现头大尾小 attributes.percent 用百分比数据来控制每个点的渲染大小
    let percentArr = [];
    for (let i = 0; i < FlyPoints.length; i++) {
            percentArr.push(i / FlyPoints.length);
    }
    //点模型渲染几何体每个顶点
    FlyPointGeometry.attributes.percent = new THREE.BufferAttribute(new Float32Array(percentArr), 1);
    //渲染顶点颜色
    const flyPointColors = [];
    //使用lerp()方法寻找两种颜色的中间颜色值
    for (let i = 0; i < FlyPoints.length; i++) {
        let flyPointHeadColor = new THREE.Color(FlyPointHeadColor);
        let flyPointBackColor = new THREE.Color(FlyPointBackColor);
        let flyPointColor = flyPointHeadColor.lerp(flyPointBackColor, i / FlyPoints.length);
        flyPointColors.push(flyPointColor.r, flyPointColor.g, flyPointColor.b);
    }
    FlyPointGeometry.attributes.color = new THREE.Float32BufferAttribute(flyPointColors, 3)
    const FlyPointMaterial = new THREE.PointsMaterial({
        vertexColors: THREE.VertexColors, //轨迹颜色
        size: FlyPointSize,
    })
    //更改着色器顶点渲染方法 size -> percent * size * ( scale / - mvPosition.z ) 以实现头大脚小
    FlyPointMaterial.onBeforeCompile = function (shader) {
        // 顶点着色器中声明一个attribute变量:百分比
        shader.vertexShader = shader.vertexShader.replace(
            'void main() {',
            [
                'attribute float percent;', //顶点大小百分比变量，控制点渲染大小
                'void main() {',
            ].join('\n') // .join()把数组元素合成字符串
        );

        // 调整点渲染大小计算方式
        shader.vertexShader = shader.vertexShader.replace(
            'if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );',
            [
                'if ( !isPerspective ) gl_PointSize = percent * size * ( scale / - mvPosition.z );',
            ].join('\n') // .join()把数组元素合成字符串
        );
    };
    const FlyPoint = new THREE.Points(FlyPointGeometry, FlyPointMaterial)
    FlyPoint.position.y+=0.02;
    FlyPoint.renderOrder =999;
    // Group.add(FlyPoint)

    return {
        group: Group,
        FlyPointStartPointIndex: FlyPointStartPointIndex,
        FlyPointEndPointIndex: FlyPointEndPointIndex,
        FlyLinePointCount: TrailLinePoints.length ,
        FlyPoint: FlyPoint,
        FlyLine: TrailLineObject[0],
        FlyPointSpeed:FlyPointSpeed,
        FlyLinePoints:TrailLinePoints,
        FlyLinePointsCurrentIndex : 0,
        FlyPointSpace:FlyPointSpace,
        FlyLineAsymptoticSpeed:FlyLineAsymptoticSpeed,
        IsAsymptotic:IsAsymptotic,
        update:function(lastCount=0) {
            const that =this;
            that.FlyLinePointsCurrentIndex =lastCount;//lastCount记录上次一个飞线实例化对象的最大轨迹顶点数，需手动传入
            if (this.group) {
                setInterval(()=>{//renderer 更新就注释这一行
                    if(that.IsAsymptotic){
                        if(that.FlyLinePointsCurrentIndex!==that.FlyLinePointCount){
                            that.FlyLinePointsCurrentIndex =Math.min(that.FlyLinePointsCurrentIndex,that.FlyLinePointCount - that.FlyLineAsymptoticSpeed)
                            that.FlyLinePointsCurrentIndex = that.FlyLinePointsCurrentIndex + that.FlyLineAsymptoticSpeed;
                            that.FlyLine.geometry.setFromPoints(that.FlyLinePoints.slice(0,that.FlyLinePointsCurrentIndex));
                            if(that.FlyLinePointsCurrentIndex=== that.FlyLineAsymptoticSpeed +lastCount){
                                that.group.add(that.FlyLine);
                                that.group.add(that.FlyPoint)
                            }
                        }
                    }
                    else{
                        that.FlyLinePointsCurrentIndex = that.FlyLinePointCount;
                        that.group.add(that.FlyPoint)
                    }
                    if(that.FlyPointStartPointIndex >= that.FlyLinePointsCurrentIndex - that.FlyPointEndPointIndex) that.FlyPointStartPointIndex = 0;
                    let FlyPointUpdate = that.FlyLinePoints.slice(that.FlyPointStartPointIndex, Math.min(that.FlyPointStartPointIndex + that.FlyPointEndPointIndex,that.FlyLinePointsCurrentIndex));
                    that.FlyPointStartPointIndex += that.FlyPointSpeed;

                    let cur = new THREE.CatmullRomCurve3(FlyPointUpdate);

                    FlyPointUpdate = cur.getSpacedPoints(FlyPointSpace);
                    that.FlyPoint.geometry.setFromPoints(FlyPointUpdate);
                },0)//还有注释这一行
            }
        }
    }

}
