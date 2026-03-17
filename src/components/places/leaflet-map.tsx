'use client';

import { useEffect, useRef } from 'react';
import type { Place, Category } from '@/lib/types';

// Leaflet CSS must be loaded globally or via a stylesheet tag
// We inject it once at mount to avoid Next.js issues with CSS imports in client components

interface LeafletMapProps {
  places: Place[];
  categories: Category[];
  onPlaceClick: (place: Place) => void;
}

export default function LeafletMap({ places, categories, onPlaceClick }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep a stable reference to onPlaceClick so markers don't need to re-register
  const onPlaceClickRef = useRef(onPlaceClick);
  onPlaceClickRef.current = onPlaceClick;

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    async function init() {
      // Inject Leaflet CSS if not already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const L = (await import('leaflet')).default;

      // Fix default marker icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      for (const place of places) {
        if (place.lat == null || place.lng == null) continue;

        const cat = categoryMap[place.category_id] ?? null;
        const color = cat?.color ?? '#0D9488';

        // Custom colored circle marker
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${color};border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;
          ">${cat?.icon ?? ''}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([place.lat, place.lng], { icon }).addTo(map);
        bounds.extend([place.lat, place.lng]);

        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'min-width:160px;font-family:inherit;';
        popupContent.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>
            <strong style="font-size:13px;line-height:1.3;">${place.name}</strong>
          </div>
          ${cat ? `<p style="font-size:11px;color:#78716c;margin-bottom:8px;">${cat.name}</p>` : ''}
          <button
            id="popup-btn-${place.id}"
            style="
              font-size:12px;padding:5px 12px;border-radius:8px;
              background:#0D9488;color:white;border:none;cursor:pointer;
              font-weight:500;
            "
          >View details</button>
        `;

        const popup = L.popup({ closeButton: true, maxWidth: 220 }).setContent(popupContent);
        marker.bindPopup(popup);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`popup-btn-${place.id}`);
          if (btn) {
            btn.onclick = () => {
              map.closePopup();
              onPlaceClickRef.current(place);
            };
          }
        });
      }

      // Fit bounds
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }

      // Cleanup on unmount
      return () => {
        isMounted = false;
        map.remove();
      };
    }

    const cleanup = init();

    return () => {
      isMounted = false;
      cleanup.then((fn) => fn?.());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
