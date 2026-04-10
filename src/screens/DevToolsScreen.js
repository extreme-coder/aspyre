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
          <Ionicons name="arrow-back" size={24} color="#000" />
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
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Capture This Screen</Text>
          </TouchableOpacity>

          {/* Named Capture */}
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleCaptureWithName}
            disabled={isRunning}
          >
            <Ionicons name="create-outline" size={20} color="#000" />
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
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>Running Tour...</Text>
              </>
            ) : (
              <>
                <Ionicons name="albums-outline" size={20} color="#fff" />
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
                <Ionicons name="arrow-forward" size={16} color="#666" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#000',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#000',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  failedList: {
    marginTop: 8,
  },
  failedItem: {
    fontSize: 11,
    color: '#c00',
    marginBottom: 2,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  screenNumber: {
    width: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  screenInfo: {
    flex: 1,
  },
  screenName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  screenRoute: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  goButton: {
    padding: 8,
  },
  guideText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  manualList: {
    marginTop: 8,
  },
  manualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  manualItemNumber: {
    width: 24,
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  manualItemInfo: {
    flex: 1,
  },
  manualItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  manualItemHint: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  totalSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
