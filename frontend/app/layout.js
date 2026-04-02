import "./globals.css";

export const metadata = {
  title: "Ducksite",
  description: "Learning platform frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
