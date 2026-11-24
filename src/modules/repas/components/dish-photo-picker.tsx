"use client";

import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { resizeImage } from "@/shared/lib/resize-image";
import { removeDishPhoto, uploadDishPhoto } from "../actions/photos";
import { DishPhoto } from "./dish-photo";
import { look } from "./look";

type Props = { dishId: string; dishName: string; photoUrl: string | null };

/**
 * Add, replace or remove the photo of a dish (camera or photo library on an iPhone).
 * Saved right away: the photo then shows on every meal of this dish.
 */
export function DishPhotoPicker({ dishId, dishName, photoUrl }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(photoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = (file: File) =>
    startTransition(async () => {
      setError(null);
      try {
        const blob = await resizeImage(file);
        const formData = new FormData();
        formData.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const result = await uploadDishPhoto(dishId, formData);
        if (!result.ok) return setError(result.error);
        setPreview(URL.createObjectURL(blob));
        router.refresh();
      } catch {
        setError("Impossible de lire cette photo");
      }
    });

  const remove = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeDishPhoto(dishId);
      if (!result.ok) return setError(result.error);
      setPreview(null);
      router.refresh();
    });

  return (
    <div className="grid gap-2">
      <span className="px-1 text-[13px] font-medium text-muted-foreground">Photo du plat</span>
      {preview ? (
        <div className="relative overflow-hidden rounded-xl bg-muted">
          <DishPhoto src={preview} alt={`Photo : ${dishName}`} className="aspect-[16/9] w-full" />
          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
              <LoaderCircle className="size-6 animate-spin" aria-label="Envoi…" />
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => input.current?.click()} className={`${look.btn} ${look.btnPlain} ${look.btnSm}`}>
          {pending && !preview ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
          {preview ? "Changer la photo" : "Ajouter une photo"}
        </button>
        {preview ? (
          <button type="button" disabled={pending} onClick={remove} className={`${look.btn} ${look.btnRed} ${look.btnSm}`}>
            <Trash2 className="size-4" aria-hidden />
            Retirer
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-label={`Photo de ${dishName}`}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
