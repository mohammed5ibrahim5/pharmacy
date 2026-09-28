import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing. Credentials live in android/key.properties, which is
// git-ignored and must be produced once per machine (see docs in the repo
// README): keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA \
//   -keysize 2048 -validity 10000 -alias upload
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}
val hasReleaseKeystore = keystorePropertiesFile.exists() &&
    keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "com.dawai.dawai_app"
    compileSdk = flutter.compileSdkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.dawai.dawai_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            // Falls back to the debug keystore so that configuration (and
            // `flutter build apk --debug`) never fails, but packageRelease
            // below refuses to actually produce a debug-signed artifact: the
            // debug keystore uses a publicly known password, so such an APK
            // could be re-signed by anyone and Play would reject it.
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

// Hard gate on the artifact itself rather than on configuration, so debug and
// profile builds keep working while a release build without a keystore fails.
tasks.matching { it.name == "packageRelease" }.configureEach {
    doFirst {
        if (!hasReleaseKeystore) {
            throw GradleException(
                "Missing android/key.properties (release keystore), refusing to " +
                    "package a debug-signed release. Generate one with:\n" +
                    "  keytool -genkey -v -keystore android/upload-keystore.jks " +
                    "-keyalg RSA -keysize 2048 -validity 10000 -alias upload\n" +
                    "then create android/key.properties pointing at it."
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
