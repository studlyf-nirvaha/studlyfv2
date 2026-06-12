
import React from 'react';
import LandingHero from '../components/LandingHero';
import WhatIsStudlyf from '../components/WhatIsStudlyf';
import VoicesThatInspire from '../components/VoicesThatInspire';
import OldVsNewSection from '../components/OldVsNewSection';
import MentorCredibility from '../components/MentorCredibility';
import WhoWeServe from '../components/WhoWeServe';
import FeaturedInstitutions from '../components/FeaturedInstitutions';
import OurPartners from '../components/OurPartners';
import FAQ from '../components/FAQ';
import LandingNavbar from '../components/LandingNavbar';
import PurpleNavbar from '../components/PurpleNavbar';
import RoadmapSection from '../components/RoadmapSection';



const Home: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      <div className="min-h-screen flex flex-col relative overflow-hidden pt-12 sm:pt-20 pb-24">
        <LandingNavbar />
        <LandingHero />
        <PurpleNavbar />
      </div>

      {/* Scrollable content starts here */}
      <WhatIsStudlyf />
      <VoicesThatInspire />
      <OldVsNewSection />
      <MentorCredibility />
      <WhoWeServe />
      <RoadmapSection />
      <FAQ />
      <FeaturedInstitutions />
      <OurPartners />
    </div>
  );
};

export default Home;

