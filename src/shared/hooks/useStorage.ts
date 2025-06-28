import { useState, useEffect, useCallback } from 'react'

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadValue = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await chrome.storage.local.get([key])
      const storedValue = result[key]
      
      if (storedValue !== undefined) {
        setValue(storedValue)
      } else {
        setValue(defaultValue)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load from storage')
      setValue(defaultValue)
    } finally {
      setLoading(false)
    }
  }, [key, defaultValue])

  const saveValue = useCallback(async (newValue: T) => {
    try {
      setError(null)
      await chrome.storage.local.set({ [key]: newValue })
      setValue(newValue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to storage')
      throw err
    }
  }, [key])

  const removeValue = useCallback(async () => {
    try {
      setError(null)
      await chrome.storage.local.remove([key])
      setValue(defaultValue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from storage')
      throw err
    }
  }, [key, defaultValue])

  useEffect(() => {
    loadValue()
  }, [loadValue])

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setValue(changes[key].newValue ?? defaultValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [key, defaultValue])

  return {
    value,
    setValue: saveValue,
    removeValue,
    loading,
    error,
    reload: loadValue
  }
}