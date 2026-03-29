import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { Canvas, RoundedRect, Line, Circle, Path, Skia, vec, Shadow } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function VisualizerCanvas({ activeStages = {} }: { activeStages?: Record<string, boolean> }) {
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  // Colors based on web theme
  const accentColor = "#2f81f7";
  const vizBlock = "#161b22";
  const vizStroke = "#30363d";
  const vizStageInactive = "#0f1115";
  const activeStrokeColor = "#2f81f7";
  const shadowColor = "rgba(47, 129, 247, 0.4)";
  const textColor = "#8b949e";

  const isFetch = !!activeStages.Fetch;
  const isDecode = !!activeStages.Decode;
  const isExecute = !!activeStages.Execute;
  const isMemory = !!activeStages.Memory;
  const isWriteBack = !!activeStages.WriteBack;

  const getStroke = (isActive: boolean) => isActive ? activeStrokeColor : vizStroke;

  // Responsive initialization for phones and tablets
  const windowWidth = Dimensions.get('window').width;
  const initialScale = Math.min(windowWidth / CANVAS_WIDTH, 1);

  // Gesture shared values
  const scale = useSharedValue(initialScale); 
  const savedScale = useSharedValue(initialScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTransX = useSharedValue(0);
  const savedTransY = useSharedValue(0);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3.0;
  const MAX_PAN_X = 1500;
  const MAX_PAN_Y = 1000;

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      let nextScale = savedScale.value * e.scale;
      if (nextScale < MIN_SCALE) nextScale = MIN_SCALE;
      if (nextScale > MAX_SCALE) nextScale = MAX_SCALE;
      scale.value = nextScale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .activeOffsetY([-5, 5])
    .onUpdate((e) => {
      let nextX = savedTransX.value + e.translationX;
      let nextY = savedTransY.value + e.translationY;
      
      if (nextX > MAX_PAN_X) nextX = MAX_PAN_X;
      if (nextX < -MAX_PAN_X) nextX = -MAX_PAN_X;
      if (nextY > MAX_PAN_Y) nextY = MAX_PAN_Y;
      if (nextY < -MAX_PAN_Y) nextY = -MAX_PAN_Y;

      translateX.value = nextX;
      translateY.value = nextY;
    })
    .onEnd(() => {
      savedTransX.value = translateX.value;
      savedTransY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  // Create Writeback paths
  const aluWBPath = Skia.Path.Make();
  aluWBPath.moveTo(780, 480);
  aluWBPath.lineTo(780, 560);
  aluWBPath.lineTo(520, 560);
  aluWBPath.lineTo(520, 504);

  const memWBPath = Skia.Path.Make();
  memWBPath.moveTo(1060, 480);
  memWBPath.lineTo(1060, 620);
  memWBPath.lineTo(480, 620);
  memWBPath.lineTo(480, 504);

  const stageLabels = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'];
  const stageWidth = CANVAS_WIDTH / 6;
  const arrSize = 18;

  const blockStrokeWidth = 6;
  const lineStrokeWidth = 8;
  const shadowBlur = 24;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          <View style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <Canvas style={styles.canvas}>
              
              {/* STAGE INDICATORS */}
              {stageLabels.map((stageName, i) => {
                const x = (i + 0.5) * stageWidth;
                const y = 60;
                const isActiveStage = !!activeStages[stageName];
                return (
                  <React.Fragment key={stageName}>
                    <Circle cx={x} cy={y} r={24} color={isActiveStage ? accentColor : vizStageInactive} />
                    <Circle cx={x} cy={y} r={24} color={getStroke(isActiveStage)} style="stroke" strokeWidth={blockStrokeWidth}>
                      {isActiveStage && <Shadow dx={0} dy={0} blur={15} color={shadowColor} />}
                    </Circle>
                    {i < stageLabels.length - 1 && (
                      <Line 
                        p1={vec(x + 24, y)} 
                        p2={vec((i + 1.5) * stageWidth - 24, y)} 
                        color={vizStroke} 
                        style="stroke" 
                        strokeWidth={6} 
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* DATAPATH BLOCKS */}
              {/* Instruction Memory */}
              <RoundedRect x={100} y={340} width={200} height={120} r={8} color={vizBlock} />
              <RoundedRect x={100} y={340} width={200} height={120} r={8} color={getStroke(isFetch)} style="stroke" strokeWidth={blockStrokeWidth}>
                {isFetch && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </RoundedRect>

              {/* Register File */}
              <RoundedRect x={400} y={300} width={200} height={200} r={8} color={vizBlock} />
              <RoundedRect x={400} y={300} width={200} height={200} r={8} color={getStroke(isDecode || isWriteBack)} style="stroke" strokeWidth={blockStrokeWidth}>
                {(isDecode || isWriteBack) && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </RoundedRect>

              {/* ALU */}
              <RoundedRect x={700} y={320} width={160} height={160} r={8} color={vizBlock} />
              <RoundedRect x={700} y={320} width={160} height={160} r={8} color={getStroke(isExecute)} style="stroke" strokeWidth={blockStrokeWidth}>
                {isExecute && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </RoundedRect>

              {/* Data Memory */}
              <RoundedRect x={960} y={320} width={200} height={160} r={8} color={vizBlock} />
              <RoundedRect x={960} y={320} width={200} height={160} r={8} color={getStroke(isMemory)} style="stroke" strokeWidth={blockStrokeWidth}>
                {isMemory && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </RoundedRect>

              {/* DATAPATH LINES & ARROWS */}
              {/* 1) INST MEM -> REG FILE */}
              <Line p1={vec(300, 400)} p2={vec(396, 400)} color={getStroke(isDecode)} strokeWidth={lineStrokeWidth}>
                {isDecode && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </Line>
              <Path path={`M 396 400 L ${396-arrSize} ${400-arrSize/2} L ${396-arrSize} ${400+arrSize/2} Z`} color={getStroke(isDecode)} />

              {/* 2) REG FILE -> ALU */}
              <Line p1={vec(600, 400)} p2={vec(696, 400)} color={getStroke(isExecute)} strokeWidth={lineStrokeWidth}>
                 {isExecute && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </Line>
              <Path path={`M 696 400 L ${696-arrSize} ${400-arrSize/2} L ${696-arrSize} ${400+arrSize/2} Z`} color={getStroke(isExecute)} />

              {/* 3) ALU -> DATA MEM */}
              <Line p1={vec(860, 400)} p2={vec(956, 400)} color={getStroke(isMemory)} strokeWidth={lineStrokeWidth}>
                 {isMemory && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </Line>
              <Path path={`M 956 400 L ${956-arrSize} ${400-arrSize/2} L ${956-arrSize} ${400+arrSize/2} Z`} color={getStroke(isMemory)} />

              {/* 4) ALU -> REG FILE (writeback path) */}
              <Path path={aluWBPath} color={getStroke(isWriteBack)} style="stroke" strokeWidth={lineStrokeWidth} strokeJoin="round">
                 {isWriteBack && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </Path>
              <Path path={`M 520 504 L ${520-arrSize/2} ${504+arrSize} L ${520+arrSize/2} ${504+arrSize} Z`} color={getStroke(isWriteBack)} />

              {/* 5) DATA MEM -> REG FILE (load writeback path) */}
              <Path path={memWBPath} color={getStroke(isWriteBack)} style="stroke" strokeWidth={lineStrokeWidth} strokeJoin="round">
                 {isWriteBack && <Shadow dx={0} dy={0} blur={shadowBlur} color={shadowColor} />}
              </Path>
              <Path path={`M 480 504 L ${480-arrSize/2} ${504+arrSize} L ${480+arrSize/2} ${504+arrSize} Z`} color={getStroke(isWriteBack)} />

            </Canvas>

            {/* TEXT OVERLAY */}
            <View style={styles.textOverlay}>
              {/* Stages */}
              <Text style={[styles.label, { top: 96, left: stageWidth * 0.5 - 50, width: 100, color: isFetch ? accentColor : textColor, fontWeight: isFetch ? '800' : '600' }]}>Fetch</Text>
              <Text style={[styles.label, { top: 96, left: stageWidth * 1.5 - 50, width: 100, color: isDecode ? accentColor : textColor, fontWeight: isDecode ? '800' : '600' }]}>Decode</Text>
              <Text style={[styles.label, { top: 96, left: stageWidth * 2.5 - 50, width: 100, color: isExecute ? accentColor : textColor, fontWeight: isExecute ? '800' : '600' }]}>Execute</Text>
              <Text style={[styles.label, { top: 96, left: stageWidth * 3.5 - 50, width: 100, color: isMemory ? accentColor : textColor, fontWeight: isMemory ? '800' : '600' }]}>Memory</Text>
              <Text style={[styles.label, { top: 96, left: stageWidth * 4.5 - 50, width: 100, color: isWriteBack ? accentColor : textColor, fontWeight: isWriteBack ? '800' : '600' }]}>WriteBack</Text>

              {/* Blocks */}
              <Text style={[styles.label, { top: 380, left: 150, width: 100, color: isFetch ? accentColor : textColor, fontSize: 28 }]}>INST{'\n'}MEM</Text>
              <Text style={[styles.label, { top: 380, left: 450, width: 100, color: (isDecode || isWriteBack) ? accentColor : textColor, fontSize: 28 }]}>REG{'\n'}FILE</Text>
              <Text style={[styles.label, { top: 385, left: 740, width: 80, color: isExecute ? accentColor : textColor, fontSize: 32 }]}>ALU</Text>
              <Text style={[styles.label, { top: 380, left: 1010, width: 100, color: isMemory ? accentColor : textColor, fontSize: 28 }]}>DATA{'\n'}MEM</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0a0c10',
  },
  canvasWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  label: {
    position: 'absolute',
    fontSize: 22, 
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
