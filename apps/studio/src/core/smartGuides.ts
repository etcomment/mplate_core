export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideLine {
  type: 'h' | 'v';
  position: number;
  start: number;
  end: number;
}

export interface SmartGuideResult {
  snappedBBox: BoundingBox;
  guides: GuideLine[];
}

export function calculateSmartGuides(
  activeBox: BoundingBox,
  targetBoxes: BoundingBox[],
  threshold: number = 5
): SmartGuideResult {
  const guides: GuideLine[] = [];
  const snapped = { ...activeBox };

  let bestXSnap: { diff: number; snappedX: number; linePos: number; start: number; end: number } | null = null;
  let bestYSnap: { diff: number; snappedY: number; linePos: number; start: number; end: number } | null = null;

  const activeX = {
    left: activeBox.x,
    center: activeBox.x + activeBox.width / 2,
    right: activeBox.x + activeBox.width,
  };

  const activeY = {
    top: activeBox.y,
    middle: activeBox.y + activeBox.height / 2,
    bottom: activeBox.y + activeBox.height,
  };

  for (const target of targetBoxes) {
    const targetX = {
      left: target.x,
      center: target.x + target.width / 2,
      right: target.x + target.width,
    };

    const targetY = {
      top: target.y,
      middle: target.y + target.height / 2,
      bottom: target.y + target.height,
    };

    // Check X alignments
    for (const [aKey, aVal] of Object.entries(activeX)) {
      for (const [tKey, tVal] of Object.entries(targetX)) {
        const diff = Math.abs(aVal - tVal);
        if (diff <= threshold) {
          if (!bestXSnap || diff < bestXSnap.diff) {
            let snappedX = activeBox.x;
            if (aKey === 'left') snappedX = tVal;
            else if (aKey === 'center') snappedX = tVal - activeBox.width / 2;
            else if (aKey === 'right') snappedX = tVal - activeBox.width;

            bestXSnap = {
              diff,
              snappedX,
              linePos: tVal,
              start: Math.min(activeBox.y, target.y) - 50,
              end: Math.max(activeBox.y + activeBox.height, target.y + target.height) + 50,
            };
          }
        }
      }
    }

    // Check Y alignments
    for (const [aKey, aVal] of Object.entries(activeY)) {
      for (const [tKey, tVal] of Object.entries(targetY)) {
        const diff = Math.abs(aVal - tVal);
        if (diff <= threshold) {
          if (!bestYSnap || diff < bestYSnap.diff) {
            let snappedY = activeBox.y;
            if (aKey === 'top') snappedY = tVal;
            else if (aKey === 'middle') snappedY = tVal - activeBox.height / 2;
            else if (aKey === 'bottom') snappedY = tVal - activeBox.height;

            bestYSnap = {
              diff,
              snappedY,
              linePos: tVal,
              start: Math.min(activeBox.x, target.x) - 50,
              end: Math.max(activeBox.x + activeBox.width, target.x + target.width) + 50,
            };
          }
        }
      }
    }
  }

  if (bestXSnap) {
    snapped.x = bestXSnap.snappedX;
    guides.push({
      type: 'v',
      position: bestXSnap.linePos,
      start: bestXSnap.start,
      end: bestXSnap.end,
    });
  }

  if (bestYSnap) {
    snapped.y = bestYSnap.snappedY;
    guides.push({
      type: 'h',
      position: bestYSnap.linePos,
      start: bestYSnap.start,
      end: bestYSnap.end,
    });
  }

  return { snappedBBox: snapped, guides };
}
