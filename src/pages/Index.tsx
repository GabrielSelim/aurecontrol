import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { UserRolesSection } from "@/components/landing/UserRolesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const Index = () => {
  useDocumentTitle("Início");
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <AboutSection />
        <UserRolesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
