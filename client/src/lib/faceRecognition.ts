import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (err) {
      modelLoadingPromise = null;
      console.error("Failed to load face recognition models:", err);
      throw new Error("Unable to load face detection models. Please check internet connection.");
    }
  })();

  return modelLoadingPromise;
}

/**
 * Captures a single face from an active HTMLVideoElement and returns its 128-element descriptor array.
 */
export async function detectFaceDescriptor(videoElement: HTMLVideoElement): Promise<number[] | null> {
  await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return Array.from(detection.descriptor);
}

/**
 * Calculates Euclidean distance between two 128D descriptors.
 * Lower distance = higher similarity. (Standard threshold: <= 0.55)
 */
export function compareDescriptors(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return Infinity;
  return faceapi.euclideanDistance(desc1, desc2);
}
