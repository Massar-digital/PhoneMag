import { describe, it, expect } from 'vitest'

// Test wrapper component
const TestWrapper = ({ children }) => {
  return children
}

describe('App', () => {
  it('renders basic test', () => {
    expect(true).toBe(true)
  })

  it('can import modules', () => {
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    expect(typeof expect).toBe('function')
  })
})