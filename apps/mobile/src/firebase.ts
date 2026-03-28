import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Note on React Native Firebase & experimentalForceLongPolling:
// The web Firebase JS SDK requires `experimentalForceLongPolling` to bypass
// restrictive university/corporate IT firewalls that block standard WebSockets.
// However, @react-native-firebase natively bridges to the iOS and Android 
// Firebase SDKs which use gRPC over HTTP/2, completely avoiding WebSockets 
// and bypassing these specific network constraints automatically!

// Make sure your google-services.json (Android) and GoogleService-Info.plist (iOS)
// are placed in the correct native directories to initialize.

export const db = firestore();
export const fbAuth = auth();

export const isFirebaseInitialized = !!firebase.apps.length;

export default firebase;
