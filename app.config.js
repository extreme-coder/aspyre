export default {
  expo: {
    name: "aspyre",
    slug: "aspyre",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to let you add photos to your journal entries.",
        NSPhotoLibraryUsageDescription: "This app accesses your photos to let you add images to your journal entries."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      "expo-notifications"
    ],
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      }
    },
    owner: "aryansingh3475"
  }
};
