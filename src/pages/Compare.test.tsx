import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Compare } from './Compare'

describe('Compare page', () => {
  it('renders headline and both persona names without an outer router', () => {
    render(<Compare />)
    expect(screen.getByText('Same app, set up two different ways')).toBeTruthy()
    expect(screen.getByText(/Auntie Mei,/)).toBeTruthy()
    expect(screen.getByText(/Arif,/)).toBeTruthy()
  })

  it('fails when Compare is nested inside BrowserRouter', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <Compare />
        </BrowserRouter>,
      )
    }).toThrow(/Router/)
  })

  it('applies persona prefs inside each pane on Home', async () => {
    const { container } = render(<Compare />)
    const meiRoot = container.querySelector('#compare-root-auntiemei')
    const arifRoot = container.querySelector('#compare-root-arif')
    expect(meiRoot?.getAttribute('data-easy-tap')).toBe('1')
    expect(arifRoot?.classList.contains('dyslexia-font')).toBe(true)
    expect(meiRoot?.classList.contains('dyslexia-font')).toBe(false)

    await waitFor(() => {
      expect(arifRoot?.querySelector('[data-testid="spending-insights-home"]')).toBeTruthy()
    })
    expect(meiRoot?.querySelector('[data-testid="spending-insights-home"]')).toBeNull()
  })
})