import { render, screen } from '@testing-library/react'
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
})