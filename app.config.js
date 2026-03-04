export default {
  expo: {
    name: "aspyre",
    slug: "aspyre",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-logo.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.aspyre.app",
      usesAppleSignIn: true,
      icon: "./assets/icon.png",
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to let you add photos to your journal entries.",
        NSPhotoLibraryUsageDescription: "This app accesses your photos to let you add images to your journal entries."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      "expo-notifications",
      "expo-apple-authentication"
    ],
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      }
    },
    owner: "aryansingh3475"
  }
};
