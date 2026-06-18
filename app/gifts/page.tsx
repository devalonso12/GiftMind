'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'   // ← Change this if you renamed the file

export default function GiftsPage() {
  const [gifts, setGifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadGifts() {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
      
      if (error) {
        console.error("Error loading gifts:", error)
      } else {
        setGifts(data || [])
      }
      setLoading(false)
    }
    
    loadGifts()
  }, [])

  if (loading) return <p style={{padding: '20px'}}>Loading gifts...</p>

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🎁 Available Gifts</h1>
      <p>Demo gifts from Supabase database:</p>
      
      {gifts.map((gift: any) => (
        <div key={gift.id} style={{
          margin: '15px 0',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <h3>{gift.name}</h3>
          <p>{gift.description}</p>
          <p><strong>Category:</strong> {gift.category}</p>
          <p><strong>Price Range:</strong> {gift.price_range}</p>
        </div>
      ))}

      {gifts.length === 0 && <p>No gifts found.</p>}
    </div>
  )
}
