import "./globals.css";

export const metadata = {
  title: "Ducksite",
  description: "Learning platform frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
