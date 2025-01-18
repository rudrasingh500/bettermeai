export type AnalysisStep = 'front' | 'leftSide' | 'rightSide' | 'hair' | 'teeth' | 'body' | 'results';
export type ImageData = Record<Exclude<AnalysisStep, 'results'>, string | undefined>;

export const STEP_ORDER: AnalysisStep[] = ['front', 'leftSide', 'rightSide', 'hair', 'teeth', 'body', 'results'];

export const STEP_INSTRUCTIONS: Record<Exclude<AnalysisStep, 'results'>, string> = {
  front: 'Look directly at the camera with a neutral expression in good lighting',
  leftSide: 'Turn your head to show your left side profile',
  rightSide: 'Turn your head to show your right side profile',
  hair: 'Position the camera to clearly show your hair texture and style',
  teeth: 'Show your teeth in a natural smile, ensuring good lighting',
  body: 'Stand naturally with your full body visible, wearing fitted clothing'
};