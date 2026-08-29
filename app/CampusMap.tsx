'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

type MapEvent = { id: number; title: string; address: string; emoji: string; color: string; lat: number; lng: number };

export default function CampusMap({ events, selectedId, onSelect }: { events: MapEvent[]; selectedId: number; onSelect: (id: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    void import('leaflet').then(L => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current).setView([-33.8886, 151.1895], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then(L => {
      const map = mapRef.current;
      if (cancelled || !map) return;
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = events.map(event => {
        const icon = L.divIcon({
          className: 'campus-map-marker-wrap',
          html: `<span class="campus-map-marker${event.id === selectedId ? ' selected' : ''}" style="--marker-color:${event.color}"><i>${event.emoji}</i></span>`,
          iconSize: [48, 48], iconAnchor: [24, 45],
        });
        const marker = L.marker([event.lat, event.lng], { icon }).addTo(map)
          .bindTooltip(`<b>${event.title}</b><br>${event.address}`, { direction: 'top', offset: [0, -38] });
        marker.on('click', () => onSelectRef.current(event.id));
        return marker;
      });
    });
    return () => { cancelled = true; };
  }, [events, mapReady, selectedId]);

  useEffect(() => {
    const selected = events.find(event => event.id === selectedId);
    if (mapReady && selected) mapRef.current?.flyTo([selected.lat, selected.lng], 16, { duration: .8 });
  }, [events, mapReady, selectedId]);

  return <div ref={containerRef} className="leaflet-campus-map" aria-label="Interactive campus event map" />;
}
