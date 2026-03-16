import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Sonic Therapy Platform — Personalized AI Music Therapy';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
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
          fontSize: 48,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: 900,
        }}
      >
        Sonic Therapy — Personalized Music Therapy Powered by AI
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 22,
          color: '#d4af37',
          marginTop: 16,
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.4,
        }}
      >
        Binaural Beats · Solfeggio Frequencies · RAG · Multi-Model Orchestration
      </div>

      {/* CTA button */}
      <div
        style={{
          marginTop: 36,
          padding: '14px 40px',
          borderRadius: 12,
          background: '#d4af37',
          color: '#0f1b2d',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        Start a Free Session →
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 15,
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        sonic.deciwa.com · Built by Deciwa
      </div>
    </div>,
    { ...size },
  );
}
