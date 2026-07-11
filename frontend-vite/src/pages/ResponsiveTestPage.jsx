import React from 'react';
import { ResponsiveTest } from '../components/dev/ResponsiveTest';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

const ResponsiveTestPage = () => {
  return (
    <ResponsiveTest>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-[var(--spacing-md)] lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Responsive Design Test Page
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              This page tests responsive design across different screen sizes.
              Resize your browser or use device emulation to see how the layout adapts.
            </p>
          </section>

          {/* Typography Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Typography Scale</h2>
            <div className="space-y-2">
              <p className="text-xs">Extra Small Text (text-xs)</p>
              <p className="text-sm">Small Text (text-sm)</p>
              <p className="text-base">Base Text (text-base)</p>
              <p className="text-lg">Large Text (text-lg)</p>
              <p className="text-xl">Extra Large Text (text-xl)</p>
              <p className="text-2xl">2XL Text (text-2xl)</p>
            </div>
          </section>

          {/* Button Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Button Variants</h2>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </section>

          {/* Form Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Form Elements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Email" type="email" placeholder="Enter your email" />
              <Input label="Password" type="password" placeholder="Enter your password" />
              <Input label="Name" placeholder="Enter your name" />
              <Input label="Phone" type="tel" placeholder="Enter your phone" />
            </div>
          </section>

          {/* Grid Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Grid System</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="bg-blue-100 dark:bg-blue-900 p-4 rounded text-center">
                  <span className="font-semibold">Col {i + 1}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Card Grid Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Card Layout</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-[var(--spacing-md)]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 p-4 md:p-[var(--spacing-md)] rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">Card {i}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    This is a test card to check responsive layout behavior.
                    The content should wrap appropriately on different screen sizes.
                  </p>
                  <Button size="sm">Action</Button>
                </div>
              ))}
            </div>
          </section>

          {/* Table Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Table Responsiveness</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">User {i}</td>
                      <td className="p-2">user{i}@example.com</td>
                      <td className="p-2">+1 234 567 890{i}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Active
                        </span>
                      </td>
                      <td className="p-2">
                        <Button size="sm" variant="outline">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Spacing Test */}
          <section className="bg-white dark:bg-gray-900 rounded-lg p-[var(--spacing-md)] shadow">
            <h2 className="text-xl md:text-2xl font-semibold mb-4">Spacing Scale</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((space) => (
                <div key={space} className="flex items-center">
                  <span className="w-16 text-sm font-mono">p-{space}</span>
                  <div className={`bg-blue-200 dark:bg-blue-800 h-8`} style={{ width: `${space * 4}px` }} />
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </ResponsiveTest>
  );
};

export default ResponsiveTestPage;

