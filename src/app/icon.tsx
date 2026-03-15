import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9";
  
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 24,
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '50%',
          overflow: 'hidden'
        }}
      >
        <img src={logoUrl} alt="Starryz5 Logo" width="32" height="32" style={{ objectFit: 'cover' }} />
      </div>
    ),
    {
      ...size,
    }
  )
}
