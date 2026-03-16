import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Sonic Therapy Platform — Personalized AI Music Therapy';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1b2d 0%, #162340 50%, #0f1b2d 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Soundwave icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: 20,
            background: '#d4af37',
            marginBottom: 32,
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0f1b2d"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M2 10v3" />
            <path d="M6 6v11" />
            <path d="M10 3v18" />
            <path d="M14 8v7" />
            <path d="M18 5v13" />
            <path d="M22 10v3" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          Sonic Therapy Platform
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: '#d4af37',
            marginTop: 16,
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Personalized AI Music Therapy
        </div>

        {/* Tech pills */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 36,
          }}
        >
          {['Prompt Engineering', 'RAG', 'Multi-Model AI', 'Binaural Beats', 'Solfeggio'].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 15,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 16,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Built by Deciwa
        </div>
      </div>
    ),
    { ...size },
  );
}
