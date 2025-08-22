// Configuration Jest pour les tests
import '@testing-library/jest-dom'

// Mock des variables d'environnement pour les tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.API_FOOTBALL_KEY = 'test-api-key'

// Mock global de fetch si necessaire
global.fetch = jest.fn()

// Mock de console.error pour eviter le spam dans les tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})