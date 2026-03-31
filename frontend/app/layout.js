import "./globals.css";

export const metadata = {
  title: "Ducksite",
  description: "Ducksite migrated to Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
