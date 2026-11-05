import { useSmartGuidesStore } from '../store/smartGuidesStore';

export function SmartGuidesOverlay() {
  const guides = useSmartGuidesStore(s => s.activeGuides);

  if (guides.length === 0) return null;

  return (
    <g data-smart-guides pointerEvents="none">
      {guides.map((guide, idx) => {
        if (guide.type === 'v') {
          return (
            <line
              key={idx}
              x1={guide.position}
              y1={guide.start}
              x2={guide.position}
              y2={guide.end}
              stroke="#ff007f"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        } else {
          return (
            <line
              key={idx}
              x1={guide.start}
              y1={guide.position}
              x2={guide.end}
              y2={guide.position}
              stroke="#ff007f"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        }
      })}
    </g>
  );
}
