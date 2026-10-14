import { ColorPalette } from './components/ColorPalette';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { RadiusShadows } from './components/RadiusShadows';
import { Sidebar } from './components/Sidebar';
import { Spacing } from './components/Spacing';
import { Typography } from './components/Typography';
import { UIKit } from './components/UIKit';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <a href="#cores" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-background">
        Pular para o conteúdo
      </a>
      <Sidebar />
      <main className="lg:pl-[264px]">
        <Hero />
        <ColorPalette />
        <Typography />
        <Spacing />
        <RadiusShadows />
        <UIKit />
        <Footer />
      </main>
    </div>
  );
}
