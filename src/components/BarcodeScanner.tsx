import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useId, useRef, useState } from "react";
import { normalizeBarcode } from "../lib/barcode";

type Props = {
  onBarcode: (barcode: string) => void;
  disabled?: boolean;
};

export function BarcodeScanner({ onBarcode, disabled }: Props) {
  const videoId = useId().replace(/:/g, "");
  const controlsRef = useRef<IScannerControls | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (disabled) return;

    const reader = new BrowserMultiFormatReader();
    setCameraError(null);

    reader
      .decodeFromVideoDevice(undefined, videoId, (result) => {
        if (result) {
          const code = normalizeBarcode(result.getText());
          if (code) onBarcode(code);
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((err: unknown) => {
        setCameraError(
          err instanceof Error
            ? err.message
            : "Could not access camera. Use photo upload or type the barcode.",
        );
      });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [disabled, onBarcode, videoId]);

  async function handlePhoto(file: File | null) {
    if (!file) return;
    setPhotoBusy(true);
    setCameraError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        const code = normalizeBarcode(result.getText());
        if (code) {
          onBarcode(code);
        } else {
          setCameraError("No valid barcode in photo. Try better lighting or type the digits.");
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setCameraError("Could not read a barcode from that photo. Try the nutrition label area or type digits.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="barcode-scanner">
      <p className="modal__hint">Point at the product barcode, or upload a photo of the package.</p>

      <div className="barcode-scanner__video-wrap">
        <video id={videoId} className="barcode-scanner__video" muted playsInline />
      </div>

      <label className="btn btn--ghost btn--block barcode-scanner__upload">
        {photoBusy ? "Reading photo…" : "Upload photo of barcode / package"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled || photoBusy}
          hidden
          onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
        />
      </label>

      {cameraError ? (
        <p className="status status--error" role="alert">
          {cameraError}
        </p>
      ) : null}
    </div>
  );
}
