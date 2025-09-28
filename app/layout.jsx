import "./globals.css";

export const metadata = {
  title: "venegasai",
  description: "venegasai · chat",
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-title">venegasai</div>
        </header>
        {children}
      </body>
    </html>
  );
}
