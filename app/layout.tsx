import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Go Workout - Trainer & Student App',
  description: 'Workout routine management for trainers and students',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
