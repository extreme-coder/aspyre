// Shared theme constants for Aspyre

export const colors = {
  black: '#000',
  white: '#fff',
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eee',
    300: '#ddd',
    400: '#bbb',
    500: '#999',
    600: '#666',
    700: '#444',
    800: '#333',
    900: '#111',
  },
  error: '#c00',
  success: '#080',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  logo: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 8,
  },
  h1: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 2,
  },
  h2: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 1,
  },
  h3: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
  },
};

export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    paddingVertical: 12,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.black,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    color: colors.white,
    textAlign: 'center',
    ...typography.button,
  },
  buttonOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.black,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  buttonOutlineText: {
    color: colors.black,
    textAlign: 'center',
    ...typography.button,
  },
};
