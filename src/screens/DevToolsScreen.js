import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';
import {
  runScreenshotTour,
  captureCurrentScreen,
  SCREENSHOT_SCREENS,
  MANUAL_SCREENSHOTS,
} from '../utils/screenshotTour';

/**
 * Developer Tools Screen
 * Provides utilities for capturing screenshots and other dev tasks.
 * Access via Settings > Dev Tools (only in __DEV__ mode)
 */
export default function DevToolsScreen({ navigation }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [results, setResults] = useState(null);

  const handleRunTour = async () => {
    Alert.alert(
      'Screenshot Tour',
      `This will navigate through ${SCREENSHOT_SCREENS.length} screens and save screenshots to your camera roll.\n\nThe app will navigate automatically. Do not touch the screen during the process.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Tour',
          onPress: async () => {
            setIsRunning(true);
            setResults(null);
            setProgress({ current: 0, total: SCREENSHOT_SCREENS.length, name: 'Starting...' });

            try {
              const tourResults = await runScreenshotTour(
                navigation,
                (current, total, name) => {
                  setProgress({ current, total, name });
                }
              );

              setResults(tourResults);

              if (tourResults.failed.length === 0) {
                Alert.alert(
                  'Tour Complete!',
                  `Successfully captured ${tourResults.captured.length} screenshots.\n\nCheck your camera roll for the images.`
                );
              } else {
                Alert.alert(
                  'Tour Complete',
                  `Captured: ${tourResults.captured.length}\nFailed: ${tourResults.failed.length}\n\nCheck console for details.`
                );
              }
            } catch (error) {
              Alert.alert('Tour Failed', error.message);
            } finally {
              setIsRunning(false);
            }
          },
        },
      ]
    );
  };

  const handleCaptureNow = async () => {
    await captureCurrentScreen('dev_tools');
  };

  const handleCaptureWithName = () => {
    Alert.prompt(
      'Screenshot Name',
      'Enter a name for this screenshot:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Capture',
          onPress: (name) => {
            if (name && name.trim()) {
              captureCurrentScreen(name.trim().replace(/\s+/g, '_'));
            }
          },
        },
      ],
      'plain-text',
      'screenshot'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Dev Tools</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Screenshot Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCREENSHOTS</Text>

          {/* Quick Capture */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleCaptureNow}
            disabled={isRunning}
          >
            <Ionicons name="camera-outline" size={20} color={colors.onPrimary} />
            <Text style={styles.buttonText}>Capture This Screen</Text>
          </TouchableOpacity>

          {/* Named Capture */}
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleCaptureWithName}
            disabled={isRunning}
          >
            <Ionicons name="create-outline" size={20} color={colors.onSurface} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Capture with Custom Name
            </Text>
          </TouchableOpacity>

          {/* Full Tour */}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleRunTour}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <ActivityIndicator size="small" color={colors.onPrimary} />
                <Text style={styles.buttonText}>Running Tour...</Text>
              </>
            ) : (
              <>
                <Ionicons name="albums-outline" size={20} color={colors.onPrimary} />
                <Text style={styles.buttonText}>
                  Run Full Screenshot Tour ({SCREENSHOT_SCREENS.length} screens)
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Progress */}
          {isRunning && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(progress.current / progress.total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress.current} / {progress.total}: {progress.name}
              </Text>
            </View>
          )}

          {/* Results */}
          {results && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Last Tour Results</Text>
              <Text style={styles.resultsText}>
                Captured: {results.captured.length}
              </Text>
              <Text style={styles.resultsText}>
                Failed: {results.failed.length}
              </Text>
              {results.failed.length > 0 && (
                <View style={styles.failedList}>
                  {results.failed.map((f, i) => (
                    <Text key={i} style={styles.failedItem}>
                      {f.name}: {f.error}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Screen List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCREENS IN TOUR</Text>
          {SCREENSHOT_SCREENS.map((screen, index) => (
            <View key={screen.name} style={styles.screenItem}>
              <Text style={styles.screenNumber}>{index + 1}</Text>
              <View style={styles.screenInfo}>
                <Text style={styles.screenName}>{screen.description}</Text>
                <Text style={styles.screenRoute}>{screen.route}</Text>
              </View>
              <TouchableOpacity
                style={styles.goButton}
                onPress={() => navigation.navigate(screen.route, screen.params)}
              >
                <Ionicons name="arrow-forward" size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Manual Screenshots Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MANUAL SCREENSHOTS ({MANUAL_SCREENSHOTS.length} remaining)
          </Text>
          <Text style={styles.guideText}>
            These screens require special navigation or state. Navigate to each manually and tap "Capture This Screen" or "Capture with Custom Name".
          </Text>
          <View style={styles.manualList}>
            {MANUAL_SCREENSHOTS.map((item, index) => (
              <View key={item.name} style={styles.manualItem}>
                <Text style={styles.manualItemNumber}>{index + 1}</Text>
                <View style={styles.manualItemInfo}>
                  <Text style={styles.manualItemName}>{item.description}</Text>
                  <Text style={styles.manualItemHint}>{item.name}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Total Count */}
        <View style={styles.section}>
          <Text style={styles.totalText}>
            Total: {SCREENSHOT_SCREENS.length + MANUAL_SCREENSHOTS.length} screenshots
          </Text>
          <Text style={styles.totalSubtext}>
            {SCREENSHOT_SCREENS.length} automated + {MANUAL_SCREENSHOTS.length} manual
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyLg.fontSize,
    color: colors.onSurface,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceContainerLow,
  },
  buttonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    color: colors.onPrimary,
  },
  buttonTextSecondary: {
    color: colors.onSurface,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
  },
  resultsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  resultsText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  failedList: {
    marginTop: spacing.sm,
  },
  failedItem: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  screenNumber: {
    fontFamily: fontFamily.semiBold,
    width: 24,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  screenInfo: {
    flex: 1,
  },
  screenName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  screenRoute: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  goButton: {
    padding: spacing.sm,
  },
  guideText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  manualList: {
    marginTop: spacing.sm,
  },
  manualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  manualItemNumber: {
    fontFamily: fontFamily.semiBold,
    width: 24,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  manualItemInfo: {
    flex: 1,
  },
  manualItemName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurface,
  },
  manualItemHint: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  totalText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyLg.fontSize,
    color: colors.onSurface,
    textAlign: 'center',
  },
  totalSubtext: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
