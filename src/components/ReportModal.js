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
            <Ionicons name="close" size={24} color="#666" />
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
              placeholderTextColor="#999"
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 0.5,
  },
  submitButton: {
    padding: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
    marginBottom: 20,
  },
  reasons: {
    gap: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
  },
  reasonOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#fafafa',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#000',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
  },
  detailsSection: {
    marginTop: 24,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    fontSize: 14,
    fontWeight: '300',
    color: '#333',
    minHeight: 100,
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    marginTop: 24,
    lineHeight: 18,
    textAlign: 'center',
  },
});
