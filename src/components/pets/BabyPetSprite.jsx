/** Palace Pets–style PNG sprites for RallyPet overlay only. */

import { DEFAULT_PET_ID } from "@/lib/rallyPetDefs";

export const PET_IMAGE_PATHS = {
  dog: "/pets/dog.png",
  cat: "/pets/cat.png",
  horse: "/pets/horse.png",
  cow: "/pets/cow.png",
  elephant: "/pets/elephant.png",
  monkey: "/pets/monkey.png",
  pig: "/pets/pig.png",
  bear: "/pets/bear.png",
  chicken: "/pets/chicken.png",
  frog: "/pets/frog.png",
};

/** Renders a Palace Pets–style PNG sprite for the floating overlay. */
export default function BabyPetSprite({ id = DEFAULT_PET_ID, size = 96, level = 1, sad = false }) {
  const src = PET_IMAGE_PATHS[id] || PET_IMAGE_PATHS[DEFAULT_PET_ID];
  const innerScale = 1.02 + (level - 1) * 0.032;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        transform: `scale(${innerScale})`,
        transformOrigin: "center center",
        opacity: sad ? 0.68 : 1,
        filter: sad ? "grayscale(0.3) brightness(0.92)" : "drop-shadow(0 4px 10px rgba(13,23,48,0.22))",
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
}

export function petSpriteIds() {
  return Object.keys(PET_IMAGE_PATHS);
}
