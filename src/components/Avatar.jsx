// Player avatar — uses an uploaded/generated photo when available,
// otherwise a blue gradient circle with initials.
export default function Avatar({ user, size = 48, className = "" }) {
  const initials = (user.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (user.photo_url) {
    return (
      <img
        src={user.photo_url}
        alt={user.name}
        className={`rounded-md object-cover ring-2 ring-white ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`grid place-items-center rounded-md bg-gradient-to-br from-brand-300 to-blue-600 font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
