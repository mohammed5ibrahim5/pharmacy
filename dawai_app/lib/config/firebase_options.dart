import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBNJau0ePghvuvzgQosqja0INiMrTGI-NU',
    appId: '1:194872140989:android:403e2f8190e677b776c3d4',
    messagingSenderId: '194872140989',
    projectId: 'dawai-cf66b',
    storageBucket: 'dawai-cf66b.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: 'YOUR_IOS_APP_ID',
    messagingSenderId: '194872140989',
    projectId: 'dawai-cf66b',
    storageBucket: 'dawai-cf66b.firebasestorage.app',
    iosBundleId: 'com.dawai.dawai_app',
  );
}
