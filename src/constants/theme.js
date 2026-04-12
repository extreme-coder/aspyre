/**
 * Aspyre Design System: "The Digital Sanctuary"
 *
 * A curated environment designed to foster focus and personal evolution.
 * Based on intentional asymmetry, editorial pacing, and tonal layering.
 */

// =============================================================================
// COLORS: Tonal Depth & Atmospheric Focus
// =============================================================================

export const colors = {
  // Primary - Deep intellectual blues
  primary: '#001832',
  primaryContainer: '#0f2d4e',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#d1e4ff',
  primaryFixed: '#d1e4ff',

  // Secondary - "Growth Mint"
  secondary: '#006a66',
  secondaryContainer: '#6ff7f0',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#00201e',
  secondaryFixed: '#6ff7f0',

  // Tertiary - "Achievement Gold"
  tertiary: '#735c00',
  tertiaryContainer: '#ffe08a',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#231b00',

  // Surface Hierarchy (layered like stacked sheets of paper)
  surface: '#f7faf9',                    // Base layer
  surfaceContainerLowest: '#ffffff',     // High-focus insets
  surfaceContainerLow: '#f1f4f3',        // Subtle lift
  surfaceContainer: '#ebeeed',           // Content blocks
  surfaceContainerHigh: '#e5e8e7',       // Elevated sections
  surfaceContainerHighest: '#e0e3e2',    // Elevated interactive elements

  // On-Surface (NO pure black - use ink-like tones)
  onSurface: '#181c1c',                  // Primary text
  onSurfaceVariant: '#43474e',           // Secondary text, metadata

  // Outline
  outline: '#73777f',
  outlineVariant: '#c4c6cf',             // Ghost borders at 15% opacity

  // Semantic
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#410002',

  success: '#006d3b',
  successContainer: '#98f7b5',

  // Legacy support (mapped to new system)
  white: '#ffffff',
  black: '#001832', // Now maps to primary, not pure black
};

// =============================================================================
// SPACING: Editorial Rhythm
// =============================================================================

export const spacing = {
  xs: 4,    // 0.25rem
  sm: 8,    // 0.5rem
  md: 12,   // 0.75rem - feed item separation
  lg: 16,   // 1rem
  xl: 24,   // 1.5rem
  xxl: 32,  // 2rem
  xxxl: 48, // 3rem
};

// Asymmetrical margins for editorial layouts
export const editorialMargins = {
  left: 24,
  right: 32,
};

// =============================================================================
// BORDER RADIUS: Growth & Fluidity
// =============================================================================

export const radius = {
  none: 0,
  sm: 4,    // 0.25rem - minimum, no sharp corners
  md: 8,    // 0.5rem
  lg: 16,   // 1rem - cards
  xl: 24,   // 1.5rem - buttons
  full: 9999,
};

// =============================================================================
// TYPOGRAPHY: The Editorial Voice (Manrope)
// =============================================================================

export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
};

export const typography = {
  // Display - High-impact motivation, milestones
  displayLg: {
    fontFamily: fontFamily.bold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.02 * 48, // -0.02em
  },
  displayMd: {
    fontFamily: fontFamily.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.02 * 40,
  },
  displaySm: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.02 * 32,
  },

  // Headline - Screen titles
  headlineLg: {
    fontFamily: fontFamily.semiBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineMd: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },
  headlineSm: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0,
  },

  // Title - Card titles
  titleLg: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0,
  },
  titleMd: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSm: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // Body - User-generated content (1.6x line height for reduced eye strain)
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 26, // ~1.6x
    letterSpacing: 0.5,
  },
  bodyMd: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 22, // ~1.6x
    letterSpacing: 0.25,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 19, // ~1.6x
    letterSpacing: 0.4,
  },

  // Label - Metadata, secondary information
  labelLg: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMd: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSm: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
};

// =============================================================================
// SHADOWS: Ambient Light (no drop shadow era)
// =============================================================================

export const shadows = {
  // Ambient shadow for floating elements (FABs, Modals)
  // 32px blur, 6% opacity, tinted with primary
  ambient: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 8,
  },

  // Subtle lift for cards
  subtle: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },

  // None - use tonal layering instead
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

// =============================================================================
// GLASSMORPHISM: For floating navigation/action sheets
// =============================================================================

export const glass = {
  background: 'rgba(247, 250, 249, 0.7)', // surface at 70%
  backdropBlur: 20,
};

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const components = {
  // Primary Button - Gradient, xl roundedness, no shadow
  buttonPrimary: {
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    minHeight: 48, // Touch target
  },

  // Secondary Button - surface-container-highest background
  buttonSecondary: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },

  // Tertiary Button - Ghost style, text only
  buttonTertiary: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },

  // Cards - lg roundedness, no borders
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    // NO borderWidth!
  },

  // Input Fields - bottom-only ghost border
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: `rgba(196, 198, 207, 0.15)`, // outlineVariant at 15%
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.onSurface,
  },

  // Progress bars - full roundedness
  progressBar: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  progressFill: {
    borderRadius: radius.full,
  },
};

// =============================================================================
// TOUCH TARGETS
// =============================================================================

export const touchTarget = {
  min: 48, // Minimum 48dp for all interactive elements
};

// =============================================================================
// COMMON STYLES (Updated for new design system)
// =============================================================================

export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Screen padding with editorial margins
  screenPadding: {
    paddingLeft: editorialMargins.left,
    paddingRight: editorialMargins.right,
  },

  // Symmetric padding option
  screenPaddingSymmetric: {
    paddingHorizontal: spacing.xl,
  },
};

// =============================================================================
// GRADIENTS (for use with expo-linear-gradient)
// =============================================================================

export const gradients = {
  // Primary CTA gradient - 135 degree angle
  primary: {
    colors: [colors.primary, colors.primaryContainer],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Achievement gradient
  achievement: {
    colors: [colors.tertiary, colors.tertiaryContainer],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Growth gradient
  growth: {
    colors: [colors.secondary, colors.secondaryContainer],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

// =============================================================================
// ASPIRATION GLOW (outer glow for goal cards)
// =============================================================================

export const aspirationGlow = {
  // Use secondaryFixed color for the glow
  shadowColor: colors.secondaryFixed,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 0, // Android doesn't support colored shadows well
};
