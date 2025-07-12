import { ImageResponse } from 'next/og'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const size = parseInt(searchParams.get('size') || '32')
  
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: size * 0.5,
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
          borderRadius: size * 0.2,
        }}
      >
        H
      </div>
    ),
    {
      width: size,
      height: size,
    }
  )
}