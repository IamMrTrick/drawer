'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Drawer } from '@/components/drawer/Drawer'

export default function TestDrawerPage() {
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const openDrawer = (drawerId: string) => {
    setActiveDrawer(drawerId)
  }

  const closeDrawer = () => {
    setActiveDrawer(null)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.setAttribute('data-theme', !isDarkMode ? 'dark' : 'light')
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isDarkMode ? 'dark' : ''}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Header */}
      <header className="bg-white dark-bg-gray-900 shadow-sm border-b border-gray-200 dark-border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-gray-500 dark-text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Back to Home
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark-text-white">
                Drawer Component Test
              </h1>
            </div>
            <button
              onClick={toggleDarkMode}
              className="px-3 py-2 bg-gray-100 dark-bg-gray-800 text-gray-700 dark-text-gray-300 rounded-lg hover-bg-gray-200 dark-hover-bg-gray-700 transition-colors"
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark-text-white mb-3">
              Interactive Drawer Component
            </h2>
            <p className="text-gray-600 dark-text-gray-400">
              Test all drawer variations, sizes, and positions. Each drawer includes sample content
              and demonstrates the smooth animations and responsive behavior.
            </p>
          </section>

          {/* Side Drawers */}
          <section className="bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark-text-white mb-4">
              Side Drawers
            </h3>
            <div className="grid grid-cols-1 md-grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 dark-text-gray-300 mb-3">Left Side</h4>
                <div className="space-y-2">
                  {['s', 'm', 'l', 'xl'].map((size) => (
                    <button
                      key={`left-${size}`}
                      onClick={() => openDrawer(`left-${size}`)}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded hover-bg-blue-600 transition-colors text-sm"
                    >
                      Left - Size {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark-text-gray-300 mb-3">Right Side</h4>
                <div className="space-y-2">
                  {['s', 'm', 'l', 'xl'].map((size) => (
                    <button
                      key={`right-${size}`}
                      onClick={() => openDrawer(`right-${size}`)}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded hover-bg-green-600 transition-colors text-sm"
                    >
                      Right - Size {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Top & Bottom Drawers */}
          <section className="bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark-text-white mb-4">
              Top & Bottom Drawers
            </h3>
            <div className="grid grid-cols-1 md-grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 dark-text-gray-300 mb-3">Top</h4>
                <div className="space-y-2">
                  {['s', 'm', 'l', 'xl'].map((size) => (
                    <button
                      key={`top-${size}`}
                      onClick={() => openDrawer(`top-${size}`)}
                      className="w-full px-4 py-2 bg-purple-500 text-white rounded hover-bg-purple-600 transition-colors text-sm"
                    >
                      Top - Size {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark-text-gray-300 mb-3">Bottom</h4>
                <div className="space-y-2">
                  {['s', 'm', 'l', 'xl'].map((size) => (
                    <button
                      key={`bottom-${size}`}
                      onClick={() => openDrawer(`bottom-${size}`)}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded hover-bg-orange-600 transition-colors text-sm"
                    >
                      Bottom - Size {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Special Variations */}
          <section className="bg-white dark-bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark-border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark-text-white mb-4">
              Special Variations
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => openDrawer('fullscreen')}
                className="px-4 py-2 bg-red-500 text-white rounded hover-bg-red-600 transition-colors"
              >
                Fullscreen Drawer
              </button>
              <button
                onClick={() => openDrawer('scrollable')}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover-bg-indigo-600 transition-colors"
              >
                Scrollable Content
              </button>
              <button
                onClick={() => openDrawer('form')}
                className="px-4 py-2 bg-teal-500 text-white rounded hover-bg-teal-600 transition-colors"
              >
                Form Example
              </button>
            </div>
          </section>

          {/* Instructions */}
          <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              🎯 Testing Instructions
            </h3>
            <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-sm">
              <li>• Click any button above to open a drawer</li>
              <li>• Try dragging the drawers to close them (mobile-friendly)</li>
              <li>• Test the backdrop click to close</li>
              <li>• Toggle dark mode to see theme adaptation</li>
              <li>• Resize your browser to test responsiveness</li>
              <li>• Check mobile touch interactions</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Side Drawers */}
      {['left', 'right'].map((side) =>
        ['s', 'm', 'l', 'xl'].map((size) => (
          <Drawer
            key={`${side}-${size}`}
            isOpen={activeDrawer === `${side}-${size}`}
            onClose={closeDrawer}
            side={side as 'left' | 'right'}
            size={size as 's' | 'm' | 'l' | 'xl'}
            title={`${side.charAt(0).toUpperCase() + side.slice(1)} Drawer - ${size.toUpperCase()}`}
            description={`This is a ${size.toUpperCase()} sized drawer positioned on the ${side} side.`}
          >
            <div className="space-y-4">
              <p className="text-gray-600 dark-text-gray-400">
                This drawer demonstrates the {side} side position with {size.toUpperCase()} sizing.
                You can interact with all the content inside.
              </p>

              <div className="bg-gray-50 dark-bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark-text-white mb-2">Sample Content</h4>
                <p className="text-sm text-gray-600 dark-text-gray-400">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                  Sample Button
                </button>
                <button className="px-3 py-1 bg-gray-100 dark-bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm">
                  Another Action
                </button>
              </div>
            </div>
          </Drawer>
        ))
      )}

      {/* Top & Bottom Drawers */}
      {['top', 'bottom'].map((side) =>
        ['s', 'm', 'l', 'xl'].map((size) => (
          <Drawer
            key={`${side}-${size}`}
            isOpen={activeDrawer === `${side}-${size}`}
            onClose={closeDrawer}
            side={side as 'top' | 'bottom'}
            size={size as 's' | 'm' | 'l' | 'xl'}
            title={`${side.charAt(0).toUpperCase() + side.slice(1)} Drawer - ${size.toUpperCase()}`}
            description={`This is a ${size.toUpperCase()} sized drawer positioned on the ${side}.`}
          >
            <div className="space-y-4">
              <p className="text-gray-600 dark-text-gray-400">
                This drawer opens from the {side} with {size.toUpperCase()} height sizing.
                Perfect for notifications, quick actions, or additional content.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <h5 className="font-medium text-blue-900 dark:text-blue-200 text-sm">Feature 1</h5>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Description here</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <h5 className="font-medium text-green-900 dark:text-green-200 text-sm">Feature 2</h5>
                  <p className="text-xs text-green-700 dark:text-green-300">Description here</p>
                </div>
              </div>
            </div>
          </Drawer>
        ))
      )}

      {/* Special Drawers */}
      <Drawer
        isOpen={activeDrawer === 'fullscreen'}
        onClose={closeDrawer}
        side="right"
        fullscreen
        title="Fullscreen Drawer"
        description="This drawer takes up the entire screen space."
      >
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark-text-white mb-2">
              Fullscreen Experience
            </h3>
            <p className="text-gray-600 dark-text-gray-400">
              This drawer demonstrates the fullscreen mode, perfect for detailed views,
              complex forms, or immersive content experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md-grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark-text-white">Left Column</h4>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark-bg-gray-800 p-4 rounded border border-gray-200 dark-border-gray-700">
                  <h5 className="font-medium text-gray-900 dark-text-white">Item {i}</h5>
                  <p className="text-sm text-gray-600 dark-text-gray-400">Sample content for item {i}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark-text-white">Right Column</h4>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark-bg-gray-800 p-4 rounded border border-gray-200 dark-border-gray-700">
                  <h5 className="font-medium text-gray-900 dark-text-white">Detail {i}</h5>
                  <p className="text-sm text-gray-600 dark-text-gray-400">Additional information {i}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer
        isOpen={activeDrawer === 'scrollable'}
        onClose={closeDrawer}
        side="right"
        size="l"
        title="Scrollable Content"
        description="This drawer contains a lot of content that demonstrates scrolling behavior."
        scrollable
      >
        <div className="space-y-4">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="bg-gray-50 dark-bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark-text-white mb-2">
                Content Block {i + 1}
              </h4>
              <p className="text-sm text-gray-600 dark-text-gray-400">
                This is content block number {i + 1}. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.
              </p>
              {i % 3 === 0 && (
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                    Action
                  </button>
                  <button className="px-3 py-1 bg-gray-100 dark-bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm">
                    View More
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Drawer>

      <Drawer
        isOpen={activeDrawer === 'form'}
        onClose={closeDrawer}
        side="right"
        size="m"
        title="Sample Form"
        description="A form example with various input types and validation."
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500 focus-border-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500 focus-border-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-1">
              Category
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500 focus-border-blue-500">
              <option>General</option>
              <option>Support</option>
              <option>Sales</option>
              <option>Technical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark-text-gray-300 mb-1">
              Message
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark-border-gray-600 rounded-lg bg-white dark-bg-gray-800 text-gray-900 dark-text-white focus-ring-2 focus-ring-blue-500 focus-border-blue-500"
              placeholder="Enter your message here..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus-ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700 dark-text-gray-300">
              I agree to the terms and conditions
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover-bg-blue-700 transition-colors"
            >
              Submit Form
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="px-4 py-2 bg-gray-100 dark-bg-gray-800 text-gray-700 dark-text-gray-300 rounded-lg hover-bg-gray-200 dark-hover-bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}