import "./globals.css";

export const metadata = {
  title: "RallyHQ · Volleyball Team Manager",
  description: "Track stats, schedules, check-ins, and team communication.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1730",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
