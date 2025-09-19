'use client'

import React, { useState } from 'react'
import { Drawer } from '@/components/drawer/Drawer'

type DrawerSide = 'left' | 'right' | 'top' | 'bottom'
type DrawerSize = 's' | 'm' | 'l' | 'xl'

interface DrawerSettings {
  side: DrawerSide
  size: DrawerSize
  title: string
  description: string
  content: string
  scrollable: boolean
  expandMode: boolean
  minimizeMode: boolean
  fullscreen: boolean
  backdrop: boolean
  dismissible: boolean
  swipeToClose: boolean
  bottomOffset: number
  topOffset: number
}

export default function HomePage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [settings, setSettings] = useState<DrawerSettings>({
    side: 'right',
    size: 'm',
    title: 'Sample Drawer',
    description: 'This is a customizable drawer component',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    scrollable: true,
    expandMode: false,
    minimizeMode: false,
    fullscreen: false,
    backdrop: true,
    dismissible: true,
    swipeToClose: true,
    bottomOffset: 0,
    topOffset: 0
  })

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.setAttribute('data-theme', !isDarkMode ? 'dark' : 'light')
  }

  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)

  const updateSetting = <K extends keyof DrawerSettings>(key: K, value: DrawerSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const generateLongContent = () => {
    const paragraphs = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
      'Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.',
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentibus voluptatum.',
      'Deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      'Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
      'Et harum quidem rerum facilis est et expedita distinctio nam libero tempore.'
    ]
    return paragraphs.map((p, i) => `${i + 1}. ${p}`).join('\n\n')
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isDarkMode ? 'dark' : ''}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Header */}
      <header className="bg-white dark-bg-gray-900 shadow-sm border-b border-gray-200 dark-border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark-text-white flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Advanced Drawer Control Panel
            </h1>
            <button
              onClick={toggleDarkMode}
              className="px-3 py-2 bg-gray-100 dark-bg-gray-800 text-gray-700 dark-text-gray-300 rounded-lg hover-bg-gray-200 dark-hover-bg-gray-700 transition-colors"
            >
              {isDarkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8 py-8 mobile-bottom-spacing">
        <div className="grid grid-cols-1 lg-grid-cols-2 gap-8">

          {/* Settings Panel */}
          <div className="bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark-text-white mb-6">
              Drawer Settings
            </h2>

            <div className="space-y-6">
              {/* Position & Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-2">
                    Side
                  </label>
                  <select
                    value={settings.side}
                    onChange={(e) => updateSetting('side', e.target.value as DrawerSide)}
                    className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-2">
                    Size
                  </label>
                  <select
                    value={settings.size}
                    onChange={(e) => updateSetting('size', e.target.value as DrawerSize)}
                    className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500"
                    disabled={settings.fullscreen}
                  >
                    <option value="s">Small</option>
                    <option value="m">Medium</option>
                    <option value="l">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>
              </div>

              {/* Content Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-2">
                  Title
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => updateSetting('title', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500"
                    placeholder="Enter drawer title"
                  />
                  <button
                    onClick={() => updateSetting('title', '')}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover-bg-red-600 transition-colors"
                    title="Clear title"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-2">
                  Description
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.description}
                    onChange={(e) => updateSetting('description', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500"
                    placeholder="Enter drawer description"
                  />
                  <button
                    onClick={() => updateSetting('description', '')}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover-bg-red-600 transition-colors"
                    title="Clear description"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={settings.content}
                  onChange={(e) => updateSetting('content', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500"
                  placeholder="Enter drawer content"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => updateSetting('content', generateLongContent())}
                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover-bg-blue-200 dark:hover-bg-blue-800 transition-colors flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Generate Long Content
                  </button>
                  <button
                    onClick={() => updateSetting('content', '')}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover-bg-red-600 transition-colors flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete All
                  </button>
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 dark-text-white">
                  Behavior Options
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">Scrollable Content</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.scrollable}
                        onChange={(e) => updateSetting('scrollable', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">Fullscreen Mode</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.fullscreen}
                        onChange={(e) => updateSetting('fullscreen', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">
                      Expand Mode {(settings.side === 'left' || settings.side === 'right') && '(Top/Bottom only)'}
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.expandMode}
                        onChange={(e) => updateSetting('expandMode', e.target.checked)}
                        disabled={settings.side === 'left' || settings.side === 'right'}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">
                      Minimize Mode {(settings.side === 'left' || settings.side === 'right') && '(Top/Bottom only)'}
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.minimizeMode}
                        onChange={(e) => updateSetting('minimizeMode', e.target.checked)}
                        disabled={settings.side === 'left' || settings.side === 'right'}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">Show Backdrop</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.backdrop}
                        onChange={(e) => updateSetting('backdrop', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">Dismissible (ESC key)</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.dismissible}
                        onChange={(e) => updateSetting('dismissible', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark-text-gray-300">Swipe to Close</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.swipeToClose}
                        onChange={(e) => updateSetting('swipeToClose', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Offset Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark-text-white">
                    Position Offsets (px)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark-text-gray-400 mb-1">
                        Bottom Offset
                      </label>
                      <input
                        type="number"
                        value={settings.bottomOffset}
                        onChange={(e) => updateSetting('bottomOffset', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500 text-sm"
                        placeholder="0"
                        min="0"
                        max="200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark-text-gray-400 mb-1">
                        Top Offset
                      </label>
                      <input
                        type="number"
                        value={settings.topOffset}
                        onChange={(e) => updateSetting('topOffset', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500 text-sm"
                        placeholder="0"
                        min="0"
                        max="200"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark-text-gray-400">
                    Useful for avoiding navigation bars or status bars
                  </p>
                </div>
              </div>

              {/* Open Drawer Button - Desktop */}
              <div className="pt-4 hidden md:block">
                <button
                  onClick={openDrawer}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover-bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Open Drawer with Current Settings
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark-text-white mb-6">
              Current Configuration
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-50 dark-bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 dark-text-white mb-2">Position & Size</h3>
                <p className="text-sm text-gray-600 dark-text-gray-400">
                  <strong>Side:</strong> {settings.side.charAt(0).toUpperCase() + settings.side.slice(1)} |
                  <strong> Size:</strong> {settings.fullscreen ? 'Fullscreen' : settings.size.toUpperCase()}<br/>
                  <strong>Offsets:</strong> Bottom: {settings.bottomOffset}px, Top: {settings.topOffset}px
                </p>
              </div>

              <div className="bg-gray-50 dark-bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 dark-text-white mb-2">Content</h3>
                <p className="text-sm text-gray-600 dark-text-gray-400">
                  <strong>Title:</strong> {settings.title || 'No title'}<br/>
                  <strong>Description:</strong> {settings.description || 'No description'}<br/>
                  <strong>Content Length:</strong> {settings.content.length} characters
                </p>
              </div>

              <div className="bg-gray-50 dark-bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 dark-text-white mb-2">Active Features</h3>
                <div className="flex flex-wrap gap-1">
                  {settings.scrollable && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">Scrollable</span>}
                  {settings.fullscreen && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">Fullscreen</span>}
                  {settings.expandMode && <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">Expandable</span>}
                  {settings.minimizeMode && <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">Minimizable</span>}
                  {settings.backdrop && <span className="px-2 py-1 bg-gray-100 dark-bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">Backdrop</span>}
                  {settings.dismissible && <span className="px-2 py-1 bg-gray-100 dark-bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">Dismissible</span>}
                  {settings.swipeToClose && <span className="px-2 py-1 bg-gray-100 dark-bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">Swipe Close</span>}
                </div>
              </div>

              {/* Feature Explanations */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9,9h3v5"/>
                    <circle cx="12" cy="7.5" r=".5"/>
                  </svg>
                  Feature Guide
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li><strong>Expand Mode:</strong> Drag up/down to expand to full screen (top/bottom drawers)</li>
                  <li><strong>Minimize Mode:</strong> Minimize to header only, still accessible (top/bottom drawers)</li>
                  <li><strong>Scrollable:</strong> Content scrolls inside drawer body</li>
                  <li><strong>Swipe to Close:</strong> Drag in closing direction to dismiss</li>
                  <li><strong>Backdrop:</strong> Click outside drawer to close</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-8 bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark-text-white mb-4">
            Quick Presets
          </h2>
          <div className="grid grid-cols-1 md-grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setSettings({
                side: 'bottom',
                size: 'l',
                title: 'Mobile Bottom Sheet',
                description: 'Perfect for mobile interactions',
                content: 'This is a mobile-friendly bottom sheet with minimize and expand capabilities.',
                scrollable: true,
                expandMode: true,
                minimizeMode: true,
                fullscreen: false,
                backdrop: true,
                dismissible: true,
                swipeToClose: true,
                bottomOffset: 80,
                topOffset: 0
              })}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover-bg-blue-100 dark:hover-bg-blue-900/30 transition-colors text-left"
            >
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-1">Mobile Bottom Sheet</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">Expandable & minimizable</p>
            </button>

            <button
              onClick={() => setSettings({
                side: 'right',
                size: 'l',
                title: 'Sidebar Panel',
                description: 'Perfect for navigation or settings',
                content: generateLongContent(),
                scrollable: true,
                expandMode: false,
                minimizeMode: false,
                fullscreen: false,
                backdrop: true,
                dismissible: true,
                swipeToClose: true,
                bottomOffset: 0,
                topOffset: 0
              })}
              className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover-bg-green-100 dark:hover-bg-green-900/30 transition-colors text-left"
            >
              <h3 className="font-medium text-green-900 dark:text-green-200 mb-1">Sidebar Panel</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Scrollable content</p>
            </button>

            <button
              onClick={() => setSettings({
                side: 'right',
                size: 'm',
                title: 'Modal Dialog',
                description: 'Fullscreen experience',
                content: 'This is a fullscreen modal perfect for detailed forms or immersive content.',
                scrollable: false,
                expandMode: false,
                minimizeMode: false,
                fullscreen: true,
                backdrop: true,
                dismissible: true,
                swipeToClose: false,
                bottomOffset: 0,
                topOffset: 0
              })}
              className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover-bg-purple-100 dark:hover-bg-purple-900/30 transition-colors text-left"
            >
              <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-1">Fullscreen Modal</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">Immersive experience</p>
            </button>

            <button
              onClick={() => setSettings({
                side: 'top',
                size: 's',
                title: 'Notification Bar',
                description: 'Quick notifications',
                content: 'This is a notification that can be minimized to stay accessible.',
                scrollable: false,
                expandMode: false,
                minimizeMode: true,
                fullscreen: false,
                backdrop: false,
                dismissible: true,
                swipeToClose: true,
                bottomOffset: 0,
                topOffset: 60
              })}
              className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover-bg-orange-100 dark:hover-bg-orange-900/30 transition-colors text-left"
            >
              <h3 className="font-medium text-orange-900 dark:text-orange-200 mb-1">Notification Bar</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">Minimizable notification</p>
            </button>
          </div>
        </div>
      </main>

      {/* The Actual Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        side={settings.side}
        size={settings.size}
        title={settings.title}
        description={settings.description}
        scrollable={settings.scrollable}
        expandMode={settings.expandMode}
        minimizeMode={settings.minimizeMode}
        fullscreen={settings.fullscreen}
        backdrop={settings.backdrop}
        dismissible={settings.dismissible}
        swipeToClose={settings.swipeToClose}
        bottomOffset={settings.bottomOffset}
        onMinimize={() => console.log('Drawer minimized')}
        onRestore={() => console.log('Drawer restored')}
      >
        <div className="space-y-4">
          {settings.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-gray-600 dark-text-gray-400">
              {paragraph}
            </p>
          ))}

          <div className="mt-6 p-4 bg-gray-50 dark-bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark-text-white mb-2">Interactive Elements</h4>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover-bg-blue-700 transition-colors">
                Sample Action Button
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Test input field"
                  className="flex-1 px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-700 text-gray-900 dark-text-white"
                />
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover-bg-green-700 transition-colors">
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Mobile Sticky Bottom Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark-bg-gray-900 border-t border-gray-200 dark-border-gray-700 z-50">
        <button
          onClick={openDrawer}
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover-bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10,17 15,12 10,7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Open Drawer
        </button>
      </div>
    </div>
  )
}