'use client'

import Image from 'next/image'

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center">
        {/* Cloud icon with dots */}
        <div className="mb-8 flex justify-center">
          <svg
            className="w-24 h-24 text-gray-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 5.23 11.08 5 12 5c3.04 0 5.5 2.46 5.5 5.5v.5H19c2.05 0 3.71 1.66 3.71 3.71 0 1.71-1.04 2.95-2.05 3.12.02-.2.03-.4.03-.6 0-2.64-2.05-4.78-4.65-4.78z" />
          </svg>
        </div>

        {/* Error heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Hmmm... can't reach this page
        </h1>

        {/* Error message */}
        <p className="text-gray-600 mb-6">
          <span className="font-semibold">www.wexhealthbenefitsaccount.com</span>'s
          server IP address could not be found.
        </p>

        {/* Try section */}
        <div className="text-left mb-6 bg-white p-4 rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-3">Try:</p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Checking the connection</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Checking the proxy, firewall, and DNS settings</span>
            </li>
          </ul>
        </div>

        {/* Error code */}
        <p className="text-sm text-gray-500 mb-6">ERR_NAME_NOT_RESOLVED</p>

        {/* Refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition duration-200"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
