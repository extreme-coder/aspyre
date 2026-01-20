import React, { createContext, useContext, useState, useCallback } from 'react';

const UnsavedChangesContext = createContext({
  unsavedScreens: {},
  setUnsaved: () => {},
  clearUnsaved: () => {},
  hasUnsavedChanges: () => false,
});

export function UnsavedChangesProvider({ children }) {
  const [unsavedScreens, setUnsavedScreens] = useState({});

  const setUnsaved = useCallback((screenName, hasChanges) => {
    setUnsavedScreens(prev => ({
      ...prev,
      [screenName]: hasChanges,
    }));
  }, []);

  const clearUnsaved = useCallback((screenName) => {
    setUnsavedScreens(prev => {
      const next = { ...prev };
      delete next[screenName];
      return next;
    });
  }, []);

  const hasUnsavedChanges = useCallback((screenName) => {
    return !!unsavedScreens[screenName];
  }, [unsavedScreens]);

  return (
    <UnsavedChangesContext.Provider value={{ unsavedScreens, setUnsaved, clearUnsaved, hasUnsavedChanges }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
