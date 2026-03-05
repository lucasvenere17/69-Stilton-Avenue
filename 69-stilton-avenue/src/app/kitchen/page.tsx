"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import kitchenData from "@/data/kitchen-options.json";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

const KITCHEN_PHOTOS = [
  "/assets/photos/n12792888_7.jpg",
  "/assets/photos/n12792888_8.jpg",
  "/assets/photos/n12792888_9.jpg",
  "/assets/photos/n12792888_10.jpg",
  "/assets/photos/n12792888_11.jpg",
];

export default function KitchenPage() {
  const { activeScenarioId, scenarios, saveScenario } = useAppStore();
  const scenario = scenarios.find((s) => s.id === activeScenarioId);

  const [selectedPhoto, setSelectedPhoto] = useState(KITCHEN_PHOTOS[0]);
  const [selectedComponent, setSelectedComponent] = useState(kitchenData.components[0].id);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspirationPreview, setInspirationPreview] = useState<string | null>(null);

  const activeComponent = kitchenData.components.find((c) => c.id === selectedComponent);

  const handleApplyMaterial = useCallback(async () => {
    if (!selectedOption || !activeComponent) return;
    const option = activeComponent.options.find((o) => o.id === selectedOption);
    if (!option) return;

    setLoading(true);
    setError(null);

    try {
      const imgRes = await fetch(selectedPhoto);
      const blob = await imgRes.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          prompt: option.prompt,
          scenarioId: activeScenarioId,
          mode: "inpaint",
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setEditedImage(data.imageUrl || null);

      // Save to scenario
      if (scenario && data.imageUrl) {
        const updated = {
          ...scenario,
          kitchenEdits: [
            ...scenario.kitchenEdits,
            {
              originalPhoto: selectedPhoto,
              editedPhoto: data.imageUrl,
              component: activeComponent.label,
              material: option.name,
            },
          ],
        };
        await saveScenario(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply material");
    } finally {
      setLoading(false);
    }
  }, [selectedOption, activeComponent, selectedPhoto, activeScenarioId, scenario, saveScenario]);

  const handleInspirationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInspirationPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (!scenario) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Create a scenario first using the header controls.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kitchen Customizer</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Image / Compare Slider */}
          <div className="border rounded-lg overflow-hidden bg-black aspect-[4/3]">
            {editedImage ? (
              <ReactCompareSlider
                itemOne={
                  <ReactCompareSliderImage src={selectedPhoto} alt="Before" />
                }
                itemTwo={
                  <ReactCompareSliderImage src={editedImage} alt="After" />
                }
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <img
                src={selectedPhoto}
                alt="Kitchen"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Photo Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {KITCHEN_PHOTOS.map((photo) => (
              <button
                key={photo}
                onClick={() => {
                  setSelectedPhoto(photo);
                  setEditedImage(null);
                }}
                className={`flex-shrink-0 w-20 h-16 rounded-md overflow-hidden border-2 transition-all ${
                  selectedPhoto === photo
                    ? "border-primary"
                    : "border-transparent hover:border-border"
                }`}
              >
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Previous Edits */}
          {scenario.kitchenEdits.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Previous Edits</h3>
              <div className="flex gap-2 overflow-x-auto">
                {scenario.kitchenEdits.map((edit, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedPhoto(edit.originalPhoto);
                      setEditedImage(edit.editedPhoto);
                    }}
                    className="flex-shrink-0 text-left p-2 border rounded text-xs hover:bg-accent"
                  >
                    <div className="font-medium">{edit.component}</div>
                    <div className="text-muted-foreground">{edit.material}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Component Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Component</label>
            <select
              value={selectedComponent}
              onChange={(e) => {
                setSelectedComponent(e.target.value);
                setSelectedOption(null);
              }}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {kitchenData.components.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.label}
                </option>
              ))}
            </select>
          </div>

          {/* Material Options */}
          {activeComponent && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Material / Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activeComponent.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`flex items-center gap-2 p-2 border rounded-md text-left text-sm transition-all ${
                      selectedOption === option.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-border"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="text-xs leading-tight">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          <button
            onClick={handleApplyMaterial}
            disabled={!selectedOption || loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              "Apply with AI"
            )}
          </button>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {/* Inspiration Upload */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-2 block">
              Inspiration Image
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload a reference image to guide the AI edit style
            </p>
            <label className="block border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInspirationUpload}
              />
              {inspirationPreview ? (
                <img
                  src={inspirationPreview}
                  alt="Inspiration"
                  className="max-h-32 mx-auto rounded"
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Drop or click to upload
                </span>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
