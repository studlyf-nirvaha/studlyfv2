import React, { useRef, useState, useEffect } from 'react';

const DEFAULT_CATALOG_URL = '/avatars/catalog.png';
const CATALOG_SIZE = 1024;

interface AvatarImageProps {
  src: string | null;
  alt?: string;
  className?: string;
}

function parseCrop(src: string): { catalogUrl: string; cx: number; cy: number; cw: number; ch: number } | null {
  const hashIdx = src.lastIndexOf('#');
  if (hashIdx === -1) return null;
  const catalogUrl = src.slice(0, hashIdx) || DEFAULT_CATALOG_URL;
  const m = src.slice(hashIdx + 1).match(/^(\d+),(\d+),(\d+),(\d+)$/);
  if (!m) return null;
  return { catalogUrl, cx: +m[1], cy: +m[2], cw: +m[3], ch: +m[4] };
}

const AvatarImage: React.FC<AvatarImageProps> = ({ src, alt = '', className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize(el.offsetWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!src) return null;

  const crop = parseCrop(src);
  if (!crop) {
    return <img src={src} alt={alt} className={className} />;
  }

  const displaySize = size || Math.max(crop.cw, crop.ch);
  const scale = displaySize / Math.max(crop.cw, crop.ch);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        backgroundImage: `url(${crop.catalogUrl})`,
        backgroundSize: `${CATALOG_SIZE * scale}px`,
        backgroundPosition: `${-crop.cx * scale}px ${-crop.cy * scale}px`,
        backgroundRepeat: 'no-repeat',
      }}
      role="img"
      aria-label={alt}
    />
  );
};

export default AvatarImage;
