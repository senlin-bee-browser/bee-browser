import React, { useState } from 'react'
import { Save, RefreshCw, Download, Upload, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useStorage } from '@shared/hooks/useStorage'

export default function OptionsApp() {
  const { state, dispatch } = useApp()
  const { value: settings, setValue: saveSettings } = useStorage('settings', state.settings)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('Saving...')
      await saveSettings(settings)
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
      setSaveStatus('Saved!')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setSaveStatus('Error saving settings')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

  const handleResetSettings = () => {
    const defaultSettings = {
      aiProvider: 'openai' as const,
      autoGrouping: true,
      maxHistoryDays: 30,
    }
    saveSettings(defaultSettings)
    dispatch({ type: 'UPDATE_SETTINGS', payload: defaultSettings })
  }

  const handleExportData = async () => {
    try {
      const data = {
        tabGroups: state.tabGroups,
        settings: state.settings,
        exportDate: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bee-browser-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.tabGroups) {
          dispatch({ type: 'SET_TAB_GROUPS', payload: data.tabGroups })
        }
        if (data.settings) {
          dispatch({ type: 'UPDATE_SETTINGS', payload: data.settings })
        }
      } catch (error) {
        console.error('Import failed:', error)
      }
    }
    reader.readAsText(file)
  }

  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        await chrome.storage.local.clear()
        dispatch({ type: 'SET_TAB_GROUPS', payload: [] })
        handleResetSettings()
      } catch (error) {
        console.error('Failed to clear data:', error)
      }
    }
  }

  return (
    <div className="extension-container">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">🐝</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bee Browser Settings</h1>
              <p className="text-gray-600">Configure your AI-powered browsing assistant</p>
            </div>
          </div>
        </header>

        {/* AI Provider Settings */}
        <section className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">AI Provider Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <select
                value={settings.aiProvider}
                onChange={(e) => saveSettings({ ...settings, aiProvider: e.target.value as any })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="openai">OpenAI GPT</option>
                <option value="claude">Anthropic Claude</option>
                <option value="local">Local Analysis</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Choose your preferred AI provider for content analysis
              </p>
            </div>

            {settings.aiProvider !== 'local' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {apiKeyVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Your API key is stored locally and never shared
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Grouping Behavior */}
        <section className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Grouping Behavior</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoGrouping"
                checked={settings.autoGrouping}
                onChange={(e) => saveSettings({ ...settings, autoGrouping: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="autoGrouping" className="ml-2 block text-sm text-gray-900">
                Enable automatic tab grouping
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                History Retention (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.maxHistoryDays}
                onChange={(e) => saveSettings({ ...settings, maxHistoryDays: parseInt(e.target.value) })}
                className="w-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                How many days of browsing history to analyze
              </p>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Data Management</h2>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <Button onClick={handleExportData} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>

            <div className="border-t pt-4">
              <Button
                onClick={handleClearAllData}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
              <p className="text-sm text-gray-500 mt-1">
                Remove all stored tab groups and analysis data
              </p>
            </div>
          </div>
        </section>

        {/* Analytics */}
        <section className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600">Total Groups</h4>
              <p className="text-2xl font-bold text-primary-600">{state.tabGroups.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600">Total Tabs</h4>
              <p className="text-2xl font-bold text-primary-600">
                {state.tabGroups.reduce((sum, group) => sum + group.tabs.length, 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600">Avg. per Group</h4>
              <p className="text-2xl font-bold text-primary-600">
                {state.tabGroups.length > 0 
                  ? Math.round(state.tabGroups.reduce((sum, group) => sum + group.tabs.length, 0) / state.tabGroups.length)
                  : 0
                }
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600">Last Sync</h4>
              <p className="text-sm font-medium text-gray-600">Never</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <Button
            onClick={handleResetSettings}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <div className="flex items-center space-x-4">
            {saveStatus && (
              <span className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {saveStatus}
              </span>
            )}
            <Button onClick={handleSaveSettings}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}