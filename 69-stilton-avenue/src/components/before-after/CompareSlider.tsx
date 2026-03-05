"use client";

import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export default function CompareSlider({
  beforeSrc,
  afterSrc,
}: CompareSliderProps) {
  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-zinc-700">
      <ReactCompareSlider
        itemOne={
          <ReactCompareSliderImage
            src={beforeSrc}
            alt="Before renovation"
            style={{ objectFit: "contain", width: "100%", height: "100%" }}
          />
        }
        itemTwo={
          <ReactCompareSliderImage
            src={afterSrc}
            alt="After renovation"
            style={{ objectFit: "contain", width: "100%", height: "100%" }}
          />
        }
        style={{ width: "100%", height: "100%" }}
      />
      {/* Labels */}
      <span className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
        Before
      </span>
      <span className="absolute top-3 right-3 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded pointer-events-none">
        After
      </span>
    </div>
  );
}
