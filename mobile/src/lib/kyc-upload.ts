import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

// Privater Bucket; die App darf nur in den eigenen Ordner <auth-uid>/ hochladen, lesen können nur Prüfer
const BUCKET = 'kyc-documents';

export type KycPhoto = { uri: string; base64: string; mimeType: string };

// Foto mit der Kamera aufnehmen (Rückkamera für den Ausweis, Frontkamera für das Selfie)
export async function takeKycPhoto(kind: 'document' | 'selfie'): Promise<KycPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Kamera-Zugriff wird benötigt, um den Ausweis zu fotografieren.');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: kind === 'selfie' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    quality: 0.6, // lesbar, aber klein genug für langsame Mobilnetze
    base64: true,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.base64) return null;
  return { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' };
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function uploadKycPhoto(userId: string, name: string, photo: KycPhoto) {
  const ext = photo.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${name}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(photo.base64), { contentType: photo.mimeType });
  if (error) throw new Error(`Hochladen fehlgeschlagen: ${error.message}`);
  return path;
}
