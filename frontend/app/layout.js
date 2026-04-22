import "./globals.css";
import AudioProvider from "@/components/AudioProvider";

export const metadata = {
  title: "DuckSiteT", 
  description: "Learning platform frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
