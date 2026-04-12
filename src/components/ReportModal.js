import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'self_harm', label: 'Self-harm or dangerous' },
  { value: 'other', label: 'Other' },
];

/**
 * Modal for reporting a journal post.
 */
export default function ReportModal({
  visible,
  onClose,
  journal,
  userId,
}) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Please select a reason', 'Choose why you are reporting this post.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        journal_id: journal.id,
        reason: selectedReason,
        details: details.trim() || null,
      });

      if (error) throw error;

      Alert.alert(
        'Report Submitted',
        "Thanks for letting us know. We'll review this post.",
        [{ text: 'OK', onPress: onClose }]
      );

      // Reset state
      setSelectedReason(null);
      setDetails('');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      console.warn('Report error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  if (!journal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.title}>Report Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
            disabled={!selectedReason || submitting}
          >
            <Text style={[
              styles.submitButtonText,
              !selectedReason && styles.submitButtonTextDisabled,
            ]}>
              {submitting ? 'Sending...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            Why are you reporting this post?
          </Text>

          <View style={styles.reasons}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.value && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <View style={[
                  styles.radioOuter,
                  selectedReason === reason.value && styles.radioOuterSelected,
                ]}>
                  {selectedReason === reason.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsLabel}>
              Additional details (optional)
            </Text>
            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              placeholder="Tell us more about the issue..."
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.disclaimer}>
            Reports are confidential. We'll review this post and take action if it violates our guidelines.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyLg.fontSize,
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  submitButton: {
    padding: spacing.xs,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.primary,
  },
  submitButtonTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  reasons: {
    gap: spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  reasonOptionSelected: {
    backgroundColor: colors.secondaryContainer,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  detailsSection: {
    marginTop: spacing.xl,
  },
  detailsLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  detailsInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    minHeight: 100,
  },
  disclaimer: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xl,
    lineHeight: 18,
    textAlign: 'center',
  },
});
