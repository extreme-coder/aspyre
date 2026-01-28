// Onboarding-specific theme constants
// Based on Mozi design with Aspyre customizations

export const onboardingColors = {
  background: '#FAF9F6',      // Warm off-white
  inputBg: '#EDEAE4',         // Cream for inputs
  accent: '#84CC16',          // Lime green for progress bar
  accentLight: '#ECFCCB',     // Light lime green
  textPrimary: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
  white: '#FFFFFF',
  black: '#000000',
  progressInactive: '#E0DDD7', // Gray for unfilled progress
  buttonDisabled: '#CCCCCC',
};

export const onboardingTypography = {
  logo: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 8,
    color: onboardingColors.white,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: onboardingColors.textPrimary,
    letterSpacing: 0,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
    lineHeight: 24,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: onboardingColors.white,
    textAlign: 'center',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  privacyNote: {
    fontSize: 13,
    fontWeight: '400',
    color: onboardingColors.textMuted,
    lineHeight: 18,
  },
  link: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
};

export const onboardingStyles = {
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 24,
  },
  logoText: {
    ...onboardingTypography.logo,
    color: onboardingColors.textPrimary,
  },
  heading: {
    ...onboardingTypography.heading,
    marginBottom: 8,
  },
  subheading: {
    ...onboardingTypography.subheading,
    marginBottom: 24,
  },
  input: {
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: onboardingColors.textPrimary,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: onboardingColors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  buttonPrimary: {
    backgroundColor: onboardingColors.black,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimaryText: {
    ...onboardingTypography.button,
    color: onboardingColors.white,
  },
  buttonSecondary: {
    backgroundColor: onboardingColors.white,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondaryText: {
    ...onboardingTypography.button,
    color: onboardingColors.black,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: onboardingColors.white,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonOutlineText: {
    ...onboardingTypography.button,
    color: onboardingColors.white,
  },
  buttonDisabled: {
    backgroundColor: onboardingColors.buttonDisabled,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  privacyNoteText: {
    ...onboardingTypography.privacyNote,
    flex: 1,
    marginLeft: 8,
  },
  link: {
    ...onboardingTypography.link,
    textDecorationLine: 'underline',
  },
  linkCenter: {
    alignItems: 'center',
    marginTop: 16,
  },
};
