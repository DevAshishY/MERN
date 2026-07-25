import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [jokes, setJokes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJokes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('api/jokes')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setJokes(data)
      return data
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error')
      console.error(err)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJokes().then(result => console.log(result))
  }, [])

  return (
    <>
      <h1>Jokes</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <ul>
        {jokes.map((j: any, i: number) => (
          <li key={i}>{typeof j === 'string' ? j : JSON.stringify(j)}</li>
        ))}
      </ul>
    </>
  )
}

export default App
