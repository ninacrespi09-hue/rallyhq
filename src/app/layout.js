import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

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
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
